const { DataTypes, ValidationError } = require('sequelize')
const sequelize = require('../lib/sequelize')

const Visualization = sequelize.define('visualization', {
  name: { type: DataTypes.STRING, allowNull: false, unique: false },
  contentId: { type: DataTypes.INTEGER, allowNull: false, unique: false } // this is the ID of the corresponding visualization from the visualization engine database
})

exports.Visualization = Visualization

/*
 * Export an array containing the names of fields the client is allowed to set
 * on visualizations.
 */
exports.VisualClientFields = [
  'userId',
  'name',
  'contentId'
]