// use temporary, in-memory db for testing
jest.mock('../../../main/api/lib/sequelize', () => {
    const { Sequelize } = require('sequelize')

    const mockSequelize = new Sequelize('database', 'username', 'password', {
        dialect: 'sqlite',
        storage: ':memory:',
        logging: false
    })

    return mockSequelize
})

// imports
const request = require('supertest')
const api = require('../../../main/api/server')
const sequelize = require('../../../main/api/lib/sequelize')
const { User } = require('../../../main/api/model/User')

// testing constants
const TEST_USER = { name:"testUser", password:"testPassword", confirm_password:"testPassword" }

// registers and logs in user with given credentials, returns details relevant for testing
async function registerAndLogin(credentials) {
    const registerRes = await request(api).post('/users').send(credentials)
    const myId = registerRes.body.id
    const token = registerRes.body.token
    return {id: myId, token: token}
}

// before each test, reset test database
beforeEach(async () => {
    await sequelize.sync({ force: true })
})
  
afterAll(async () => {
    await sequelize.close()
})

describe("POST /users - registers user", () => {
    test("creates a new user in database, sends 201 status code and id", async () => {
        const res = await request(api).post('/users').send(TEST_USER)    

        expect(res.statusCode).toBe(201)
        expect(res.body).toHaveProperty('id')
        const newUser = await User.findOne({ where: {name:TEST_USER.name} })
        expect(newUser).toBeTruthy()
    })
    
    test("sends 400 status code and error on invalid input", async () => {
        const res = await request(api).post('/users').send({ })

        expect(res.statusCode).toBe(400)
        expect(res.body).toHaveProperty('error')
    })
})

describe("POST /users/login - logs user in", () => {
    test("sends 200 status code and token", async () => {
        await request(api).post('/users').send(TEST_USER)

        const loginCredentials = { name: TEST_USER.name, password: TEST_USER.password }
        const res = await request(api).post('/users/login').send(loginCredentials)

        expect(res.statusCode).toBe(200)
        expect(res.body).toHaveProperty('token')
    })

    test("sends 401 status code and error on bad credentials", async () => {
        const res = await request(api).post('/users/login').send({ name:"", password:"" })

        expect(res.statusCode).toBe(401)
        expect(res.body).toHaveProperty('error')
    })
})

describe("GET /users - get user info", () => {
    test("sends name, id, and 200 status code", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)

        const res = await request(api).get('/users').set("Authorization", `Bearer ${loginDetails.token}`)

        expect(res.statusCode).toBe(200)
        expect(res.body).toHaveProperty('name', TEST_USER.name)
        expect(res.body).toHaveProperty('id')
    })

    test("sends 401 status code and error when not logged in", async () => {
        const res = await request(api).get('/users')

        expect(res.statusCode).toBe(401)
        expect(res.body).toHaveProperty('error')
    })
})

describe("POST /users/logout - logs user out", () => {
    test("sends 200 status code and returns null token", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)

        const logoutRes = await request(api).post('/users/logout').set("Authorization", `Bearer ${loginDetails.token}`)

        expect(logoutRes.statusCode).toBe(200)
        expect(logoutRes.body.token).toBeNull()
    })
})