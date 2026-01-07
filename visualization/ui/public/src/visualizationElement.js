/**
 * HTML tags of visual elements that are interactable on the visualization
 * @const
 * @type {string[]}
 * @default
 */
const VISUAL_ELEMENT_TAGS = ["path", "rect", "circle", "ellipse", "polygon", "line", "polyline", "image", "foreignObject"]

/**
 * Class name for visual elements
 * @const
 * @type {string}
 * @default
 */
const VISUAL_ELEMENT_LABEL = "visual-element"
/**
 * Class name for selected elements
 * @const
 * @type {string}
 * @default
 */
const SELECTION_LABEL = "selected"
/**
 * Class name for selectable elements
 * @const
 * @type {string}
 * @default
 */
const SELECTABLE_LABEL = "selectable"
/**
 * Class name that blocks default behavior of marking all visual elements as selectable
 * @const
 * @type {string}
 * @default
 */
const FIRST_TIME_MARK_LABEL = "marked-selectables"
/**
 * Class name for user-created visual elements
 * @const
 * @type {string}
 * @default
 */
const CUSTOM_ELEMENT_LABEL = "custom"

/**
 * Class for the visualization element in the DOM
 * @class
 */
const VisualizationElement = class {
    /**
     * Constructs a VisualizationElement using existing SVG element as its base
     * @constructor
     * @param {Element} svg 
     */
    constructor(svg) {
        this.svg = svg
        this.visualElements = ExtractVisualElements(svg)
        this.nextId = this.visualElements.length

        // Get width/height from viewBox first, then from width/height properties, then from attributes
        this.defaultWidth = this.svg.viewBox?.baseVal?.width
            ? this.svg.viewBox.baseVal.width
            : (this.svg.width?.baseVal?.value ?? parseFloat(this.svg.getAttribute('width')) ?? 500)
        this.defaultHeight = this.svg.viewBox?.baseVal?.height
            ? this.svg.viewBox.baseVal.height
            : (this.svg.height?.baseVal?.value ?? parseFloat(this.svg.getAttribute('height')) ?? 500)
        this.resetScaleAndPosition()
        
        // on first time upload, mark all visual elements as selectable by default
        if (!this.svg.classList.contains(FIRST_TIME_MARK_LABEL)) {
            this.setAllSelectable()
            this.svg.classList.add(FIRST_TIME_MARK_LABEL)
        }
    }

    /**
     * Marks element as selected
     * @param {Element} element 
     */
    select(element) {
        if (element.classList.contains(SELECTABLE_LABEL))
            element.classList.add(SELECTION_LABEL)
    }

    /**
     * Unmarks element as selected
     * @param {Element} element 
     */
    deselect(element) {
        element.classList.remove(SELECTION_LABEL)
    }
    
    /**
     * Toggles selection of element
     * @param {Element} element 
     */
    toggleSelection(element) {
        if (element.classList.contains(SELECTABLE_LABEL) && !element.classList.contains(SELECTION_LABEL))
            element.classList.add(SELECTION_LABEL)
        else
            element.classList.remove(SELECTION_LABEL)
    }

    /**
     * Marks multiple elements as selected
     * @param {Array} elements 
     */
    selectMultiple(elements) {
        for (const element of elements) {
            this.select(element)
        }
    }

    /**
     * Marks element as selectable
     * @param {Element} element 
     */
    setSelectable(element) {
        element.classList.add(SELECTABLE_LABEL)
    }

    /**
     * Marks element as not selectable
     * @param {Element} element 
     */
    setNotSelectable(element) {
        element.classList.remove(SELECTABLE_LABEL)
    }

    /**
     * Toggles selectability of element
     * @param {Element} element 
     */
    toggleSelectable(element) {
        element.classList.toggle(SELECTABLE_LABEL)
    }

    /**
     * Returns true if element is selectable
     * @param {Element} element 
     * @returns {boolean} 
     */
    isSelectable(element) {
        return element.classList.contains(SELECTABLE_LABEL)
    }

    /**
     * Returns all visualId's of selected elements
     * @returns {Array} 
     */
    getSelectedIds() {
        let ids = []
        for (const element of this.visualElements) {
            if (element.classList.contains(SELECTION_LABEL))
                ids.push(element.getAttribute("visualId"))
        }

        return ids
    }

    /**
     * Returns element whose visualId matches param, null if no match
     * @param {string} id
     * @returns {Element} 
     */
    getElementById(id) {
        for(const element of this.visualElements) {
            if (element.getAttribute("visualId") == id) {
                return element
            }
        }

        return null
    }

    /**
     * Marks multiple elements as selectable
     * @param {Array} elements 
     */
    setSelectableMultiple(elements) {
        for (const element of elements) {
            this.setSelectable(element)
        }
    }

    /**
     * Marks all elements as selectable
     */
    setAllSelectable() {
        for (const element of this.visualElements) {
            this.setSelectable(element)
        }
    }

    /**
     * Marks all elements as not selectable
     */
    setAllNotSelectable() {
        for (const element of this.visualElements) {
            this.setNotSelectable(element)
        }
    }

    /**
     * selects all elements
     */
    selectAll() {
        for (const element of this.visualElements) {
            this.select(element)
        }
    }

    /**
     * Marks all elements as selectable
     */
    deselectAll() {
        for (const element of this.visualElements) {
            this.deselect(element)
        }
    }

    /**
     * Returns true if element was drawn by user
     * @param {Element} element 
     * @returns {boolean} 
     */
    isCustom(element) {
        return element.classList.contains(CUSTOM_ELEMENT_LABEL)
    }
    

    /**
     * Adds visual element to visualization
     * @param {Element} element 
     */
    addVisualElement(element) {
        // mark as a visual element
        element.classList.add(VISUAL_ELEMENT_LABEL)

        // mark as a custom element
        element.classList.add(CUSTOM_ELEMENT_LABEL)

        // set unique ID
        element.setAttribute("visualId", this.nextId)
        this.nextId += 1

        // make selectable by default
        this.setSelectable(element)
    }

    /**
     * Removes visual element from visualization
     * @param {Element} element 
     */
    removeVisualElement(element) {
        // simply remove from the DOM
        element.remove()
    }

    /**
     * Resets scale and position to calculated default which should fill the container
     */
    resetScaleAndPosition() {
        const scale = this.defaultWidth > this.defaultHeight ? this.defaultWidth : this.defaultHeight
        this.svg.setAttribute("viewBox", "0 0 " + scale + " " + scale)
    }

    /**
     * Returns number of selected elements
     * @returns {int} 
     */
    getNumberOfSelectedElements() {
        let count = 0
        for (const element of this.visualElements) {
            if (element.classList.contains(SELECTION_LABEL))
                count += 1
        }
        return count
    }

    // Helper to parse viewBox when baseVal is not available
    _parseViewBox() {
        const viewBoxAttr = this.svg.getAttribute('viewBox')
        if (viewBoxAttr) {
            const parts = viewBoxAttr.split(/\s+/)
            return {
                x: parseFloat(parts[0]) || 0,
                y: parseFloat(parts[1]) || 0,
                width: parseFloat(parts[2]) || 500,
                height: parseFloat(parts[3]) || 500
            }
        }
        return { x: 0, y: 0, width: 500, height: 500 }
    }

    get scale() {
        if (this.svg.viewBox?.baseVal?.width) {
            return this.svg.viewBox.baseVal.width
        }
        return this._parseViewBox().width
    }

    set scale(num) {
        if (num > 0) {
            this.svg.setAttribute("viewBox", this.x + " " + this.y + " " +
                num + " " + num)
        }
    }

    get x() {
        if (this.svg.viewBox?.baseVal?.x !== undefined) {
            return this.svg.viewBox.baseVal.x
        }
        return this._parseViewBox().x
    }

    set x(pos) {
        this.svg.setAttribute("viewBox", pos + " " + this.y + " " +
            this.scale + " " + this.scale)
    }

    get y() {
        if (this.svg.viewBox?.baseVal?.y !== undefined) {
            return this.svg.viewBox.baseVal.y
        }
        return this._parseViewBox().y
    }

    set y(pos) {
        this.svg.setAttribute("viewBox", this.x + " " + pos + " " +
            this.scale + " " + this.scale)
    }
}

/**
 * Marks visual elements then returns live collection of visual elements from SVG
 * @param {Element} svg SVG DOM element to extract visual elements from
 * @returns {HTMLCollection} Live collection of visual elements
 */
function ExtractVisualElements(svg) {
    let visualId = 0

    // this is a live collection of elements in class <VISUAL_ELEMENT_LABEL>
    const elements = svg.getElementsByClassName(VISUAL_ELEMENT_LABEL)

    // remove all existing visual element marks just to be safe
    while (elements.length > 0) {
        elements.item(0).classList.remove(VISUAL_ELEMENT_LABEL)
    }

    // mark all elements with the appropriate tag, 
    for (const tag of VISUAL_ELEMENT_TAGS) {
        const shapeGroup = svg.getElementsByTagName(tag)
        for (const shape of shapeGroup) {
            shape.classList.add(VISUAL_ELEMENT_LABEL)

            shape.classList.remove(SELECTION_LABEL)

            if (!shape.hasAttribute("visualId")) {
                shape.setAttribute("visualId", visualId)
                visualId += 1
            }
        }
    }

    return elements
}

export {VisualizationElement}
