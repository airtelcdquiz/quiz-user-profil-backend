const express = require('express')
const router = express.Router()
const controller = require('../controllers/users.controller')

router.get('/', controller.getUsers)
router.post('/', controller.createUser)
router.get('/:phoneNumber', controller.getUserByPhone)

module.exports = router
