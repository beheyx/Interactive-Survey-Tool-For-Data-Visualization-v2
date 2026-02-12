// database imports
const { Question, QuestionClientFields } = require('../model/Question')
const { Visualization } = require('../model/Visualization')
const { requireAuthentication } = require('../lib/auth')
const { handleErrors, getResourceById } = require('../lib/error')
const { SurveyDesign } = require('../model/SurveyDesign')
const sequelize = require('../lib/sequelize')

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

// Refresh question numbers after deletion (safe even with UNIQUE(surveyDesignId, number))
async function renumberSurveyQuestions(surveyDesignId, transaction) {
  const questions = await Question.findAll({
    where: { surveyDesignId },
    order: [['number', 'ASC'], ['id', 'ASC']],
    transaction
  })

  // Phase 1: move out of the way to avoid unique collisions
  const OFFSET = 1000
  for (const q of questions) {
    await q.update({ number: q.number + OFFSET }, { transaction })
  }

  // Phase 2: rewrite 1..N
  for (let i = 0; i < questions.length; i++) {
    await questions[i].update({ number: i + 1 }, { transaction })
  }
}

/*
 * Get specific question info
 */
router.get('/:id', requireAuthentication, handleErrors(async (req, res, next) => {
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

/*
 * Delete specific question
 */
router.delete('/:id', requireAuthentication, handleErrors(async (req, res, next) => {
  const question = await getResourceById(Question, req.params.id)
  const surveyDesign = await getResourceById(SurveyDesign, question.surveyDesignId)

  if (req.userid != surveyDesign.userId) {
    return res.status(401).send({ error: "You do not have access to this resource" })
  }

  await sequelize.transaction(async (t) => {
    // delete visualization content first (no DB change, but keep behavior)
    if (question.visualizationContentId) {
      await visualApi.delete('/' + question.visualizationContentId)
    }

    // delete question row
    await question.destroy({ transaction: t })

    // renumber remaining questions in this survey
    await renumberSurveyQuestions(question.surveyDesignId, t)

    // touch parent updatedAt inside the same transaction
    await surveyDesign.changed('updatedAt', true)
    await surveyDesign.save({ transaction: t })
  })

  res.status(200).send()
}))


/*
 * Update specific question
 */
router.patch('/:id', requireAuthentication, handleErrors(async (req, res, next) => {
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
      await Question.update(
        { visualizationContentId: visualizationContentId },
        { where: { id: req.params.id } }
      )
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

/*
 * Move question UP (swap with previous question in same survey)
 * Trigger this with: POST /questions/:id/moveUp
 */
router.post('/:id/moveUp', requireAuthentication, handleErrors(async (req, res, next) => {
  const question = await getResourceById(Question, req.params.id)
  const surveyDesign = await getResourceById(SurveyDesign, question.surveyDesignId)

  if (req.userid != surveyDesign.userId) {
    return res.status(401).send({
      error: "You do not have access to this resource"
    })
  }

  const prevQuestion = await Question.findOne({
    where: {
      surveyDesignId: question.surveyDesignId,
      number: question.number - 1
    }
  })

  // Already first or gap in numbering
  if (!prevQuestion) {
    return res.status(200).send()
  }

  await sequelize.transaction(async (t) => {
    const currentNumber = question.number
    const prevNumber = prevQuestion.number

    await question.update({ number: prevNumber }, { transaction: t })
    await prevQuestion.update({ number: currentNumber }, { transaction: t })
  })

  await surveyDesign.changed('updatedAt', true);
  await surveyDesign.save();

  res.status(200).send()
}))

/*
 * Move question DOWN (swap with next question in same survey)
 * Trigger this with: POST /questions/:id/moveDown
 */
router.post('/:id/moveDown', requireAuthentication, handleErrors(async (req, res, next) => {
  const question = await getResourceById(Question, req.params.id)
  const surveyDesign = await getResourceById(SurveyDesign, question.surveyDesignId)

  if (req.userid != surveyDesign.userId) {
    return res.status(401).send({
      error: "You do not have access to this resource"
    })
  }

  const nextQuestion = await Question.findOne({
    where: {
      surveyDesignId: question.surveyDesignId,
      number: question.number + 1
    }
  })

  // Already last or gap in numbering
  if (!nextQuestion) {
    return res.status(200).send()
  }

  await sequelize.transaction(async (t) => {
    const currentNumber = question.number
    const nextNumber = nextQuestion.number

    await question.update({ number: nextNumber }, { transaction: t })
    await nextQuestion.update({ number: currentNumber }, { transaction: t })
  })

  await surveyDesign.changed('updatedAt', true);
  await surveyDesign.save();

  res.status(200).send()
}))

module.exports = router