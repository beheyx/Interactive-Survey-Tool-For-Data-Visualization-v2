const { DataTypes } = require('sequelize')
const sequelize = require('../lib/sequelize')

const Question = sequelize.define('question', {
  number: { type: DataTypes.INTEGER, allowNull: true, unique: false },
  text: { type: DataTypes.TEXT, allowNull: true, unique: false },
  type: { type: DataTypes.STRING, allowNull: true, unique: false },
  required: { type: DataTypes.BOOLEAN, allowNull: true, unique: false },
  allowComment: { type: DataTypes.BOOLEAN, allowNull: true, unique: false },
  min: { type: DataTypes.INTEGER, allowNull: true, unique: false },
  max: { type: DataTypes.INTEGER, allowNull: true, unique: false },
  choices: { type: DataTypes.STRING, allowNull: true, unique: false },
  disableZoom: { type: DataTypes.BOOLEAN, allowNull: true, unique: false },
  disablePan: { type: DataTypes.BOOLEAN, allowNull: true, unique: false },
  visualizationContentId: { type: DataTypes.INTEGER, allowNull: true, unique: false },
}, {
  hooks: {
    beforeCreate: (question, options) => {
      question.min = 0
      question.max = 0
      question.type = "Multiple Choice"
      question.required = false
      question.allowComment = true
    }
  }
})

exports.Question = Question

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
  'min',
  'max',
  'choices',
  'disableZoom',
  'disablePan',
  'visualizationContentId'
]