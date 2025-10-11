const { DataTypes } = require('sequelize')
const sequelize = require('../lib/sequelize')
const bcrypt = require('bcryptjs')
const { Visualization } = require('./Visualization')
const { SurveyDesign } = require('./SurveyDesign')
const { PublishedSurvey } = require('./PublishedSurvey')

const User = sequelize.define('user', {
  name: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { 
    type: DataTypes.STRING, 
    allowNull: false,
    set(value) {
        this.setDataValue('password', bcrypt.hashSync(value, 8))
    }
  }
})

/*
* Set up one-to-many relationship between User and Visualization.
*/
User.hasMany(Visualization, { foreignKey: { allowNull: false } })
Visualization.belongsTo(Visualization)

/*
* Set up one-to-many relationship between User and SurveyDesign.
*/
User.hasMany(SurveyDesign, { foreignKey: { allowNull: false } })
SurveyDesign.belongsTo(User)

/*
* Set up one-to-many relationship between User and PublishedSurvey.
*/
User.hasMany(PublishedSurvey, { foreignKey: { allowNull: false } })
PublishedSurvey.belongsTo(User)

exports.User = User

/*
 * Export an array containing the names of fields the client is allowed to set
 * on users.
 */
exports.UserClientFields = [
  'name',
  'password'
]

/*
 * validate username and password
 */
exports.validateCredentials = async function (name, password) {
    const user = await User.findOne({ where: { name: name }})
    return user && await bcrypt.compare(password, user.password)
}