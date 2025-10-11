require('dotenv').config()

const sequelizeMain = require('../main/api/lib/sequelize')
const sequelizeVisual = require('../visualization/api/lib/sequelize')

const axios = require('axios')

test("successful connection to main API server", async () => {
    let unsuccessfulConnection = false

    try {
        await axios.get(process.env.MAIN_API_URL)
    } catch (error) {
        if (!error.response)
            unsuccessfulConnection = true
    }

    expect(unsuccessfulConnection).toBeFalsy()
})

test("successful connection to main UI server", async () => {
    let unsuccessfulConnection = false

    try {
        await axios.get(process.env.MAIN_UI_URL)
    } catch (error) {
        if (!error.response)
            unsuccessfulConnection = true
    }

    expect(unsuccessfulConnection).toBeFalsy()
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
    let unsuccessfulConnection = false

    try {
        await axios.get(process.env.VISUAL_API_URL)
    } catch (error) {
        if (!error.response)
            unsuccessfulConnection = true
    }

    expect(unsuccessfulConnection).toBeFalsy()
})

test("successful connection to visualization engine UI server", async () => {
    let unsuccessfulConnection = false

    try {
        await axios.get(process.env.VISUAL_UI_URL)
    } catch (error) {
        if (!error.response)
            unsuccessfulConnection = true
    }

    expect(unsuccessfulConnection).toBeFalsy()
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