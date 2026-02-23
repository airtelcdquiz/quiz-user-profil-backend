const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('./db')

// Import des modèles
const School = require('./School')(sequelize, DataTypes);
const User = require('./User')(sequelize, DataTypes);
const Question = require('./Question')(sequelize, DataTypes);
const QuestionResponse = require('./QuestionResponse')(sequelize, DataTypes);
const DailyQuestionStat = require('./DailyQuestionStat')(sequelize, DataTypes);

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