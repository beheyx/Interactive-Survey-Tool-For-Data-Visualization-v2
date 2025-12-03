import {VisualizationElement} from "./visualizationElement.js"
import {visualizerDecorator} from "./features/visualizerDecorator.js"

export let debug = false
let visualizer
export let visualizationElement
export let svgElement
export const wrapper = document.getElementById("wrapper")                      // container that covers entire page
export const visualContainer = document.getElementById("visual-container")     // container for the visual


const visualizerBase = {
    // called when the page loads regardless of role
    onPageLoad: function() {
        
    },
    
    // called when the page loads as an editor
    onPageLoadAsEditor: function() {
        // create file uploader
        const uploader = document.getElementById("svg-uploader");
        const uploaderContainer = document.getElementById("uploader-container");
        uploaderContainer.removeAttribute('hidden')
        uploader.addEventListener("change", handleSvgUpload);
        
        // help button
        document.getElementById("help-button").removeAttribute("hidden")
        document.getElementById("help-button").addEventListener("click", () => {
            document.getElementById("help-window").removeAttribute("hidden")
        })
        document.getElementById("close-help-window-button").addEventListener("click", () => {
            document.getElementById("help-window").setAttribute("hidden", "true")
        })
    },
    
    // called when the page loads as a participant
    onPageLoadAsParticipant: function() {
    
    },
    
    // called when the page loads in debug mode
    onPageLoadDebug: function() {
        // debug mode set up
        debug = true
    
        // create file uploader
        const uploader = document.getElementById("svg-uploader");
        const uploaderContainer = document.getElementById("uploader-container");
        uploaderContainer.removeAttribute('hidden')
        uploader.addEventListener("change", handleSvgUpload);  
    
        // create debug mode buttons
        document.getElementById("editor-button").removeAttribute("hidden")
        document.getElementById("participant-button").removeAttribute("hidden")
    
        document.getElementById("editor-button").addEventListener("click", (evt) => {
            wrapper.classList.remove("participant") 
            wrapper.classList.add("editor") 
        })
    
        document.getElementById("participant-button").addEventListener("click", (evt) => {
            wrapper.classList.remove("editor") 
            wrapper.classList.add("participant") 
        })
    },

    // called when the SVG loads for the first time
    onFirstLoadSvg: function() {
        if (wrapper.classList.contains("editor") || debug) {
            

            page.addFileButton("Save", () => {
                // fetch(window.location.href, { 
                //     method: "PUT",
                //     body: JSON.stringify({
                //         svg: svgElement.outerHTML
                //     }),
                //     headers: {
                //         "Content-type": "application/json",
                //     },    
                // })
                autosave.save()
            })

            document.getElementById("uploader-container").setAttribute("hidden", "true")

            page.addFileButton("Import", () => {
                document.getElementById("svg-uploader").click()
            })
        }
    },

    // called each time the SVG loads
    onLoadSvg: function() {
        // send scale factor to CSS
        document.body.style.setProperty("--visual-scale", visualizationElement.scale / 80 + "px")
        document.body.style.setProperty("--zoom-scale", visualizationElement.scale / 80 + "px")
    },

    // called when the page mode changes
    onChangeMode: function() {

    }
}

export const page = {
    changeModeListeners: [],
    mode: "",
    set mode(s) {
        // change class in wrapper for CSS
        wrapper.classList.remove(this.value)
        wrapper.classList.add(s)

        // set the mode
        this.value = s

        // call listeners after changing the mode
        for (const listener of this.changeModeListeners) {
            listener()
        }
    },
    get mode() {
        return this.value
    },

    // takes a function listener
    // makes it so function listener will be called when the page mode changes
    addChangeModeListener: function(listener) {
        this.changeModeListeners.push(listener)
    },

    addTool: function(toolName, toolMode) {
        // tools dropdown is hidden by default, remove
        document.getElementsByClassName("tools")[0].removeAttribute("hidden")

        // create the button element
        const newTool = document.createElement("button")
        newTool.textContent = toolName

        // clicking the button will change the mode accordingly
        newTool.addEventListener("click", () => {this.mode = toolMode})

        // add button to DOM
        const toolButtons = document.getElementsByClassName("tool-buttons")[0]
        toolButtons.appendChild(newTool)
    },

    addOption: function(optionName, mode, onClick) {
        // options dropdown is hidden by default, remove
        document.getElementsByClassName("options")[0].removeAttribute("hidden")

        // create the button
        const newOption = document.createElement("button")
        newOption.textContent = optionName
        newOption.addEventListener("click", onClick)

        // button will only be visible in the right mode
        if (this.mode != mode)
            newOption.setAttribute("hidden", "true")
        this.addChangeModeListener(() => {
            if (this.mode == mode) {
                newOption.removeAttribute("hidden")
            } else {
                newOption.setAttribute("hidden", "true")
            }
        })

        // add button to DOM
        const optionButtons = document.getElementsByClassName("option-buttons")[0]
        optionButtons.appendChild(newOption)
    },

    addFileButton: function(buttonText, onClick) {
        // file dropdown is hidden by default, remove
        document.getElementsByClassName("file")[0].removeAttribute("hidden")

        // create the button
        const newFileButton = document.createElement("button")
        newFileButton.textContent = buttonText
        newFileButton.addEventListener("click", onClick)

        // add button to DOM
        const fileButtons = document.getElementsByClassName("file-buttons")[0]
        fileButtons.appendChild(newFileButton)
    }
}

export const autosave = {
    statusText: "",
    set statusText(s) {
        this.value = s
        document.getElementById("save-status").textContent = s
    },
    save: async function() {
        this.statusText = "Preparing to save..."

        const progressContainer = document.getElementById("upload-progress-container")
        const progressFill = document.getElementById("upload-progress-fill")
        const progressText = document.getElementById("upload-progress-text")

        // Show progress bar immediately
        progressContainer.hidden = false
        progressFill.style.width = "0%"
        progressText.textContent = "Processing SVG..."

        try {
            // Step 1: Extract SVG data
            this.statusText = "Processing SVG..."
            const svgData = svgElement.outerHTML
            const svgSizeBytes = new Blob([svgData]).size
            const svgSizeMB = (svgSizeBytes / 1024 / 1024).toFixed(2)

            progressFill.style.width = "5%"
            progressText.textContent = `Preparing ${svgSizeMB}MB...`

            // Determine chunk size (1MB chunks for better progress tracking)
            const CHUNK_SIZE = 1 * 1024 * 1024 // 1MB
            const useChunking = svgSizeBytes > CHUNK_SIZE

            // Get base URL without query parameters
            const baseUrl = window.location.origin + window.location.pathname

            if (!useChunking) {
                // Small file - use original PUT method
                progressFill.style.width = "50%"
                const response = await fetch(baseUrl, {
                    method: "PUT",
                    body: JSON.stringify({ svg: svgData }),
                    headers: { "Content-type": "application/json" }
                })

                if (response.ok) {
                    this.statusText = "Changes saved"
                    progressFill.style.width = "100%"
                    progressText.textContent = "Complete!"
                    setTimeout(() => {
                        progressContainer.hidden = true
                        progressFill.style.width = "0%"
                    }, 2000)
                } else {
                    throw new Error("Upload failed")
                }
                return
            }

            // Large file - use chunked upload
            const totalChunks = Math.ceil(svgSizeBytes / CHUNK_SIZE)
            this.statusText = `Uploading ${svgSizeMB}MB in ${totalChunks} chunks...`

            // Step 2: Initialize upload
            progressFill.style.width = "10%"
            progressText.textContent = "Initializing upload..."

            const initResponse = await fetch(`${baseUrl}/upload/init`, {
                method: "POST",
                body: JSON.stringify({ totalChunks, fileSize: svgSizeBytes }),
                headers: { "Content-type": "application/json" }
            })

            if (!initResponse.ok) throw new Error("Failed to initialize upload")
            const { uploadId } = await initResponse.json()

            // Step 3: Send chunks
            for (let i = 0; i < totalChunks; i++) {
                const start = i * CHUNK_SIZE
                const end = Math.min(start + CHUNK_SIZE, svgSizeBytes)
                const chunk = svgData.substring(start, end)

                const chunkResponse = await fetch(`${baseUrl}/upload/chunk`, {
                    method: "POST",
                    body: JSON.stringify({
                        uploadId,
                        chunkIndex: i,
                        data: chunk
                    }),
                    headers: { "Content-type": "application/json" }
                })

                if (!chunkResponse.ok) {
                    throw new Error(`Failed to upload chunk ${i + 1}/${totalChunks}`)
                }

                // Update progress (10% for init, 80% for chunks, 10% for finalize)
                const chunkProgress = 10 + (80 * (i + 1) / totalChunks)
                progressFill.style.width = chunkProgress + "%"
                progressText.textContent = `Uploading: ${i + 1}/${totalChunks} chunks (${svgSizeMB}MB)`
                this.statusText = `Uploading chunk ${i + 1}/${totalChunks}...`
            }

            // Step 4: Finalize upload
            progressFill.style.width = "95%"
            progressText.textContent = "Finalizing..."
            this.statusText = "Finalizing upload..."

            const finalizeResponse = await fetch(`${baseUrl}/upload/finalize`, {
                method: "POST",
                body: JSON.stringify({ uploadId }),
                headers: { "Content-type": "application/json" }
            })

            if (!finalizeResponse.ok) {
                const errorText = await finalizeResponse.text()
                console.error("Finalize error response:", finalizeResponse.status, errorText)
                throw new Error(`Failed to finalize upload: ${finalizeResponse.status}`)
            }

            // Success!
            this.statusText = "Changes saved"
            progressFill.style.width = "100%"
            progressText.textContent = `Complete! (${svgSizeMB}MB)`
            setTimeout(() => {
                progressContainer.hidden = true
                progressFill.style.width = "0%"
            }, 2000)

        } catch (error) {
            console.error("Save error:", error)
            this.statusText = "Error while saving!"
            progressContainer.hidden = true
            progressFill.style.width = "0%"
        }
    }
}


// Lazy load SVG via AJAX to prevent UI freezing
async function loadSVGAsync() {
    const svgLoaded = visualContainer.getAttribute('data-svg-loaded') === 'true'

    if (!svgLoaded) {
        // SVG not embedded - fetch it via AJAX
        try {
            const baseUrl = window.location.origin + window.location.pathname
            const response = await fetch(`${baseUrl}/svg-data`)

            if (!response.ok) throw new Error('Failed to load SVG')

            const data = await response.json()

            // Remove loading spinner
            const spinner = document.getElementById('svg-loading-spinner')
            if (spinner) spinner.remove()

            // Insert SVG using DOM parser to avoid blocking
            // This is much faster than innerHTML for large SVGs
            await new Promise(resolve => setTimeout(resolve, 0)) // Let UI update

            const parser = new DOMParser()
            const svgDoc = parser.parseFromString(data.svg, 'image/svg+xml')
            const svgElement = svgDoc.documentElement

            // Clear container and append parsed SVG
            visualContainer.innerHTML = ''
            visualContainer.appendChild(svgElement)

            // Show button header and uploader after SVG loads
            const buttonHeader = document.getElementById('button-header')
            if (buttonHeader) buttonHeader.hidden = false

            const uploaderContainer = document.getElementById('uploader-container')
            if (uploaderContainer) uploaderContainer.hidden = false

        } catch (error) {
            console.error('Error loading SVG:', error)
            visualContainer.innerHTML = '<p style="color: red; text-align: center;">Failed to load visualization</p>'
            return false
        }
    }

    return true
}

// start loading svg once page has loaded
addEventListener("DOMContentLoaded", async () => {
    visualizer = visualizerDecorator(visualizerBase)

    page.addChangeModeListener(visualizer.onChangeMode)

    visualizer.onPageLoad()

    if (wrapper.classList.contains("editor")) {
        visualizer.onPageLoadAsEditor()
    } else {
        // debug mode
        if (wrapper.classList.contains("debug")) {
            visualizer.onPageLoadDebug()
        }

        page.mode = wrapper.className
        visualizer.onPageLoadAsParticipant()
    }

    // Load SVG asynchronously if not embedded
    await loadSVGAsync()

    if (visualContainer.firstElementChild) {
        svgElement = visualContainer.firstElementChild
        visualizationElement = new VisualizationElement(svgElement)
        visualizer.onLoadSvg();
        visualizer.onFirstLoadSvg();
    }

});


function handleSvgUpload(event){
    const file = event.target.files[0];
    if (!file) return;
    if (debug)
        if (!file.name.endsWith('.svg')) return;
    else
        if (!(file.name.endsWith('.svg') || file.name.endsWith('.jpg') || file.name.endsWith('.png'))) return;

    if (file.name.endsWith('.svg')) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const svgText = e.target.result;
            loadSvgFromText(svgText);
        }
        reader.readAsText(file);
    } else {
        loadRaster(file)
        
    }
    
}

function loadSvgFromText(svgText) {
    let firstUpload = true
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgText, "image/svg+xml");
  
    // Check if the parse failed
    if (svgDoc.documentElement.nodeName === "parsererror") {
      console.error("Error parsing SVG:", svgDoc.documentElement);
      return;
    }
    // Remove old SVG if one is already present
    if (svgElement) {
      visualContainer.removeChild(visualizationElement.svg);
      firstUpload = false
    }

   
    svgElement = visualContainer.appendChild(svgDoc.documentElement);

    visualizationElement = new VisualizationElement(svgElement)

    if (!debug) {
        // fetch(window.location.href, { 
        //     method: "PUT",
        //     body: JSON.stringify({
        //         svg: svgElement.outerHTML
        //     }),
        //     headers: {
        //         "Content-type": "application/json",
        //     },    
        // })
        autosave.save()
    }
  
    // Re-initialize pan/zoom
    visualizer.onLoadSvg();
    if (firstUpload)
        visualizer.onFirstLoadSvg();
}

async function loadRaster(file) {
    // send request to upload image
    const formData = new FormData()
    const urlParts = window.location.href.split('/')
    const fileParts = file.name.split('.')
    const fileUrl = window.location.href.split('?')[0] + "/photo"
    formData.append('file', file, urlParts[urlParts.length-1].split('?')[0] + '.' + fileParts[fileParts.length-1]);
    await fetch(fileUrl, { 
        method: "POST",
        body: formData
    })

    // Remove old SVG if one is already present
    let firstUpload = true
    if (svgElement) {
        visualContainer.removeChild(visualizationElement.svg);
        firstUpload = false
    }

    // create svg element
    const newSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    newSvg.setAttributeNS(null, "width", "500")
    newSvg.setAttributeNS(null, "height", "500")
    newSvg.setAttributeNS(null, "viewBox", "0 0 500 500")
    newSvg.innerHTML = `<image href="${fileUrl}" x="0" y="0" height="500" width="500"></image>`

    svgElement = visualContainer.appendChild(newSvg);

    visualizationElement = new VisualizationElement(svgElement)

    autosave.save()
    // fetch(window.location.href, { 
    //     method: "PUT",
    //     body: JSON.stringify({
    //         svg: svgElement.outerHTML
    //     }),
    //     headers: {
    //         "Content-type": "application/json",
    //     },    
    // })
  
    // Re-initialize pan/zoom
    visualizer.onLoadSvg();
    if (firstUpload)
        visualizer.onFirstLoadSvg();
}


// The following function was adapted from stackoverflow user "inna" (Jan 19, 2018)
// Adapted from function transformPoint() (name was taken from Paul LeBeau's answer) 
// Sourced on 1/30/2025
// Source URL: https://stackoverflow.com/questions/48343436/how-to-convert-svg-element-coordinates-to-screen-coordinates
export const screenToSVG = function(screenX, screenY) {
    const p = DOMPoint.fromPoint(svgElement)
    p.x = screenX
    p.y = screenY
    return p.matrixTransform(svgElement.getScreenCTM().inverse());
}

// this is in response for an iframe message for the count of selected elements, ids of selected elements, or selection based on array of ids
window.addEventListener('message', (event) => {
    if (event.data == "count")
        event.source.postMessage({ type: "count", count: visualizationElement.getNumberOfSelectedElements() }, "*")
    else if (event.data == "ids")
        event.source.postMessage({ type: "ids", ids: visualizationElement.getSelectedIds() }, "*")
    else if (event.data == "coordinates") {
        let coordinates = []
        const markContainer = document.getElementsByClassName("mark-container")[0]
        if (markContainer) {
            for (const mark of markContainer.getElementsByClassName("mark")) {
                coordinates.push("x:" + mark.cx.baseVal.value + "y:" + mark.cy.baseVal.value)
            }
        }
        event.source.postMessage({ type: "coordinates", coordinates: coordinates }, "*")
    } else if (event.data.selectIds) {
        for (const id of event.data.selectIds) {
            const elementToSelect = visualizationElement.getElementById(id)
            if (elementToSelect)
                visualizationElement.select(elementToSelect)
        }
    } else if (event.data.markCoordinates) {
        const markContainer = document.createElementNS("http://www.w3.org/2000/svg", "g")
        visualizationElement.svg.appendChild(markContainer)
        markContainer.classList.add("mark-container")

        for (const coordinate of event.data.markCoordinates) {
            const x = coordinate.split(":")[1].slice(0,-1)
            const y = coordinate.split(":")[2]
            const point = document.createElementNS("http://www.w3.org/2000/svg", "circle")
            markContainer.appendChild(point)
            point.outerHTML = `<circle cx=\"${x}\" cy=\"${y}\" class=\"mark\"></circle>`
        }
    }
})