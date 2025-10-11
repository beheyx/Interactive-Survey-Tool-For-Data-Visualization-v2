// database imports
const { User, UserClientFields, validateCredentials } = require('../model/User')
const { generateAuthToken, requireAuthentication } = require('../lib/auth')
const { handleErrors, getResourceById } = require('../lib/error')

// setup express router
const express = require('express');
const router = express.Router();

// setup cookie parser
const cookieParser = require('cookie-parser');
router.use(cookieParser());


/*****************************************
 * Start User endpoints
 * 
 *****************************************/

// Get current user info
router.get('/', requireAuthentication, handleErrors( async (req, res, next) => {
	// find user with matching id and return info
	const user = await getResourceById(User, req.userid)
	res.status(200).send({ id: user.id, name: user.name })
}))

// Register a new user
router.post('/', handleErrors( async (req, res, next) => {
	// create new user entry in database
	const user = await User.create(req.body, UserClientFields)
	// send authentication
	const token = generateAuthToken(user.id)
	res.status(201).send({ id: user.id, token: token })
}))

// Login user
router.post('/login', handleErrors( async (req, res, next) => {
	// attempt login with given credentials
	const authenticated = await validateCredentials(req.body.name, req.body.password)
	if (authenticated) {
		// find user with matching name
		const user = await User.findOne({ where: { name: req.body.name } })
		// send authentication token back as a cookie
		// this token lets API know who the user is and whether they have an authenticated login 
		const token = generateAuthToken(user.id)
		//res.cookie("access_token", token, { httpOnly: true })
		res.status(200).send({ token: token })
	} else {
		// invalid login attempt
		res.status(401).send({
			error: "Invalid login credentials"
		})
	}
}))

// logout user
router.post('/logout', handleErrors( async (req, res, next) => {
	// simply get rid of the authentication token
	//res.cookie("access_token", null, { httpOnly: true })
	res.status(200).send({ token: null })
}))


/*****************************************
 * GET User collections endpoints
 *****************************************/

// generic function for a getting a collection list from a user
function getUserCollection(collectionModel, collectionName) {
	return async (req, res, next) => {
		// verify correct id
		if (req.userid != req.params.id) {
			res.status(401).send({
				error: "You are not allowed to access this resource"
			})
		} else {
			const resources = await collectionModel.findAll({ where: { userId: req.params.id} })	

			const returnJson = {}
			returnJson[collectionName] = resources

			res.status(200).send(returnJson);	// sending as json response
		}
	}
}

// collection imports
const { Visualization } = require('../model/Visualization')
const { SurveyDesign } = require('../model/SurveyDesign');
const { PublishedSurvey } = require('../model/PublishedSurvey')

// get list of specific collection from user
router.get('/:id/visualizations', requireAuthentication, handleErrors(getUserCollection(Visualization, 'visualizations')))

router.get('/:id/surveyDesigns', requireAuthentication, handleErrors(getUserCollection(SurveyDesign, 'surveyDesigns')))

router.get('/:id/publishedSurveys', requireAuthentication, handleErrors(getUserCollection(PublishedSurvey, 'publishedSurveys')))


module.exports = router;