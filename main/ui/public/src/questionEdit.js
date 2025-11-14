import questionTypes from "./questionTypes.mjs"

document.addEventListener('DOMContentLoaded', () => {
    const questionType = document.getElementById("type")
    const minLabel = document.getElementById("min-label")
    const maxLabel = document.getElementById("max-label")
    const multiChoiceSection = document.getElementById("multiple-choice-section")
    const minLine = document.getElementById("min-line")
    const maxLine = document.getElementById("max-line")
    const requiredLine = document.getElementById("required-line")
    const requiredElement = document.getElementById("required")
    const minElement = document.getElementById("min")
    const typeDescription = document.getElementById("type-description")
    let typeInfo = null


    // making min connected to required
    // if not required min should be 0 and the input field is readonly
    function updateMinReadOnlyStatus() {
        if (!requiredElement.checked) {
            minElement.value = 0
            minElement.setAttribute("readonly", "true")
        } else {
            minElement.removeAttribute("readonly")
        }
    }

    // update on page load
    updateMinReadOnlyStatus()

    // update whenever required box is checked/unchecked
    requiredElement.addEventListener("change", updateMinReadOnlyStatus)


    // show appropriate content based on specified question type
    function updateContent() {
        // get info about question type
        typeInfo = questionTypes.filter(type => type.name == questionType.value)[0]

        // update description
        typeDescription.textContent = typeInfo.description

        // update min/max section
        if (typeInfo.hasMinMax) {
            minLine.removeAttribute("hidden")
            maxLine.removeAttribute("hidden")
            minLabel.textContent = typeInfo.minText + ": "
            maxLabel.textContent = typeInfo.maxText + ": "
        } else {
            minLine.setAttribute("hidden", "true")
            maxLine.setAttribute("hidden", "true")
        }
        
        // show choices section?
        if (typeInfo.hasChoices)
            multiChoiceSection.removeAttribute("hidden")
        else
            multiChoiceSection.setAttribute("hidden", "true")

        // show required line?
        if (typeInfo.hasRequired) 
            requiredLine.removeAttribute("hidden")
        else {
           requiredLine.setAttribute("hidden", "true") 
           requiredElement.checked = false
           updateMinReadOnlyStatus()
        }
    }

    // update on page load
    updateContent()
        
    // update whenever question type is changed
    questionType.addEventListener("change", updateContent)


    // import button behavior
    const importVisualizationButton = document.getElementById("import-vis-button")
    importVisualizationButton.addEventListener("click", (event) => {
        event.preventDefault()
        if (document.getElementById("visualizationId").value != ""){
            document.getElementById("question-form").submit()
        }
    })

    // save button behavior
    const saveQuestionButton = document.getElementById("save-question-button")
    saveQuestionButton.addEventListener("click", (event) => {
        event.preventDefault()
        // save without resending the import
        document.getElementById("visualizationId").value = ""
        document.getElementById("question-form").submit()
    })
    
    // removing a visual
    const removeVisualButton = document.getElementById("remove-visualization-button")
    if (removeVisualButton) {
        removeVisualButton.addEventListener("click", (event) => {
            // negative number removes visualization
            event.preventDefault()
            document.getElementById("visualizationId").value = "-1"
            document.getElementById("question-form").submit()
        })
    }

    
})

