const { DataTypes } = require('sequelize')
const sequelize = require('../db')

const Question = sequelize.define('Question', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  question: {
    type: DataTypes.STRING(160),
    allowNull: false
  },
  option_1: {
    type: DataTypes.STRING,
    allowNull: false
  },
  option_2: {
    type: DataTypes.STRING,
    allowNull: false
  },
  option_3: {
    type: DataTypes.STRING,
    allowNull: false
  },
  option_4: {
    type: DataTypes.STRING,
    allowNull: false
  },
  response: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 4
    }
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'questions',
  timestamps: false
})

module.exports = Question
