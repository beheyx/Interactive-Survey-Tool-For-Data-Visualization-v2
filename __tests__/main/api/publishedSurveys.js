// Use temporary, in-memory db for testing
jest.mock('../../../main/api/lib/sequelize', () => {
    const { Sequelize } = require('sequelize')

    const mockSequelize = new Sequelize('database', 'username', 'password', {
        dialect: 'sqlite',
        storage: ':memory:',
        logging: false
    })

    return mockSequelize
})

// Imports
const request = require('supertest')
const api = require('../../../main/api/server')
const sequelize = require('../../../main/api/lib/sequelize')
const { PublishedSurvey } = require('../../../main/api/model/PublishedSurvey')

// Testing constants
const TEST_USER = { name: "testUser", password: "testPassword", confirm_password: "testPassword" }
const TEST_USER2 = { name: "testUser2", password: "testPassword2", confirm_password: "testPassword2" }
const DESIGN_POST_REQ_BODY = { name: "design" }

// Registers and logs in user with given credentials
async function registerAndLogin(credentials) {
    const registerRes = await request(api).post('/users').send(credentials)
    return { id: registerRes.body.id, token: registerRes.body.token }
}

// Creates a survey design and returns its id
async function createSurveyDesign(token) {
    const res = await request(api).post('/surveyDesigns').set("Authorization", `Bearer ${token}`).send(DESIGN_POST_REQ_BODY)
    return res.body.id
}

// Creates a question in a survey design
async function createQuestion(surveyDesignId, token) {
    const res = await request(api).post(`/surveyDesigns/${surveyDesignId}/questions`).set("Authorization", `Bearer ${token}`)
    return res.body.id
}

// Publishes a survey and returns the published survey id and linkHash
async function publishSurvey(surveyDesignId, token) {
    const publishBody = {
        name: "Published Survey",
        openDateTime: new Date(Date.now() - 1000).toISOString(),
        closeDateTime: new Date(Date.now() + 86400000).toISOString()
    }
    const res = await request(api).post(`/surveyDesigns/${surveyDesignId}/publishedSurveys`).set("Authorization", `Bearer ${token}`).send(publishBody)
    const published = await PublishedSurvey.findOne({ where: { id: res.body.id } })
    return { id: res.body.id, linkHash: published.linkHash }
}

// Before each test, reset test database
beforeEach(async () => {
    await sequelize.sync({ force: true })
})

afterAll(async () => {
    await sequelize.close()
})

describe("GET /publishedSurveys/{id} - get published survey info", () => {
    test("sends appropriate response body and 200 status code", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)
        const designId = await createSurveyDesign(loginDetails.token)
        await createQuestion(designId, loginDetails.token)
        const published = await publishSurvey(designId, loginDetails.token)

        const res = await request(api).get(`/publishedSurveys/${published.id}`).set("Authorization", `Bearer ${loginDetails.token}`)

        expect(res.statusCode).toBe(200)
        expect(res.body).toHaveProperty('id', published.id)
        expect(res.body).toHaveProperty('name', 'Published Survey')
        expect(res.body).toHaveProperty('linkHash')
        expect(res.body).toHaveProperty('openDateTime')
        expect(res.body).toHaveProperty('closeDateTime')
        expect(res.body).toHaveProperty('questions')
    })

    test("sends 404 status code when published survey does not exist", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)

        const res = await request(api).get('/publishedSurveys/999').set("Authorization", `Bearer ${loginDetails.token}`)

        expect(res.statusCode).toBe(404)
        expect(res.body).toHaveProperty('error')
    })

    test("sends 401 status code when logged in as incorrect user", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)
        const designId = await createSurveyDesign(loginDetails.token)
        await createQuestion(designId, loginDetails.token)
        const published = await publishSurvey(designId, loginDetails.token)
        const loginDetails2 = await registerAndLogin(TEST_USER2)

        const res = await request(api).get(`/publishedSurveys/${published.id}`).set("Authorization", `Bearer ${loginDetails2.token}`)

        expect(res.statusCode).toBe(401)
        expect(res.body).toHaveProperty('error')
    })

    test("sends 401 status code when not logged in", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)
        const designId = await createSurveyDesign(loginDetails.token)
        await createQuestion(designId, loginDetails.token)
        const published = await publishSurvey(designId, loginDetails.token)

        const res = await request(api).get(`/publishedSurveys/${published.id}`)

        expect(res.statusCode).toBe(401)
        expect(res.body).toHaveProperty('error')
    })
})

describe("PATCH /publishedSurveys/{id} - update published survey", () => {
    test("updates name and dates, sends 200 status code", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)
        const designId = await createSurveyDesign(loginDetails.token)
        await createQuestion(designId, loginDetails.token)
        const published = await publishSurvey(designId, loginDetails.token)

        const newCloseDate = new Date(Date.now() + 172800000).toISOString()
        const updateBody = {
            name: "Updated Survey Name",
            closeDateTime: newCloseDate
        }

        const res = await request(api).patch(`/publishedSurveys/${published.id}`).set("Authorization", `Bearer ${loginDetails.token}`).send(updateBody)

        expect(res.statusCode).toBe(200)
        const updated = await PublishedSurvey.findOne({ where: { id: published.id } })
        expect(updated.name).toBe("Updated Survey Name")
    })

    test("sends 404 status code when published survey does not exist", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)

        const res = await request(api).patch('/publishedSurveys/999').set("Authorization", `Bearer ${loginDetails.token}`).send({ name: "New Name" })

        expect(res.statusCode).toBe(404)
        expect(res.body).toHaveProperty('error')
    })

    test("sends 401 status code when logged in as incorrect user", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)
        const designId = await createSurveyDesign(loginDetails.token)
        await createQuestion(designId, loginDetails.token)
        const published = await publishSurvey(designId, loginDetails.token)
        const loginDetails2 = await registerAndLogin(TEST_USER2)

        const res = await request(api).patch(`/publishedSurveys/${published.id}`).set("Authorization", `Bearer ${loginDetails2.token}`).send({ name: "New Name" })

        expect(res.statusCode).toBe(401)
        expect(res.body).toHaveProperty('error')
    })

    test("sends 401 status code when not logged in", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)
        const designId = await createSurveyDesign(loginDetails.token)
        await createQuestion(designId, loginDetails.token)
        const published = await publishSurvey(designId, loginDetails.token)

        const res = await request(api).patch(`/publishedSurveys/${published.id}`).send({ name: "New Name" })

        expect(res.statusCode).toBe(401)
        expect(res.body).toHaveProperty('error')
    })
})

describe("DELETE /publishedSurveys/{id} - delete published survey", () => {
    test("removes published survey from database, sends 200 status code", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)
        const designId = await createSurveyDesign(loginDetails.token)
        await createQuestion(designId, loginDetails.token)
        const published = await publishSurvey(designId, loginDetails.token)

        const res = await request(api).delete(`/publishedSurveys/${published.id}`).set("Authorization", `Bearer ${loginDetails.token}`)

        expect(res.statusCode).toBe(200)
        const deleted = await PublishedSurvey.findOne({ where: { id: published.id } })
        expect(deleted).toBeFalsy()
    })

    test("sends 404 status code when published survey does not exist", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)

        const res = await request(api).delete('/publishedSurveys/999').set("Authorization", `Bearer ${loginDetails.token}`)

        expect(res.statusCode).toBe(404)
        expect(res.body).toHaveProperty('error')
    })

    test("sends 401 status code when logged in as incorrect user", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)
        const designId = await createSurveyDesign(loginDetails.token)
        await createQuestion(designId, loginDetails.token)
        const published = await publishSurvey(designId, loginDetails.token)
        const loginDetails2 = await registerAndLogin(TEST_USER2)

        const res = await request(api).delete(`/publishedSurveys/${published.id}`).set("Authorization", `Bearer ${loginDetails2.token}`)

        expect(res.statusCode).toBe(401)
        expect(res.body).toHaveProperty('error')
    })

    test("sends 401 status code when not logged in", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)
        const designId = await createSurveyDesign(loginDetails.token)
        await createQuestion(designId, loginDetails.token)
        const published = await publishSurvey(designId, loginDetails.token)

        const res = await request(api).delete(`/publishedSurveys/${published.id}`)

        expect(res.statusCode).toBe(401)
        expect(res.body).toHaveProperty('error')
    })
})
