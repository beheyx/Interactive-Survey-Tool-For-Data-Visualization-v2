import saveAnswer from "./responseSave.js"
import questionTypes from "./questionTypes.mjs"

document.addEventListener('DOMContentLoaded', () => {
    const requirements = document.getElementById("requirements")
    const required = requirements.getAttribute("required")
    const min = requirements.getAttribute("min")
    const max = requirements.getAttribute("max")
    const questionType = requirements.getAttribute("questionType")
    
    const nextButton = document.getElementById("next-button")
    const prevButton = document.getElementById("prev-button")

    const typeInfo = questionTypes.filter(type => type.name == questionType)[0]
    typeInfo.onPageLoaded?.()

    function goToNextPage() {
        saveAnswer(() => {
            const questionNumber = document.getElementById("questionNumber").getAttribute("number")
            const questionTotal = document.getElementById("questionTotal").getAttribute("total")

            if (questionNumber == questionTotal) {
                const style = document.createElement('style')
                style.innerHTML = '*{cursor: wait !important;}'
                document.head.appendChild(style)
                setTimeout(() => {window.location.href = nextButton.getAttribute("href")}, 3000)
            } else {
                window.location.href = nextButton.getAttribute("href")
            }
        })
    }

    function goToPrevPage() {
        saveAnswer(() => {window.location.href = prevButton.getAttribute("href")})
    }

    prevButton.addEventListener('click', goToPrevPage)

    // on clicking the next button, check for restrictions
    nextButton.addEventListener('click', () => {
        typeInfo.checkRequirement(min, max, required, (failText) => { document.getElementById("error-text").textContent = failText }, goToNextPage)
    })
})



