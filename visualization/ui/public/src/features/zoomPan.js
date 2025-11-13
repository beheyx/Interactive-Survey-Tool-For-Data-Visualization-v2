// Features needed for both zooming and panning
//
// This code sets the mousedown behavior on the wrapper to panning, but this can be overwritten by decorators that come after
// this one by changing wrapper.onmousedown under the onChangeMode function

import { visualizationElement, svgElement, wrapper, debug, screenToSVG, page } from "../visualizer.js"

let startPanning = null

export const zoomPan = (visualizer) => {

    const decoratedVisualizer = Object.create(visualizer)

    decoratedVisualizer.onFirstLoadSvg = function() {
        visualizer.onFirstLoadSvg()
        EnablePanning(decoratedVisualizer)
        EnableZoom()
    }

    decoratedVisualizer.onChangeMode = function() {
        visualizer.onChangeMode()
        // make panning the default mousedown behavior
        wrapper.onmousedown = startPanning
    }

    return decoratedVisualizer
}

// Enable user to pan the visual by clicking and dragging anywhere on the page
function EnablePanning(visualizer) {
    let isPanning = false
    let startXMouse, startYMouse
    let startXVisual, startYVisual

    // define behavior for when user presses mouse button down anywhere on the page
    startPanning = (evt) => {
        evt.preventDefault()
        // while user holds the mouse button down, the user is panning
        isPanning = true

        // get starting coordinates for visual and mouse
        startXMouse = evt.clientX
        startYMouse = evt.clientY
        startXVisual = visualizationElement.x
        startYVisual = visualizationElement.y

        // add wrapper class for CSS changes
        wrapper.classList.add("panning")
    }
    wrapper.onmousedown = startPanning


    // define behavior for when user moves mouse while panning
    document.addEventListener("mousemove", evt => {
        if (isPanning) {
            // prevent mouse from highlighting text while panning
            evt.preventDefault()

            // get scale of visualization as it is displayed in the window
            const svgBoundingBox = visualizationElement.svg.getBoundingClientRect()
            const svgWindowScale = svgBoundingBox.height < svgBoundingBox.width ? svgBoundingBox.height : svgBoundingBox.width

            // panning speed adjusts based on visualization's programmed scale and its window scale 
            const speedModifier = visualizationElement.scale / svgWindowScale

            // coordinates to move visual to
            visualizationElement.x = startXVisual - (evt.clientX - startXMouse) * speedModifier
            visualizationElement.y = startYVisual - (evt.clientY - startYMouse) * speedModifier
        }
    })

    // define behavior for when user releases mouse button
    document.addEventListener("mouseup", () => {
        if (isPanning) {
            // the user is not panning if the mouse button is not pressed down
            isPanning = false

            // remove wrapper class
            wrapper.classList.remove("panning")
        }
    })
}

// Enable user to zoom the visual via scroll wheel (and optionally zoom buttons)
function EnableZoom() {
    // How fast to zoom
    const zoomOutIntensity = 1.1
    const zoomInIntensity = 1 / zoomOutIntensity

    // Optional clamp so you can't zoom infinitely
    const minScale = 5
    const maxScale = 2000

    // Helper to apply a zoom factor and update CSS
    const applyZoomFactor = (factor) => {
        let newSize = visualizationElement.scale * factor

        // clamp scale
        if (newSize < minScale) newSize = minScale
        if (newSize > maxScale) newSize = maxScale

        visualizationElement.scale = newSize

        // send scale factor to CSS
        document.body.style.setProperty("--zoom-scale", visualizationElement.scale / 80 + "px")
    }

    // --- Scroll wheel zoom on wrapper ---
    // Use wheel to zoom in/out where the cursor is
    wrapper.addEventListener(
        "wheel",
        (evt) => {
            // prevent page from scrolling
            evt.preventDefault()

            // deltaY < 0 => scroll up => zoom in
            if (evt.deltaY < 0) {
                applyZoomFactor(zoomInIntensity)
            } else if (evt.deltaY > 0) {
                applyZoomFactor(zoomOutIntensity)
            }
        },
        { passive: false } // needed so preventDefault works on wheel
    )
}