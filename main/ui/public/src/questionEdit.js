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
    const maxElement = document.getElementById("max")
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

    // update the min and max when out of bounds
    minElement.addEventListener('input', (event) => {
        const setValue = Math.floor(event.target.value)
        minElement.value = setValue
        if (maxElement.value < setValue){
            maxElement.value = setValue
        }
        if (setValue < 0){
            minElement.value = 0
        }
    })

    maxElement.addEventListener('input', (event) => {
        const setValue = Math.floor(event.target.value)
        maxElement.value = setValue
        if (minElement.value > setValue){
            minElement.value = setValue
        }
        if (setValue< 0){
            maxElement.value = 0
        }
    })


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

    const visualizationDropdown = document.getElementById("visualizationId")
    if (visualizationDropdown.value == ""){
        importVisualizationButton.setAttribute("disabled", "true")
    }
    visualizationDropdown.addEventListener("change", (event) => {
        console.log(event.target.value)
        if (event.target.value == ""){
            importVisualizationButton.setAttribute("disabled", "true")
        } else {
            importVisualizationButton.removeAttribute("disabled")
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

    function updateChoices(){
        // sneakily edit #choices
        const items = [...document.querySelectorAll("#choice-list li")].map(li =>
            li.firstChild.textContent.trim()
        )
        const choices = items.join("|")
        document.getElementById("choices").value = choices
    }

    function createChoice(value){
        const li = document.createElement("li")
        li.className = "list-group-item d-flex align-items-center col ltr"
        li.textContent = value

        // choice remove
        const removeBtn = document.createElement("div")
        removeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>'
        removeBtn.className = "btn-outline-danger mr-3"
        removeBtn.onclick = () => {li.remove(); updateChoices()}

        li.prepend(removeBtn)
        document.getElementById("choice-list").appendChild(li)
    }

    // recreate saved choices
    const savedChoices = document.getElementById("choices").value
    if (savedChoices != ""){
        const listChoices = savedChoices.split("|")
        for (const choice of listChoices){
            createChoice(choice)
        }
    }

    // adding/removing choices (multiple choice/radio)
    document.getElementById("add-choice-btn").addEventListener("click", () => {
        const input = document.getElementById("choice-input")
        let value = input.value.trim()
        // remove the pipe
        value = value.replace("|", "")
        if (value == "") return
        
        createChoice(value)

        input.value = ""
        input.focus()
        updateChoices()
    });
    
})

