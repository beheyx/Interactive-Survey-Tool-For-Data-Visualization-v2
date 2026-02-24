require('dotenv').config()
const ExcelJS = require('exceljs') // using excel to download instead of csv for better formatting

// express setup
const express = require('express');
const compression = require('compression');
const app = express();

const { buildSurveyZipBundle, streamSurveyZip } = require("./public/src/export/surveyZipExport");


// Enable gzip compression for all responses
app.use(compression());

// Increase JSON body parser limit to 50MB to handle large survey data
app.use(express.json({ limit: '50mb' }));
const path = require('path');
app.use(express.static(path.join(__dirname, "public"), { extensions: ['html'] }))

// setup required for processing cookies
const cookieParser = require('cookie-parser');
app.use(cookieParser());

// setup axios API interface
const DEBUG = process.argv[2] == "-debug"
const axios = require('axios');
const api = (DEBUG) ? (
    // if running in debug mode, use fake debug API
    require('./debugApi')
) : (
    // else, use the real API
    axios.create({
        baseURL: process.env.MAIN_API_URL,
        maxContentLength: 50 * 1024 * 1024, // 50MB
        maxBodyLength: 50 * 1024 * 1024, // 50MB
        timeout: 120000 // 2 minutes
    })
)

// use this function as a parameter in an API call to send auth data
// this function just returns the authorization header using the parameter 'token'
function withAuth(token) {
    return { headers: { Authorization: `Bearer ${token}` } }
}

// body-parser setup
// needed to parse HTML form submissions for API requests
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));

// express-handlebars setup
// this dynamically renders pages
app.set('views', path.join(__dirname, 'views'));
const exphbs = require('express-handlebars');
app.engine("handlebars", exphbs.engine({
    defaultLayout: "main.handlebars",
    layoutsDir: path.join(app.get('views'), 'layouts'),
    partialsDir: path.join(app.get('views'), 'partials'),
    helpers: {
        eq: function(a, b) {
            return a === b;
        },
        formatDate: function(dateString) {
            if (!dateString) return "";
            const date = new Date(dateString);

            return date.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric"
            });
        }
    }
}))

app.set("view engine", "handlebars")

// Middleware to add authentication status and breadcrumbs to all renders
app.use(async (req, res, next) => {
    // Store original render function
    const originalRender = res.render;

    // Override render to inject common data
    res.render = function(view, options = {}, callback) {
        // Check if user is authenticated by checking for access token
        const isAuthenticated = !!req.cookies.access_token;

        // Merge authentication status with options
        const renderOptions = {
            isAuthenticated,
            ...options
        };

        // Call original render with merged options
        originalRender.call(this, view, renderOptions, callback);
    };

    next();
});



// some browsers request this automatically, ignoring for now
app.get('/favicon.ico', (req, res, next) => {
    return
})


// Default path
// when there is not path in the URL, go to generic homepage or user dashboard
app.get('/', async (req, res, next) => {
    let user = null
    
    try {
        // get user info
        const response = await api.get('/users', withAuth(req.cookies.access_token))
        user = response.data
    } catch (error) {
        if (error.response) {
            // if not logged in, display generic home page
            res.sendFile(path.join(__dirname, "public/home.html"))
        } else {
            next(error)
        }
    }

    // if logged in, display user dashboard
    if (user) {
        // get user visualizations
        let userVisualizations
        let userSurveyDesigns
        let userPublishedSurveys

        let visError = ""
        let surError = ""
        let pSurError = ""

        try {
            userVisualizations = await api.get(`/users/${user.id}/visualizations`, withAuth(req.cookies.access_token))
        } catch {
            visError = "Unable to load visualizations."
        }
        
        try {
            userSurveyDesigns = await api.get(`/users/${user.id}/surveyDesigns`, withAuth(req.cookies.access_token))
        } catch {
            surError = "Unable to load survey designs."
        }

        try {
            userPublishedSurveys = await api.get(`/users/${user.id}/publishedSurveys`, withAuth(req.cookies.access_token))
        } catch {
            pSurError = "Unable to load published surveys."
        }
                    
        res.render("dashboard", {
            name: user.name,
            visualizations: userVisualizations?.data.visualizations,
            surveyDesigns: userSurveyDesigns?.data.surveyDesigns,
            publishedSurveys: userPublishedSurveys?.data.publishedSurveys,
            visError: visError,
            surError: surError,
            pSurError: pSurError,
            activePage: 'home',
            breadcrumbs: [
                { label: 'Home', url: '/' }
            ]
        })
    }
    
});

// register page
app.get('/register', (req, res) => {
    res.render("register", { layout: false })
});

// login page
app.get('/login', (req, res) => {
    res.render("login", { layout: false })
});

// FAQ page - serves different version based on authentication
app.get('/faq', async (req, res, next) => {
    try {
        const userResponse = await api.get('/users', withAuth(req.cookies.access_token))

        // User is authenticated - show authenticated FAQ with sidebar
        res.render('faq-authenticated', {
            isAuthenticated: true,
            activePage: 'faq',
            breadcrumbs: [
                { label: 'Home', url: '/' },
                { label: 'FAQ', url: '/faq' }
            ]
        })
    } catch (error) {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            // Not authenticated - show public FAQ page
            res.sendFile(path.join(__dirname, "public/faq-public.html"))
        } else {
            next(error)
        }
    }
});

// About Us page - serves different version based on authentication
app.get('/about', async (req, res, next) => {
    try {
        await api.get('/users', withAuth(req.cookies.access_token));

        // Authenticated → Handlebars page with sidebar
        res.render('about-us', {
            isAuthenticated: true,
            activePage: 'about',
            breadcrumbs: [
                { label: 'Home', url: '/' },
                { label: 'About Us', url: '/about' }
            ]
        });
    } catch (error) {
        if (
            error.response &&
            (error.response.status === 401 || error.response.status === 403)
        ) {
            // Not authenticated → public page (no sidebar)
            res.sendFile(
                path.join(__dirname, 'public/about-public.html')
            );
        } else {
            next(error);
        }
    }
});


// existing visualizations page
app.get('/existing-visualizations', async (req, res, next) => {
    try {
        const userResponse = await api.get('/users', withAuth(req.cookies.access_token))
        const user = userResponse.data

        let userVisualizations
        let visError = ""

        try {
            userVisualizations = await api.get(`/users/${user.id}/visualizations`, withAuth(req.cookies.access_token))
        } catch {
            visError = "Unable to load visualizations."
        }

        res.render("existingVisualizations", {
            visualizations: userVisualizations?.data.visualizations,
            visError: visError,
            activePage: 'visualizations',
            breadcrumbs: [
                { label: 'Home', url: '/' },
                { label: 'Visualizations', url: '/existing-visualizations' }
            ]
        })
    } catch (error) {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            res.redirect('/login')
        } else {
            next(error)
        }
    }
});

// existing survey designs page
app.get('/existing-survey-designs', async (req, res, next) => {
    try {
        const userResponse = await api.get('/users', withAuth(req.cookies.access_token))
        const user = userResponse.data

        let userSurveyDesigns
        let surError = ""

        try {
            userSurveyDesigns = await api.get(`/users/${user.id}/surveyDesigns`, withAuth(req.cookies.access_token))
        } catch {
            surError = "Unable to load survey designs."
        }

        res.render("existingSurveyDesigns", {
            surveyDesigns: userSurveyDesigns?.data.surveyDesigns,
            surError: surError,
            activePage: 'surveys',
            breadcrumbs: [
                { label: 'Home', url: '/' },
                { label: 'Survey Designs', url: '/existing-survey-designs' }
            ]
        })
    } catch (error) {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            res.redirect('/login')
        } else {
            next(error)
        }
    }
});

// existing published surveys page
app.get('/existing-published-surveys', async (req, res, next) => {
    try {
        const userResponse = await api.get('/users', withAuth(req.cookies.access_token))
        const user = userResponse.data

        let userPublishedSurveys
        let pSurError = ""

        try {
            userPublishedSurveys = await api.get(`/users/${user.id}/publishedSurveys`, withAuth(req.cookies.access_token))
        } catch {
            pSurError = "Unable to load published surveys."
        }

        res.render("existingPublishedSurveys", {
            publishedSurveys: userPublishedSurveys?.data.publishedSurveys,
            pSurError: pSurError,
            activePage: 'published',
            breadcrumbs: [
                { label: 'Home', url: '/' },
                { label: 'Published Surveys', url: '/existing-published-surveys' }
            ]
        })
    } catch (error) {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            res.redirect('/login')
        } else {
            next(error)
        }
    }
});


// REGISTER — popup only, no cookie
app.post('/users', async (req, res, next) => {
  try {
    await api.post('/users', req.body);
    res.redirect('/register?success=true');
  } catch (error) {
    if (error.response) {
      res.render('register', {
        layout: false,
        error: error.response.data.error,
        name: req.body.name,
        password: req.body.password,
        confirm_password: req.body.confirm_password
      });
    } else {
      next(error);
    }
  }
});


// LOGIN and LOGOUT — handled by the old universal handler
app.post('/users(/*)?', async (req, res, next) => {
  const apiPageNames = {
    '/users/login': 'login',
    '/users/logout': 'logout'
  };

  try {
    const response = await api.post(req.originalUrl, req.body);
    res.cookie('access_token', response.data.token, { httpOnly: true });

    // redirect home (works for both login and logout)
    res.redirect(req.protocol + '://' + req.get('host'));
  } catch (error) {
    if (error.response) {
      res.render(apiPageNames[req.originalUrl], {
        layout: false,
        error: error.response.data.error,
        name: req.body.name,
        password: req.body.password
      });
    } else {
      next(error);
    }
  }
});



// page of specific visualization
app.get('/visualizations/:id', async (req, res, next) => {
    try {
        // relay post request to api
        const response = await api.get(req.originalUrl, withAuth(req.cookies.access_token))

        // on success, refresh page
        res.render("visualization", {
            name: response.data.name,
            id: response.data.contentId,
            visualizationId: response.data.id,   // real ID from MYSQL, used to delete visualization
            visualURL: process.env.VISUAL_UI_URL,
            activePage: 'visualizations',
            breadcrumbs: [
                { label: 'Home', url: '/' },
                { label: 'Visualizations', url: '/existing-visualizations' },
                { label: response.data.name, url: `/visualizations/${req.params.id}` }
            ]
        })

    } catch (error) {
        next(error)
    }
});

// Edit survey design
app.get('/surveyDesigns/:id', async (req, res, next) => {
    let response = null

    try {
        response = await api.get(req.originalUrl, withAuth(req.cookies.access_token))
    } catch (error) {
        next(error)
    }

    if (response) {

        const localOffset = new Date(Date.now()).getTimezoneOffset()
        const today = new Date(Date.now() - (localOffset * 60000))
        const tomorrow = new Date(Date.now() + 86400000 - (localOffset * 60000))

        try {
            const questionResponse = await api.get(
                req.originalUrl + "/questions",
                withAuth(req.cookies.access_token)
            )

            // 🔽 Sort questions by their number before rendering
            const questions = (questionResponse.data.questions || [])
                .slice()
                .sort((a, b) => a.number - b.number)
            
            res.render("editsurveydesign", {
                name: response.data.name,
                id: response.data.id,
                title: response.data.title,
                introText: response.data.introText,
                questions: questions,
                conclusionText: response.data.conclusionText,
                today: today.toISOString().substring(0, 16),
                tomorrow: tomorrow.toISOString().substring(0, 16),
                visualURL: process.env.VISUAL_UI_URL,
                activePage: 'surveys',
                breadcrumbs: [
                    { label: 'Home', url: '/' },
                    { label: 'Survey Designs', url: '/existing-survey-designs' },
                    { label: response.data.name, url: `/surveyDesigns/${req.params.id}` }
                ]
            })
        } catch (error) {
            res.render("editsurveydesign", {
                name: response.data.name,
                id: response.data.id,
                title: response.data.title,
                introText: response.data.introText,
                questionError: "Unable to load questions",
                conclusionText: response.data.conclusionText,
                today: today.toISOString().substring(0, 16),
                tomorrow: tomorrow.toISOString().substring(0, 16),
                visualURL: process.env.VISUAL_UI_URL,
                activePage: 'surveys',
                breadcrumbs: [
                    { label: 'Home', url: '/' },
                    { label: 'Survey Designs', url: '/existing-survey-designs' },
                    { label: response.data.name, url: `/surveyDesigns/${req.params.id}` }
                ]
            })
        }
    }

    
});

// button for publishing survey design
app.post('/surveyDesigns/:id/publishedSurveys', async (req, res, next) => {
    try {
        await api.post(req.originalUrl, req.body, withAuth(req.cookies.access_token))
        res.redirect(req.protocol + "://" + req.get("host"))
    } catch (error) {
        next(error)
    }
})

// Edit survey question
app.get('/questions/:id', async (req, res, next) => {
    try {
        const questionTypes = (await import("./public/src/questionTypes.mjs")).default
        const response = await api.get(req.originalUrl, withAuth(req.cookies.access_token))
        const designResponse = await api.get(`/surveyDesigns/${response.data.surveyDesignId}`, withAuth(req.cookies.access_token))
        const visualResponse = await api.get(`/users/${designResponse.data.userId}/visualizations`, withAuth(req.cookies.access_token))

        let editQuestionTypes = []
        for (const type of questionTypes) {
            editQuestionTypes.push({
                name: type.name,
                label: type.label,
                selected: response.data.type == type.name
            })
        }
        
        res.render("editquestion", {
            number: response.data.number,
            id: response.data.id,
            surveyDesignId: response.data.surveyDesignId,
            text: response.data.text,
            questionTypes: editQuestionTypes,
            choices: response.data.choices,
            min: response.data.min,
            max: response.data.max,
            visualizations: visualResponse.data.visualizations,
            visualizationContentId: response.data.visualizationContentId,
            required: response.data.required,
            allowComment: response.data.allowComment,
            visualURL: process.env.VISUAL_UI_URL,
            DEBUG: DEBUG,
            breadcrumbs: [
                    { label: 'Home', url: '/' },
                    { label: 'Survey Designs', url: '/existing-survey-designs' },
                    { label: `${designResponse.data.name}`, url: `/surveyDesigns/${response.data.surveyDesignId}` },
                    { label: 'Question '+response.data.number, url: req.originalUrl }
                ]
        })

    } catch (error) {
        next(error)
    }
});

async function buildSurveyPreviewData(surveyId, token) {

  const { data: pub } = await api.get(
    `/publishedSurveys/${surveyId}`,
    withAuth(token)
  )

  const participants = pub.results?.participants || []
  const questions = (pub.questions || [])
    .slice()
    .sort((a, b) => (Number(a.number ?? 0) - Number(b.number ?? 0)) || (Number(a.id ?? 0) - Number(b.id ?? 0)))

  const questionTables = questions.map(question => {

    const rows = []

    participants.forEach(p => {

      if (!Array.isArray(p.answers)) return

      const answer = p.answers.find(
        a => String(a.questionNumber) === String(question.number)
      )

      if (!answer) return

      rows.push({
        participantId: p.participantId,
        response: answer.response,
        comment: answer.comment ?? ""
      })
    })

    return {
      questionNumber: question.number,
      questionText: question.text,
      rows
    }
  })

  return {questionTables, pub}
}

// Building the Excel output for survey results download so it looks nicer and organized 
async function buildSurveyWorkbook(surveyId, token) {

  const { data: pub } = await api.get(
    `/publishedSurveys/${surveyId}`,
    withAuth(token)
  )

  const participants = pub.results?.participants || []
  const questions = (pub.questions || [])
    .slice()
    .sort((a, b) => (Number(a.number ?? 0) - Number(b.number ?? 0)) || (Number(a.id ?? 0) - Number(b.id ?? 0)))

  const workbook = new ExcelJS.Workbook()

  questions.forEach(question => {

    // Create sheet named after question number
    const sheet = workbook.addWorksheet(`Question ${question.number}`)

    // Row 1 → Question text
    sheet.addRow([`Question ${question.number}: ${question.text}`])

    // Make it bold
    sheet.getRow(1).font = { bold: true }

    // Row 2 → headers
    sheet.addRow([
      'Participant ID',
      'Response',
      'Comment'
    ])
    sheet.getRow(2).font = { bold: true } // Bold

    // Populate answers
    participants.forEach(p => {

      if (!Array.isArray(p.answers)) return

      const answer = p.answers.find(
        a => String(a.questionNumber) === String(question.number)
      )

      if (!answer) return

      sheet.addRow([
        p.participantId,
        answer.response,
        answer.comment ?? ""
      ])
    })

    sheet.columns = [
        { width: 20 },
        { width: 40 },
        { width: 40 }
    ]
    sheet.getColumn(1).alignment = { horizontal: 'left' }

    // header stays frozen at top, question text stays frozen above that
    sheet.views = [
        { state: 'frozen', ySplit: 2 }
    ]

  })

  return { pub, workbook }
}

// View published survey
app.get('/publishedSurveys/:id', async (req, res, next) => {
    try {
        const response = await api.get(req.originalUrl, withAuth(req.cookies.access_token))
        let openDateTime
        let closeDateTime
        if (response.data.openDateTime instanceof Date) {
            openDateTime = response.data.openDateTime
        } else {
            openDateTime = new Date(response.data.openDateTime)
        }

        if (response.data.closeDateTime instanceof Date) {
            closeDateTime = response.data.closeDateTime
        } else {
            closeDateTime = new Date(response.data.closeDateTime)
        }

        if (req.query.downloadZip) {
            const { data: pub } = await api.get(
                `/publishedSurveys/${req.params.id}`,
                withAuth(req.cookies.access_token)
            );

            const visualUiUrl = process.env.VISUAL_UI_INTERNAL_URL || process.env.VISUAL_UI_URL;

            const { workbook, images } = await buildSurveyZipBundle({
                pub,
                visualUiUrl
            });

            await streamSurveyZip(res, {
                pubName: pub.name,
                pubStatus: pub.status,
                workbook,
                images
            });

            return;
        }


        if (req.query.downloadExcel) {

            const { pub, workbook } =
                await buildSurveyWorkbook(req.params.id, req.cookies.access_token)

            res.setHeader(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )

            res.setHeader(
                'Content-Disposition',
                `attachment; filename="${pub.name.replace(/\W+/g,'_')}-${pub.status}-results.xlsx"`
            )

            await workbook.xlsx.write(res)

            return res.end()
        }


        else {
            // Format dates and times for separate date/time inputs
            const localOffset = new Date().getTimezoneOffset() * 60000
            const openLocal = new Date(openDateTime - localOffset)
            const closeLocal = new Date(closeDateTime - localOffset)

            // Split into date (YYYY-MM-DD) and time (HH:MM) parts
            const openDate = openLocal.toISOString().slice(0, 10)
            const openTime = openLocal.toISOString().slice(11, 16)
            const closeDate = closeLocal.toISOString().slice(0, 10)
            const closeTime = closeLocal.toISOString().slice(11, 16)

            // Calculate response count
            const responseCount = response.data.results?.participants?.length || 0

            res.render('publishedSurvey', {
                id: req.params.id,
                name: response.data.name,
                openDateTime: openDateTime,
                closeDateTime: closeDateTime,
                openDate: openDate,
                openTime: openTime,
                closeDate: closeDate,
                closeTime: closeTime,
                responseCount: responseCount,
                status: response.data.status,
                url: process.env.MAIN_UI_URL + '/takeSurvey/' + response.data.linkHash,
                activePage: 'published',
                breadcrumbs: [
                    { label: 'Home', url: '/' },
                    { label: 'Published Surveys', url: '/existing-published-surveys' },
                    { label: response.data.name, url: `/publishedSurveys/${req.params.id}` }
                ]
            })
        }

    } catch (error) {
        next(error)
    }
});

// Allow user to preview results
app.get('/publishedSurveys/:id/preview', async (req, res, next) => {
  try {
    const { questionTables, pub } =
        await buildSurveyPreviewData(req.params.id, req.cookies.access_token)

    res.render('publishedSurveyPreview', {
    layout: false, 
    questionTables,
    title: pub.name,

    })
  } catch (err) {
    next(err)
  }
})

// handle ui button for saving questions
app.post('/questions/:id/PATCH', async (req, res, next) => {
    try {
        // convert to boolean before send
        req.body.allowComment = !!req.body.allowComment
        req.body.required = !!req.body.required

        const response = await api.patch(req.originalUrl.split('/PATCH')[0], req.body, withAuth(req.cookies.access_token))
        const importVis = req.body.visualizationId
        if (importVis == ""){
            // redirect to top of page
            res.redirect(req.get('Referrer'))
        } else {
            // redirect to visualization section
            res.redirect(req.get('Referrer')+"#visualizationId")
        }
        
    } catch (error) {
        next(error)
    }
})

// links for taking surveys
app.get('/takeSurvey/:hash', async (req, res, next) => {
    try {
        const response = await api.get(req.originalUrl)

        // Check if survey is accepting responses
        if (response.data.status !== "in-progress") {
            return res.render("takeSurveyConclusion", {
                layout: false,
                title: response.data.surveyDesign?.title || "Survey",
                headingText: response.data.status === "pending" ? "Survey Not Yet Open" : "Survey Closed",
                conclusionText: response.data.status === "pending"
                    ? "This survey has not opened yet. Please check back later."
                    : "This survey is now closed and is no longer accepting responses.",
                hideProgress: true
            })
        }

        // Normalize published questions: sort + force sequential numbering (1..N)
        const normalizedQuestions = (response.data.questions || [])
            .slice()
            .sort((a, b) => (Number(a.number ?? 0) - Number(b.number ?? 0)) || (Number(a.id ?? 0) - Number(b.id ?? 0)))
            .map((q, idx) => ({ ...q, number: idx + 1 }))

        // Overwrite the questions used by the rest of this handler
        response.data.questions = normalizedQuestions

        if (req.query.page && req.query.page < response.data.questions.length+2 && req.query.page > 0) {
            if (req.query.page == response.data.questions.length + 1) {
                const parsedAnswers = req.cookies.answers ? JSON.parse(req.cookies.answers) : { answers: [] }
                await api.patch(req.originalUrl, { answers: parsedAnswers.answers })

                //clear cookie before sending response
                res.clearCookie("answers")

                //render conclusion page
                return res.render("takeSurveyConclusion", {
                    layout: false,
                    title: response.data.surveyDesign.title,
                    conclusionText: response.data.surveyDesign.conclusionText,
                })
            } else {
                const questionTypes = (await import("./public/src/questionTypes.mjs")).default
                const question = response.data.questions[Number(req.query.page) - 1]
                if (!question) return next()

                let comment = ""
                let userResponse = ""
                if (req.cookies.answers) {
                    const parsedAnswers = JSON.parse(req.cookies.answers)

                    if (parsedAnswers.hash == req.params.hash) {
                        const matchingAnswers = parsedAnswers.answers.filter(obj => obj?.questionNumber == question.number)

                        if (matchingAnswers.length > 0) {
                            const match = matchingAnswers[0]
                            comment = match.comment
                            userResponse = match.response
                        }
                    }
                }

                const typeInfo = questionTypes.filter(type => type.name == question.type)[0]

                let choices = []
                if (typeInfo.hasChoices) {
                    const qChoices = question.choices.split('|')
                    const userSelections = userResponse.split('|')

                    for (let i = 0; i < qChoices.length; i++)
                        choices.push({ id: `choice${i}`, choice: qChoices[i], checked: userSelections.includes(qChoices[i]) })
                }        

                res.render("takeSurveyPage", {
                    layout: false,
                    title: response.data.surveyDesign.title,
                    linkHash: response.data.linkHash,
                    text: question.text,
                    visualURL: process.env.VISUAL_UI_URL,
                    visualModeLabel: typeInfo.visualModeLabel,
                    visualizationContentId: question.visualizationContentId,
                    number: question.number,
                    progress: question.number-1,
                    total: response.data.questions.length,
                    percent: (((question.number-1) / response.data.questions.length) * 100).toFixed(2),
                    choices: choices,
                    prompt: typeInfo.getPromptString(question.min, question.max),
                    allowComment: question.allowComment,
                    min: question.min,
                    max: question.max,
                    required: question.required,
                    questionType: question.type,
                    comment: comment,
                    response: userResponse,
                    prev: question.number-1,
                    next: question.number+1,
                    nextText: (question.number == response.data.questions.length) ? "Finish & Submit" : "Next Question",
                    DEBUG: DEBUG,
                    ...typeInfo?.pageRenderOptions
                })
            }
        } else if (!req.query.page || req.query.page == 0) {
            res.render("takeSurveyWelcome", {
                layout: false,
                linkHash: response.data.linkHash,
                title: response.data.surveyDesign.title,
                introText: response.data.surveyDesign.introText
            })
        } else {
            next()
        }

        
    } catch (error) {
        next(error)
    }
})


app.get('/profile', async (req, res, next) => {
    try {
        // Get user info from API
        const response = await api.get('/users', withAuth(req.cookies.access_token));
        const user = response.data;

        res.render('profile', {
            layout: 'main',
            activePage: 'profile',
            user,
            breadcrumbs: [
                { label: 'Home', url: '/' },
                { label: 'Profile', url: '/profile' }
            ]
        });

    } catch (error) {
        if (error.response &&
           (error.response.status === 401 || error.response.status === 403)) {
            return res.redirect('/login');
        }
        next(error);
    }
});

// for saving cookie data while taking survey
app.patch('/takeSurvey/:hash', async (req, res, next) => {
    let answers = null
    if (req.cookies.answers) {
        answers = JSON.parse(req.cookies.answers)
    }

    if (!answers || answers.hash != req.params.hash) {
        answers = { hash: req.params.hash, answers: [] }
    }

    let isReplacement = false
    for (let i = 0; i < answers.answers.length && !isReplacement; i++) {
        if (answers.answers[i] && answers.answers[i].questionNumber == req.body.answer.questionNumber) {
            answers.answers[i] = req.body.answer
            isReplacement = true
        }
    }

    if (!isReplacement)
        answers.answers.push(req.body.answer)

    res.cookie("answers", JSON.stringify(answers), { httpOnly: true })
    res.send()
})

// handle ui button for editing published survey dates
app.post('/publishedSurveys/:id/PATCH', async (req, res, next) => {
    try {
        // Combine separate date and time fields into Date objects
        if (req.body.openDate && req.body.openTime) {
            req.body.openDateTime = new Date(`${req.body.openDate}T${req.body.openTime}`)
            delete req.body.openDate
            delete req.body.openTime
        }
        if (req.body.closeDate && req.body.closeTime) {
            req.body.closeDateTime = new Date(`${req.body.closeDate}T${req.body.closeTime}`)
            delete req.body.closeDate
            delete req.body.closeTime
        }

        const response = await api.patch(req.originalUrl.split('/PATCH')[0], req.body, withAuth(req.cookies.access_token))
        res.redirect(req.get('Referrer'))
    } catch (error) {
        next(error)
    }
})

// Specific route for deleting current visualization
app.post('/visualizations/:id/DELETE', async (req, res, next) => {
  try {
    console.log("Deleting visualization:", req.params.id);

    await api.delete(`/visualizations/${req.params.id}`, withAuth(req.cookies.access_token));

    return res.redirect('/existing-visualizations');
  } catch (error) {
    console.log("DELETE visualization failed:");
    next(error);
  }
});

// Specific route for deleting current survey design
app.post('/surveyDesigns/:id/DELETE', async (req, res, next) => {
  try {
    await api.delete(`/surveyDesigns/${req.params.id}`, withAuth(req.cookies.access_token));
    return res.redirect('/existing-survey-designs');
  } catch (error) {
    next(error);
  }
});

// Specific route for deleting published surveys
app.post('/publishedSurveys/:id/DELETE', async (req, res, next) => {
  try {
    await api.delete(`/publishedSurveys/${req.params.id}`, withAuth(req.cookies.access_token));
    return res.redirect('/existing-published-surveys');
  } catch (error) {
    next(error);
  }
});


// handle ui buttons for POST, PATCH, and DELETE for user resource collections (such as visualizations, survey designs)
app.post('/:resource/:id?/:method?', async (req, res, next) => {
    let response

    try {
        // relay request to api
        switch (req.params.method) {
            case 'PATCH':
                response = await api.patch(req.originalUrl.split('/PATCH')[0], req.body, withAuth(req.cookies.access_token))
                break;
            case 'DELETE':
                response = await api.delete(req.originalUrl.split('/DELETE')[0], withAuth(req.cookies.access_token))
                break;
            case 'POST':
                response = await api.post(req.originalUrl.split('/POST')[0], req.body, withAuth(req.cookies.access_token))
                break;
            default:
                response = await api.post(req.originalUrl, req.body, withAuth(req.cookies.access_token))
        }

        // If openInEditor is set and we have a created resource ID, redirect to editor
        if (req.body.openInEditor && response.data && response.data.id) {
            res.redirect(`/${req.params.resource}/${response.data.id}`)
        } else {
            // refresh
            res.redirect(req.get('Referrer'))
        }

    } catch (error) {
        next(error)
    }
})


// anything else is 404
app.use('*', function (req, res, next) {
    res.sendFile(path.join(__dirname, "public/404.html"))
})

// error case
app.use('*', function (err, req, res, next) {
    switch(err.response?.status) {
        case 400:
            res.sendFile(path.join(__dirname, "public/badrequest.html"))
            break;
        case 401:
        case 403:
            res.sendFile(path.join(__dirname, "public/unauthorized.html"))
            break;
        case 404:
            res.sendFile(path.join(__dirname, "public/404.html"))
            break;
        default:
            console.error("== Error:", err)
            res.sendFile(path.join(__dirname, "public/internalerror.html"))
    }
})

// start server
app.listen(process.env.MAIN_UI_PORT, '0.0.0.0', function () {
    console.log("== Server is running on port", process.env.MAIN_UI_PORT)
});