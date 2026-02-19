const { DataTypes } = require('sequelize')
const sequelize = require('../db')

const QuestionResponse = sequelize.define('QuestionResponse', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  question_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  user_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  choice: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 4
    }
  },
  is_correct: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  already_read: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  created_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  updated_date: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'question_responses',
  timestamps: false
})

module.exports = QuestionResponse
