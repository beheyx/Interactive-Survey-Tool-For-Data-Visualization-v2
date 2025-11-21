// database imports
const { Question, QuestionClientFields } = require('../model/Question')
const { Visualization } = require('../model/Visualization')
const { requireAuthentication } = require('../lib/auth')
const { handleErrors, getResourceById } = require('../lib/error')

// setup express router
const express = require('express');
const router = express.Router();

// setup cookie parser
const cookieParser = require('cookie-parser');
const { SurveyDesign } = require('../model/SurveyDesign')
router.use(cookieParser());

// setup axios API interface for visualization engine
const axios = require('axios');
const visualApi = axios.create({
    baseURL: process.env.VISUAL_API_URL
})


// Get specific question info
router.get('/:id', requireAuthentication, handleErrors( async (req, res, next) => {
	const question = await getResourceById(Question, req.params.id)
	const surveyDesign = await getResourceById(SurveyDesign, question.surveyDesignId)

	if (req.userid == surveyDesign.userId) {
		res.status(200).json(question);
	} else {
		res.status(401).send({ 
			error: "You do not have access to this resource"
		})
	}
}))

// Delete specific question
router.delete('/:id', requireAuthentication, handleErrors( async (req, res, next) => {
	const question = await getResourceById(Question, req.params.id)
	const surveyDesign = await getResourceById(SurveyDesign, question.surveyDesignId)

	if (req.userid == surveyDesign.userId) {
		if (question.visualizationContentId) {
			await visualApi.delete('/' + question.visualizationContentId)
		}

		await question.destroy();

		// Update parent survey design's updatedAt timestamp
		await surveyDesign.changed('updatedAt', true);
		await surveyDesign.save();

		res.status(200).send()
	} else {
		res.status(401).send({
			error: "You do not have access to this resource"
		})
	}
}))

// Update specific question
router.patch('/:id', requireAuthentication, handleErrors( async (req, res, next) => {
	const question = await getResourceById(Question, req.params.id)
	const surveyDesign = await getResourceById(SurveyDesign, question.surveyDesignId)
	
	if (req.userid == surveyDesign.userId) {

		console.log("VISUALIZATION ID: ", req.body.visualizationId)

		let visualizationContentId = question.visualizationContentId
		if (req.body.visualizationId > 0) {
			const visualizationImport = await getResourceById(Visualization, req.body.visualizationId)
			const importInEngine = await visualApi.get(`/${visualizationImport.contentId}`)
			const importedSvg = importInEngine.data.svg

			if (!visualizationContentId) {
				 const newVisual = await visualApi.post('/', { svg: importedSvg })
				 visualizationContentId = newVisual.data.id
			} else {
				await visualApi.put(`/${visualizationContentId}`, { svg: importedSvg })
			}
		} else if (req.body.visualizationId < 0) {
			await visualApi.delete(`/${visualizationContentId}`)
			visualizationContentId = null
		}

		await Question.update(req.body, {
			where: { id: req.params.id },
			fields: QuestionClientFields.filter(
			  field => field !== 'surveyDesignId'
			)
		})

		if (visualizationContentId != question.visualizationContentId) {
			await Question.update({visualizationContentId: visualizationContentId}, {where: { id: req.params.id }})
		}

		// Update parent survey design's updatedAt timestamp
		await surveyDesign.changed('updatedAt', true);
		await surveyDesign.save();

		res.status(200).send()
	} else {
		res.status(401).send({ 
			error: "You do not have access to this resource"
		})
	}
}))

module.exports = router;