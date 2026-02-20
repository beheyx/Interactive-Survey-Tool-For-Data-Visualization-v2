// Use temporary, in-memory db for testing
jest.mock('../../../visualization/api/lib/sequelize', () => {
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
const api = require('../../../visualization/api/server')
const sequelize = require('../../../visualization/api/lib/sequelize')
const { Visualization } = require('../../../visualization/api/model/Visualization')

// Test SVG content
const TEST_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="40"/></svg>'
const TEST_SVG_UPDATED = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="100" height="100"/></svg>'

// Before each test, reset test database
beforeEach(async () => {
    await sequelize.sync({ force: true })
})

afterAll(async () => {
    await sequelize.close()
})

describe("POST / - create new visualization", () => {
    test("creates a new visualization and returns id with 201 status", async () => {
        const res = await request(api).post('/').send({ svg: TEST_SVG })

        expect(res.statusCode).toBe(201)
        expect(res.body).toHaveProperty('id')
        const visualization = await Visualization.findOne({ where: { id: res.body.id } })
        expect(visualization).toBeTruthy()
    })

    test("creates visualization with empty SVG", async () => {
        const res = await request(api).post('/').send({})

        expect(res.statusCode).toBe(201)
        expect(res.body).toHaveProperty('id')
    })

    test("creates visualization with detailsOnHover setting", async () => {
        const res = await request(api).post('/').send({ svg: TEST_SVG, detailsOnHover: false })

        expect(res.statusCode).toBe(201)
        const visualization = await Visualization.findOne({ where: { id: res.body.id } })
        expect(visualization.detailsOnHover).toBe(false)
    })
})

describe("GET /{id} - get visualization", () => {
    test("returns visualization SVG and 200 status", async () => {
        const createRes = await request(api).post('/').send({ svg: TEST_SVG })

        const res = await request(api).get(`/${createRes.body.id}`)

        expect(res.statusCode).toBe(200)
        expect(res.body).toHaveProperty('svg', TEST_SVG)
        expect(res.body).toHaveProperty('detailsOnHover')
    })

    test("returns 404 when visualization does not exist", async () => {
        const res = await request(api).get('/999')

        expect(res.statusCode).toBe(404)
        expect(res.body).toHaveProperty('error')
    })
})

describe("PUT /{id} - update visualization", () => {
    test("updates SVG content and returns 204 status", async () => {
        const createRes = await request(api).post('/').send({ svg: TEST_SVG })

        const res = await request(api).put(`/${createRes.body.id}`).send({ svg: TEST_SVG_UPDATED })

        expect(res.statusCode).toBe(204)
        const visualization = await Visualization.findOne({ where: { id: createRes.body.id } })
        expect(visualization.svg).toBe(TEST_SVG_UPDATED)
    })

    test("updates detailsOnHover setting", async () => {
        const createRes = await request(api).post('/').send({ svg: TEST_SVG, detailsOnHover: true })

        const res = await request(api).put(`/${createRes.body.id}`).send({ detailsOnHover: false })

        expect(res.statusCode).toBe(204)
        const visualization = await Visualization.findOne({ where: { id: createRes.body.id } })
        expect(visualization.detailsOnHover).toBe(false)
    })

    test("returns 404 when visualization does not exist", async () => {
        const res = await request(api).put('/999').send({ svg: TEST_SVG })

        expect(res.statusCode).toBe(404)
        expect(res.body).toHaveProperty('error')
    })
})

describe("DELETE /{id} - delete visualization", () => {
    test("removes visualization from database and returns 204 status", async () => {
        const createRes = await request(api).post('/').send({ svg: TEST_SVG })

        const res = await request(api).delete(`/${createRes.body.id}`)

        expect(res.statusCode).toBe(204)
        const visualization = await Visualization.findOne({ where: { id: createRes.body.id } })
        expect(visualization).toBeFalsy()
    })

    test("returns 404 when visualization does not exist", async () => {
        const res = await request(api).delete('/999')

        expect(res.statusCode).toBe(404)
        expect(res.body).toHaveProperty('error')
    })
})

describe("Chunked upload flow", () => {
    test("initializes upload session and returns uploadId", async () => {
        const createRes = await request(api).post('/').send({})

        const res = await request(api).post(`/${createRes.body.id}/upload/init`).send({
            totalChunks: 2,
            fileSize: 2000
        })

        expect(res.statusCode).toBe(200)
        expect(res.body).toHaveProperty('uploadId')
    })

    test("receives chunks and tracks progress", async () => {
        const createRes = await request(api).post('/').send({})
        const initRes = await request(api).post(`/${createRes.body.id}/upload/init`).send({
            totalChunks: 2,
            fileSize: 2000
        })
        const uploadId = initRes.body.uploadId

        const chunk1Res = await request(api).post(`/${createRes.body.id}/upload/chunk`).send({
            uploadId,
            chunkIndex: 0,
            data: '<svg xmlns="http://www.w3.org/2000/svg">'
        })

        expect(chunk1Res.statusCode).toBe(200)
        expect(chunk1Res.body).toHaveProperty('received', 1)
        expect(chunk1Res.body).toHaveProperty('total', 2)

        const chunk2Res = await request(api).post(`/${createRes.body.id}/upload/chunk`).send({
            uploadId,
            chunkIndex: 1,
            data: '<circle cx="50" cy="50" r="40"/></svg>'
        })

        expect(chunk2Res.statusCode).toBe(200)
        expect(chunk2Res.body).toHaveProperty('received', 2)
    })

    test("finalizes upload and reassembles SVG", async () => {
        const createRes = await request(api).post('/').send({})
        const initRes = await request(api).post(`/${createRes.body.id}/upload/init`).send({
            totalChunks: 2,
            fileSize: 2000
        })
        const uploadId = initRes.body.uploadId

        await request(api).post(`/${createRes.body.id}/upload/chunk`).send({
            uploadId,
            chunkIndex: 0,
            data: '<svg>'
        })
        await request(api).post(`/${createRes.body.id}/upload/chunk`).send({
            uploadId,
            chunkIndex: 1,
            data: '</svg>'
        })

        const finalizeRes = await request(api).post(`/${createRes.body.id}/upload/finalize`).send({ uploadId })

        expect(finalizeRes.statusCode).toBe(204)
        const visualization = await Visualization.findOne({ where: { id: createRes.body.id } })
        expect(visualization.svg).toBe('<svg></svg>')
    })

    test("returns 404 when upload session not found for chunk", async () => {
        const createRes = await request(api).post('/').send({})

        const res = await request(api).post(`/${createRes.body.id}/upload/chunk`).send({
            uploadId: 'nonexistent',
            chunkIndex: 0,
            data: 'test'
        })

        expect(res.statusCode).toBe(404)
        expect(res.body).toHaveProperty('error')
    })

    test("returns 404 when upload session not found for finalize", async () => {
        const createRes = await request(api).post('/').send({})

        const res = await request(api).post(`/${createRes.body.id}/upload/finalize`).send({
            uploadId: 'nonexistent'
        })

        expect(res.statusCode).toBe(404)
        expect(res.body).toHaveProperty('error')
    })

    test("returns 400 when finalizing with missing chunks", async () => {
        const createRes = await request(api).post('/').send({})
        const initRes = await request(api).post(`/${createRes.body.id}/upload/init`).send({
            totalChunks: 3,
            fileSize: 3000
        })
        const uploadId = initRes.body.uploadId

        await request(api).post(`/${createRes.body.id}/upload/chunk`).send({
            uploadId,
            chunkIndex: 0,
            data: 'chunk1'
        })

        const finalizeRes = await request(api).post(`/${createRes.body.id}/upload/finalize`).send({ uploadId })

        expect(finalizeRes.statusCode).toBe(400)
        expect(finalizeRes.body).toHaveProperty('error')
        expect(finalizeRes.body).toHaveProperty('received', 1)
        expect(finalizeRes.body).toHaveProperty('expected', 3)
    })
})
