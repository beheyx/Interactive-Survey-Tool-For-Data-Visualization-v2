// database imports
const { PublishedSurvey, PublishedSurveyClientFields } = require('../model/PublishedSurvey')
const { requireAuthentication } = require('../lib/auth')
const { handleErrors, getResourceById } = require('../lib/error')

// setup express router
const express = require('express');
const router = express.Router();

// setup cookie parser
const cookieParser = require('cookie-parser');
const { SurveyDesign } = require('../model/SurveyDesign')
router.use(cookieParser());

// Get specific published survey info (designer end)
router.get('/:id', requireAuthentication, handleErrors( async (req, res, next) => {
	const publishedSurvey = await getResourceById(PublishedSurvey, req.params.id)

	if (req.userid == publishedSurvey.userId) {
		res.status(200).json(publishedSurvey)
	} else {
		res.status(401).send({
			error: "You do not have access to this resource"
		})
	}
}))

// Update published survey (edit dates to reopen/extend)
router.patch('/:id', requireAuthentication, handleErrors( async (req, res, next) => {
	const publishedSurvey = await getResourceById(PublishedSurvey, req.params.id)

	if (req.userid == publishedSurvey.userId) {
		await PublishedSurvey.update(req.body, {
			where: { id: req.params.id },
			fields: PublishedSurveyClientFields.filter(
				field => field !== 'userId' && field !== 'surveyDesign' && field !== 'questions' && field !== 'results'
			)
		})

		res.status(200).send()
	} else {
		res.status(401).send({
			error: "You do not have access to this resource"
		})
	}
}))

// Delete published survey
router.delete('/:id', requireAuthentication, handleErrors( async (req, res, next) => {
	const publishedSurvey = await getResourceById(PublishedSurvey, req.params.id)

	if (req.userid == publishedSurvey.userId) {
		await publishedSurvey.destroy();
		res.status(200).send()
	} else {
		res.status(401).send({
			error: "You do not have access to this resource"
		})
	}
}))

module.exports = router;