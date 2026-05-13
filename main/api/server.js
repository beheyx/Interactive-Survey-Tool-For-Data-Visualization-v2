require('dotenv').config()

const userRoutes = require('./routes/users');
const visualRoutes = require('./routes/visualizations');
const surveyDesignRoutes = require('./routes/surveyDesigns');
const questionRoutes = require('./routes/questions');
const publishedSurveyRoutes = require('./routes/publishedSurveys');
const sequelize = require('./lib/sequelize')
const { PublishedSurvey } = require('./model/PublishedSurvey')
const { handleErrors } = require('./lib/error')

const express = require('express');
const compression = require('compression');
const app = express();

// Enable gzip compression for all responses
app.use(compression());

// Increase JSON body parser limit to 50MB to handle large survey results
app.use(express.json({ limit: '50mb' }));

// API routes
app.use('/users', userRoutes);
app.use('/visualizations', visualRoutes);
app.use('/surveyDesigns', surveyDesignRoutes);
app.use('/questions', questionRoutes)
app.use('/publishedSurveys', publishedSurveyRoutes)

// Get specific published survey info (participant end)
app.get('/takeSurvey/:hash', handleErrors(async (req, res, next) => {
  const publishedSurvey = await PublishedSurvey.findOne({
    where: { linkHash: req.params.hash }
  })

  if (!publishedSurvey) return next()

  const payload = publishedSurvey.toJSON()

  // Sort snapshot questions by number, then id
  const sorted = Array.isArray(payload.questions)
    ? [...payload.questions].sort((a, b) => {
        const an = Number(a.number ?? 0)
        const bn = Number(b.number ?? 0)
        if (an !== bn) return an - bn
        return Number(a.id ?? 0) - Number(b.id ?? 0)
      })
    : []

  // Force sequential numbering in the response
  payload.questions = sorted.map((q, idx) => ({
    ...q,
    number: idx + 1
  }))

  res.status(200).json(payload)
}))

// submit answers (participant end)
app.patch('/takeSurvey/:hash', handleErrors(async (req, res, next) => {
    const publishedSurvey = await PublishedSurvey.findOne({
        where: { linkHash: req.params.hash }
    })

    if (!publishedSurvey) {
        return next()
    }

    // Check if survey is open for responses
    if (publishedSurvey.status !== "in-progress") {
        return res.status(403).send({
            error: "This survey is not currently accepting responses"
        })
    }

    let results = publishedSurvey.results || { participants: [] }

    let answers = []

    // Existing API/test format
    if (Array.isArray(req.body.answers)) {
        answers = req.body.answers
    }

    // Single-answer format from responseSave.js
    else if (req.body.answer) {
        answers = [req.body.answer]
    }

    else {
        return res.status(400).send({
            error: "Missing answers"
        })
    }

    const newParticipant = {
        participantId: results.participants.length,
        answers: answers
    }

    results.participants.push(newParticipant)

    publishedSurvey.results = results
    publishedSurvey.changed('results', true)
    publishedSurvey.changed('updatedAt', true)

    await publishedSurvey.save()

    res.status(200).send()
}))


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

// start API server only if this file is run directly (not imported by tests)
if (require.main === module) {
    sequelize.sync().then(function () {
        app.listen(process.env.MAIN_API_PORT, '0.0.0.0', function () {
            console.log("== Server is running on port", process.env.MAIN_API_PORT)
        });
    })
}