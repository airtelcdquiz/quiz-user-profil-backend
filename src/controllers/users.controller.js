const prisma = require('../db')

exports.getUserByPhone = async (req, res) => {
  const { phoneNumber } = req.params

  const user = await prisma.user.findUnique({
    where: { phone_number: phoneNumber }
  })

  return res.json({
    exist: Boolean(user),
    user: user || null
  })
}


exports.createUser = async (req, res) => {
  const { name, phone_number, email } = req.body

  const existingUser = await prisma.user.findUnique({
    where: { phone_number }
  })

  if (existingUser) {
    return res.status(200).json({ exist: true, user: existingUser })
  }

  const user = await prisma.user.create({
    data: { name, phone_number, email }
  })

  return res.status(201).json({ exist: false, user })
}


exports.updateUserByPhone = async (req, res) => {
  const { phoneNumber } = req.params
  const { name, email } = req.body

  const user = await prisma.user.findUnique({
    where: { phone_number: phoneNumber }
  })

  if (!user) {
    return res.json({ exist: false, user: null })
  }

  const updatedUser = await prisma.user.update({
    where: { phone_number: phoneNumber },
    data: { name, email }
  })

  return res.json({ exist: true, user: updatedUser })
}