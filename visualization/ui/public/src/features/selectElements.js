// Adds all of the relevant features for the "select elements" question type for both editor and participant roles
// Includes
//      - Selecting elements when taking a survey
//      - Setting elements as selectable as an editor
//      - Ability to Draw and delete selectable boxes as an editor
//      - Ability to highlight elements as an editor
//      - Ability to draw lasso regions as selectable polygons

const OPTIONTEXT_SELECT_ALL = "Select All Elements"
const OPTIONTEXT_DESELECT_ALL = "Clear All Selections"
const OPTIONTEXT_SET_ALL_SELECTABLE = "Make All Elements Selectable"
const OPTIONTEXT_SET_ALL_NOT_SELECTABLE = "Make All Elements Not Selectable"

const TOOLTEXT_SET_SELECTABLE = "Set Selectable"
const TOOLTEXT_CREATE = "Create Box"
const TOOLTEXT_LASSO = "Create Lasso"
const TOOLTEXT_DELETE = "Delete Added Elements"
const TOOLTEXT_HIGHLIGHT = "Highlight Elements"
const TOOLTEXT_DETAIL = "Edit Details"

const MODELABEL_SELECT_ELEMENTS = "selectElements"
const MODELABEL_SET_SELECTABLE = "setSelectable"
const MODELABEL_CREATE = "create"
const MODELABEL_LASSO = "lasso"
const MODELABEL_DELETE = "delete"
const MODELABEL_HIGHLIGHT_TOOL = "highlightTool"
const MODELABEL_DETAIL_EDITOR = "detailEditor"

// Used when cancelling out of lasso/box mode
const MODELABEL_NONE = "none"

const OPTIONTEXT_HIGHLIGHT_ALL = "Highlight All Elements"
const OPTIONTEXT_CLEAR_HIGHLIGHTS = "Clear All Highlights"

import { visualizationElement, svgElement, page, wrapper, debug, screenToSVG, autosave } from "../visualizer.js"

// These are assigned inside EnableBox() and EnableLassoSelection()
// so onChangeMode can cancel unfinished drawings when switching tools.
let cancelBoxDrawing = () => {}
let cancelLassoDrawing = () => {}

export const selectElements = (visualizer) => {
    const decoratedVisualizer = Object.create(visualizer)

    decoratedVisualizer.onPageLoadAsParticipant = function() {
        visualizer.onPageLoadAsParticipant()

        if (page.mode == MODELABEL_SELECT_ELEMENTS) {
            page.addOption(OPTIONTEXT_SELECT_ALL, MODELABEL_SELECT_ELEMENTS, () => {
                visualizationElement.selectAll()
            })

            page.addOption(OPTIONTEXT_DESELECT_ALL, MODELABEL_SELECT_ELEMENTS, () => {
                visualizationElement.deselectAll()
            })
        }
    }

    decoratedVisualizer.onFirstLoadSvg = function() {
        visualizer.onFirstLoadSvg()

        if (wrapper.classList.contains("editor") || debug) {
            page.addOption(OPTIONTEXT_SET_ALL_SELECTABLE, MODELABEL_SET_SELECTABLE, () => {
                visualizationElement.setAllSelectable()
                autosave.save()
            })

            page.addOption(OPTIONTEXT_SET_ALL_NOT_SELECTABLE, MODELABEL_SET_SELECTABLE, () => {
                visualizationElement.setAllNotSelectable()
                autosave.save()
            })

            page.addOption(OPTIONTEXT_HIGHLIGHT_ALL, MODELABEL_HIGHLIGHT_TOOL, () => {
                for (const element of visualizationElement.visualElements) {
                    element.classList.add("highlight")
                }
                autosave.save()
            })

            page.addOption(OPTIONTEXT_CLEAR_HIGHLIGHTS, MODELABEL_HIGHLIGHT_TOOL, () => {
                const highlighted = svgElement.getElementsByClassName("highlight")
                while (highlighted.length > 0) {
                    highlighted[0].classList.remove("highlight")
                }
                autosave.save()
            })

            createToolButtons()

            EnableBox()
            EnableLassoSelection()
        }
    }

    decoratedVisualizer.onLoadSvg = function() {
        visualizer.onLoadSvg()
        EnableSelection()
    }

    decoratedVisualizer.onChangeMode = function() {
        visualizer.onChangeMode()

        const isLasso = page.mode === MODELABEL_LASSO
        const isBox = page.mode === MODELABEL_CREATE

        // If the user switches away from box mode while drawing,
        // remove the unfinished rectangle.
        if (!isBox) {
            cancelBoxDrawing()
        }

        // If the user switches away from lasso mode while drawing,
        // remove the unfinished lasso path.
        if (!isLasso) {
            cancelLassoDrawing()
        }

        if (wrapper) {
            wrapper.classList.toggle("mode-lasso", isLasso)
            wrapper.classList.toggle("mode-box", isBox)
            wrapper.style.cursor = (isLasso || isBox) ? "crosshair" : ""
        }

        // If entering box or lasso mode, disable default mousedown behavior like panning.
        if (isBox || isLasso) {
            wrapper.onmousedown = null
        }
    }

    return decoratedVisualizer
}

function createToolButtons() {
    page.addTool(TOOLTEXT_HIGHLIGHT, MODELABEL_HIGHLIGHT_TOOL)
    page.addTool(TOOLTEXT_SET_SELECTABLE, MODELABEL_SET_SELECTABLE)
    page.addTool(TOOLTEXT_CREATE, MODELABEL_CREATE)
    page.addTool(TOOLTEXT_LASSO, MODELABEL_LASSO)
    page.addTool(TOOLTEXT_DELETE, MODELABEL_DELETE)
    page.addTool(TOOLTEXT_DETAIL, MODELABEL_DETAIL_EDITOR)
}

// Enable user to select/deselect vector elements by clicking on them
function EnableSelection() {
    for (const visualElement of visualizationElement.visualElements) {
        EnableSelectionOfElement(visualElement)
    }
}

// Enable user to select/deselect a single visual element
function EnableSelectionOfElement(visualElement) {
    visualElement.addEventListener("click", evt => {
        if (page.mode == MODELABEL_SELECT_ELEMENTS) {
            visualizationElement.toggleSelection(evt.currentTarget)
        }
    })

    visualElement.addEventListener("click", evt => {
        if (page.mode == MODELABEL_SET_SELECTABLE) {
            visualizationElement.toggleSelectable(evt.currentTarget)
            autosave.save()
        }
    })

    if (visualizationElement.isCustom(visualElement)) {
        visualElement.addEventListener("click", evt => {
            if (page.mode == MODELABEL_DELETE) {
                visualizationElement.removeVisualElement(visualElement)
                autosave.save()
            }
        })
    }

    visualElement.addEventListener("click", evt => {
        if (page.mode == MODELABEL_HIGHLIGHT_TOOL) {
            evt.currentTarget.classList.toggle("highlight")
            autosave.save()
        }
    })
}

// Enable user to draw a selectable box on the screen
function EnableBox() {
    let box = null
    let boxStartingPoint = null
    let isStartDrawing = false
    let isDrawingBox = false

    cancelBoxDrawing = function() {
        isStartDrawing = false
        isDrawingBox = false
        boxStartingPoint = null

        if (box && box.parentNode) {
            box.parentNode.removeChild(box)
        }

        box = null
    }

    wrapper.addEventListener("mousedown", evt => {
        if (page.mode == MODELABEL_CREATE) {
            evt.preventDefault()
            isStartDrawing = true
        }
    })

    document.addEventListener("mousemove", evt => {
        if (page.mode !== MODELABEL_CREATE) {
            cancelBoxDrawing()
            return
        }

        if (isStartDrawing) {
            evt.preventDefault()

            box = document.createElementNS("http://www.w3.org/2000/svg", "rect")
            box.setAttribute("width", 0)
            box.setAttribute("height", 0)

            boxStartingPoint = screenToSVG(evt.clientX, evt.clientY)
            box.setAttribute("x", boxStartingPoint.x)
            box.setAttribute("y", boxStartingPoint.y)
            box.setAttribute("id", "user-box")

            visualizationElement.svg.appendChild(box)

            isDrawingBox = true
            isStartDrawing = false
        } else if (isDrawingBox) {
            evt.preventDefault()

            const newPoint = screenToSVG(evt.clientX, evt.clientY)
            const newWidth = newPoint.x - boxStartingPoint.x
            const newHeight = newPoint.y - boxStartingPoint.y

            if (newWidth <= 0) {
                box.setAttribute("x", boxStartingPoint.x + newWidth)
            } else {
                box.setAttribute("x", boxStartingPoint.x)
            }

            if (newHeight <= 0) {
                box.setAttribute("y", boxStartingPoint.y + newHeight)
            } else {
                box.setAttribute("y", boxStartingPoint.y)
            }

            box.setAttribute("width", Math.abs(newWidth))
            box.setAttribute("height", Math.abs(newHeight))
        }
    })

    document.addEventListener("mouseup", evt => {
        if (!isDrawingBox && !isStartDrawing) return

        isDrawingBox = false
        isStartDrawing = false

        if (box) {
            box.removeAttribute("id")
            visualizationElement.addVisualElement(box)
            EnableSelectionOfElement(box)
            autosave.save()

            box = null
            boxStartingPoint = null
        }
    })

    // Right-click cancels the unfinished box and leaves box mode.
    wrapper.addEventListener("contextmenu", evt => {
        if (page.mode === MODELABEL_CREATE) {
            evt.preventDefault()
            cancelBoxDrawing()
            page.mode = MODELABEL_NONE

            wrapper.classList.remove("mode-box")
            wrapper.style.cursor = ""
        }
    })
}

// Enable user to lasso-select by drawing a freehand polygon.
// This creates a persistent polygon custom element.
function EnableLassoSelection() {
    let isLassoing = false
    let lassoPoints = []
    let lassoPath = null

    cancelLassoDrawing = function() {
        isLassoing = false
        lassoPoints = []

        if (lassoPath && lassoPath.parentNode) {
            lassoPath.parentNode.removeChild(lassoPath)
        }

        lassoPath = null
    }

    wrapper.addEventListener("mousedown", evt => {
        if (page.mode == MODELABEL_LASSO) {
            evt.preventDefault()
            isLassoing = true
            lassoPoints = []

            const startPoint = screenToSVG(evt.clientX, evt.clientY)
            lassoPoints.push(startPoint)

            lassoPath = document.createElementNS("http://www.w3.org/2000/svg", "polyline")
            lassoPath.setAttribute("points", `${startPoint.x},${startPoint.y}`)
            lassoPath.setAttribute("id", "lasso-path")
            lassoPath.setAttribute("class", "lasso-path")
            lassoPath.setAttribute("vector-effect", "non-scaling-stroke")
            lassoPath.setAttribute("pointer-events", "none")

            visualizationElement.svg.appendChild(lassoPath)
        }
    })

    document.addEventListener("mousemove", evt => {
        if (page.mode !== MODELABEL_LASSO) {
            cancelLassoDrawing()
            return
        }

        if (!isLassoing || !lassoPath) return

        evt.preventDefault()

        const point = screenToSVG(evt.clientX, evt.clientY)
        lassoPoints.push(point)

        const pointsAttr = lassoPoints.map(p => `${p.x},${p.y}`).join(" ")
        lassoPath.setAttribute("points", pointsAttr)
    })

    document.addEventListener("mouseup", evt => {
        if (!isLassoing) return

        isLassoing = false

        if (lassoPath && lassoPath.parentNode) {
            lassoPath.parentNode.removeChild(lassoPath)
        }

        lassoPath = null

        if (lassoPoints.length >= 3) {
            const pointsAttr = lassoPoints.map(p => `${p.x},${p.y}`).join(" ")

            const lassoPolygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon")
            lassoPolygon.setAttribute("points", pointsAttr)

            visualizationElement.svg.appendChild(lassoPolygon)
            visualizationElement.addVisualElement(lassoPolygon)
            EnableSelectionOfElement(lassoPolygon)

            autosave.save()
        }

        lassoPoints = []
    })

    // Right-click cancels the unfinished lasso and leaves lasso mode.
    wrapper.addEventListener("contextmenu", evt => {
        if (page.mode === MODELABEL_LASSO) {
            evt.preventDefault()
            cancelLassoDrawing()
            page.mode = MODELABEL_NONE

            wrapper.classList.remove("mode-lasso")
            wrapper.style.cursor = ""
        }
    })
}