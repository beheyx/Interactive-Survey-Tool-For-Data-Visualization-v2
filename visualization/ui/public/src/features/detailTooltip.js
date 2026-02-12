import { visualizationElement, svgElement, wrapper, debug, screenToSVG, page, visualContainer, autosave, staticvis, hoverDetails } from "../visualizer.js"

export const detailTooltip = (visualizer) => {

    const decoratedVisualizer = Object.create(visualizer)

    // calls when the SVG is first loaded
    decoratedVisualizer.onFirstLoadSvg = function() {
        visualizer.onFirstLoadSvg()
        // new code here
    }

    // calls every time the SVG is loaded
    decoratedVisualizer.onLoadSvg = function() {
        visualizer.onLoadSvg()
        if (hoverDetails["enabled"] && !staticvis) {
            document.getElementById("tooltip-container").removeAttribute("hidden");
            document.getElementById("tooltip-detail").removeAttribute("hidden");
        }
        let children = svgElement.querySelectorAll('*')
        for (let i = 0; i < children.length; i++) {
            children[i].addEventListener('mouseenter', function(e){
                let item = children[i]
                document.getElementById("tooltip-detail").textContent = item.getAttribute("label") || item.id || item.getAttribute("visualId") || "No Information"
            })
        }
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
        document.getElementById("tooltip-container").removeAttribute("hidden");
        document.getElementById("tooltip-setting").removeAttribute("hidden");
        document.getElementById("checkTooltip").addEventListener('change', function(e){
            hoverDetails["enabled"] = document.getElementById("checkTooltip").checked;
            if (hoverDetails["enabled"]) {
                document.getElementById("tooltip-detail").removeAttribute("hidden");
            } else {
                document.getElementById("tooltip-detail").hidden = true;
            }
            autosave.save();
        });
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