const db = require('../db')


exports.getUserByPhone = async (req, res) => {
  const { phoneNumber } = req.params

  const { rows } = await db.query(
    'SELECT * FROM users WHERE phone_number = $1 LIMIT 1',
    [phoneNumber]
  )

  if (rows.length === 0) {
    return res.json({
      exist: false,
      user: null,
    })
  }

  return res.json({
    exist: true,
    user: rows[0],
  })
}

exports.getUsers = async (req, res) => {
  const { rows } = await db.query('SELECT * FROM users ORDER BY id')
  res.json(rows)
}

exports.createUser = async (req, res) => {
  const { name, email } = req.body

  const { rows } = await db.query(
    'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
    [name, email]
  )

  res.status(201).json(rows[0])
}
