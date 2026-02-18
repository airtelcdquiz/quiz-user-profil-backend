const express = require('express')
const router = express.Router()
const School = require('../models/School')

// GET /school/:code
router.get('/:code', async (req, res) => {
  const school = await School.findOne({ where: { code: req.params.code } })
  school ? res.json({ ...school.toJSON(), exist: true }) : 
  res.json({ exist: false})
})