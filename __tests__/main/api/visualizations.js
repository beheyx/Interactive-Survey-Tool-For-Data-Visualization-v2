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

// mock axios because requests are made to visualization engine API, but we're not testing that here
jest.mock('axios', () => {
    const mockAxios = {
        create: jest.fn(() => mockAxios),
        post: jest.fn(),
        delete: jest.fn()
    }

    return mockAxios
})

// imports
const axios = require('axios')
const request = require('supertest')
const api = require('../../../main/api/server')
const sequelize = require('../../../main/api/lib/sequelize')
const { Visualization } = require('../../../main/api/model/Visualization')

// testing constants
const TEST_USER = { name:"testUser", password:"testPassword" }
const TEST_USER2 = { name:"testUser2", password:"testPassword2" }
const VISUAL_POST_REQ_BODY = { name:"visual" }
const VISUAL_POST_REQ_BODY2 = { name:"visual2" }
const VISUAL_PATCH_REQ_BODY = { name:"new visual" }
const MOCK_VISUAL_API_POST_RES_BODY = { data: {id: 1} }
const MOCK_VISUAL_API_POST_RES_BODY2 = { data: {id: 2} }

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

describe("POST /visualizations - new visualization", () => {
    test("creates a new visualization in database, sends 201 status code and id", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)  

        axios.post.mockImplementation(() => Promise.resolve(MOCK_VISUAL_API_POST_RES_BODY))
        const res = await request(api).post('/visualizations').set("Cookie", [...loginDetails.header["set-cookie"]]).send(VISUAL_POST_REQ_BODY)

        expect(res.statusCode).toBe(201) 
        expect(res.body).toHaveProperty('id')
        const newVisual = await Visualization.findOne({ where: {id: res.body.id} })
        expect(newVisual).toBeTruthy()
    })

    test("sends 400 status code and error when name is not given", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)  

        axios.post.mockImplementation(() => Promise.resolve(MOCK_VISUAL_API_POST_RES_BODY))
        const res = await request(api).post('/visualizations').set("Cookie", [...loginDetails.header["set-cookie"]]).send({})

        expect(res.statusCode).toBe(400)
        expect(res.body).toHaveProperty('error')
    })

    test("sends 401 status code and error when not logged in", async () => {
        const res = await request(api).post('/visualizations').send(VISUAL_POST_REQ_BODY)     

        expect(res.statusCode).toBe(401)
        expect(res.body).toHaveProperty('error')
    })
})

describe("GET /visualizations/{id} - get visualization info", () => {
    test("sends appropriate response body and 200 status code", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)  
        axios.post.mockImplementation(() => Promise.resolve(MOCK_VISUAL_API_POST_RES_BODY))
        const createRes = await request(api).post('/visualizations').set("Cookie", [...loginDetails.header["set-cookie"]]).send(VISUAL_POST_REQ_BODY) 

        const res = await request(api).get(`/visualizations/${createRes.body.id}`).set("Cookie", [...loginDetails.header["set-cookie"]])

        expect(res.statusCode).toBe(200)
        expect(res.body).toHaveProperty('name', VISUAL_POST_REQ_BODY.name)
        expect(res.body).toHaveProperty('userId', loginDetails.id)
        expect(res.body).toHaveProperty('contentId', MOCK_VISUAL_API_POST_RES_BODY.data.id)
    })

    test("sends 404 status code and error when resource with specified id does not exist", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)  

        const res = await request(api).get('/visualizations/1').set("Cookie", [...loginDetails.header["set-cookie"]])

        expect(res.statusCode).toBe(404)
        expect(res.body).toHaveProperty('error')
    })

    test("sends 401 status code and error when logged in as incorrect user", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)  
        axios.post.mockImplementation(() => Promise.resolve(MOCK_VISUAL_API_POST_RES_BODY))
        const createRes = await request(api).post('/visualizations').set("Cookie", [...loginDetails.header["set-cookie"]]).send(VISUAL_POST_REQ_BODY)
        const loginDetails2 = await registerAndLogin(TEST_USER2)  

        const res = await request(api).get(`/visualizations/${createRes.body.id}`).set("Cookie", [...loginDetails2.header["set-cookie"]])  

        expect(res.statusCode).toBe(401)
        expect(res.body).toHaveProperty('error')
    })
})

describe("GET /users/{id}/visualizations - get visualizations of user", () => {
    test("sends array of visualizations and 200 status code", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)   
        axios.post.mockImplementationOnce(() => Promise.resolve(MOCK_VISUAL_API_POST_RES_BODY))
        const createRes = await request(api).post('/visualizations').set("Cookie", [...loginDetails.header["set-cookie"]]).send(VISUAL_POST_REQ_BODY)
        axios.post.mockImplementationOnce(() => Promise.resolve(MOCK_VISUAL_API_POST_RES_BODY2))
        const createRes2 = await request(api).post('/visualizations').set("Cookie", [...loginDetails.header["set-cookie"]]).send(VISUAL_POST_REQ_BODY2)
        const expectedArray = [
            {id:createRes.body.id, userId:loginDetails.id, name:VISUAL_POST_REQ_BODY.name, contentId:MOCK_VISUAL_API_POST_RES_BODY.data.id}, 
            {id:createRes2.body.id, userId:loginDetails.id, name:VISUAL_POST_REQ_BODY2.name, contentId:MOCK_VISUAL_API_POST_RES_BODY2.data.id}
        ]

        const res = await request(api).get(`/users/${loginDetails.id}/visualizations`).set("Cookie", [...loginDetails.header["set-cookie"]])  

        expect(res.statusCode).toBe(200)
        expect(res.body).toHaveProperty('visualizations')
        expect(res.body.visualizations).toMatchObject(expectedArray)
    })
    
    test("sends 401 status code and error when logged in as incorrect user", async () => {
        const loginDetails = await registerAndLogin(TEST_USER) 

        const res = await request(api).get(`/users/${loginDetails.id+1}/visualizations`).set("Cookie", [...loginDetails.header["set-cookie"]])    
        
        expect(res.statusCode).toBe(401)
        expect(res.body).toHaveProperty('error')
    })
})

describe("DELETE /visualizations/{id} - delete visualization", () => {
    test("removes from database, sends 200 status code", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)  
        axios.post.mockImplementation(() => Promise.resolve(MOCK_VISUAL_API_POST_RES_BODY))
        const createRes = await request(api).post('/visualizations').set("Cookie", [...loginDetails.header["set-cookie"]]).send(VISUAL_POST_REQ_BODY) 

        const res = await request(api).delete(`/visualizations/${createRes.body.id}`).set("Cookie", [...loginDetails.header["set-cookie"]])

        expect(res.statusCode).toBe(200)
        const deletedVisual = await Visualization.findOne({ where: {id: createRes.body.id} })
        expect(deletedVisual).toBeFalsy()
    })

    test("sends 404 status code and error when resource with specified id does not exist", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)  

        const res = await request(api).delete('/visualizations/1').set("Cookie", [...loginDetails.header["set-cookie"]])

        expect(res.statusCode).toBe(404)
        expect(res.body).toHaveProperty('error')
    })

    test("sends 401 status code and error when logged in as incorrect user", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)  
        axios.post.mockImplementation(() => Promise.resolve(MOCK_VISUAL_API_POST_RES_BODY))
        const createRes = await request(api).post('/visualizations').set("Cookie", [...loginDetails.header["set-cookie"]]).send(VISUAL_POST_REQ_BODY)
        const loginDetails2 = await registerAndLogin(TEST_USER2)  

        const res = await request(api).delete(`/visualizations/${createRes.body.id}`).set("Cookie", [...loginDetails2.header["set-cookie"]])  

        expect(res.statusCode).toBe(401)
        expect(res.body).toHaveProperty('error')
    })
})

describe("PATCH /visualizations/{id} - update visualization info", () => {
    test("updates info, sends 200 status code", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)  
        const createRes = await request(api).post('/visualizations').set("Cookie", [...loginDetails.header["set-cookie"]]).send(VISUAL_POST_REQ_BODY) 

        const res = await request(api).patch(`/visualizations/${createRes.body.id}`).set("Cookie", [...loginDetails.header["set-cookie"]]).send(VISUAL_PATCH_REQ_BODY)  

        expect(res.statusCode).toBe(200)
        const updated = await Visualization.findOne({ where: {id: createRes.body.id} })
        expect(updated).toMatchObject(VISUAL_PATCH_REQ_BODY)
    })

    test("sends 404 status code and error when resource with specified id does not exist", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)  

        const res = await request(api).patch('/visualizations/1').set("Cookie", [...loginDetails.header["set-cookie"]]).send(VISUAL_PATCH_REQ_BODY)  

        expect(res.statusCode).toBe(404)
        expect(res.body).toHaveProperty('error')
    })

    test("sends 401 status code and error when logged in as incorrect user", async () => {
        const loginDetails = await registerAndLogin(TEST_USER)  
        const createRes = await request(api).post('/visualizations').set("Cookie", [...loginDetails.header["set-cookie"]]).send(VISUAL_POST_REQ_BODY)
        const loginDetails2 = await registerAndLogin(TEST_USER2)  

        const res = await request(api).patch(`/visualizations/${createRes.body.id}`).set("Cookie", [...loginDetails2.header["set-cookie"]]).send(VISUAL_PATCH_REQ_BODY)  

        expect(res.statusCode).toBe(401)
        expect(res.body).toHaveProperty('error')
    })
})

