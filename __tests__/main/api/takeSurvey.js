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
async function createQuestion(surveyDesignId, token, questionData = {}) {
    const res = await request(api).post(`/surveyDesigns/${surveyDesignId}/questions`).set("Authorization", `Bearer ${token}`)
    if (Object.keys(questionData).length > 0) {
        await request(api).patch(`/questions/${res.body.id}`).set("Authorization", `Bearer ${token}`).send(questionData)
    }
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

describe("GET /takeSurvey/{hash} - get survey for participant", () => {
    test("sends survey data with questions and 200 status code", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)
        const designId = await createSurveyDesign(loginDetails.token)
        await createQuestion(designId, loginDetails.token, { text: "Question 1", type: "Multiple Choice" })
        await createQuestion(designId, loginDetails.token, { text: "Question 2", type: "Radio Choice" })
        const published = await publishSurvey(designId, loginDetails.token)

        const res = await request(api).get(`/takeSurvey/${published.linkHash}`)

        expect(res.statusCode).toBe(200)
        expect(res.body).toHaveProperty('id', published.id)
        expect(res.body).toHaveProperty('name', 'Published Survey')
        expect(res.body).toHaveProperty('questions')
        expect(res.body.questions).toHaveLength(2)
        expect(res.body.questions[0]).toHaveProperty('number', 1)
        expect(res.body.questions[1]).toHaveProperty('number', 2)
    })

    test("does not require authentication", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)
        const designId = await createSurveyDesign(loginDetails.token)
        await createQuestion(designId, loginDetails.token)
        const published = await publishSurvey(designId, loginDetails.token)

        const res = await request(api).get(`/takeSurvey/${published.linkHash}`)

        expect(res.statusCode).toBe(200)
        expect(res.body).toHaveProperty('id')
    })

    test("sends 404 status code when hash does not exist", async () => {
        const res = await request(api).get('/takeSurvey/nonexistenthash123')

        expect(res.statusCode).toBe(404)
        expect(res.body).toHaveProperty('error')
    })

    test("returns questions sorted by number", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)
        const designId = await createSurveyDesign(loginDetails.token)
        await createQuestion(designId, loginDetails.token, { text: "First question" })
        await createQuestion(designId, loginDetails.token, { text: "Second question" })
        await createQuestion(designId, loginDetails.token, { text: "Third question" })
        const published = await publishSurvey(designId, loginDetails.token)

        const res = await request(api).get(`/takeSurvey/${published.linkHash}`)

        expect(res.statusCode).toBe(200)
        expect(res.body.questions[0].number).toBe(1)
        expect(res.body.questions[1].number).toBe(2)
        expect(res.body.questions[2].number).toBe(3)
    })
})

describe("PATCH /takeSurvey/{hash} - submit survey answers", () => {
    test("stores participant answers and sends 200 status code", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)
        const designId = await createSurveyDesign(loginDetails.token)
        await createQuestion(designId, loginDetails.token, { text: "What is your favorite color?" })
        const published = await publishSurvey(designId, loginDetails.token)

        const answers = [{ questionId: 1, answer: "Blue" }]
        const res = await request(api).patch(`/takeSurvey/${published.linkHash}`).send({ answers })

        expect(res.statusCode).toBe(200)
        const updatedSurvey = await PublishedSurvey.findOne({ where: { id: published.id } })
        expect(updatedSurvey.results).toBeTruthy()
        expect(updatedSurvey.results.participants).toHaveLength(1)
        expect(updatedSurvey.results.participants[0].answers).toEqual(answers)
    })

    test("assigns incremental participant IDs", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)
        const designId = await createSurveyDesign(loginDetails.token)
        await createQuestion(designId, loginDetails.token)
        const published = await publishSurvey(designId, loginDetails.token)

        await request(api).patch(`/takeSurvey/${published.linkHash}`).send({ answers: [{ questionId: 1, answer: "A" }] })
        await request(api).patch(`/takeSurvey/${published.linkHash}`).send({ answers: [{ questionId: 1, answer: "B" }] })
        await request(api).patch(`/takeSurvey/${published.linkHash}`).send({ answers: [{ questionId: 1, answer: "C" }] })

        const updatedSurvey = await PublishedSurvey.findOne({ where: { id: published.id } })
        expect(updatedSurvey.results.participants).toHaveLength(3)
        expect(updatedSurvey.results.participants[0].participantId).toBe(0)
        expect(updatedSurvey.results.participants[1].participantId).toBe(1)
        expect(updatedSurvey.results.participants[2].participantId).toBe(2)
    })

    test("does not require authentication", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)
        const designId = await createSurveyDesign(loginDetails.token)
        await createQuestion(designId, loginDetails.token)
        const published = await publishSurvey(designId, loginDetails.token)

        const res = await request(api).patch(`/takeSurvey/${published.linkHash}`).send({ answers: [] })

        expect(res.statusCode).toBe(200)
    })

    test("sends 404 status code when hash does not exist", async () => {
        const res = await request(api).patch('/takeSurvey/nonexistenthash123').send({ answers: [] })

        expect(res.statusCode).toBe(404)
        expect(res.body).toHaveProperty('error')
    })

    test("updates published survey updatedAt timestamp", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)
        const designId = await createSurveyDesign(loginDetails.token)
        await createQuestion(designId, loginDetails.token)
        const published = await publishSurvey(designId, loginDetails.token)
        const surveyBefore = await PublishedSurvey.findOne({ where: { id: published.id } })
        const updatedAtBefore = surveyBefore.updatedAt

        await new Promise(resolve => setTimeout(resolve, 100))

        await request(api).patch(`/takeSurvey/${published.linkHash}`).send({ answers: [{ questionId: 1, answer: "Test" }] })

        const surveyAfter = await PublishedSurvey.findOne({ where: { id: published.id } })
        expect(surveyAfter.updatedAt.getTime()).toBeGreaterThan(updatedAtBefore.getTime())
    })

    test("handles multiple answers per submission", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)
        const designId = await createSurveyDesign(loginDetails.token)
        await createQuestion(designId, loginDetails.token, { text: "Question 1" })
        await createQuestion(designId, loginDetails.token, { text: "Question 2" })
        await createQuestion(designId, loginDetails.token, { text: "Question 3" })
        const published = await publishSurvey(designId, loginDetails.token)

        const answers = [
            { questionId: 1, answer: "Answer 1" },
            { questionId: 2, answer: "Answer 2" },
            { questionId: 3, answer: "Answer 3" }
        ]
        const res = await request(api).patch(`/takeSurvey/${published.linkHash}`).send({ answers })

        expect(res.statusCode).toBe(200)
        const updatedSurvey = await PublishedSurvey.findOne({ where: { id: published.id } })
        expect(updatedSurvey.results.participants[0].answers).toHaveLength(3)
    })
})
