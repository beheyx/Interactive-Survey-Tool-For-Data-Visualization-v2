const { ValidationError } = require('sequelize')

// 404 error class
class Error404 extends Error {
    constructor(message) {
        super(message)
        this.name = "Error404"
    }
}

// returns database row of resourceType with corresponding id
// if it does not exist throws a 404 error
//
// this function should be used in API endpoints so the error handler can catch it
exports.getResourceById = async function (resourceType, id) {
    const resource = await resourceType.findOne({ where : { id: id }})
    if (resource)
        return resource
    else
        throw new Error404()
}

// this function wraps the lambda code of an API endpoint to automatically handle some errors
exports.handleErrors = function (apiFunc) {
    return async (req, res, next) => {
        try {
            await apiFunc(req, res, next)
        } catch (e) {
            if (e instanceof ValidationError) {     // 400 - bad input
                res.status(400).send({
                    error: "Invalid input"
                })
            } else if (e instanceof Error404) {
                next()                              // 404 - missing resource
            } else if (e.status && e.message) {     // custom status/message error
                res.status(e.status).send({
                    error: e.message
                })
            } else {
                next(e)                             // 500 - server error
            }
        }
    }
}