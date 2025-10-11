import questionTypes from "./questionTypes.mjs"

document.getElementById("displayedImage")?.addEventListener('load', () => {
    const questionType = document.getElementById("requirements").getAttribute("questionType")
    const typeInfo = questionTypes.filter(type => type.name == questionType)[0]
    typeInfo.onVisualLoaded?.()
})