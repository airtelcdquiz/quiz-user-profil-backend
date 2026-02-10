const { Pool } = require('pg')

const pool = new Pool({
  host: "ussd-postgres",
  port: 5432,
  database: "ussd",
  user: "ussd",
  password: "ussd",
})

pool.on('connect', () => {
  console.log('✅ Connecté à PostgreSQL')
})

module.exports = pool
