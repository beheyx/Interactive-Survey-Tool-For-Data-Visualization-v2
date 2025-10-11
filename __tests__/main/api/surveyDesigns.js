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

// testing constants
const TEST_USER = { name:"testUser", password:"testPassword" }
const TEST_USER2 = { name:"testUser2", password:"testPassword2" }
const DESIGN_POST_REQ_BODY = { name:"design" }
const DESIGN_POST_REQ_BODY2 = { name:"design2" }
const DESIGN_PATCH_REQ_BODY = { name:"design Updated", title:"my Survey", introText:"a lot of text", conclusionText:"a lot more text" }

// registers and logs in user with given credentials, returns details relevant for testing
async function registerAndLogin(credentials) {
    const registerRes = await request(api).post('/users').send(credentials)
    const myId = registerRes.body.id
    const loginRes = await request(api).post('/users/login').send(credentials)
    const { header } = loginRes 
    return {id: myId, res: loginRes, header: header}  
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

        const res = await request(api).post('/surveyDesigns').set("Cookie", [...loginDetails.header["set-cookie"]]).send(DESIGN_POST_REQ_BODY)

        expect(res.statusCode).toBe(201) 
        expect(res.body).toHaveProperty('id')
        const newDesign = await SurveyDesign.findOne({ where: {id: res.body.id} })
        expect(newDesign).toBeTruthy()
    })

    test("sends 400 status code and error when name is not given", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)  

        const res = await request(api).post('/surveyDesigns').set("Cookie", [...loginDetails.header["set-cookie"]]).send({})

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
        const createRes = await request(api).post('/surveyDesigns').set("Cookie", [...loginDetails.header["set-cookie"]]).send(DESIGN_POST_REQ_BODY)

        const res = await request(api).get(`/surveyDesigns/${createRes.body.id}`).set("Cookie", [...loginDetails.header["set-cookie"]])

        expect(res.statusCode).toBe(200)
        expect(res.body).toHaveProperty('name', DESIGN_POST_REQ_BODY.name)
        expect(res.body).toHaveProperty('userId', loginDetails.id)
        expect(res.body).toHaveProperty('title')
        expect(res.body).toHaveProperty('introText')
        expect(res.body).toHaveProperty('conclusionText')
    })

    test("sends 404 status code and error when resource with specified id does not exist", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)  

        const res = await request(api).get('/surveyDesigns/1').set("Cookie", [...loginDetails.header["set-cookie"]])

        expect(res.statusCode).toBe(404)
        expect(res.body).toHaveProperty('error')
    })

    test("sends 401 status code and error when logged in as incorrect user", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)  

        const createRes = await request(api).post('/surveyDesigns').set("Cookie", [...loginDetails.header["set-cookie"]]).send(DESIGN_POST_REQ_BODY)
        const loginDetails2 = await registerAndLogin(TEST_USER2)  

        const res = await request(api).get(`/surveyDesigns/${createRes.body.id}`).set("Cookie", [...loginDetails2.header["set-cookie"]])  

        expect(res.statusCode).toBe(401)
        expect(res.body).toHaveProperty('error')
    })
})

describe("GET /users/{id}/surveyDesigns - get survey designs of user", () => {
    test("sends array of survey designs and 200 status code", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)   
        const createRes = await request(api).post('/surveyDesigns').set("Cookie", [...loginDetails.header["set-cookie"]]).send(DESIGN_POST_REQ_BODY)
        const createRes2 = await request(api).post('/surveyDesigns').set("Cookie", [...loginDetails.header["set-cookie"]]).send(DESIGN_POST_REQ_BODY2)
        const expectedArray = [
            {id:createRes.body.id, userId:loginDetails.id, name:DESIGN_POST_REQ_BODY.name}, 
            {id:createRes2.body.id, userId:loginDetails.id, name:DESIGN_POST_REQ_BODY2.name}
        ]

        const res = await request(api).get(`/users/${loginDetails.id}/surveyDesigns`).set("Cookie", [...loginDetails.header["set-cookie"]])  

        expect(res.statusCode).toBe(200)
        expect(res.body).toHaveProperty('surveyDesigns')
        expect(res.body.surveyDesigns).toMatchObject(expectedArray)
    })
    
    test("sends 401 status code and error when logged in as incorrect user", async () => {
        const loginDetails = await registerAndLogin(TEST_USER) 

        const res = await request(api).get(`/users/${loginDetails.id+1}/surveyDesigns`).set("Cookie", [...loginDetails.header["set-cookie"]])    
        
        expect(res.statusCode).toBe(401)
        expect(res.body).toHaveProperty('error')
    })
})

describe("DELETE /surveyDesigns/{id} - delete survey design", () => {
    test("removes from database, sends 200 status code", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)  
        const createRes = await request(api).post('/surveyDesigns').set("Cookie", [...loginDetails.header["set-cookie"]]).send(DESIGN_POST_REQ_BODY) 

        const res = await request(api).delete(`/surveyDesigns/${createRes.body.id}`).set("Cookie", [...loginDetails.header["set-cookie"]])

        expect(res.statusCode).toBe(200)
        const deletedDesign = await SurveyDesign.findOne({ where: {id: createRes.body.id} })
        expect(deletedDesign).toBeFalsy()
    })

    test("sends 404 status code and error when resource with specified id does not exist", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)  

        const res = await request(api).delete('/surveyDesigns/1').set("Cookie", [...loginDetails.header["set-cookie"]])

        expect(res.statusCode).toBe(404)
        expect(res.body).toHaveProperty('error')
    })

    test("sends 401 status code and error when logged in as incorrect user", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)  
        const createRes = await request(api).post('/surveyDesigns').set("Cookie", [...loginDetails.header["set-cookie"]]).send(DESIGN_POST_REQ_BODY)
        const loginDetails2 = await registerAndLogin(TEST_USER2)  

        const res = await request(api).delete(`/surveyDesigns/${createRes.body.id}`).set("Cookie", [...loginDetails2.header["set-cookie"]])  

        expect(res.statusCode).toBe(401)
        expect(res.body).toHaveProperty('error')
    })
})

describe("PATCH /surveyDesigns/{id} - update survey design info", () => {
    test("updates info, sends 200 status code", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)  
        const createRes = await request(api).post('/surveyDesigns').set("Cookie", [...loginDetails.header["set-cookie"]]).send(DESIGN_POST_REQ_BODY) 

        const res = await request(api).patch(`/surveyDesigns/${createRes.body.id}`).set("Cookie", [...loginDetails.header["set-cookie"]]).send(DESIGN_PATCH_REQ_BODY)  

        expect(res.statusCode).toBe(200)
        const updatedDesign = await SurveyDesign.findOne({ where: {id: createRes.body.id} })
        expect(updatedDesign).toMatchObject(DESIGN_PATCH_REQ_BODY)
    })

    test("sends 404 status code and error when resource with specified id does not exist", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)  

        const res = await request(api).patch('/surveyDesigns/1').set("Cookie", [...loginDetails.header["set-cookie"]]).send(DESIGN_PATCH_REQ_BODY)  

        expect(res.statusCode).toBe(404)
        expect(res.body).toHaveProperty('error')
    })

    test("sends 401 status code and error when logged in as incorrect user", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)  
        const createRes = await request(api).post('/surveyDesigns').set("Cookie", [...loginDetails.header["set-cookie"]]).send(DESIGN_POST_REQ_BODY)
        const loginDetails2 = await registerAndLogin(TEST_USER2)  

        const res = await request(api).patch(`/surveyDesigns/${createRes.body.id}`).set("Cookie", [...loginDetails2.header["set-cookie"]]).send(DESIGN_PATCH_REQ_BODY)  

        expect(res.statusCode).toBe(401)
        expect(res.body).toHaveProperty('error')
    })
})

