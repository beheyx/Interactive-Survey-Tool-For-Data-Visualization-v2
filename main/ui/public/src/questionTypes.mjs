/** questionTypes.js
 * 
 *  USE THIS FILE TO ADD NEW QUESTION TYPES
 *  
 *  Simply add a new object to the questionTypes array below
 *  The object must follow this format:
 * 
 *  {
 *      name: string
 *          // the internal name of the question type
 * 
 *      label: string
 *          // label for the question type in the survey editor
 * 
 *      description: string
 *          // description for the question type in the survey editor
 * 
 *      hasRequired: bool
 *          // true if the question type can be set to required
 * 
 *      hasMinMax: bool
 *          // true if the question type has minimum and maximum properties
 * 
 *      hasChoices: bool
 *          // true if the question type has pre-set choices that the user selects from
 * 
 *      minText: string
 *          // label for the minimum property in the editor
 * 
 *      maxText: string
 *          // label for the maximum property in the editor
 * 
 *      requiresVisual: bool
 *          // true if the question type requires a visual
 * 
 *      visualModeLabel: string
 *          // the string associated with the mode to enter in when a visual is displayed
 * 
 *      getPromptString: function(min: int, max: int) -> string
 *          // function that returns a string for the prompt that is displayed while taking the survey
 *          // the prompt is usually based on the minimum and maximum requirement for the question
 *          
 *      checkRequirement: function(min: int, max: int, required: bool, onFailure: function(string), onSuccess: function())
 *          // function that checks the current answer against the requirement (min and max parameters, which are integers)
 *          // if the user has failed to meet the requirement, call the callback onFailure(message) where message is a string telling the user what they did wrong
 *          // if the user has succeeded, call the callback onSuccess()
 *          // this function is capable of manipulating the DOM
 * 
 *      getResponse: function(onGet: function())
 *          // function that collects the response, formats it into a string, and passes it through the callback onGet(response)
 *          // this function is capable of manipulating the DOM
 * 
 *      (optional) onPageLoaded: function()
 *          // function that is called when the page with the question is finished loading while taking the survey
 *          // this function is capable of manipulating the DOM
 * 
 *      (optional) onVisualLoaded: function()
 *          // function that is called when the visualization window is finsished loading while taking the survey
 *          // this function is capable of manipulating the DOM
 * 
 *      (optional) pageRenderOptions: Object
 *          // object containing addtional options that are passed through when rendering the question page while taking the survey
 *          // you must edit takeSurveyPage.handlebars if you want to change how the html is rendered for the specific question type
 *  }
 * 
 * 
 ***************************************************************************************************************************************************************/


const questionTypes = [
    /**************************************************************************** 
     * Multiple Choice
    *****************************************************************************/
    {
        name: "Multiple Choice",
        label: "Multiple Choice",
        description: "User checks boxes from a list of pre-written choices as a response.",
        hasRequired: true,
        hasMinMax: true,
        hasChoices: true,
        minText: "Minimum required selections",
        maxText: "Maximum allowed selections",
        requiresVisual: false,
        visualModeLabel: "highlight",
        getPromptString: function(min, max) {
            let requirement = ""

            if (min < 1 && max < 1) {
                requirement = "items"
            } else if (min == max) {
                if (min == 1)
                    requirement = "exactly 1 item"
                else 
                    requirement = `exactly ${min} items`
            } else if (max < 1) {
                if (min == 1)
                    requirement = "at least 1 item"
                else
                    requirement = `at least ${min} items`
            } else if (min < 1) {
                if (max == 1)
                    requirement = "at most 1 item"
                else
                    requirement = `at most ${max} items`
            } else {
                requirement = `${min} to ${max} items`
            }

            return `Select ${requirement}:`
        },
        checkRequirement: function(min, max, required, onFailure, onSuccess) {
            const boxes = document.getElementsByClassName("multiple-choice-box")
            let total = 0
            for (const box of boxes) {
                if (box.checked) {
                    total += 1
                }
            }

            if (max > 0 && total > max) {
                if (max > 1)
                    onFailure(`You cannot select more than ${max} choices`)
                else
                    onFailure("You cannot select more than 1 choice")
            } else if (min > 0 && total < min) {
                if (min > 1)
                    onFailure(`You must select at least ${min} choices`)
                else
                    onFailure("You must select at least 1 choice")
            } else {
                onSuccess()
            }
        },
        getResponse: function(onGet) {
            const boxes = document.getElementsByClassName("multiple-choice-box")
            let response = ""
            for (const box of boxes) {
                if (box.checked) {
                    response += box.value + '|'
                }
            }

            if (response == "")
                onGet(response)
            else
                onGet(response.slice(0, -1))
        },
        pageRenderOptions: {
            multipleChoice: true
        }
    },
    /**************************************************************************** 
     * Radio Choice
    *****************************************************************************/
    {
        name: "Radio Choice",
        label: "Radio Choice",
        description: "User selects one choice from a list of pre-written choices as a response.",
        hasRequired: true,
        hasMinMax: false,
        hasChoices: true,
        minText: "",
        maxText: "",
        requiresVisual: false,
        visualModeLabel: "highlight",
        getPromptString: function(min, max) {
            return "Select 1 choice:"
        },
        checkRequirement: function(min, max, required, onFailure, onSuccess) {
            if (required) {
                const boxes = document.getElementsByClassName("radio-choice")
                let checked = false
                for (let i = 0; i < boxes.length && !checked; i++) {
                    checked = boxes[i].checked
                }

                if (!checked) {
                    onFailure("You must select 1 choice")
                } else {
                    onSuccess()
                }


            } else {
                onSuccess()
            }         
        },
        getResponse: function(onGet) {
            const boxes = document.getElementsByClassName("radio-choice")
            let response = ""
            for (let i = 0; i < boxes.length && !response; i++) {
                if (boxes[i].checked)
                    response = boxes[i].value
            }

            onGet(response)
        },
        pageRenderOptions: {
            radioChoice: true
        }
    },
    /**************************************************************************** 
     * Short Answer
    *****************************************************************************/
    {
        name: "Short Answer",
        label: "Short Answer",
        description: "User writes an answer in a scrollable text box.",
        hasRequired: true,
        hasMinMax: true,
        hasChoices: false,
        minText: "Minimum required characters",
        maxText: "Maximum allowed characters",
        requiresVisual: false,
        visualModeLabel: "highlight",
        getPromptString: function(min, max) {
            return "Short answer:"
        },
        checkRequirement: function(min, max, required, onFailure, onSuccess) {
            const answer = document.getElementsByClassName("answer-entry-box")[0]

            if (max > 0 && answer.value.length > max) {
                onFailure(`Your answer may not exceed ${max} characters`)
            } else if (min > 0 && answer.value.length < min) {
                if (min > 1)
                    onFailure(`Your answer must be at least ${min} characters`)
                else
                    onFailure("Your answer must be at least 1 character")
            } else {
                onSuccess()
            }
        },
        getResponse: function(onGet) {
            onGet(document.getElementsByClassName("answer-entry-box")[0].value)
        },
        onPageLoaded: function() {
            const currentChars = document.getElementById("current-characters")
            const answer = document.getElementsByClassName("answer-entry-box")[0]
            currentChars.textContent = answer.value.length

            answer.addEventListener("input", (evt) => {
                currentChars.textContent = evt.target.value.length
            })
        },
        pageRenderOptions: {
            shortAnswer: true
        }
    },
    /**************************************************************************** 
     * Write-in Answer
    *****************************************************************************/
    {
        name: "Write-in",
        label: "Write-in",
        description: "User writes an answer in a single line input field.",
        hasRequired: true,
        hasMinMax: false,
        hasChoices: false,
        minText: "",
        maxText: "",
        requiresVisual: false,
        visualModeLabel: "highlight",
        getPromptString: function(min, max) {
            return "Write-in answer:"
        },
        checkRequirement: function(min, max, required, onFailure, onSuccess) {
            if (required) {
                const answer = document.getElementsByClassName("write-in-field")[0]

                if (!answer.value.trim()) {
                    onFailure("You must write in an answer.")
                } else {
                    onSuccess()
                }
            } else {
                onSuccess()
            }
        },
        getResponse: function(onGet) {
            onGet(document.getElementsByClassName("write-in-field")[0].value)
        },
        pageRenderOptions: {
            writeInAnswer: true
        }
    },
    /**************************************************************************** 
     * Select Elements
    *****************************************************************************/
    {
        name: "Select Elements",
        label: "Select Elements",
        description: "User selects elements on a visual as a response.",
        hasRequired: true,
        hasMinMax: true,
        hasChoices: false,
        minText: "Minimum required selections",
        maxText: "Maximum allowed selections",
        requiresVisual: true,
        visualModeLabel: "selectElements",
        getPromptString: function(min, max) {
            let requirement = ""

            if (min < 1 && max < 1) {
                requirement = "elements"
            } else if (min == max) {
                if (min == 1)
                    requirement = "exactly 1 element"
                else 
                    requirement = `exactly ${min} elements`
            } else if (max < 1) {
                if (min == 1)
                    requirement = "at least 1 element"
                else
                    requirement = `at least ${min} elements`
            } else if (min < 1) {
                if (max == 1)
                    requirement = "at most 1 element"
                else
                    requirement = `at most ${max} elements`
            } else {
                requirement = `${min} to ${max} elements`
            }

            return `Select ${requirement} on the visual to the left`
        },
        checkRequirement: function(min, max, required, onFailure, onSuccess) {
            
            // we want to send a message to the visual window in order to check the requirement
            // the message will be sent after the message listener has been added

            const visualURL = document.getElementById("visualURL").getAttribute("url")

            // add message listener
            function messageListener(event) {
                // if recieve a message from iframe, it might be for the selected element count check
                
                if (event.origin === visualURL && event.data.type == "count") {
                    const count = parseInt(event.data.count)
                
                    if (max > 0 && count > max) {
                        if (max > 1)
                            onFailure(`You cannot select more than ${max} elements`)
                        else 
                            onFailure("You cannot select more than 1 element")
                    } else if (min > 0 && count < min) {
                        if (min > 1)
                            onFailure(`You must select at least ${min} elements`)
                        else
                            onFailure("You must select at least 1 element")
                    } else {
                        onSuccess()
                    }
                } 
            } 
            
            window.addEventListener('message', messageListener, {once: true})

            // send message to iframe to get selected element count
            const visualWindow = document.getElementById("displayedImage").contentWindow
            visualWindow.postMessage("count", visualURL) 
        },
        getResponse: function(onGet) {
            // the visualization is in an iframe
            // we need to send a request message to the iframe for the ids
            // then wait for a response that contains the ids
            const visualURL = document.getElementById("visualURL").getAttribute("url")
            const visualWindow = document.getElementById("displayedImage").contentWindow

            function messageListener(event) {
                // if receive a message from iframe, it might be for the ids of visual elements
                if (event.origin === visualURL && event.data.type == "ids") {
                    let response = ""
                    for (const id of event.data.ids) {
                        response += id + '|'
                    }
                
                    if (response == "")
                        onGet(response)
                    else
                        onGet(response.slice(0, -1))
                }
            }

            window.addEventListener('message', messageListener, {once: true})

            // send message to iframe to get selected element ids
            visualWindow.postMessage("ids", visualURL)
        },
        onVisualLoaded: function() {
            // get saved ids of selected elements
            const savedResponse = document.getElementById("savedResponse").getAttribute("response")
            const selectedIds = savedResponse.split('|')
        
            // send message to iframe to highlight selected elements
            const visualURL = document.getElementById("visualURL").getAttribute("url")
            const visualWindow = document.getElementById("displayedImage").contentWindow
            visualWindow.postMessage({ selectIds: selectedIds }, visualURL)  
        },
    },
    /**************************************************************************** 
     * Mark Points
    *****************************************************************************/
    {
        name: "Mark Points",
        label: "Mark Points",
        description: "User marks coordinate locations on a visual as a response.",
        hasRequired: true,
        hasMinMax: true,
        hasChoices: false,
        minText: "Minimum required marks",
        maxText: "Maximum allowed marks",
        requiresVisual: true,
        visualModeLabel: "markPoints",
        getPromptString: function(min, max) {
            let requirement = ""

            if (min < 1 && max < 1) {
                requirement = "points"
            } else if (min == max) {
                if (min == 1)
                    requirement = "exactly 1 points"
                else 
                    requirement = `exactly ${min} points`
            } else if (max < 1) {
                if (min == 1)
                    requirement = "at least 1 point"
                else
                    requirement = `at least ${min} points`
            } else if (min < 1) {
                if (max == 1)
                    requirement = "at most 1 point"
                else
                    requirement = `at most ${max} point`
            } else {
                requirement = `${min} to ${max} points`
            }

            return `Mark ${requirement} on the visual to the left`
        },
        checkRequirement: function(min, max, required, onFailure, onSuccess) {
            
            // we want to send a message to the visual window in order to check the requirement
            // the message will be sent after the message listener has been added

            const visualURL = document.getElementById("visualURL").getAttribute("url")

            // add message listener
            function messageListener(event) {
                // if recieve a message from iframe, it might be for the mark point count check
                
                if (event.origin === visualURL && event.data.type == "coordinates") {
                    const count = event.data.coordinates.length
                
                    if (max > 0 && count > max) {
                        if (max > 1)
                            onFailure(`You cannot mark more than ${max} points`)
                        else 
                            onFailure("You cannot mark more than 1 point")
                    } else if (min > 0 && count < min) {
                        if (min > 1)
                            onFailure(`You must mark at least ${min} points`)
                        else
                            onFailure("You must mark at least 1 point")
                    } else {
                        onSuccess()
                    }
                } 
            } 
            
            window.addEventListener('message', messageListener, {once:true})

            // send message to iframe to get selected element count
            const visualWindow = document.getElementById("displayedImage").contentWindow
            visualWindow.postMessage("coordinates", visualURL) 
        },
        getResponse: function(onGet) {
            // the visualization is in an iframe
            // we need to send a request message to the iframe for the coordinates
            // then wait for a response that contains the coordinates
            const visualURL = document.getElementById("visualURL").getAttribute("url")
            const visualWindow = document.getElementById("displayedImage").contentWindow

            function messageListener(event) {
                // if receive a message from iframe, it might be for the ids of visual elements
                if (event.origin === visualURL && event.data.type == "coordinates") {
                    let response = ""
                    for (const coordinate of event.data.coordinates) {
                        response += coordinate + '|'
                    }
                
                    if (response == "")
                        onGet(response)
                    else
                        onGet(response.slice(0, -1))
                }
            }

            window.addEventListener('message', messageListener, {once:true})

            // send message to iframe to get selected element ids
            visualWindow.postMessage("coordinates", visualURL)
        },
        onVisualLoaded: function() {
            // get saved ids of selected elements
            const savedResponse = document.getElementById("savedResponse").getAttribute("response")
            const coordinates = savedResponse.split('|')
        
            // send message to iframe to highlight selected elements
            const visualURL = document.getElementById("visualURL").getAttribute("url")
            const visualWindow = document.getElementById("displayedImage").contentWindow
            visualWindow.postMessage({ markCoordinates: coordinates }, visualURL)  
        },
    },
    /**************************************************************************** 
     * No Response
    *****************************************************************************/
    {
        name: "No Response",
        label: "No Response",
        description: "This question will not have a response.",
        hasRequired: false,
        hasMinMax: false,
        hasChoices: false,
        minText: "",
        maxText: "",
        requiresVisual: false,
        visualModeLabel: "highlight",
        getPromptString: function(min, max) {
            return "There is no response to be left for this question."
        },
        checkRequirement: function(min, max, required, onFailure, onSuccess) {
            onSuccess()
        },
        getResponse: function(onGet) {
            onGet("")
        },
    },
]

export default questionTypes