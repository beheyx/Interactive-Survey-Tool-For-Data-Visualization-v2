const { DataTypes } = require('sequelize')
const sequelize = require('../lib/sequelize')

const Visualization = sequelize.define('visualization', {
  // LONGTEXT (4GB) to support large SVG files
  svg: { type: DataTypes.TEXT('long'), allowNull: true }
})

exports.Visualization = Visualization

/*
 * Export an array containing the names of fields the client is allowed to set
 * on visualizations.
 */
exports.VisualClientFields = [
  'svg'
]