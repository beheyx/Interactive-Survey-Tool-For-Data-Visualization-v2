// database imports
const { SurveyDesign, SurveyDesignClientFields } = require('../model/SurveyDesign')
const { Question, QuestionClientFields } = require('../model/Question')
const { PublishedSurvey, PublishedSurveyClientFields } = require('../model/PublishedSurvey')
const { requireAuthentication } = require('../lib/auth')
const { handleErrors, getResourceById } = require('../lib/error')

// setup express router
const express = require('express');
const router = express.Router();

// setup cookie parser
const cookieParser = require('cookie-parser');
router.use(cookieParser());

// Create new survey design
router.post('/', requireAuthentication, handleErrors( async (req, res, next) => {
	// Get survey data from req
	const surveyData = {
		userId: req.userid,
		name: req.body.name,
	}

	// Create new survey design in database
	const surveyDesign = await SurveyDesign.create(surveyData, SurveyDesignClientFields)
	res.status(201).send({ id: surveyDesign.id })
}))

// Get specific survey design info
router.get('/:id', requireAuthentication, handleErrors( async (req, res, next) => {
	const surveyDesign = await getResourceById(SurveyDesign, req.params.id)

	if (req.userid == surveyDesign.userId) {
		res.status(200).json(surveyDesign);

	} else {
		res.status(401).send({ 
			error: "You do not have access to this resource"
		})
	}
}))

// Delete specific survey design
router.delete('/:id', requireAuthentication, handleErrors( async (req, res, next) => {
	const surveyDesign = await getResourceById(SurveyDesign, req.params.id)
	
	if (req.userid == surveyDesign.userId) {
		await surveyDesign.destroy();
		res.status(200).send()
	} else {
		res.status(401).send({ 
			error: "You do not have access to this resource"
		})
	}
}))

// Update specific survey design
router.patch('/:id', requireAuthentication, handleErrors( async (req, res, next) => {
	const surveyDesign = await getResourceById(SurveyDesign, req.params.id)
	
	if (req.userid == surveyDesign.userId) {
		const result = await SurveyDesign.update(req.body, {
			where: { id: req.params.id },
			fields: SurveyDesignClientFields.filter(
			  field => field !== 'userId'
			)
		})

		res.status(200).send()
	} else {
		res.status(401).send({ 
			error: "You do not have access to this resource"
		})
	}
}))

// Get questions belonging to design
router.get('/:id/questions', requireAuthentication, handleErrors( async (req, res, next) => {
	const surveyDesign = await getResourceById(SurveyDesign, req.params.id)

	// verify correct id
	if (req.userid != surveyDesign.userId) {
		res.status(401).send({
			error: "You are not allowed to access this resource"
		})
	} else {
		const questions = await Question.findAll({ where: { surveyDesignId: req.params.id} })	

		res.status(200).send({questions: questions});	// sending as json response
	}
}))

// Create new question
router.post('/:id/questions', requireAuthentication, handleErrors( async (req, res, next) => {
	const surveyDesign = await getResourceById(SurveyDesign, req.params.id)
	const questions = await Question.findAll({where: {surveyDesignId: req.params.id}})

	// Get survey data from req
	const questionData = {
		surveyDesignId: req.params.id,
		number: questions.length+1
	}

	// Create new survey design in database
	const question = await Question.create(questionData, QuestionClientFields)

	// Update parent survey design's updatedAt timestamp
	await surveyDesign.changed('updatedAt', true);
	await surveyDesign.save();

	res.status(201).send({ id: question.id })
}))

// Publish a survey
router.post('/:id/publishedSurveys', requireAuthentication, handleErrors( async (req, res, next) => {
	const surveyDesign = await getResourceById(SurveyDesign, req.params.id)
	const questions = await Question.findAll({where: {surveyDesignId: req.params.id}})

	// Get survey data from req
	const publishedSurveyData = {
		userId: surveyDesign.userId,
		name: req.body.name,
		openDateTime: new Date(req.body.openDateTime),
		closeDateTime: new Date(req.body.closeDateTime),
		surveyDesign: surveyDesign,
		questions: questions
	}

	// Create new survey design in database
	const publishedSurvey = await PublishedSurvey.create(publishedSurveyData, PublishedSurveyClientFields)
	res.status(201).send({ id: publishedSurvey.id })
}))




module.exports = router;