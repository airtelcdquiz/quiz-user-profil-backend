const { DataTypes } = require('sequelize')
const sequelize = require('./db')

const DailyQuestionStat = sequelize.define('DailyQuestionStat', {
    question_id: {
        type: DataTypes.INTEGER,
        primaryKey: true
    },
    date: {
        type: DataTypes.DATEONLY,
        primaryKey: true
    },
    send_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    }
}, {
    tableName: 'daily_question_stats',
    timestamps: false
});

module.exports = DailyQuestionStat