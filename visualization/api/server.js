require('dotenv').config()

// database imports
const { ValidationError } = require('sequelize')
const { Visualization, VisualClientFields } = require('./model/Visualization')

const sequelize = require('./lib/sequelize')

const express = require('express');
const compression = require('compression');
const app = express();

// Enable gzip compression for all responses
app.use(compression());

// Increase JSON body parser limit to 50MB to handle large SVG files
app.use(express.json({ limit: '50mb' }));

// Get visualization info with ID {id}
app.get('/:id', async (req, res, next) => {
    try {
		// find visualization with matching id and return info
		const visualization = await Visualization.findOne({ where: { id: req.params.id } })
        if (visualization) {
            res.status(200).send({ svg: visualization.svg })
        } else {
            next()
        }
	} catch (e) {
		next(e)
	}
})

// Create new visualization
app.post('/', async (req, res, next) => {
    try {
        const visualization = await Visualization.create(req.body, VisualClientFields)
        res.status(201).send({id: visualization.id})
    } catch (e) {
        if (e instanceof ValidationError) {
            // attempted to create a bad visualization
            res.status(400).send({
                msg: "Invalid input"
            })
        } else {
            next(e)
        }
    }
})

// replace visualization content
app.put('/:id', async (req, res, next) => {
    try {
        const visualization = await Visualization.findOne({where: { id: req.params.id} })
        if (visualization) {
            await Visualization.update(req.body, {
                where: { id: req.params.id },
                fields: VisualClientFields
              })

            res.status(204).send()
        } else {
            next()
        }
    } catch (e) {
        if (e instanceof ValidationError) {
            // attempted to create a bad visualization
            res.status(400).send({
                msg: "Invalid input"
            })
        } else {
            next(e)
        }
    }
})

// Remove visualization from database
app.delete('/:id', async (req, res, next) => { 
    // TODO
    try {
        const visualization = await Visualization.findOne({where: { id: req.params.id} })
        if (visualization) {
            await Visualization.destroy({
                where: { id: req.params.id }
            })
            res.status(204).send()
        } else {
            next()
        }
    }   catch(e) {
        next(e)
    }
})

// catch-all for any undefined API endpoint
app.use('*', function (req, res, next) {
    res.status(404).send({
        error: "Requested resource " + req.originalUrl + " does not exist"
    })
})

// server error endpoint
app.use('*', function (err, req, res, next) {
    console.error("== Error:", err)
    res.status(500).send({
        error: "Server error.  Please try again later."
    })
})

module.exports = app

// start API server
sequelize.sync().then(function () {
    app.listen(process.env.VISUAL_API_PORT, function () {
        console.log("== Server is running on port", process.env.VISUAL_API_PORT)
    })
})