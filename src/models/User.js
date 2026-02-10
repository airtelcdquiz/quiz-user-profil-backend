const { DataTypes } = require('sequelize')
const sequelize = require('../db')

const User = sequelize.define('User', { 
  name: { type: DataTypes.STRING, allowNull: true },
  phone_number: { type: DataTypes.STRING, primaryKey: true, unique: true, allowNull: false }
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
})

module.exports = User
