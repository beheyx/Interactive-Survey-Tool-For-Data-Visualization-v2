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
		console.error(`[API Server] GET error:`, e.message)
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

// In-memory storage for chunked uploads (temporary chunks during upload)
const uploadChunks = new Map()

// Initialize chunked upload
app.post('/:id/upload/init', async (req, res, next) => {
    try {
        const { totalChunks, fileSize } = req.body
        const uploadId = `${req.params.id}-${Date.now()}`

        uploadChunks.set(uploadId, {
            chunks: new Array(totalChunks),
            totalChunks,
            fileSize,
            receivedChunks: 0,
            createdAt: Date.now()
        })

        res.status(200).send({ uploadId })
    } catch (e) {
        next(e)
    }
})

// Receive individual chunk
app.post('/:id/upload/chunk', async (req, res, next) => {
    try {
        const { uploadId, chunkIndex, data } = req.body

        if (!uploadChunks.has(uploadId)) {
            return res.status(404).send({ error: "Upload session not found" })
        }

        const upload = uploadChunks.get(uploadId)
        upload.chunks[chunkIndex] = data
        upload.receivedChunks++

        res.status(200).send({
            received: upload.receivedChunks,
            total: upload.totalChunks
        })
    } catch (e) {
        next(e)
    }
})

// Finalize chunked upload
app.post('/:id/upload/finalize', async (req, res, next) => {
    try {
        const { uploadId } = req.body

        if (!uploadChunks.has(uploadId)) {
            return res.status(404).send({ error: "Upload session not found" })
        }

        const upload = uploadChunks.get(uploadId)

        // Verify all chunks received
        if (upload.receivedChunks !== upload.totalChunks) {
            return res.status(400).send({
                error: "Missing chunks",
                received: upload.receivedChunks,
                expected: upload.totalChunks
            })
        }

        // Reassemble the SVG data
        const svgData = upload.chunks.join('')

        // Update visualization in database
        const visualization = await Visualization.findOne({where: { id: req.params.id} })
        if (visualization) {
            await Visualization.update({ svg: svgData }, {
                where: { id: req.params.id },
                fields: VisualClientFields
            })

            // Clean up chunks from memory
            uploadChunks.delete(uploadId)

            res.status(204).send()
        } else {
            uploadChunks.delete(uploadId)
            next()
        }
    } catch (e) {
        next(e)
    }
})

// replace visualization content (keep original for backwards compatibility)
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
        console.error(`[API Server] PUT error:`, e.message, e.stack)
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