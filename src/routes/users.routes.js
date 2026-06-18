const express = require('express')
const router = express.Router()
const { Op } = require('sequelize')
const { pushQuestionToUser } = require('../lib/questionDistributionOptimized')

const { User, Question,QuestionResponse, School, UserHistory, sequelize }  = require('../models')
const { enqueueBulkSMS } = require('../lib/smsQueue') 

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
        phone_number: user.phone_number, 
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


// POST /users/:mobileNumber/unsubscribe
router.post('/:mobileNumber/unsubscribe', async (req, res) => {
  const t = await sequelize.transaction()
  try {
    const user = await User.findOne({
      where: { phone_number: req.params.mobileNumber },
      transaction: t
    })

    if (!user) {
      await t.rollback()
      return res.status(404).json({ exist: false })
    }

    const responses = await QuestionResponse.findAll({
      where: { phone_number: user.phone_number },
      transaction: t
    })

    // 🗄️ Archivage avant suppression définitive (audit)
    await UserHistory.create({
      phone_number: user.phone_number,
      action: 'unsubscribe',
      data: {
        user: user.toJSON(),
        responses: responses.map(r => r.toJSON())
      }
    }, { transaction: t })

    await QuestionResponse.destroy({
      where: { phone_number: user.phone_number },
      transaction: t
    })

    await user.destroy({ transaction: t })

    await t.commit()

    return res.json({
      exist: true,
      deleted: true
    })

  } catch (error) {
    await t.rollback()
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
        phone_number: user.phone_number,  // ⚠️ assure-toi que phone_number = phone_number
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
        phone_number: user.phone_number, // ⚠️ idealement user.id
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
      enqueueBulkSMS(mobileNumber, [
        `Merci cher(e) ${user.name}. FELICITATION ! Vous avez fourni la bonne reponse. Verifiez votre score cumule en tapant *4405# puis option 1.`
      ] , {})
    }else{
      console.log('Desole, la reponse fourni est incorrecte. Vous ferez mieux à la prochaine question !')
      enqueueBulkSMS(mobileNumber, [
        `Merci cher(e) ${user.name}. DESOLE ! Vous avez fourni une mauvaise reponse. \nVerifiez votre score cumule en tapant *4405# puis option 1.`
      ] , {})
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


// GET /users/:phoneNumber/score
router.get('/:phoneNumber/score', async (req, res) => {
  
  try {
    const user = await User.findOne({
      where: { phone_number: req.params.phoneNumber }
    })

    console.log(`${req.params.phoneNumber} veut verifier son score ...`) 

    if (!user) {
      console.log(`${req.params.phoneNumber} not found `) 
      return res.status(404).json({ exist: false })
    }

    // 📊 Statistiques globales
    const totalAnswers = await QuestionResponse.count({
      where: {
        phone_number: user.phone_number,
        choice: { [Op.ne]: null }
      }
    })

    const correctAnswers = await QuestionResponse.count({
      where: {
        phone_number: user.phone_number,
        is_correct: true
      }
    })

    const totalScore = correctAnswers * 10

    // 📅 Score du jour
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)

    const todayCorrect = await QuestionResponse.count({
      where: {
        phone_number: user.phone_number,
        is_correct: true,
        created_date: {
          [Op.between]: [startOfDay, endOfDay]
        }
      }
    })

    console.log(`Cher(e)s ${user.name}\nVoici votre score du jour : ${todayCorrect * 10}\nTotal de score : ${totalScore}`) 
    enqueueBulkSMS(user.phone_number,[
       `Cher(e)s ${user.name}\nVoici votre score du jour : ${todayCorrect * 10}\nTotal de score : ${totalScore}`
    ]);

    return res.json({
      exist: true,
      phone_number: user.phone_number,
      name: user.name,
      stats: {
        total_answers: totalAnswers,
        correct_answers: correctAnswers,
        wrong_answers: totalAnswers - correctAnswers,
        total_score: totalScore,
        today_score: todayCorrect * 10
      }
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
        school_option,
        is_subscribed: true
      }
    })

    if (!created && user.is_subscribed === false) {
      await user.update({ is_subscribed: true })
    }

    /**
     * Envoi du message de bienvenue et envoie de la question de bienvenue.
     */
    const today = new Date().toISOString().split('T')[0];

    // Vérifier si job déjà exécuté aujourd'hui
    const alreadyExecuted = await sequelize.query(`
      SELECT 1 FROM daily_job_logs
      WHERE job_name = 'daily_question_job'
      AND date = :today
    `, {
      replacements: { today },
      type: sequelize.QueryTypes.SELECT
    });

    console.log(`${user.phone_number} [${user.name}] : Saved !`)
    if (alreadyExecuted.length > 0) {
      console.log("✅ Job déjà exécuté aujourd'hui");
      pushQuestionToUser(user, [
        `Cher(e) ${name}, Felicitations, votre enregistrement a reussi. Airtel Quiz *4405#!`
      ]); 
    }else{
      console.log(`Wait for daily question...`)
      enqueueBulkSMS(user.phone_number, [
         `Cher(e) ${name}, Felicitations, votre enregistrement a reussi. Airtel Quiz *4405#!`
      ]);
    }

    
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
    enqueueBulkSMS(mobileNumber, [
      'Votre profil a ete mis à jour avec succès.'
    ], {})
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
