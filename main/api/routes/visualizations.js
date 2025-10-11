// database imports
const { Visualization, VisualClientFields } = require('../model/Visualization');
const { requireAuthentication } = require('../lib/auth')
const { handleErrors, getResourceById } = require('../lib/error')

// setup express router
const express = require('express');
const router = express.Router();

// setup cookie parser
const cookieParser = require('cookie-parser');
router.use(cookieParser());

// setup axios API interface for visualization engine
const axios = require('axios');
const visualApi = axios.create({
    baseURL: process.env.VISUAL_API_URL
})

// Create new visualization
router.post('/', requireAuthentication, handleErrors( async (req, res, next) => {
	const visualResponse = await visualApi.post('/')

	const visualData = {
		userId: req.userid,
		name: req.body.name,
		contentId: visualResponse.data.id
	}

	const visualization = await Visualization.create(visualData, VisualClientFields);
	res.status(201).send({
		id: visualization.id
	});
}))

// Get info of specific visualization
router.get('/:id', requireAuthentication, handleErrors( async (req, res, next) => {
	const visualization = await getResourceById(Visualization, req.params.id)

	if (req.userid == visualization.userId) {
		res.status(200).json(visualization);
	} else {
		res.status(401).send({ 
			error: "You do not have access to this resource"
		})
	}
}))

// Delete specific visualization
router.delete('/:id', requireAuthentication, handleErrors( async (req, res, next) => {
	const visualization = await getResourceById(Visualization, req.params.id)
	
	if (req.userid == visualization.userId) {
		const engineResponse = await visualApi.delete(`/${visualization.contentId}`)
		await visualization.destroy();
		res.status(200).send()
		
	} else {
		res.status(401).send({ 
			error: "You do not have access to this resource"
		})
	}
}))

// Update specific visualization
router.patch('/:id', requireAuthentication, handleErrors( async (req, res, next) => {
	const visualization = await getResourceById(Visualization, req.params.id)
	
	if (req.userid == visualization.userId) {
		const result = await Visualization.update(req.body, {
			where: { id: req.params.id },
			fields: VisualClientFields.filter(
			  field => field !== 'userId' && field !== 'contentId'
			)
		})

		res.status(200).send()
	} else {
		res.status(401).send({ 
			error: "You do not have access to this resource"
		})
	}
}))

module.exports = router;