import {VisualizationElement} from "./visualizationElement.js"
import {visualizerDecorator} from "./features/visualizerDecorator.js"

export let debug = false
let visualizer
export let visualizationElement
export let svgElement
export const wrapper = document.getElementById("wrapper")                      // container that covers entire page
export const visualContainer = document.getElementById("visual-container")     // container for the visual
export const staticvis = (document.getElementById("static-visualization").value == "true")
export const hoverDetails = {enabled: false}

const visualizerBase = {
    // called when the page loads regardless of role
    onPageLoad: function() {
        if (staticvis){
            document.getElementById("zoom-container").setAttribute("hidden", "true")
            wrapper.setAttribute("static",true)
        } else {
            document.getElementById("zoom-container").removeAttribute("hidden")
        }
    },
    
    // called when the page loads as an editor
    onPageLoadAsEditor: function() {
        // Attach file upload handler (element may load asynchronously)
        const uploader = document.getElementById("svg-uploader");
        if (uploader) {
            uploader.addEventListener("change", handleSvgUpload);
            uploader.dataset.listenerAttached = "true";
        }

        setupDragAndDrop()

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
        debug = true

        // Attach file upload handler (element may load asynchronously)
        const uploader = document.getElementById("svg-uploader");
        if (uploader) {
            uploader.addEventListener("change", handleSvgUpload);
            uploader.dataset.listenerAttached = "true";
        }

        setupDragAndDrop()

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
        newTool.addEventListener("click", () => {
            this.mode = toolMode;
            if (this.mode == "detailEditor") {
                document.getElementById("groupTooltip").removeAttribute("hidden")
            } else {
                document.getElementById("groupTooltip").hidden = true;
            }
        })

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
        const saveStatus = document.getElementById("save-status")
        if (saveStatus) {
            saveStatus.textContent = s
        }
    },
    save: async function() {
        this.statusText = "Preparing to save..."

        const progressContainer = document.getElementById("upload-progress-container")
        const progressFill = document.getElementById("upload-progress-fill")
        const progressText = document.getElementById("upload-progress-text")

        // Show progress bar immediately (only if elements exist)
        if (progressContainer && progressFill && progressText) {
            progressContainer.hidden = false
            progressFill.style.width = "0%"
            progressText.textContent = "Processing SVG..."
        }

        try {
            // Extract and measure SVG data
            this.statusText = "Processing SVG..."

            // Serialize SVG with XMLSerializer to ensure proper XML formatting
            // (e.g., HTML img tags inside foreignObject are properly closed)
            const serializer = new XMLSerializer()
            let svgData = serializer.serializeToString(svgElement)

            const svgSizeBytes = new Blob([svgData]).size
            const svgSizeMB = (svgSizeBytes / 1024 / 1024).toFixed(2)

            if (progressFill && progressText) {
                progressFill.style.width = "5%"
                progressText.textContent = `Preparing ${svgSizeMB}MB...`
            }

            // Use chunked upload for files > 1MB
            const CHUNK_SIZE = 1 * 1024 * 1024
            const useChunking = svgSizeBytes > CHUNK_SIZE
            const baseUrl = window.location.origin + window.location.pathname

            if (!useChunking) {
                // Small file - use direct PUT upload
                if (progressFill && progressText) {
                    progressFill.style.width = "50%"
                    progressText.textContent = `Uploading ${svgSizeMB}MB...`
                }

                const requestBody = { svg: svgData, detailsOnHover: hoverDetails["enabled"] }

                const response = await fetch(baseUrl, {
                    method: "PUT",
                    body: JSON.stringify(requestBody),
                    headers: { "Content-type": "application/json" }
                })

                if (response.ok) {
                    this.statusText = "Changes saved"
                    if (progressFill && progressText && progressContainer) {
                        progressFill.style.width = "100%"
                        progressText.textContent = "Complete!"
                        setTimeout(() => {
                            progressContainer.hidden = true
                            progressFill.style.width = "0%"
                        }, 2000)
                    }
                } else {
                    const errorText = await response.text()
                    console.error("PUT upload error:", response.status, errorText)
                    throw new Error(`Upload failed: ${response.status}`)
                }
                return
            }

            // Large file - use chunked upload for better progress tracking
            const totalChunks = Math.ceil(svgSizeBytes / CHUNK_SIZE)
            this.statusText = `Uploading ${svgSizeMB}MB in ${totalChunks} chunks...`

            // Initialize chunked upload session
            if (progressFill && progressText) {
                progressFill.style.width = "10%"
                progressText.textContent = "Initializing upload..."
            }

            const initResponse = await fetch(`${baseUrl}/upload/init`, {
                method: "POST",
                body: JSON.stringify({ totalChunks, fileSize: svgSizeBytes }),
                headers: { "Content-type": "application/json" }
            })

            if (!initResponse.ok) throw new Error("Failed to initialize upload")
            const { uploadId } = await initResponse.json()

            // Upload chunks sequentially
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

                // Update progress: 10% init + 80% chunks + 10% finalize
                if (progressFill && progressText) {
                    const chunkProgress = 10 + (80 * (i + 1) / totalChunks)
                    progressFill.style.width = chunkProgress + "%"
                    progressText.textContent = `Uploading: ${i + 1}/${totalChunks} chunks (${svgSizeMB}MB)`
                }
                this.statusText = `Uploading chunk ${i + 1}/${totalChunks}...`
            }

            // Finalize upload and save to database
            if (progressFill && progressText) {
                progressFill.style.width = "95%"
                progressText.textContent = "Finalizing..."
            }
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

            // Upload complete
            this.statusText = "Changes saved"
            if (progressFill && progressText && progressContainer) {
                progressFill.style.width = "100%"
                progressText.textContent = `Complete! (${svgSizeMB}MB)`
                setTimeout(() => {
                    progressContainer.hidden = true
                    progressFill.style.width = "0%"
                }, 2000)
            }

        } catch (error) {
            console.error("Save error:", error)
            console.error("Error stack:", error.stack)
            this.statusText = "Error while saving!"
            if (progressContainer && progressFill) {
                progressContainer.hidden = true
                progressFill.style.width = "0%"
            }
            alert(`Upload failed: ${error.message}. Check console for details.`)
        }
    }
}


// Load SVG asynchronously to prevent UI blocking
async function loadSVGAsync() {
    const svgLoaded = visualContainer.getAttribute('data-svg-loaded') === 'true'

    if (!svgLoaded) {
        // SVG not embedded - fetch it via AJAX
        try {
            const baseUrl = window.location.origin + window.location.pathname
            const response = await fetch(`${baseUrl}/svg-data`)

            if (!response.ok) throw new Error('Failed to load SVG')

            const data = await response.json()
            hoverDetails["enabled"] = data.detailsOnHover
            document.getElementById("checkTooltip").checked = hoverDetails["enabled"] 
            // Handle empty visualization state
            if (!data.svg || data.svg.trim() === '') {
                const spinner = document.getElementById('svg-loading-spinner')
                if (spinner) spinner.remove()

                visualContainer.innerHTML = '<p style="text-align: center; color: #666;">No visualization uploaded yet. Upload one to get started.</p>'

                // Show file uploader in editor/debug mode
                const uploaderContainer = document.getElementById('uploader-container')
                if (uploaderContainer && (wrapper.classList.contains('editor') || wrapper.classList.contains('debug'))) {
                    uploaderContainer.hidden = false

                    // Attach event listener if not already attached
                    const uploader = document.getElementById("svg-uploader")
                    if (uploader && !uploader.dataset.listenerAttached) {
                        uploader.addEventListener("change", handleSvgUpload)
                        uploader.dataset.listenerAttached = "true"
                    }
                }
                return true
            }

            // Parse and validate SVG
            const parser = new DOMParser()
            const svgDoc = parser.parseFromString(data.svg, 'image/svg+xml')
            const svgElement = svgDoc.documentElement

            // Validate SVG was parsed successfully
            const parserError = svgDoc.querySelector('parsererror')
            if (parserError) {
                console.error('SVG parsing error:', parserError.textContent)
                const spinner = document.getElementById('svg-loading-spinner')
                if (spinner) spinner.remove()
                visualContainer.innerHTML = '<p style="color: red; text-align: center;">Failed to parse SVG: Invalid XML format</p>'
                return false
            }

            // Insert SVG into DOM
            const spinner = document.getElementById('svg-loading-spinner')
            if (spinner) spinner.remove()
            visualContainer.appendChild(svgElement)

            // Convert legacy SVG image elements to foreignObject for better raster image support
            const images = svgElement.querySelectorAll('image')
            if (images.length > 0) {
                setTimeout(() => {
                    images.forEach((img) => {
                        const href = img.getAttributeNS('http://www.w3.org/1999/xlink', 'href') || img.getAttribute('href')
                        const x = parseFloat(img.getAttribute('x') || '0')
                        const y = parseFloat(img.getAttribute('y') || '0')
                        const width = parseFloat(img.getAttribute('width') || '500')
                        const height = parseFloat(img.getAttribute('height') || '500')

                        if (href) {
                            // Use foreignObject with HTML img for better raster image rendering
                            const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject')
                            foreignObject.setAttributeNS(null, 'x', x.toString())
                            foreignObject.setAttributeNS(null, 'y', y.toString())
                            foreignObject.setAttributeNS(null, 'width', width.toString())
                            foreignObject.setAttributeNS(null, 'height', height.toString())

                            const htmlImg = document.createElement('img')
                            htmlImg.src = href
                            htmlImg.style.width = '100%'
                            htmlImg.style.height = '100%'
                            htmlImg.style.objectFit = 'contain'
                            htmlImg.style.display = 'block'

                            htmlImg.addEventListener('error', (e) => {
                                console.error('Failed to load image:', href, e)
                            })

                            foreignObject.appendChild(htmlImg)
                            img.parentNode.replaceChild(foreignObject, img)
                        }
                    })
                }, 100)
            }

            // Show UI elements after SVG loads
            const buttonHeader = document.getElementById('button-header')
            if (buttonHeader) buttonHeader.hidden = false

            const progressContainer = document.getElementById('upload-progress-container')
            if (progressContainer) progressContainer.hidden = true

            const uploaderContainer = document.getElementById('uploader-container')
            if (uploaderContainer && (wrapper.classList.contains('editor') || wrapper.classList.contains('debug'))) {
                uploaderContainer.hidden = false
            }

        } catch (error) {
            console.error('Error loading SVG:', error)
            visualContainer.innerHTML = '<p style="color: red; text-align: center;">Failed to load visualization</p>'
            return false
        }
    } else {
        // SVG was pre-rendered in HTML - convert any legacy image elements
        const svgElement = visualContainer.firstElementChild
        if (svgElement && svgElement.tagName.toLowerCase() === 'svg') {
            const images = svgElement.querySelectorAll('image')

            images.forEach((img) => {
                const href = img.getAttributeNS('http://www.w3.org/1999/xlink', 'href') || img.getAttribute('href')
                const x = parseFloat(img.getAttribute('x') || '0')
                const y = parseFloat(img.getAttribute('y') || '0')
                const width = parseFloat(img.getAttribute('width') || '500')
                const height = parseFloat(img.getAttribute('height') || '500')

                if (href) {
                    // Convert to foreignObject for better raster image rendering
                    const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject')
                    foreignObject.setAttributeNS(null, 'x', x.toString())
                    foreignObject.setAttributeNS(null, 'y', y.toString())
                    foreignObject.setAttributeNS(null, 'width', width.toString())
                    foreignObject.setAttributeNS(null, 'height', height.toString())

                    const htmlImg = document.createElement('img')
                    htmlImg.src = href
                    htmlImg.style.width = '100%'
                    htmlImg.style.height = '100%'
                    htmlImg.style.objectFit = 'contain'
                    htmlImg.style.display = 'block'

                    foreignObject.appendChild(htmlImg)
                    img.parentNode.replaceChild(foreignObject, img)
                }
            })
        }

        // Show UI elements
        const buttonHeader = document.getElementById('button-header')
        if (buttonHeader) buttonHeader.hidden = false

        const progressContainer = document.getElementById('upload-progress-container')
        if (progressContainer) progressContainer.hidden = true

        const uploaderContainer = document.getElementById('uploader-container')
        if (uploaderContainer && (wrapper.classList.contains('editor') || wrapper.classList.contains('debug'))) {
            uploaderContainer.hidden = false
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

    if (visualContainer.firstElementChild && visualContainer.firstElementChild.tagName.toLowerCase() === 'svg') {
        svgElement = visualContainer.firstElementChild
        try {
            visualizationElement = new VisualizationElement(svgElement)
            visualizer.onLoadSvg();
            visualizer.onFirstLoadSvg();
        } catch (error) {
            console.error('Error creating VisualizationElement:', error)
        }
    }

});


// Handler for the file input change event
function handleSvgUpload(event){
    const file = event.target.files[0];
    if (file) processFile(file);
}

// Validates and loads an image file (SVG, PNG, JPG) into the editor.
function processFile(file) {
    if (!file) return;

    // Validate file type (case-insensitive)
    const fileName = file.name.toLowerCase();
    if (debug) {
        if (!fileName.endsWith('.svg')) return;
    } else {
        if (!(fileName.endsWith('.svg') || fileName.endsWith('.jpg') || fileName.endsWith('.png') || fileName.endsWith('.jpeg'))) return;
    }

    if (fileName.endsWith('.svg')) {
        const reader = new FileReader();
        reader.onload = async function(e) {
            await loadSvgFromText(e.target.result);
        }
        reader.onerror = function(e) {
            console.error("FileReader error:", e);
            alert("Failed to read file: " + e);
        }
        reader.readAsText(file);
    } else {
        loadRaster(file)
    }
}

// Sets up drag and drop file upload for the visualization editor.
function setupDragAndDrop() {
    const overlay = document.getElementById("drop-zone-overlay");
    let dragCounter = 0;

    wrapper.addEventListener("dragenter", (e) => {
        e.preventDefault();
        dragCounter++;
        if (overlay) overlay.removeAttribute("hidden");
    });

    // Required to allow drop
    wrapper.addEventListener("dragover", (e) => {
        e.preventDefault();
    });

    wrapper.addEventListener("dragleave", (e) => {
        e.preventDefault();
        dragCounter--;
        if (dragCounter <= 0) {
            dragCounter = 0;
            if (overlay) overlay.setAttribute("hidden", "true");
        }
    });

    wrapper.addEventListener("drop", (e) => {
        e.preventDefault();
        dragCounter = 0;
        if (overlay) overlay.setAttribute("hidden", "true");

        const file = e.dataTransfer.files[0];
        if (file) processFile(file);
    });
}

async function loadSvgFromText(svgText) {
    let firstUpload = true
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgText, "image/svg+xml");

    // Validate SVG was parsed successfully
    if (svgDoc.documentElement.nodeName === "parsererror") {
      console.error("Error parsing SVG:", svgDoc.documentElement);
      alert("Failed to parse SVG file. Invalid XML format.");
      return;
    }

    // Clear existing content
    if (svgElement && visualizationElement) {
      visualContainer.removeChild(visualizationElement.svg);
      firstUpload = false
    } else {
      // Remove placeholder message if present
      visualContainer.innerHTML = '';
    }

    // Insert SVG and initialize visualization
    svgElement = visualContainer.appendChild(svgDoc.documentElement);
    visualizationElement = new VisualizationElement(svgElement)

    // Show editor toolbar
    const buttonHeader = document.getElementById('button-header')
    if (buttonHeader) buttonHeader.hidden = false;

    // Hide progress bar (only shown during save operations)
    const progressContainer = document.getElementById('upload-progress-container')
    if (progressContainer) progressContainer.hidden = true

    // Auto-save in non-debug mode
    if (!debug) {
        await autosave.save()
    }

    // Initialize pan/zoom and editor controls
    if (visualizer) {
        visualizer.onLoadSvg();
        if (firstUpload) {
            visualizer.onFirstLoadSvg();
        }
    }
}

async function loadRaster(file) {
    // Upload raster image to server
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
    if (svgElement && visualizationElement) {
        visualContainer.removeChild(visualizationElement.svg);
        firstUpload = false
    } else {
        visualContainer.innerHTML = '';
    }

    // Create SVG wrapper with foreignObject for raster image
    const newSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    newSvg.setAttributeNS(null, "width", "500")
    newSvg.setAttributeNS(null, "height", "500")
    newSvg.setAttributeNS(null, "viewBox", "0 0 500 500")

    const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject')
    foreignObject.setAttributeNS(null, 'x', '0')
    foreignObject.setAttributeNS(null, 'y', '0')
    foreignObject.setAttributeNS(null, 'width', '500')
    foreignObject.setAttributeNS(null, 'height', '500')

    const htmlImg = document.createElement('img')
    htmlImg.src = fileUrl
    htmlImg.style.width = '100%'
    htmlImg.style.height = '100%'
    htmlImg.style.objectFit = 'contain'
    htmlImg.style.display = 'block'

    foreignObject.appendChild(htmlImg)
    newSvg.appendChild(foreignObject)

    svgElement = visualContainer.appendChild(newSvg);

    visualizationElement = new VisualizationElement(svgElement)

    // Show editor toolbar
    const buttonHeader = document.getElementById('button-header')
    if (buttonHeader) buttonHeader.hidden = false;

    // Hide progress bar (only shown during save operations)
    const progressContainer = document.getElementById('upload-progress-container')
    if (progressContainer) progressContainer.hidden = true

    // Auto-save
    console.log("Calling autosave.save()...")
    await autosave.save()
    console.log("autosave.save() completed")

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