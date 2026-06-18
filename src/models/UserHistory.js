const { DataTypes } = require('sequelize')
const sequelize = require('./db')

const UserHistory = sequelize.define('UserHistory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  phone_number: {
    type: DataTypes.STRING,
    allowNull: false
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false
  },
  data: {
    type: DataTypes.JSONB,
    allowNull: true
  }
}, {
  tableName: 'user_history',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
})

module.exports = UserHistory
