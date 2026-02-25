import { visualizationElement, svgElement, wrapper, debug, screenToSVG, page, visualContainer, autosave, staticvis, hoverDetails } from "../visualizer.js"

let selection = null;

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
            if (children[i].tagName != "foreignObject"){
                children[i].addEventListener("click", function() {
                    if (page.mode == "detailEditor"){
                        selection = i;
                        const item = children[i]
                        document.getElementById("tooltip-detail").textContent = item.getAttribute("label") || item.id || item.getAttribute("visualId") || "No Information"
                        document.getElementById("controlTooltip").focus();
                    }
                });
                children[i].addEventListener('mouseenter', function(e){
                    if (selection == null) {
                        const item = children[i]
                        document.getElementById("tooltip-detail").textContent = item.getAttribute("label") || item.id || item.getAttribute("visualId") || "No Information"
                    }
                })
            }
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
                document.getElementById("controlTooltip").removeAttribute("disabled");
                document.getElementById("modifyButton").removeAttribute("disabled");
            } else {
                document.getElementById("tooltip-detail").hidden = true;
                document.getElementById("controlTooltip").setAttribute('disabled', true);
                document.getElementById("modifyButton").setAttribute('disabled', true);
            }
            autosave.save();
        });

        // Overrides viewport dragging if clicking on input
        document.getElementById("controlTooltip").addEventListener("click", function() {
            if (page.mode == "detailEditor") {
                document.getElementById("controlTooltip").focus();
            }
        });

        // Leave focus if clicking on background
        document.getElementById("visual-container").addEventListener("click", function(e) {
            if (e.target.tagName === "svg"){
                document.getElementById("controlTooltip").blur();
                selection = null;
            }
        });

        // Manage detail editing
        document.getElementById("modifyButton").addEventListener("click", function() {

            if (!selection){ return }

            document.getElementById("controlTooltip").blur();
            const newDetail = document.getElementById("controlTooltip").value
            document.getElementById("controlTooltip").value = ""

            let children = svgElement.querySelectorAll('*')
            children[selection].setAttribute('label', newDetail);
            const item = children[selection]
            document.getElementById("tooltip-detail").textContent = item.getAttribute("label") || item.id || item.getAttribute("visualId") || "No Information"
            selection = null
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