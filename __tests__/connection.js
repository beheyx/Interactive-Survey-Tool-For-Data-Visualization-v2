// use temporary, in-memory db for testing (main)
jest.mock('../main/api/lib/sequelize', () => {
    const { Sequelize } = require('sequelize')

    const mockSequelize = new Sequelize('database', 'username', 'password', {
        dialect: 'sqlite',
        storage: ':memory:',
        logging: false
    })

    return mockSequelize
})

// use temporary, in-memory db for testing (visualization)
jest.mock('../visualization/api/lib/sequelize', () => {
    const { Sequelize } = require('sequelize')

    const mockSequelize = new Sequelize('database', 'username', 'password', {
        dialect: 'sqlite',
        storage: ':memory:',
        logging: false
    })

    return mockSequelize
})

const request = require('supertest')
const sequelizeMain = require('../main/api/lib/sequelize')
const sequelizeVisual = require('../visualization/api/lib/sequelize')
const mainApi = require('../main/api/server')
const visualApi = require('../visualization/api/server')

beforeAll(async () => {
    await sequelizeMain.sync({ force: true })

    // suppress SQLite warning about TEXT('long') — SQLite uses plain TEXT regardless
    const originalWarn = console.warn
    console.warn = jest.fn()
    await sequelizeVisual.sync({ force: true })
    console.warn = originalWarn
})

afterAll(async () => {
    await sequelizeMain.close()
    await sequelizeVisual.close()
})

test("successful connection to main API server", async () => {
    const res = await request(mainApi).get('/')

    // server responds (any status code means it's connected)
    expect(res.status).toBeDefined()
})

test("successful connection to main database", async () => {
    let unsuccessfulConnection = false

    try {
        await sequelizeMain.authenticate()
    } catch (error) {
        unsuccessfulConnection = true
    }

    expect(unsuccessfulConnection).toBeFalsy()
})

test("successful connection to visualization engine API server", async () => {
    const res = await request(visualApi).get('/')

    // server responds (any status code means it's connected)
    expect(res.status).toBeDefined()
})

test("successful connection to visualization engine database", async () => {
    let unsuccessfulConnection = false

    try {
        await sequelizeVisual.authenticate()
    } catch (error) {
        unsuccessfulConnection = true
    }

    expect(unsuccessfulConnection).toBeFalsy()
})