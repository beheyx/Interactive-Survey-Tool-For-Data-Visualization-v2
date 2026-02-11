/* 
*   This file brings all the feature decorators together into one decorator
*
*   To implement a new feature follow these steps:
*       1. import the new feature decorator
*       2. add the imported decorator to the decorators array
*           (note: the order of the decorators might matter, depending on how the decorator was written)
*
**/

import {exportButton} from "./exportButton.js"
import {zoomPan} from "./zoomPan.js"
import {selectElements} from "./selectElements.js"
import {markPoints} from "./markPoints.js"
import {detailTooltip} from "./detailTooltip.js"
// ^ import your feature here

const decorators = [exportButton, zoomPan, selectElements, markPoints, detailTooltip]  // <-- add your feature to this array

export const visualizerDecorator = (visualizer) => {
    let decoratedVisualizer = visualizer

    for (const decorator of decorators) {
        decoratedVisualizer = decorator(decoratedVisualizer)
    }

    return decoratedVisualizer
}