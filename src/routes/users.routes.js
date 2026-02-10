const express = require('express')
const router = express.Router()
const controller = require('../controllers/users.controller')

router.post('/', controller.createUser)
router.get('/:phoneNumber', controller.getUserByPhone)
router.post('/:phoneNumber', controller.updateUserByPhone)

module.exports = router
