const { DataTypes } = require('sequelize')
const sequelize = require('../lib/sequelize')

const Question = sequelize.define('question', {
  number: { type: DataTypes.INTEGER, allowNull: true, unique: false },
  text: { type: DataTypes.TEXT, allowNull: true, unique: false },
  type: { type: DataTypes.STRING, allowNull: true, unique: false },
  required: { type: DataTypes.BOOLEAN, allowNull: true, unique: false },
  allowComment: { type: DataTypes.BOOLEAN, allowNull: true, unique: false },
  commentText: { type: DataTypes.TEXT, allowNull: true, unique: false, defaultValue: null}, //default null value for backwards compatibility
  min: { type: DataTypes.INTEGER, allowNull: true, unique: false },
  max: { type: DataTypes.INTEGER, allowNull: true, unique: false },
  choices: { type: DataTypes.STRING, allowNull: true, unique: false },
  disableZoom: { type: DataTypes.BOOLEAN, allowNull: true, unique: false },
  disablePan: { type: DataTypes.BOOLEAN, allowNull: true, unique: false },
  visualizationContentId: { type: DataTypes.INTEGER, allowNull: true, unique: false },
}, {
  hooks: {
    beforeCreate: (question, options) => {
      // Only set defaults if values aren't already provided
      if (question.min === undefined || question.min === null) question.min = 0
      if (question.max === undefined || question.max === null) question.max = 0
      if (!question.type) question.type = "Multiple Choice"
      if (question.required === undefined || question.required === null) question.required = false
      if (question.allowComment === undefined || question.allowComment === null) question.allowComment = true
    }
  }
})

exports.Question = Question

sequelize
  .sync({ alter: true })
  .then(() => {
    console.log("Database synced");
  })
  .catch((err) => {
    console.error("Error syncing database:", err);
  });

/*
 * Export an array containing the names of fields the client is allowed to set
 * on users.
 */
exports.QuestionClientFields = [
  'questionId',
  'number',
  'text',
  'type',
  'required',
  'allowComment',
  'commentText',
  'min',
  'max',
  'choices',
  'disableZoom',
  'disablePan',
  'visualizationContentId'
]