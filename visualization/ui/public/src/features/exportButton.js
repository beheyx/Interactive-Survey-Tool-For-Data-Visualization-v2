// Adds the export button
// Export downloads the visualization as an SVG file

import { visualizationElement, svgElement, page, wrapper, debug } from "../visualizer.js"

export const exportButton = (visualizer) => {
    const decoratedVisualizer = Object.create(visualizer)

    decoratedVisualizer.onFirstLoadSvg = function() {
        visualizer.onFirstLoadSvg()
        if (wrapper.classList.contains("editor") || debug) {
            createExportButton()
        }
    }

    return decoratedVisualizer
}

function createExportButton() {
    // create button to locally save svg
    page.addFileButton("Export", () => {
        // we don't want to save modified scale and position
        visualizationElement.resetScaleAndPosition()

        // 1) Convert the current <svg> to a string
        //    Using XMLSerializer preserves all attributes and nested elements
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svgElement);

        // 2) Create a Blob from the string, then a URL from the Blob
        const blob = new Blob([svgString], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);

        // 3) Create a temporary link element
        const link = document.createElement("a");
        link.href = url;
        link.download = "edited-visual.svg"; // default file name in download dialog
        document.body.appendChild(link);

        // 4) Programmatically click it to start the download, then clean up
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    })
}
