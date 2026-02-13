const { DataTypes } = require('sequelize')
const sequelize = require('../lib/sequelize')
const crypto = require('crypto')

const PublishedSurvey = sequelize.define('publishedSurvey', {
  userId: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false, unique: false },
  openDateTime: { type: DataTypes.DATE, allowNull: true, unique: false },
  closeDateTime: { type: DataTypes.DATE, allowNull: true, unique: false },
  status: {type: DataTypes.STRING, allowNull: true, unique: false, 
    get() {
      let updatedStatus
      if (Date.now() < this.getDataValue('openDateTime')) {
        updatedStatus = "pending"
      } else if (Date.now() < this.getDataValue('closeDateTime')) {
        updatedStatus = "in-progress"
      } else {
        updatedStatus = "closed"
      }

      this.setDataValue('status', updatedStatus)
      return this.getDataValue('status')
    }
  },
  linkHash: {type: DataTypes.STRING, allowNull: true, unique: false},
  surveyDesign: { type: DataTypes.JSON, allowNull: false, unique: false },
  questions: { type: DataTypes.JSON, allowNull: false, unique: false },
  results: { type: DataTypes.JSON, allowNull: true, unique: false }
}, {
  hooks: {
  afterCreate: async (publishedSurvey, options) => {
    let updatedStatus
    if (Date.now() < publishedSurvey.openDateTime.valueOf()) {
      updatedStatus = "pending"
    } else if (Date.now() < publishedSurvey.closeDateTime.valueOf()) {
      updatedStatus = "in-progress"
    } else {
      updatedStatus = "closed"
    }

    const hash = crypto
      .createHash('sha256')
      .update(String(publishedSurvey.id))
      .digest('hex')

    publishedSurvey.status = updatedStatus
    publishedSurvey.linkHash = hash

    // Save using the SAME transaction as the create
    await publishedSurvey.save({
      transaction: options.transaction,
      hooks: false
    })
  }
}

})

exports.PublishedSurvey = PublishedSurvey

/*
 * Export an array containing the names of fields the client is allowed to set
 * on users.
 */
exports.PublishedSurveyClientFields = [
  'userId',
  'name',
  'openDateTime',
  'closeDateTime',
  'surveyDesign',
  'questions',
  'results'
]