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
const app = express();
app.use(express.json());

// API routes
app.use('/users', userRoutes);
app.use('/visualizations', visualRoutes);
app.use('/surveyDesigns', surveyDesignRoutes);
app.use('/questions', questionRoutes)
app.use('/publishedSurveys', publishedSurveyRoutes)

// Get specific published survey info (participant end)
app.get('/takeSurvey/:hash', handleErrors( async (req, res, next) => {
    const publishedSurvey = await PublishedSurvey.findOne({where: {linkHash: req.params.hash} })
    
    if (publishedSurvey)
        res.status(200).json(publishedSurvey)
    else
        next()
}))

// submit answers (participant end)
app.patch('/takeSurvey/:hash', handleErrors( async (req, res, next) => {
    const publishedSurvey = await PublishedSurvey.findOne({where: {linkHash: req.params.hash} })
    
    if (publishedSurvey) {
        let results = null
        if (publishedSurvey.results)
            results = publishedSurvey.results
        else
            results = { participants: [] }

        const newParticipant = { participantId: results.participants.length, answers: req.body.answers }
        results.participants.push(newParticipant)
        
        await PublishedSurvey.update({ results: results }, {where: { id: publishedSurvey.id }})
        res.status(200).send()
    } else {
        next()
    }
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

// start API server
sequelize.sync().then(function () {
    // app.listen(process.env.MAIN_API_PORT, function () {
    //     console.log("== Server is running on port", process.env.MAIN_API_PORT)
    // })
    app.listen(process.env.MAIN_API_PORT, '0.0.0.0', function () {
        console.log("== Server is running on port", process.env.MAIN_UI_PORT)
    });
})