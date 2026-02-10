const sequelize = require('./db')
require('dotenv').config()
const app = require('./app')


const PORT = process.env.PORT || 3000

sequelize.sync().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
}).catch(err => {
  console.error('DB connection failed:', err)
})