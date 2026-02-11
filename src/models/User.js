const { DataTypes } = require('sequelize')
const sequelize = require('../db')
const School = require('./School')

const User = sequelize.define('User', { 
  name: { type: DataTypes.STRING, allowNull: true },
  phone_number: { type: DataTypes.STRING, primaryKey: true, unique: true, allowNull: false },
  school_code: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: School,
      key: 'code'
    }
  },

  school_level: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },

  school_class: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },

  school_option: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  }


}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
})

/* 🔗 Associations */
User.belongsTo(School, {
  foreignKey: 'school_code',
  targetKey: 'code'
})

School.hasMany(User, {
  foreignKey: 'school_code',
  sourceKey: 'code'
})


module.exports = User
