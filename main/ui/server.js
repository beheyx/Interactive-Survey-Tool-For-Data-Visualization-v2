require('dotenv').config()
const { Parser } = require('json2csv');

// express setup
const express = require('express');
const app = express();
app.use(express.json());
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
        baseURL: process.env.MAIN_API_URL
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


// app.post('/users(/*)?', async (req, res, next) => {
//   const apiPageNames = {
//     '/users': 'register',
//     '/users/login': 'login'
//   };

//   const page = apiPageNames[req.originalUrl];

//   try {
//     // --- Frontend-side validation before calling API ---
//     if (req.originalUrl === '/users') {
//       const { name, password, confirm_password } = req.body;

//       // Check for empty fields
//       if (!name || !password || !confirm_password) {
//         return res.render(page, {
//           error: 'Please fill in all fields.',
//           name,
//           password,
//           confirm_password
//         });
//       }

//       // Check password match
//       if (password !== confirm_password) {
//         return res.render(page, {
//           error: 'Passwords do not match.',
//           name,
//           password,
//           confirm_password
//         });
//       }
//     }

//     // --- Relay post request to backend API ---
//     const response = await api.post(req.originalUrl, req.body);

//     // --- On success: save token and redirect ---
//     res.cookie('access_token', response.data.token, { httpOnly: true });
//     res.redirect('/register?success=true');
//     res.redirect(req.protocol + "://" + req.get("host"))

//   } catch (error) {
//     console.log('Full API error:', JSON.stringify(error.response.data, null, 2));

//     if (error.response) {
//       const data = error.response.data || {};
//       const status = error.response.status;
//       const combined = JSON.stringify(data).toLowerCase();

//       let errorMessage =
//         data.error ||
//         data.message ||
//         data.detail ||
//         'Registration failed.';

//       // --- Handle duplicate name ---
//       if (status === 400 && combined.includes('invalid') && req.body.name) {
//         errorMessage = 'User already exists.';
//       } else if (status === 409 || combined.includes('exist')) {
//         errorMessage = 'User already exists.';
//       } else if (combined.includes('invalid')) {
//         errorMessage = 'Invalid input. Please check your username and password.';
//       }

//       return res.render(page, {
//         error: errorMessage,
//         name: req.body.name,
//         password: req.body.password,
//         confirm_password: req.body.confirm_password
//       });
//     } else {
//       next(error);
//     }
//   }
// });

// handles what to do on ui registration, login, or logout
// app.post('/users(/*)?', async (req, res, next) => {

//     // map certain API endpoints to name of page to render
//     const apiPageNames = {
//         '/users': 'register',
//         '/users/login': 'login'
//     }

//     try {
//         // relay post request to api
//         const response = await api.post(req.originalUrl, req.body)

//         // save credentials as a cookie
//         res.cookie("access_token", response.data.token, { httpOnly: true })

//         // on success, go back to home page
//         res.redirect(req.protocol + "://" + req.get("host"))

//     } catch (error) {
//         if (error.response) {
//             // on fail, re-render page with error message
//             res.render(apiPageNames[req.originalUrl], {
//                 error: error.response.data.error
//             })
//         } else {
//             next(error)
//         }
//     }
// })


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
        error: error.response.data.error
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
            const questionResponse = await api.get(req.originalUrl + "/questions", withAuth(req.cookies.access_token))
            
            res.render("editsurveydesign", {
                name: response.data.name,
                id: response.data.id,
                title: response.data.title,
                introText: response.data.introText,
                questions: questionResponse.data.questions,
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

        if (req.query.downloadCSV) {
            const { data: pub } = await api.get(req.originalUrl, withAuth(req.cookies.access_token))
            const participants = pub.results?.participants || []
            // build one flat row per answer
            const records = []
            participants.forEach(p =>
              p.answers.forEach(a => {
                records.push({
                  participantId:    p.participantId,
                  questionNumber:   a.questionNumber,
                  response:         a.response,
                  comment:          a.comment
                })
              })
            )
      
            // defines column order
            const fields = [
              'participantId','questionNumber','response','comment'
            ]
            const parser = new Parser({ fields })
            const csv    = parser.parse(records)

            return res
            .status(200)
            .set({
              'Content-Type':        'text/csv',
              'Content-Disposition': `attachment; filename="${pub.name.replace(/\W+/g,'_')}-${pub.status}-results.csv"`
            })
            .send(csv)
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

        if (req.query.page && req.query.page < response.data.questions.length+2 && req.query.page > 0) {
            if (req.query.page == response.data.questions.length+1) {
                res.render("takeSurveyConclusion", {
                    layout: false,
                    conclusionText: response.data.surveyDesign.conclusionText,
                })

                // when this page is loaded, send cookie data to API
            
                const parsedAnswers = JSON.parse(req.cookies.answers)
                await api.patch(req.originalUrl, { answers: parsedAnswers.answers })
            } else {
                const questionTypes = (await import("./public/src/questionTypes.mjs")).default
                const question = response.data.questions.filter(obj => obj.number == req.query.page)[0]

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

        // refresh
        res.redirect(req.get('Referrer'))
        
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