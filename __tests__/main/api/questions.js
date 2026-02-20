// Mock axios before importing anything that uses it
jest.mock('axios', () => ({
    create: jest.fn(() => ({
        get: jest.fn().mockResolvedValue({ data: { svg: '<svg></svg>' } }),
        post: jest.fn().mockResolvedValue({ data: { id: 999 } }),
        put: jest.fn().mockResolvedValue({ data: {} }),
        delete: jest.fn().mockResolvedValue({ data: {} })
    }))
}))

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
const { Question } = require('../../../main/api/model/Question')
const { SurveyDesign } = require('../../../main/api/model/SurveyDesign')

// Testing constants
const TEST_USER = { name: "testUser", password: "testPassword", confirm_password: "testPassword" }
const TEST_USER2 = { name: "testUser2", password: "testPassword2", confirm_password: "testPassword2" }
const DESIGN_POST_REQ_BODY = { name: "design" }
const QUESTION_PATCH_REQ_BODY = { text: "What is your favorite color?", type: "Radio Choice", required: true }

// Registers and logs in user with given credentials, returns details relevant for testing
async function registerAndLogin(credentials) {
    const registerRes = await request(api).post('/users').send(credentials)
    const myId = registerRes.body.id
    const token = registerRes.body.token
    return { id: myId, token: token }
}

// Creates a survey design and returns its id
async function createSurveyDesign(token) {
    const res = await request(api).post('/surveyDesigns').set("Authorization", `Bearer ${token}`).send(DESIGN_POST_REQ_BODY)
    return res.body.id
}

// Creates a question in a survey design and returns its id
async function createQuestion(surveyDesignId, token) {
    const res = await request(api).post(`/surveyDesigns/${surveyDesignId}/questions`).set("Authorization", `Bearer ${token}`)
    return res.body.id
}

// Before each test, reset test database
beforeEach(async () => {
    await sequelize.sync({ force: true })
})

afterAll(async () => {
    await sequelize.close()
})

describe("GET /questions/{id} - get question info", () => {
    test("sends appropriate response body and 200 status code", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)
        const designId = await createSurveyDesign(loginDetails.token)
        const questionId = await createQuestion(designId, loginDetails.token)

        const res = await request(api).get(`/questions/${questionId}`).set("Authorization", `Bearer ${loginDetails.token}`)

        expect(res.statusCode).toBe(200)
        expect(res.body).toHaveProperty('id', questionId)
        expect(res.body).toHaveProperty('surveyDesignId', designId)
        expect(res.body).toHaveProperty('number', 1)
        expect(res.body).toHaveProperty('type')
    })

    test("sends 404 status code when question does not exist", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)

        const res = await request(api).get('/questions/999').set("Authorization", `Bearer ${loginDetails.token}`)

        expect(res.statusCode).toBe(404)
        expect(res.body).toHaveProperty('error')
    })

    test("sends 401 status code when logged in as incorrect user", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)
        const designId = await createSurveyDesign(loginDetails.token)
        const questionId = await createQuestion(designId, loginDetails.token)
        const loginDetails2 = await registerAndLogin(TEST_USER2)

        const res = await request(api).get(`/questions/${questionId}`).set("Authorization", `Bearer ${loginDetails2.token}`)

        expect(res.statusCode).toBe(401)
        expect(res.body).toHaveProperty('error')
    })

    test("sends 401 status code when not logged in", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)
        const designId = await createSurveyDesign(loginDetails.token)
        const questionId = await createQuestion(designId, loginDetails.token)

        const res = await request(api).get(`/questions/${questionId}`)

        expect(res.statusCode).toBe(401)
        expect(res.body).toHaveProperty('error')
    })
})

describe("DELETE /questions/{id} - delete question", () => {
    test("removes question from database, sends 200 status code", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)
        const designId = await createSurveyDesign(loginDetails.token)
        const questionId = await createQuestion(designId, loginDetails.token)

        const res = await request(api).delete(`/questions/${questionId}`).set("Authorization", `Bearer ${loginDetails.token}`)

        expect(res.statusCode).toBe(200)
        const deletedQuestion = await Question.findOne({ where: { id: questionId } })
        expect(deletedQuestion).toBeFalsy()
    })

    test("renumbers remaining questions after deletion", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)
        const designId = await createSurveyDesign(loginDetails.token)
        const q1Id = await createQuestion(designId, loginDetails.token)
        const q2Id = await createQuestion(designId, loginDetails.token)
        const q3Id = await createQuestion(designId, loginDetails.token)

        // Delete middle question
        await request(api).delete(`/questions/${q2Id}`).set("Authorization", `Bearer ${loginDetails.token}`)

        const q1 = await Question.findOne({ where: { id: q1Id } })
        const q3 = await Question.findOne({ where: { id: q3Id } })
        expect(q1.number).toBe(1)
        expect(q3.number).toBe(2)
    })

    test("sends 404 status code when question does not exist", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)

        const res = await request(api).delete('/questions/999').set("Authorization", `Bearer ${loginDetails.token}`)

        expect(res.statusCode).toBe(404)
        expect(res.body).toHaveProperty('error')
    })

    test("sends 401 status code when logged in as incorrect user", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)
        const designId = await createSurveyDesign(loginDetails.token)
        const questionId = await createQuestion(designId, loginDetails.token)
        const loginDetails2 = await registerAndLogin(TEST_USER2)

        const res = await request(api).delete(`/questions/${questionId}`).set("Authorization", `Bearer ${loginDetails2.token}`)

        expect(res.statusCode).toBe(401)
        expect(res.body).toHaveProperty('error')
    })
})

describe("PATCH /questions/{id} - update question", () => {
    test("updates question fields, sends 200 status code", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)
        const designId = await createSurveyDesign(loginDetails.token)
        const questionId = await createQuestion(designId, loginDetails.token)

        const res = await request(api).patch(`/questions/${questionId}`).set("Authorization", `Bearer ${loginDetails.token}`).send(QUESTION_PATCH_REQ_BODY)

        expect(res.statusCode).toBe(200)
        const updatedQuestion = await Question.findOne({ where: { id: questionId } })
        expect(updatedQuestion.text).toBe(QUESTION_PATCH_REQ_BODY.text)
        expect(updatedQuestion.type).toBe(QUESTION_PATCH_REQ_BODY.type)
        expect(updatedQuestion.required).toBe(true)
    })

    test("updates survey design updatedAt timestamp", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)
        const designId = await createSurveyDesign(loginDetails.token)
        const questionId = await createQuestion(designId, loginDetails.token)
        const designBefore = await SurveyDesign.findOne({ where: { id: designId } })
        const updatedAtBefore = designBefore.updatedAt

        await new Promise(resolve => setTimeout(resolve, 100))

        await request(api).patch(`/questions/${questionId}`).set("Authorization", `Bearer ${loginDetails.token}`).send(QUESTION_PATCH_REQ_BODY)

        const designAfter = await SurveyDesign.findOne({ where: { id: designId } })
        expect(designAfter.updatedAt.getTime()).toBeGreaterThan(updatedAtBefore.getTime())
    })

    test("sends 404 status code when question does not exist", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)

        const res = await request(api).patch('/questions/999').set("Authorization", `Bearer ${loginDetails.token}`).send(QUESTION_PATCH_REQ_BODY)

        expect(res.statusCode).toBe(404)
        expect(res.body).toHaveProperty('error')
    })

    test("sends 401 status code when logged in as incorrect user", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)
        const designId = await createSurveyDesign(loginDetails.token)
        const questionId = await createQuestion(designId, loginDetails.token)
        const loginDetails2 = await registerAndLogin(TEST_USER2)

        const res = await request(api).patch(`/questions/${questionId}`).set("Authorization", `Bearer ${loginDetails2.token}`).send(QUESTION_PATCH_REQ_BODY)

        expect(res.statusCode).toBe(401)
        expect(res.body).toHaveProperty('error')
    })
})

describe("POST /questions/{id}/moveUp - move question up", () => {
    test("swaps question with previous question, sends 200 status code", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)
        const designId = await createSurveyDesign(loginDetails.token)
        const q1Id = await createQuestion(designId, loginDetails.token)
        const q2Id = await createQuestion(designId, loginDetails.token)

        const res = await request(api).post(`/questions/${q2Id}/moveUp`).set("Authorization", `Bearer ${loginDetails.token}`)

        expect(res.statusCode).toBe(200)
        const q1 = await Question.findOne({ where: { id: q1Id } })
        const q2 = await Question.findOne({ where: { id: q2Id } })
        expect(q1.number).toBe(2)
        expect(q2.number).toBe(1)
    })

    test("does nothing when question is already first, sends 200 status code", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)
        const designId = await createSurveyDesign(loginDetails.token)
        const q1Id = await createQuestion(designId, loginDetails.token)
        await createQuestion(designId, loginDetails.token)

        const res = await request(api).post(`/questions/${q1Id}/moveUp`).set("Authorization", `Bearer ${loginDetails.token}`)

        expect(res.statusCode).toBe(200)
        const q1 = await Question.findOne({ where: { id: q1Id } })
        expect(q1.number).toBe(1)
    })

    test("sends 404 status code when question does not exist", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)

        const res = await request(api).post('/questions/999/moveUp').set("Authorization", `Bearer ${loginDetails.token}`)

        expect(res.statusCode).toBe(404)
        expect(res.body).toHaveProperty('error')
    })

    test("sends 401 status code when logged in as incorrect user", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)
        const designId = await createSurveyDesign(loginDetails.token)
        await createQuestion(designId, loginDetails.token)
        const q2Id = await createQuestion(designId, loginDetails.token)
        const loginDetails2 = await registerAndLogin(TEST_USER2)

        const res = await request(api).post(`/questions/${q2Id}/moveUp`).set("Authorization", `Bearer ${loginDetails2.token}`)

        expect(res.statusCode).toBe(401)
        expect(res.body).toHaveProperty('error')
    })
})

describe("POST /questions/{id}/moveDown - move question down", () => {
    test("swaps question with next question, sends 200 status code", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)
        const designId = await createSurveyDesign(loginDetails.token)
        const q1Id = await createQuestion(designId, loginDetails.token)
        const q2Id = await createQuestion(designId, loginDetails.token)

        const res = await request(api).post(`/questions/${q1Id}/moveDown`).set("Authorization", `Bearer ${loginDetails.token}`)

        expect(res.statusCode).toBe(200)
        const q1 = await Question.findOne({ where: { id: q1Id } })
        const q2 = await Question.findOne({ where: { id: q2Id } })
        expect(q1.number).toBe(2)
        expect(q2.number).toBe(1)
    })

    test("does nothing when question is already last, sends 200 status code", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)
        const designId = await createSurveyDesign(loginDetails.token)
        await createQuestion(designId, loginDetails.token)
        const q2Id = await createQuestion(designId, loginDetails.token)

        const res = await request(api).post(`/questions/${q2Id}/moveDown`).set("Authorization", `Bearer ${loginDetails.token}`)

        expect(res.statusCode).toBe(200)
        const q2 = await Question.findOne({ where: { id: q2Id } })
        expect(q2.number).toBe(2)
    })

    test("sends 404 status code when question does not exist", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)

        const res = await request(api).post('/questions/999/moveDown').set("Authorization", `Bearer ${loginDetails.token}`)

        expect(res.statusCode).toBe(404)
        expect(res.body).toHaveProperty('error')
    })

    test("sends 401 status code when logged in as incorrect user", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)
        const designId = await createSurveyDesign(loginDetails.token)
        const q1Id = await createQuestion(designId, loginDetails.token)
        await createQuestion(designId, loginDetails.token)
        const loginDetails2 = await registerAndLogin(TEST_USER2)

        const res = await request(api).post(`/questions/${q1Id}/moveDown`).set("Authorization", `Bearer ${loginDetails2.token}`)

        expect(res.statusCode).toBe(401)
        expect(res.body).toHaveProperty('error')
    })
})
