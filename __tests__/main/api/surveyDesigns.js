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
const { SurveyDesign } = require('../../../main/api/model/SurveyDesign')
const { Question } = require('../../../main/api/model/Question')
const { PublishedSurvey } = require('../../../main/api/model/PublishedSurvey')

// testing constants
const TEST_USER = { name:"testUser", password:"testPassword", confirm_password:"testPassword" }
const TEST_USER2 = { name:"testUser2", password:"testPassword2", confirm_password:"testPassword2" }
const DESIGN_POST_REQ_BODY = { name:"design" }
const DESIGN_POST_REQ_BODY2 = { name:"design2" }
const DESIGN_PATCH_REQ_BODY = { name:"design Updated", title:"my Survey", introText:"a lot of text", conclusionText:"a lot more text" }

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

describe("POST /surveyDesigns - new survey design", () => {
    test("creates a new survey design in database, sends 201 status code and id", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)  

        const res = await request(api).post('/surveyDesigns').set("Authorization", `Bearer ${loginDetails.token}`).send(DESIGN_POST_REQ_BODY)

        expect(res.statusCode).toBe(201) 
        expect(res.body).toHaveProperty('id')
        const newDesign = await SurveyDesign.findOne({ where: {id: res.body.id} })
        expect(newDesign).toBeTruthy()
    })

    test("sends 400 status code and error when name is not given", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)  

        const res = await request(api).post('/surveyDesigns').set("Authorization", `Bearer ${loginDetails.token}`).send({})

        expect(res.statusCode).toBe(400)
        expect(res.body).toHaveProperty('error')
    })

    test("sends 401 status code and error when not logged in", async () => {
        const res = await request(api).post('/surveyDesigns').send(DESIGN_POST_REQ_BODY)     

        expect(res.statusCode).toBe(401)
        expect(res.body).toHaveProperty('error')
    })
})

describe("GET /surveyDesigns/{id} - get survey design info", () => {
    test("sends appropriate response body and 200 status code", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)  
        const createRes = await request(api).post('/surveyDesigns').set("Authorization", `Bearer ${loginDetails.token}`).send(DESIGN_POST_REQ_BODY)

        const res = await request(api).get(`/surveyDesigns/${createRes.body.id}`).set("Authorization", `Bearer ${loginDetails.token}`)

        expect(res.statusCode).toBe(200)
        expect(res.body).toHaveProperty('name', DESIGN_POST_REQ_BODY.name)
        expect(res.body).toHaveProperty('userId', loginDetails.id)
        expect(res.body).toHaveProperty('title')
        expect(res.body).toHaveProperty('introText')
        expect(res.body).toHaveProperty('conclusionText')
    })

    test("sends 404 status code and error when resource with specified id does not exist", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)  

        const res = await request(api).get('/surveyDesigns/1').set("Authorization", `Bearer ${loginDetails.token}`)

        expect(res.statusCode).toBe(404)
        expect(res.body).toHaveProperty('error')
    })

    test("sends 401 status code and error when logged in as incorrect user", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)  

        const createRes = await request(api).post('/surveyDesigns').set("Authorization", `Bearer ${loginDetails.token}`).send(DESIGN_POST_REQ_BODY)
        const loginDetails2 = await registerAndLogin(TEST_USER2)  

        const res = await request(api).get(`/surveyDesigns/${createRes.body.id}`).set("Authorization", `Bearer ${loginDetails2.token}`)  

        expect(res.statusCode).toBe(401)
        expect(res.body).toHaveProperty('error')
    })
})

describe("GET /users/{id}/surveyDesigns - get survey designs of user", () => {
    test("sends array of survey designs and 200 status code", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)   
        const createRes = await request(api).post('/surveyDesigns').set("Authorization", `Bearer ${loginDetails.token}`).send(DESIGN_POST_REQ_BODY)
        const createRes2 = await request(api).post('/surveyDesigns').set("Authorization", `Bearer ${loginDetails.token}`).send(DESIGN_POST_REQ_BODY2)
        const expectedArray = [
            {id:createRes.body.id, userId:loginDetails.id, name:DESIGN_POST_REQ_BODY.name}, 
            {id:createRes2.body.id, userId:loginDetails.id, name:DESIGN_POST_REQ_BODY2.name}
        ]

        const res = await request(api).get(`/users/${loginDetails.id}/surveyDesigns`).set("Authorization", `Bearer ${loginDetails.token}`)  

        expect(res.statusCode).toBe(200)
        expect(res.body).toHaveProperty('surveyDesigns')
        expect(res.body.surveyDesigns).toMatchObject(expectedArray)
    })
    
    test("sends 401 status code and error when logged in as incorrect user", async () => {
        const loginDetails = await registerAndLogin(TEST_USER) 

        const res = await request(api).get(`/users/${loginDetails.id+1}/surveyDesigns`).set("Authorization", `Bearer ${loginDetails.token}`)    
        
        expect(res.statusCode).toBe(401)
        expect(res.body).toHaveProperty('error')
    })
})

describe("DELETE /surveyDesigns/{id} - delete survey design", () => {
    test("removes from database, sends 200 status code", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)  
        const createRes = await request(api).post('/surveyDesigns').set("Authorization", `Bearer ${loginDetails.token}`).send(DESIGN_POST_REQ_BODY) 

        const res = await request(api).delete(`/surveyDesigns/${createRes.body.id}`).set("Authorization", `Bearer ${loginDetails.token}`)

        expect(res.statusCode).toBe(200)
        const deletedDesign = await SurveyDesign.findOne({ where: {id: createRes.body.id} })
        expect(deletedDesign).toBeFalsy()
    })

    test("sends 404 status code and error when resource with specified id does not exist", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)  

        const res = await request(api).delete('/surveyDesigns/1').set("Authorization", `Bearer ${loginDetails.token}`)

        expect(res.statusCode).toBe(404)
        expect(res.body).toHaveProperty('error')
    })

    test("sends 401 status code and error when logged in as incorrect user", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)  
        const createRes = await request(api).post('/surveyDesigns').set("Authorization", `Bearer ${loginDetails.token}`).send(DESIGN_POST_REQ_BODY)
        const loginDetails2 = await registerAndLogin(TEST_USER2)  

        const res = await request(api).delete(`/surveyDesigns/${createRes.body.id}`).set("Authorization", `Bearer ${loginDetails2.token}`)  

        expect(res.statusCode).toBe(401)
        expect(res.body).toHaveProperty('error')
    })
})

describe("PATCH /surveyDesigns/{id} - update survey design info", () => {
    test("updates info, sends 200 status code", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)  
        const createRes = await request(api).post('/surveyDesigns').set("Authorization", `Bearer ${loginDetails.token}`).send(DESIGN_POST_REQ_BODY) 

        const res = await request(api).patch(`/surveyDesigns/${createRes.body.id}`).set("Authorization", `Bearer ${loginDetails.token}`).send(DESIGN_PATCH_REQ_BODY)  

        expect(res.statusCode).toBe(200)
        const updatedDesign = await SurveyDesign.findOne({ where: {id: createRes.body.id} })
        expect(updatedDesign).toMatchObject(DESIGN_PATCH_REQ_BODY)
    })

    test("sends 404 status code and error when resource with specified id does not exist", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)  

        const res = await request(api).patch('/surveyDesigns/1').set("Authorization", `Bearer ${loginDetails.token}`).send(DESIGN_PATCH_REQ_BODY)  

        expect(res.statusCode).toBe(404)
        expect(res.body).toHaveProperty('error')
    })

    test("sends 401 status code and error when logged in as incorrect user", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)  
        const createRes = await request(api).post('/surveyDesigns').set("Authorization", `Bearer ${loginDetails.token}`).send(DESIGN_POST_REQ_BODY)
        const loginDetails2 = await registerAndLogin(TEST_USER2)  

        const res = await request(api).patch(`/surveyDesigns/${createRes.body.id}`).set("Authorization", `Bearer ${loginDetails2.token}`).send(DESIGN_PATCH_REQ_BODY)

        expect(res.statusCode).toBe(401)
        expect(res.body).toHaveProperty('error')
    })
})

describe("GET /surveyDesigns/{id}/questions - get questions of survey design", () => {
    test("sends array of questions and 200 status code", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)
        const createRes = await request(api).post('/surveyDesigns').set("Authorization", `Bearer ${loginDetails.token}`).send(DESIGN_POST_REQ_BODY)
        await request(api).post(`/surveyDesigns/${createRes.body.id}/questions`).set("Authorization", `Bearer ${loginDetails.token}`)
        await request(api).post(`/surveyDesigns/${createRes.body.id}/questions`).set("Authorization", `Bearer ${loginDetails.token}`)

        const res = await request(api).get(`/surveyDesigns/${createRes.body.id}/questions`).set("Authorization", `Bearer ${loginDetails.token}`)

        expect(res.statusCode).toBe(200)
        expect(res.body).toHaveProperty('questions')
        expect(res.body.questions).toHaveLength(2)
        expect(res.body.questions[0]).toHaveProperty('number', 1)
        expect(res.body.questions[1]).toHaveProperty('number', 2)
    })

    test("sends 404 status code and error when resource with specified id does not exist", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)

        const res = await request(api).get('/surveyDesigns/999/questions').set("Authorization", `Bearer ${loginDetails.token}`)

        expect(res.statusCode).toBe(404)
        expect(res.body).toHaveProperty('error')
    })

    test("sends 401 status code and error when logged in as incorrect user", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)
        const createRes = await request(api).post('/surveyDesigns').set("Authorization", `Bearer ${loginDetails.token}`).send(DESIGN_POST_REQ_BODY)
        const loginDetails2 = await registerAndLogin(TEST_USER2)

        const res = await request(api).get(`/surveyDesigns/${createRes.body.id}/questions`).set("Authorization", `Bearer ${loginDetails2.token}`)

        expect(res.statusCode).toBe(401)
        expect(res.body).toHaveProperty('error')
    })

    test("sends 401 status code and error when not logged in", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)
        const createRes = await request(api).post('/surveyDesigns').set("Authorization", `Bearer ${loginDetails.token}`).send(DESIGN_POST_REQ_BODY)

        const res = await request(api).get(`/surveyDesigns/${createRes.body.id}/questions`)

        expect(res.statusCode).toBe(401)
        expect(res.body).toHaveProperty('error')
    })
})

describe("POST /surveyDesigns/{id}/questions - create new question", () => {
    test("creates a new question in database, sends 201 status code and id", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)
        const createRes = await request(api).post('/surveyDesigns').set("Authorization", `Bearer ${loginDetails.token}`).send(DESIGN_POST_REQ_BODY)

        const res = await request(api).post(`/surveyDesigns/${createRes.body.id}/questions`).set("Authorization", `Bearer ${loginDetails.token}`)

        expect(res.statusCode).toBe(201)
        expect(res.body).toHaveProperty('id')
        const newQuestion = await Question.findOne({ where: {id: res.body.id} })
        expect(newQuestion).toBeTruthy()
        expect(newQuestion.number).toBe(1)
        expect(newQuestion.type).toBe("Multiple Choice")
    })

    test("assigns correct number when multiple questions are created", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)
        const createRes = await request(api).post('/surveyDesigns').set("Authorization", `Bearer ${loginDetails.token}`).send(DESIGN_POST_REQ_BODY)

        const res1 = await request(api).post(`/surveyDesigns/${createRes.body.id}/questions`).set("Authorization", `Bearer ${loginDetails.token}`)
        const res2 = await request(api).post(`/surveyDesigns/${createRes.body.id}/questions`).set("Authorization", `Bearer ${loginDetails.token}`)

        const q1 = await Question.findOne({ where: {id: res1.body.id} })
        const q2 = await Question.findOne({ where: {id: res2.body.id} })
        expect(q1.number).toBe(1)
        expect(q2.number).toBe(2)
    })

    test("sends 404 status code and error when resource with specified id does not exist", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)

        const res = await request(api).post('/surveyDesigns/999/questions').set("Authorization", `Bearer ${loginDetails.token}`)

        expect(res.statusCode).toBe(404)
        expect(res.body).toHaveProperty('error')
    })

    test("sends 401 status code and error when logged in as incorrect user", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)
        const createRes = await request(api).post('/surveyDesigns').set("Authorization", `Bearer ${loginDetails.token}`).send(DESIGN_POST_REQ_BODY)
        const loginDetails2 = await registerAndLogin(TEST_USER2)

        const res = await request(api).post(`/surveyDesigns/${createRes.body.id}/questions`).set("Authorization", `Bearer ${loginDetails2.token}`)

        expect(res.statusCode).toBe(401)
        expect(res.body).toHaveProperty('error')
    })

    test("sends 401 status code and error when not logged in", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)
        const createRes = await request(api).post('/surveyDesigns').set("Authorization", `Bearer ${loginDetails.token}`).send(DESIGN_POST_REQ_BODY)

        const res = await request(api).post(`/surveyDesigns/${createRes.body.id}/questions`)

        expect(res.statusCode).toBe(401)
        expect(res.body).toHaveProperty('error')
    })
})

describe("POST /surveyDesigns/{id}/publishedSurveys - publish a survey", () => {
    test("creates a published survey, sends 201 status code and id", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)
        const createRes = await request(api).post('/surveyDesigns').set("Authorization", `Bearer ${loginDetails.token}`).send(DESIGN_POST_REQ_BODY)
        const questionRes = await request(api).post(`/surveyDesigns/${createRes.body.id}/questions`).set("Authorization", `Bearer ${loginDetails.token}`)
        // Add text to the question so it's not empty
        await request(api).patch(`/questions/${questionRes.body.id}`).set("Authorization", `Bearer ${loginDetails.token}`).send({ text: "Test question" })

        const publishBody = {
            name: "Published Survey",
            openDateTime: new Date(Date.now() - 1000).toISOString(),
            closeDateTime: new Date(Date.now() + 86400000).toISOString()
        }

        const res = await request(api).post(`/surveyDesigns/${createRes.body.id}/publishedSurveys`).set("Authorization", `Bearer ${loginDetails.token}`).send(publishBody)

        expect(res.statusCode).toBe(201)
        expect(res.body).toHaveProperty('id')
        const published = await PublishedSurvey.findOne({ where: {id: res.body.id} })
        expect(published).toBeTruthy()
        expect(published.name).toBe("Published Survey")
        expect(published.linkHash).toBeTruthy()
    })

    test("sends 404 status code and error when resource with specified id does not exist", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)
        const publishBody = {
            name: "Published Survey",
            openDateTime: new Date(Date.now() - 1000).toISOString(),
            closeDateTime: new Date(Date.now() + 86400000).toISOString()
        }

        const res = await request(api).post('/surveyDesigns/999/publishedSurveys').set("Authorization", `Bearer ${loginDetails.token}`).send(publishBody)

        expect(res.statusCode).toBe(404)
        expect(res.body).toHaveProperty('error')
    })

    test("sends 401 status code and error when not logged in", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)
        const createRes = await request(api).post('/surveyDesigns').set("Authorization", `Bearer ${loginDetails.token}`).send(DESIGN_POST_REQ_BODY)
        const publishBody = {
            name: "Published Survey",
            openDateTime: new Date(Date.now() - 1000).toISOString(),
            closeDateTime: new Date(Date.now() + 86400000).toISOString()
        }

        const res = await request(api).post(`/surveyDesigns/${createRes.body.id}/publishedSurveys`).send(publishBody)

        expect(res.statusCode).toBe(401)
        expect(res.body).toHaveProperty('error')
    })

    test("sends 400 status code when survey has no questions", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)
        const createRes = await request(api).post('/surveyDesigns').set("Authorization", `Bearer ${loginDetails.token}`).send(DESIGN_POST_REQ_BODY)
        const publishBody = {
            name: "Published Survey",
            openDateTime: new Date(Date.now() - 1000).toISOString(),
            closeDateTime: new Date(Date.now() + 86400000).toISOString()
        }

        const res = await request(api).post(`/surveyDesigns/${createRes.body.id}/publishedSurveys`).set("Authorization", `Bearer ${loginDetails.token}`).send(publishBody)

        expect(res.statusCode).toBe(400)
        expect(res.body).toHaveProperty('error')
    })

    test("sends 400 status code when survey has only empty questions", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)
        const createRes = await request(api).post('/surveyDesigns').set("Authorization", `Bearer ${loginDetails.token}`).send(DESIGN_POST_REQ_BODY)
        // Create questions without text (empty questions)
        await request(api).post(`/surveyDesigns/${createRes.body.id}/questions`).set("Authorization", `Bearer ${loginDetails.token}`)
        await request(api).post(`/surveyDesigns/${createRes.body.id}/questions`).set("Authorization", `Bearer ${loginDetails.token}`)
        const publishBody = {
            name: "Published Survey",
            openDateTime: new Date(Date.now() - 1000).toISOString(),
            closeDateTime: new Date(Date.now() + 86400000).toISOString()
        }

        const res = await request(api).post(`/surveyDesigns/${createRes.body.id}/publishedSurveys`).set("Authorization", `Bearer ${loginDetails.token}`).send(publishBody)

        expect(res.statusCode).toBe(400)
        expect(res.body).toHaveProperty('error')
    })
})

