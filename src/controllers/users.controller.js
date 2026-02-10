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
  const { name, phone_number, email } = req.body

  if (!phone_number) {
    return res.status(400).json({
      error: 'phone_number is required',
    })
  }

  try {
    // 1️⃣ Vérifier si le user existe déjà
    const existingUser = await db.query(
      'SELECT * FROM users WHERE phone_number = $1 LIMIT 1',
      [phone_number]
    )

    if (existingUser.rows.length > 0) {
      return res.status(200).json({
        exist: true,
        user: existingUser.rows[0],
      })
    }

    // 2️⃣ Créer le user
    const { rows } = await db.query(
      `INSERT INTO users (name, phone_number, email)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name || null, phone_number, email || null]
    )

    return res.status(201).json({
      exist: false,
      user: rows[0],
    })
  } catch (err) {
    console.error(err)

    return res.status(500).json({
      error: 'internal_server_error',
    })
  }
}