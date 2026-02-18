const express = require('express')
const router = express.Router()
const User = require('../models/User')
const { enqueueSMS } = require('../lib/smsQueue')

// GET /users/:phoneNumber
router.get('/:phoneNumber', async (req, res) => {
  const user = await User.findOne({ where: { phone_number: req.params.phoneNumber } })
  user ? res.json({ ...user.toJSON(), exist: true }) : 
  res.json({ exist: false})
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
      where: { phone_number: req.params.mobileNumber }
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
    enqueueSMS(mobileNumber, 'Votre profil a été mis à jour avec succès.', {})
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
