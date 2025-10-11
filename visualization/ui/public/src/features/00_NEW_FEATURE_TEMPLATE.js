/*
* COPY THIS TEMPLATE AS A FILE IN THE SAME FOLDER AND CHANGE CONTENTS TO GET STARTED
*
* Once you are finished writing to this file, add your decorator to ./visualizerDecorator.js to implement the new features
*
*   Some helpful imports:
*       visualizationElement - interface for the visualization element (see ../visualizationElement.js)
*       svgElement - DOM element of the SVG
*       wrapper - div DOM element that spans the whole page and contains the whole page
*       debug - bool that is true when in debug mode
*       screenToSVG - function that converts screen coordinates to SVG coordinates
*       page - interface for managing the page mode and adding new options, tools, and file buttons (see ../visualizer.js)
*       visualContainer - div DOM element that spans the whole page and contains the visualization 
*       autosave - interface for autosaving (calling autosave.save() will save the visual)
*
* Do note that each function in this template is optional, so if no new code is added, it's best to delete it to save on memory.
*/

import { visualizationElement, svgElement, wrapper, debug, screenToSVG, page, visualContainer, autosave } from "../visualizer.js"

export const RENAME_TO_NEW_FEATURE = (visualizer) => {

    const decoratedVisualizer = Object.create(visualizer)

    // calls when the SVG is first loaded
    decoratedVisualizer.onFirstLoadSvg = function() {
        visualizer.onFirstLoadSvg()
        // new code here
    }

    // calls every time the SVG is loaded
    decoratedVisualizer.onLoadSvg = function() {
        visualizer.onLoadSvg()
        // new code here
    }

    // calls on page DOM contents loaded, regardless of role
    decoratedVisualizer.onPageLoad = function() {
        visualizer.onPageLoad()
        // new code here
    }

    // calls on page DOM contents loaded as a paricipant
    decoratedVisualizer.onPageLoadAsParticipant = function() {
        visualizer.onPageLoadAsParticipant()
        // new code here
    }

    // calls on page DOM contents loaded as an editor
    decoratedVisualizer.onPageLoadAsEditor = function() {
        visualizer.onPageLoadAsEditor()
        // new code here
    }

    // calls on page DOM contents loaded in debug mode
    decoratedVisualizer.onPageLoadDebug = function() {
        visualizer.onPageLoadDebug()
        // new code here
    }

    // calls when the page mode is changed
    decoratedVisualizer.onChangeMode = function() {
        visualizer.onChangeMode()
        // new code here
    }

    return decoratedVisualizer
}