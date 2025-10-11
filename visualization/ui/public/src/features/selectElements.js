// Adds all of the relevant features for the "select elements" question type for both editor and participant roles
// Includes
//      - Selecting elements when taking a survey
//      - Setting elements as selectable as an editor
//      - Ability to Draw and delete selectable boxes as an editor
//      - Ability to highlight elements as an editor

const OPTIONTEXT_SELECT_ALL = "Select All Elements"
const OPTIONTEXT_DESELECT_ALL = "Clear All Selections"
const OPTIONTEXT_SET_ALL_SELECTABLE = "Make All Elements Selectable"
const OPTIONTEXT_SET_ALL_NOT_SELECTABLE = "Make All Elements Not Selectable"

const TOOLTEXT_SET_SELECTABLE = "Set Selectable"
const TOOLTEXT_CREATE = "Create"
const TOOLTEXT_DELETE = "Delete"
const TOOLTEXT_HIGHLIGHT = "Highlight"

const MODELABEL_SELECT_ELEMENTS = "selectElements"
const MODELABEL_SET_SELECTABLE = "setSelectable"
const MODELABEL_CREATE = "create"
const MODELABEL_DELETE = "delete"
const MODELABEL_HIGHLIGHT_TOOL = "highlightTool"

const OPTIONTEXT_HIGHLIGHT_ALL = "Highlight All Elements"
const OPTIONTEXT_CLEAR_HIGHLIGHTS = "Clear All Highlights"

import { visualizationElement, svgElement, page, wrapper, debug, screenToSVG, autosave } from "../visualizer.js"

export const selectElements = (visualizer) => {
    const decoratedVisualizer = Object.create(visualizer)

    decoratedVisualizer.onPageLoadAsParticipant = function() {
        visualizer.onPageLoadAsParticipant()
        if (page.mode == MODELABEL_SELECT_ELEMENTS) {

            // create select all button
            page.addOption(OPTIONTEXT_SELECT_ALL, MODELABEL_SELECT_ELEMENTS, () => {visualizationElement.selectAll()})

            // create deselect all button
            page.addOption(OPTIONTEXT_DESELECT_ALL, MODELABEL_SELECT_ELEMENTS, () => {visualizationElement.deselectAll()})
        }
    }

    decoratedVisualizer.onFirstLoadSvg = function() {
        visualizer.onFirstLoadSvg()

        if (wrapper.classList.contains("editor") || debug) {
            // create set all selectable button
            page.addOption(OPTIONTEXT_SET_ALL_SELECTABLE, MODELABEL_SET_SELECTABLE, () => {
                visualizationElement.setAllSelectable()
                autosave.save()
            })

            // create set all not selectable button
            page.addOption(OPTIONTEXT_SET_ALL_NOT_SELECTABLE, MODELABEL_SET_SELECTABLE, () => {
                visualizationElement.setAllNotSelectable()
                autosave.save()
            })

            // create highlight all button
            page.addOption(OPTIONTEXT_HIGHLIGHT_ALL, MODELABEL_HIGHLIGHT_TOOL, () => {
                for (const element of visualizationElement.visualElements) {
                    element.classList.add("highlight")
                }
                autosave.save()
            })

            // create clear all highlights button
            page.addOption(OPTIONTEXT_CLEAR_HIGHLIGHTS, MODELABEL_HIGHLIGHT_TOOL, () => {
                const highlighted = svgElement.getElementsByClassName("highlight")
                while (highlighted.length > 0) {
                    highlighted[0].classList.remove("highlight")
                }
                autosave.save()
            })

            createToolButtons()

            EnableBox()
        }
        
    }

    decoratedVisualizer.onLoadSvg = function() {
        visualizer.onLoadSvg()
        EnableSelection()
    }

    decoratedVisualizer.onChangeMode = function() {
        visualizer.onChangeMode()
        // if entering create mode, disable any default mousedown event (panning)
        if (page.mode == MODELABEL_CREATE) {
            wrapper.onmousedown = null
        }
    }

    return decoratedVisualizer
}

function createToolButtons() {
    // create highlight tool button
    page.addTool(TOOLTEXT_HIGHLIGHT, MODELABEL_HIGHLIGHT_TOOL)
    // add set selectable tool
    page.addTool(TOOLTEXT_SET_SELECTABLE, MODELABEL_SET_SELECTABLE)
    // add create tool
    page.addTool(TOOLTEXT_CREATE, MODELABEL_CREATE)
    // add delete tool
    page.addTool(TOOLTEXT_DELETE, MODELABEL_DELETE)
}

// Enable user to select/deselect vector elements by clicking on them
function EnableSelection() {
    // loop through all visual elements and add event listeners to each
    for(const visualElement of visualizationElement.visualElements) {
        EnableSelectionOfElement(visualElement)
    }
}

// Enable user to select/deselect a single visual element
function EnableSelectionOfElement(visualElement) {
    // clicking on selectable element in select element mode marks/unmarks as "selected"
    visualElement.addEventListener("click", evt => { 
        if (page.mode == MODELABEL_SELECT_ELEMENTS) 
            visualizationElement.toggleSelection(evt.currentTarget)
    })

    // clicking on element as an editor marks/unmarks as "selectable"
    visualElement.addEventListener("click", evt => { 
        if (page.mode == MODELABEL_SET_SELECTABLE) { 
            visualizationElement.toggleSelectable(evt.currentTarget)
            autosave.save()
        }
    })

    // clicking on element in delete mode deletes it (only for custom elements)
    if (visualizationElement.isCustom(visualElement)) {
        visualElement.addEventListener("click", evt => {
            if (page.mode == MODELABEL_DELETE) {
                visualizationElement.removeVisualElement(visualElement)
                autosave.save()
            }
        })
    }

    // clicking on element in highlight mode highlights it
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

    // when user presses mouse in select or create mode, enable box drawing
    wrapper.addEventListener("mousedown", evt => {
        if (page.mode == MODELABEL_CREATE) {
            evt.preventDefault()
            isStartDrawing = true
        }
    })

    document.addEventListener("mousemove", evt => {
        if (isStartDrawing) {       // when user has just started moving mouse after pressing down
            evt.preventDefault()

            // create rectangle element to start drawing the box at the mouse point
            box = document.createElementNS("http://www.w3.org/2000/svg", "rect")
            box.setAttribute("width", 0)
            box.setAttribute("height", 0)
            boxStartingPoint = screenToSVG(evt.clientX, evt.clientY)
            box.setAttribute("x", boxStartingPoint.x)
            box.setAttribute("y", boxStartingPoint.y)
            box.setAttribute("id", "user-box")  // used for CSS

            visualizationElement.svg.appendChild(box)

            isDrawingBox = true
            isStartDrawing = false
        } else if (isDrawingBox) {  // when user continues to move mouse
            // prevent mouse from highlighting text while drawing
            evt.preventDefault()

            // calculate box dimensions based on where mouse has moved from its starting point
            const newPoint = screenToSVG(evt.clientX, evt.clientY)
            const newWidth = newPoint.x - boxStartingPoint.x
            const newHeight = newPoint.y - boxStartingPoint.y

            // width and height grow box to the right and down respectively
            // if the user moves the mouse to the left or up (indicated by negative dimensions),
            // the box needs to be shifted accordingly in the same direction to appear to grow in that direction
            if (newWidth <= 0) {
                box.setAttribute("x", boxStartingPoint.x + newWidth)
            }
            if (newHeight <= 0) {
                box.setAttribute("y", boxStartingPoint.y + newHeight)
            }

            // set new box dimensions, can only be positive
            box.setAttribute("width", Math.abs(newWidth))
            box.setAttribute("height", Math.abs(newHeight))
            
        }
    })

    document.addEventListener("mouseup", evt => {
        // user is no longer drawing on mouse release
        isDrawingBox = false
        isStartDrawing = false
        // if the user was drawing, save the box as a selectable element
        if (box) {
            box.removeAttribute("id")   // used for CSS
            visualizationElement.addVisualElement(box)
            EnableSelectionOfElement(box)
            autosave.save()

            box = null
        }
    })
}