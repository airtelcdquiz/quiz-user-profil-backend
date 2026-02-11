const { DataTypes } = require('sequelize')
const sequelize = require('../db')

const School = sequelize.define('School', {
  code: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  address: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'schools',
  timestamps: false
})

module.exports = School
