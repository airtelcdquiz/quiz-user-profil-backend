const express = require('express')
const router = express.Router()
const User = require('../models/User')

// GET /users/:phoneNumber
router.get('/:phoneNumber', async (req, res) => {
  const user = await User.findOne({ where: { phone_number: req.params.phoneNumber } })
  res.json({ exist: !!user, user: user || null })
})

// POST /users
router.post('/', async (req, res) => {
  const { name, phone_number, email } = req.body
  const [user, created] = await User.findOrCreate({
    where: { phone_number },
    defaults: { name, email }
  })
  res.status(created ? 201 : 200).json({ exist: !created, user })
})

// PUT /users/:phoneNumber
router.put('/:phoneNumber', async (req, res) => {
  const { name, email } = req.body
  const user = await User.findOne({ where: { phone_number: req.params.phoneNumber } })
  if (!user) return res.json({ exist: false, user: null })

  await user.update({ name, email })
  res.json({ exist: true, user })
})

module.exports = router
