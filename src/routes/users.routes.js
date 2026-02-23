const express = require('express')
const router = express.Router()
const { Op } = require('sequelize')

const { User, Question,QuestionResponse, School}  = require('../models') 
const { enqueueSMS } = require('../lib/smsQueue') 

// GET /users/:phoneNumber
router.get('/:phoneNumber', async (req, res) => {
  try {
    const user = await User.findOne({
      where: { phone_number: req.params.phoneNumber }
    })

    if (!user) {
      return res.json({ exist: false })
    }

    // 📅 Debut et fin de la journee
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)

    // 🔎 Verifier si l'utilisateur a repondu
    const questionOfDay = await QuestionResponse.findOne({
      where: {
        user_id: user.phone_number, 
        created_date: {
          [Op.between]: [startOfDay, endOfDay]
        }
      }
    })

    if (!questionOfDay) {
      return res.json({
        ...user.toJSON(),
        exist: true,
        status: 'no_question_today'
      })
    }

    const question =  await Question.findByPk(questionOfDay.question_id)
    
    if (questionOfDay.choice) {
      return res.json({
        ...user.toJSON(),
        exist: true,
        status: 'already_answered',
        question_details: question.toJSON(),
        is_correct: questionOfDay.is_correct
      })
    }

    if (questionOfDay.already_read) {
      return res.json({
        ...user.toJSON(),
        exist: true,
        status: 'already_read',
        question_details: question.toJSON()
      })
    }

    // 📩 Question non encore repondue
    return res.json({
      ...user.toJSON(),
      exist: true,
      status: 'question_pending',
      question_details: question.toJSON(),
      question: {
        ...questionOfDay.toJSON()
      },
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Internal server error' })
  }
})


// POST /users/:mobileNumber/lock-daily-question
router.post('/:mobileNumber/lock-daily-question', async (req, res) => {
  try {
    const user = await User.findOne({
      where: { phone_number: req.params.mobileNumber }
    })

    if (!user) {
      return res.status(404).json({ exist: false })
    }

    // 📅 Debut et fin de la journee
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)

    // 🔎 Recuperer la question du jour assignee
    const questionOfDay = await QuestionResponse.findOne({
      where: {
        user_id: user.phone_number,  // ⚠️ assure-toi que user_id = phone_number
        created_date: {
          [Op.between]: [startOfDay, endOfDay]
        }
      }
    })

    if (!questionOfDay) {
      return res.status(404).json({
        exist: true,
        status: 'no_question_today'
      })
    }

    // 🔒 Si dejà lock
    if (questionOfDay.already_read) {
      return res.json({
        exist: true,
        status: 'already_locked'
      })
    }

    // 🔄 Mise à jour
    //questionOfDay.already_read = true
    await questionOfDay.save()

    return res.json({
      exist: true,
      status: 'locked',
      question_id: questionOfDay.question_id
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Internal server error' })
  }
})


// POST /users/:mobileNumber/submit-answer
router.post('/:mobileNumber/submit-answer', async (req, res) => {
  try {
    const { choice } = req.body

    if (!choice || choice < 1 || choice > 4) {
      return res.status(400).json({
        error: 'Choice must be between 1 and 4'
      })
    }
    const mobileNumber = req.params.mobileNumber ; 
    const user = await User.findOne({
      where: { phone_number: req.params.mobileNumber }
    })

    if (!user) {
      return res.status(404).json({ exist: false })
    }

    // 📅 Debut et fin de la journee
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)

    // 🔎 Recuperer la question assignee aujourd’hui
    const questionResponse = await QuestionResponse.findOne({
      where: {
        user_id: user.phone_number, // ⚠️ idealement user.id
        created_date: {
          [Op.between]: [startOfDay, endOfDay]
        }
      }
    })

    if (!questionResponse) {
      return res.status(404).json({
        exist: true,
        status: 'no_question_today'
      })
    }

    // 🚫 Dejà repondu
    if (questionResponse.choice) {
      return res.json({
        exist: true,
        status: 'already_answered',
        is_correct: questionResponse.is_correct
      })
    }

    // 🔎 Charger la question pour verifier la bonne reponse
    const question = await Question.findByPk(questionResponse.question_id)

    if (!question) {
      return res.status(500).json({
        error: 'Question not found'
      })
    }

    const isCorrect = question.response == choice
    if( isCorrect === true ){
      console.log('Felicitation! Vous avez fourni la bonne reponse ! Vous avez gagne 10pts !')
      enqueueSMS(mobileNumber, 'Felicitation! Vous avez fourni la bonne reponse ! Vous avez gagne 10pts !' , {})
    }else{
      console.log('Desole, la reponse fourni est incorrecte. Vous ferez mieux à la prochaine question !')
      enqueueSMS(mobileNumber, 'Desole, la reponse fourni est incorrecte. Vous ferez mieux à la prochaine question !' , {})
    }



    // 💾 Mise à jour
    questionResponse.choice = choice
    questionResponse.is_correct = isCorrect
    questionResponse.updated_date = new Date()

    await questionResponse.save()

    return res.json({
      exist: true,
      status: 'answered',
      is_correct: isCorrect,
      correct_answer: question.response
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /users
router.post('/', async (req, res) => {
  try {
    const { name, mobileNumber, school_code, school_level = 1, school_class = 1, school_option = 1} = req.body

    if (!mobileNumber || !school_code) {
      return res.status(400).json({
        error: 'mobileNumber and school_code are required'
      })
    }

    const school = await School.findByPk(school_code)
    if (!school) {
      return res.status(400).json({
        error: 'Invalid school_code',
        errorCode: 'INVALID_SCHOOL_CODE'
      })
    }

    const [user, created] = await User.findOrCreate({
      where: { phone_number: mobileNumber },
      defaults: {
        name, 
        school_code,
        school_level,
        school_class,
        school_option
      }
    })
    enqueueSMS(mobileNumber, 'Bienvenue sur notre plateforme de quiz !' , {})
    res.status(created ? 201 : 200).json({
      ...user.toJSON(),
      exist: !created
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Internal server error' })
  }
})


// PUT /users/:phoneNumber
// PUT /users/:phoneNumber
router.put('/:phoneNumber', async (req, res) => {
  try {
    const {
      name,
      email,
      school_code,
      school_level,
      school_class,
      school_option
    } = req.body

    const user = await User.findOne({
      where: { phone_number: req.params.phoneNumber }
    })

    if (!user) {
      return res.status(404).json({ exist: false })
    }

    const updates = {}

    if (name !== undefined) updates.name = name 
    if (school_code !== undefined) updates.school_code = school_code
    if (school_level !== undefined) updates.school_level = school_level
    if (school_class !== undefined) updates.school_class = school_class
    if (school_option !== undefined) updates.school_option = school_option

    await user.update(updates)
    enqueueSMS(mobileNumber, 'Votre profil a ete mis à jour avec succès.', {})
    res.json({
      ...user.toJSON(),
      exist: true
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Internal server error' })
  }
})


module.exports = router
