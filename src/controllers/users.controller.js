const db = require('../db')

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
