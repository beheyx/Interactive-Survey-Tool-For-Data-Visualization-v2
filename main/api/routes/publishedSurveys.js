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

module.exports = router;