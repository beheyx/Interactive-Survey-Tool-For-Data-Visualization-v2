require('dotenv').config()

// set up express
const express = require('express')
const app = express()
const path = require('path')
const fs = require('fs')
app.use(express.json())
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")))

// setup axios API interface
const axios = require('axios');
const api = axios.create({
    baseURL: process.env.VISUAL_API_URL
})

// express-handlebars setup
// this dynamically renders pages
app.set('views', path.join(__dirname, 'views'));
const exphbs = require('express-handlebars');
app.engine("handlebars", exphbs.engine({
    defaultLayout: false
}))
app.set("view engine", "handlebars")

//file upload
const multer = require("multer")
const crypto = require("node:crypto")
const imageTypes = {
    "image/jpeg": "jpg",
    "image/png": "png"
}
const storage = multer.diskStorage({
        destination: (req, file, callback) => {
            callback(null, `${__dirname}/uploads`)
        },
        filename: (req, file, callback) => {
            callback(null, file.originalname)
        }
    })
    // fileFilter: (req, file, callback) => {
    //     callback(null, !!imageTypes[file.mimetype])
    // }

const upload = multer({ storage })

// some browsers request this automatically, ignoring for now
app.get('/favicon.ico', (req, res, next) => {
    return
})

// debug endpoint
app.get('/', function(req,res,next) {
    console.log("loading debug page")
    res.render("visualizer", {
        role: "debug"
    })
})

function clearBeforeUpload(req, res, next) {
    if (fs.existsSync(`${__dirname}/uploads/${req.params.id}.png`))
        fs.unlinkSync(`${__dirname}/uploads/${req.params.id}.png`)
    else if (fs.existsSync(`${__dirname}/uploads/${req.params.id}.jpg`))
        fs.unlinkSync(`${__dirname}/uploads/${req.params.id}.jpg`)

    next()
}

// ui post
app.post('/:id/photo', clearBeforeUpload, upload.single("file"), function(req,res,next) {
    
    res.send()
    //res.redirect(req.get("Referrer"))
})

app.post('/', async function(req,res,next) {
    try {
        const response = await api.post(req.originalUrl, req.body)
        res.send()
    } catch (e) {
        next(e)
    }
})

// ui put
app.put('/:id', async function(req,res,next) {
    try {
        const response = await api.put(req.originalUrl, req.body)
        res.send().status(200)
    } catch (e) {
        next(e)
    }
})

// endpoint to load photo
app.get('/:id/photo', async function(req,res,next) {
    try {
        if (fs.existsSync(`${__dirname}/uploads/${req.params.id}.png`))
            res.sendFile(`${__dirname}/uploads/${req.params.id}.png`)
        else
            res.sendFile(`${__dirname}/uploads/${req.params.id}.jpg`)
    } catch (e) {
        next(e)
    }
})

// endpoint to load specific visualization
app.get('/:id', async function(req,res,next) {
    try {
        const response = await api.get(`/${req.params.id}`)
        const firstQuery = Object.keys(req.query)[0];
        if (firstQuery) {
            res.render("visualizer", {
                role: firstQuery,
                svg: response.data.svg
            })
        // if (req.query.editor) {
        //     res.render("visualizer", {
        //         role: "editor",
        //         svg: response.data.svg
        //     })
        // } else if (req.query.selectElements) {
        //     res.render("visualizer", {
        //         role: "selectElements",
        //         svg: response.data.svg
        //     })
        // } else if (req.query.markPoints) {
        //     res.render("visualizer", {
        //         role: "markPoints",
        //         svg: response.data.svg
        //     })
        } else {
            res.render("visualizer", {
                svg: response.data.svg
            })
        }
    } catch (e) {
        next(e)
    }
})

// catch-all
app.use('*', function (req, res, next) {
    res.status(404).send({
        error: "Requested resource " + req.originalUrl + " does not exist"
    })
})

// error case
app.use('*', function (err, req, res, next) {
    console.error("== Error:", err)
    res.status(500).send({
        error: "Server error.  Please try again later."
    })
})

// start server
app.listen(process.env.VISUAL_UI_PORT, function () {
    console.log("== Server is running on port", process.env.VISUAL_UI_PORT)
})