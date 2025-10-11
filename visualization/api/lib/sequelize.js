const { Sequelize } = require('sequelize')
const sequelize = new Sequelize({
  dialect: 'mysql',
  logging: false,
  host: process.env.MYSQL_HOST_VE || 'localhost',
  port: process.env.MYSQL_PORT_VE || 3308,
  database: process.env.MYSQL_DATABASE_VE,
  username: process.env.MYSQL_USER_VE,
  password: process.env.MYSQL_PASSWORD_VE || process.env.MYSQL_PASSWORD
})

module.exports = sequelize
