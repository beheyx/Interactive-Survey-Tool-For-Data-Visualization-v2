const { Sequelize } = require('sequelize')
const sequelize = new Sequelize({
  dialect: 'mysql',
  logging: false,
  host: process.env.MYSQL_HOST || 'localhost',
  port: process.env.MYSQL_PORT || 3306,
  database: process.env.MYSQL_DATABASE,
  username: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD
})

module.exports = sequelize
