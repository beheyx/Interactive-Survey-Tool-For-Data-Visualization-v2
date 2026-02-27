// enables marking coordinate points on a visual as a participant

const MODELABEL_MARK_POINTS = "markPoints"
const OPTIONTEXT_UNDO_MARK = "Undo last mark"
const OPTIONTEXT_CLEAR_MARKS = "Clear all marks"

import { visualizationElement, svgElement, wrapper, debug, screenToSVG, page, visualContainer } from "../visualizer.js"


export const markPoints = (visualizer) => {

    const decoratedVisualizer = Object.create(visualizer)

    decoratedVisualizer.onFirstLoadSvg = function() {
        visualizer.onFirstLoadSvg()
        if (page.mode == MODELABEL_MARK_POINTS) {
            // undo button
            page.addOption(OPTIONTEXT_UNDO_MARK, MODELABEL_MARK_POINTS, () => {
                // it should just be the last one in the DOM
                const marks = document.getElementsByClassName("mark")
                marks[marks.length-1].remove()
            })

            // clear all button
            page.addOption(OPTIONTEXT_CLEAR_MARKS, MODELABEL_MARK_POINTS, () => {
                const marks = document.getElementsByClassName("mark")
                while (marks.length > 0) {
                    marks[0].remove()
                }
            })

            enableMarkPoints()
        }
    }

    return decoratedVisualizer
}

function enableMarkPoints() {
    let mouseDrag = false
    let markContainer = null

    // mouseDrag variable is kept track of so mark isn't accidently left after clicking and dragging (panning)
    visualContainer.addEventListener("mousedown", () => {
        mouseDrag = false
    })

    visualContainer.addEventListener("mousemove", () => {
        mouseDrag = true
    })

    visualContainer.addEventListener("click", (evt) => {
        if (!mouseDrag) {
            // make container in SVG to hold marks
            if (!markContainer) {
                if (document.getElementsByClassName("mark-container").length > 0)
                    markContainer = document.getElementsByClassName("mark-container")[0]
                else {
                    markContainer = document.createElementNS("http://www.w3.org/2000/svg", "g")
                    visualizationElement.svg.appendChild(markContainer)
                    markContainer.classList.add("mark-container")
                }
            }

            // create the circle element within the container to represent the mark
            const pointCoordinates = screenToSVG(evt.clientX, evt.clientY, visualizationElement.svg)
            const point = document.createElementNS("http://www.w3.org/2000/svg", "circle")
            markContainer.appendChild(point)
            point.outerHTML = `<circle cx=\"${pointCoordinates.x}\" cy=\"${pointCoordinates.y}\" class=\"mark\"></circle>`

        }
    })
}