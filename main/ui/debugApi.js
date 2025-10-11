// local JSON data that imitates database data
const LOCAL_JSON = {
    user: {
        id: 0,
        name: "DEBUG USER",
        password: "debug"
    },

    visualizations: [
        {
            id: 0,
            name: "debug visualization 1"
        },
        {
            id: 1,
            name: "debug visualization 2"
        },
    ],

    surveyDesigns: [
        {
            id: 0,
            userId: 0,
            name: "debug design 1",
            title: "debug design 1",
        },
        {
            id: 1,
            userId: 0,
            name: "debug design 2",
            title: "debug design 1",
        },
    ],

    questions: [
        {
            id: 0,
            surveyDesignId: 0,
            number: 1,
            text: "Please select one.",
            type: "Multiple Choice",
            required: true,
            allowComment: true,
            min: 1,
            max: 1,
            choices: "First|Second|Third"
        },
        {
            id: 1,
            surveyDesignId: 0,
            number: 2,
            text: "Please select two.",
            type: "Multiple Choice",
            required: true,
            allowComment: true,
            min: 2,
            max: 2,
            choices: "First|Second|Third"
        },
        {
            id: 2,
            surveyDesignId: 1,
            number: 1,
            text: "Please write in an answer.",
            type: "Short Answer",
            required: true,
            allowComment: true,
            min: 100,
            max: 500,
            choices: ""
        },
    ],

    publishedSurveys: [
        {
            id: 0,
            name: "debug survey 1",
            openDateTime: new Date("2025-01-01T01:00:00.000Z"),
            closeDateTime: new Date("2025-06-30T23:00:00.000Z"),
            status: "in progress",
            linkHash: "AB89887E",
            surveyDesign: {
                title: "Example Survey",
                introText: "Welcome to my survey!",
                conclusionText: "Thank you for taking my survey!",
            },
            questions: [
                {
                    number: 1,
                    text: "Please select two.",
                    type: "Multiple Choice",
                    required: true,
                    allowComment: true,
                    min: 2,
                    max: 2,
                    choices: "First|Second|Third"
                },

                {
                    number: 2,
                    text: "Write in an answer! Describe this visual.",
                    type: "Short Answer",
                    visualizationContentId: 10,
                    required: false,
                    allowComment: true,
                    min: 10,
                    max: 100
                },
                
                {
                    number: 3,
                    text: "Select the elements",
                    type: "Select Elements",
                    visualizationContentId: 2,
                    required: true,
                    allowComment: false,
                    min: 10,
                    max: 100
                },
            ],
            results: {
                participants: [
                    {
                        participantId: 0,
                        answers: [
                            {
                                questionNumber: 1,
                                comment: "person 1 comment 1",
                                response: "multiple|choice|response"
                            },
                            {
                                questionNumber: 2,
                                comment: "person 1 comment 2",
                                response: "Short answer response"
                            }
                        ]
                    },
                    {
                        participantId: 1,
                        answers: [
                            {
                                questionNumber: 1,
                                comment: "person 2 comment 1",
                                response: "select|elements|response"
                            },
                            {
                                questionNumber: 2,
                                comment: "person 2 comment 2",
                                response: "radio|buttons|response"
                            }
                        ]
                    }
                    
                ]
            }
            
        }
    ],
}

// Debug API Interface
// imitates axios API call methods, but instead this just manipulates local JSON data
class DebugApi {
    constructor() {
        this.debugData = LOCAL_JSON
    }

    get(path) {                                         // GET
        const pathLevels = path.split('?')[0].split('/')

        if (pathLevels[1] == "users") {
            if (pathLevels[2] && parseInt(pathLevels[2]) != NaN) {  // GET /users/{id}/{resource}
                if (this.debugData[pathLevels[3]]) {
                    const returnObj = {}
                    returnObj[pathLevels[3]] = this.debugData[pathLevels[3]]
                    return { data: returnObj }
                } else {
                    // collection does not exist
                    throw new Error()
                }
            } else {                                                // GET /users
                // here there is only one user
                return { data: this.debugData["user"] }
            }
        } else if (pathLevels[1] == "surveyDesigns" && pathLevels[3] == "questions") {  // GET /surveyDesigns/{id}/questions
            return {data: { questions: this.debugData.questions.filter(obj => obj.surveyDesignId == pathLevels[2]) } }
        } else if (pathLevels[1] == "takeSurvey") {                                     // GET /takeSurvey/{hash}
            return {data: this.debugData.publishedSurveys.filter(obj => obj.linkHash == pathLevels[2].split('?')[0])[0]}
        } else {
            const collection = this.debugData[pathLevels[1]]
            if (collection) {                                       // GET /{resource}/{id}
                // here the id just matches the index
                if (collection[pathLevels[2]]) {
                    return { data: collection[pathLevels[2]] }
                } else {
                    // id does not exist
                    throw new Error()
                }
            } else {
                // collection does not exist
                throw new Error()
            }
        }
    }

    post(path, body) {                                  // POST
        const pathLevels = path.split('/')              
        if (pathLevels[1] == "users") {
            // do nothing for users
            return
        } else if (pathLevels[1] == "surveyDesigns" && pathLevels[3] == "questions") {  // POST /surveyDesigns/{id}/questions
            const numOfQuestionsInSurvey = this.debugData.questions.filter(obj => obj.surveyDesignId == pathLevels[2]).length
            this.debugData.questions.push(body)
            this.debugData.questions[this.debugData.questions.length-1].number = numOfQuestionsInSurvey+1
            this.debugData.questions[this.debugData.questions.length-1].id = this.debugData.questions.length-1
            this.debugData.questions[this.debugData.questions.length-1].surveyDesignId = pathLevels[2]
        } else {
            const collection = this.debugData[pathLevels[1]]
            if (collection) {                                           // POST /{resource}
                // add new element to end of array
                collection.push(body)
                collection[collection.length-1].id = collection.length-1
            } else {
                // collection does not exist
                throw new Error()
            }
        }
        
    }

    delete(path) {                                      // DELETE
        const pathLevels = path.split('/')
        if (pathLevels[1] == "users") {
            // do nothing for users
            return
        } 
        const collection = this.debugData[pathLevels[1]]
        if (collection) {                                             // DELETE /{resource}/{id}
            // NOTE: deletes do not cascade, this may cause weird errors if you test deleting then other actions afterwards
            // this just removes the last element, regardless of id
            collection.pop()
        } else {
            // collection does not exist
            throw new Error()
        }
    }

    patch(path, body) {                                 // PATCH
        const pathLevels = path.split('/')              
        if (pathLevels[1] == "users") {
            // do nothing for users
            return
        } else if (pathLevels[1] == "takeSurvey") { 
            // do nothing
            return
        }
        const collection = this.debugData[pathLevels[1]]
        if (collection) {                                           
            // here the id just matches the index
            if (collection[pathLevels[2]]) {                            // PATCH /{resource}/{id}
                // replace the object, but keep the id
                if (pathLevels[1] == "questions") {
                    if (parseInt(body.visualizationId) < 0) {
                        collection[pathLevels[2]].visualizationContentId = null
                    } else {
                        body.visualizationContentId = body.visualizationId
                    }
                    
                    delete body.visualizationId
                }

                for (const property in body) {
                    collection[pathLevels[2]][property] = body[property]
                }
            } else {
                // id does not exist
                throw new Error()
            }
        } else {
            // collection does not exist
            throw new Error()
        }
    }

    put(path, body) {
        // not implemented
        throw new Error()
    }
}

module.exports = new DebugApi()