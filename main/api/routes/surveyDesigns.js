// database imports
const { SurveyDesign, SurveyDesignClientFields } = require('../model/SurveyDesign')
const { Question, QuestionClientFields } = require('../model/Question')
const { PublishedSurvey, PublishedSurveyClientFields } = require('../model/PublishedSurvey')
const { requireAuthentication } = require('../lib/auth')
const { handleErrors, getResourceById } = require('../lib/error')

// sequelize (for transactions)
const sequelize = require('../lib/sequelize')

// setup express router
const express = require('express')
const router = express.Router()

// setup cookie parser
const cookieParser = require('cookie-parser')
router.use(cookieParser())

// Create new survey design
router.post('/', requireAuthentication, handleErrors(async (req, res, next) => {
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
router.get('/:id', requireAuthentication, handleErrors(async (req, res, next) => {
  const surveyDesign = await getResourceById(SurveyDesign, req.params.id)

  if (req.userid == surveyDesign.userId) {
    res.status(200).json(surveyDesign)
  } else {
    res.status(401).send({
      error: "You do not have access to this resource"
    })
  }
}))

// Delete specific survey design
router.delete('/:id', requireAuthentication, handleErrors(async (req, res, next) => {
  const surveyDesign = await getResourceById(SurveyDesign, req.params.id)

  if (req.userid == surveyDesign.userId) {
    await surveyDesign.destroy()
    res.status(200).send()
  } else {
    res.status(401).send({
      error: "You do not have access to this resource"
    })
  }
}))

// Update specific survey design
router.patch('/:id', requireAuthentication, handleErrors(async (req, res, next) => {
  const surveyDesign = await getResourceById(SurveyDesign, req.params.id)

  if (req.userid == surveyDesign.userId) {
    await SurveyDesign.update(req.body, {
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
router.get('/:id/questions', requireAuthentication, handleErrors(async (req, res, next) => {
  const surveyDesign = await getResourceById(SurveyDesign, req.params.id)

  // verify correct id
  if (req.userid != surveyDesign.userId) {
    res.status(401).send({
      error: "You are not allowed to access this resource"
    })
  } else {
    const questions = await Question.findAll({
      where: { surveyDesignId: req.params.id },
      order: [['number', 'ASC'], ['id', 'ASC']]
    })

    res.status(200).send({ questions: questions }) // sending as json response
  }
}))

// Create new question
router.post('/:id/questions', requireAuthentication, handleErrors(async (req, res, next) => {
  const surveyDesign = await getResourceById(SurveyDesign, req.params.id)

  if (req.userid != surveyDesign.userId) {
    return res.status(401).send({ error: "You are not allowed to access this resource" })
  }

  // Get next number based on max existing number (not count)
  const maxNumber = await Question.max('number', { where: { surveyDesignId: req.params.id } })
  const nextNumber = (maxNumber || 0) + 1

  const questionData = {
    surveyDesignId: req.params.id,
    number: nextNumber
  }

  const question = await Question.create(questionData, QuestionClientFields)

  await surveyDesign.changed('updatedAt', true)
  await surveyDesign.save()

  res.status(201).send({ id: question.id })
}))

// Publish a survey (robust: renumber ALL questions first, then filter)
router.post('/:id/publishedSurveys', requireAuthentication, handleErrors(async (req, res) => {
  const surveyDesign = await getResourceById(SurveyDesign, req.params.id)

  if (req.userid != surveyDesign.userId) {
    return res.status(401).send({ error: "You are not allowed to access this resource" })
  }

  const publishedSurvey = await sequelize.transaction(async (transaction) => {

    // 1) Pull ALL questions in stable order
    const all = await Question.findAll({
      where: { surveyDesignId: req.params.id },
      order: [['number', 'ASC'], ['id', 'ASC']],
      transaction
    })

    // 2) Force DB to be a clean 1..N sequence (fixes duplicates/gaps)
    for (let i = 0; i < all.length; i++) {
      const desired = i + 1
      if (all[i].number !== desired) {
        await all[i].update({ number: desired }, { transaction })
      }
    }

    // 3) Build published snapshot from the now-clean order, filtering empties
    const nonEmpty = all.filter(q => q.text && q.text.trim() !== '')

    // Renumber *snapshot* sequentially (so published has 1..M with no blanks)
    const snapshotQuestions = nonEmpty.map((q, idx) => ({
      ...q.toJSON(),
      number: idx + 1
    }))

    const publishedSurveyData = {
      userId: surveyDesign.userId,
      name: req.body.name,
      openDateTime: new Date(req.body.openDateTime),
      closeDateTime: new Date(req.body.closeDateTime),
      surveyDesign: surveyDesign.toJSON ? surveyDesign.toJSON() : surveyDesign,
      questions: snapshotQuestions
    }

    // IMPORTANT: correct create signature
    const created = await PublishedSurvey.create(publishedSurveyData, {
      fields: PublishedSurveyClientFields,
      transaction
    })

    // Touch updatedAt so UI sees the change
    await surveyDesign.changed('updatedAt', true)
    await surveyDesign.save({ transaction })

    return created
  })

  res.status(201).send({ id: publishedSurvey.id })
}))

module.exports = router
