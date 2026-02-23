const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('./db')

// Import des modèles
const School = require('./School')
const User = require('./User')
const Question = require('./Question')
const QuestionResponse = require('./QuestionResponse')
const DailyQuestionStat = require('./DailyQuestionStat')

// 🔗 Associations
Question.hasMany(DailyQuestionStat, { foreignKey: 'question_id' });
DailyQuestionStat.belongsTo(Question, { foreignKey: 'question_id' });

Question.hasMany(QuestionResponse, { foreignKey: 'question_id' });
QuestionResponse.belongsTo(Question, { foreignKey: 'question_id' });

// Optionnel : export
module.exports = {
    sequelize,
    Sequelize,
    User, 
    School, 
    Question,
    QuestionResponse,
    DailyQuestionStat
};