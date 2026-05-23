// visualization/features/regionSelect.js
//
// Participant tool: box or lasso select a REGION and store coordinates (not SVG elements).

import { wrapper, svgElement, screenToSVG, page, staticvis, debug } from "../visualizer.js"

export const MODE_REGION_BOX = "regionBox"
export const MODE_REGION_LASSO = "regionLasso"

const MIN_POINT_DIST2 = 2.5 * 2.5

function dist2(a, b) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return dx * dx + dy * dy
}

function rectFromPoints(a, b) {
  const x1 = Math.min(a.x, b.x)
  const y1 = Math.min(a.y, b.y)
  const x2 = Math.max(a.x, b.x)
  const y2 = Math.max(a.y, b.y)
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 }
}

function round2(n) {
  return Math.round(n * 100) / 100
}

function buildRectD(x, y, w, h) {
  return `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`
}

function buildPolyD(points, closed) {
  if (!points.length) return ""
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) d += ` L ${points[i].x} ${points[i].y}`
  if (closed) d += " Z"
  return d
}

export const regionSelect = (visualizer) => {
  const decorated = Object.create(visualizer)

  let drawing = false
  let startPt = null
  let lassoPts = []
  let answer = null

  // overlay for UX
  let overlayG = null
  let overlayPath = null

  function ensureOverlay() {
    if (!svgElement) return
    if (!overlayG) {
      overlayG = document.createElementNS("http://www.w3.org/2000/svg", "g")
      overlayG.setAttribute("id", "region-select-overlay")
      overlayG.setAttribute("pointer-events", "none")
      svgElement.appendChild(overlayG)
    }
    if (!overlayPath) {
      overlayPath = document.createElementNS("http://www.w3.org/2000/svg", "path")
      overlayPath.setAttribute("class", "region-select-shape")
      overlayPath.setAttribute("vector-effect", "non-scaling-stroke")
      overlayG.appendChild(overlayPath)
    }
  }

  function setOverlayD(d) {
    ensureOverlay()
    if (overlayPath) overlayPath.setAttribute("d", d)
  }

  function clearOverlay() {
    if (overlayPath) overlayPath.setAttribute("d", "")
  }

  function addLassoPoint(p) {
    if (lassoPts.length === 0 || dist2(lassoPts[lassoPts.length - 1], p) >= MIN_POINT_DIST2) {
      lassoPts.push({ x: p.x, y: p.y })
    }
  }

function normalizeRect(region) {
  if (!region) return null

  if (region.width < 1 || region.height < 1) return null

  return {
    type: "rect",
    x: round2(region.x),
    y: round2(region.y),
    width: round2(region.width),
    height: round2(region.height),
  }
}

function normalizePolygon(points) {
  if (!points || points.length < 3) return null

  const rounded = points.map(pt => ({
    x: round2(pt.x),
    y: round2(pt.y),
  }))

  // Remove duplicate closing point if one exists
  const first = rounded[0]
  const last = rounded[rounded.length - 1]

  if (first && last && first.x === last.x && first.y === last.y) {
    rounded.pop()
  }

  if (rounded.length < 3) return null

  return {
    type: "polygon",
    closed: true,
    points: rounded,
  }
}

function finalizeAnswer() {
  if (!answer) return null

  if (answer.type === "rect") {
    answer = normalizeRect(answer)
    if (answer) {
      setOverlayD(buildRectD(answer.x, answer.y, answer.width, answer.height))
    } else {
      clearOverlay()
    }
  } else if (answer.type === "polygon") {
    answer = normalizePolygon(lassoPts.length ? lassoPts : answer.points)
    if (answer) {
      setOverlayD(buildPolyD(answer.points, true))
    } else {
      clearOverlay()
    }
  }

  return answer
}

function cloneAnswer(region) {
  if (!region) return null

  if (region.type === "rect") {
    return { ...region }
  }

  if (region.type === "polygon") {
    return {
      type: "polygon",
      closed: true,
      points: (region.points || []).map(pt => ({ x: pt.x, y: pt.y })),
    }
  }

  return null
}

  function beginBox(evt) {
    evt.preventDefault()
    drawing = true
    wrapper.classList.add("drawing-region")

    startPt = screenToSVG(evt.clientX, evt.clientY)
    answer = { type: "rect", x: startPt.x, y: startPt.y, width: 0, height: 0 }
    setOverlayD(buildRectD(answer.x, answer.y, answer.width, answer.height))
  }

  function beginLasso(evt) {
    evt.preventDefault()
    drawing = true
    wrapper.classList.add("drawing-region")

    lassoPts = []
    const p = screenToSVG(evt.clientX, evt.clientY)
    addLassoPoint(p)

    answer = { type: "polygon", closed: false, points: [] }
    setOverlayD(buildPolyD(lassoPts, false))
  }

  function onMove(evt) {
    if (!drawing) return
    evt.preventDefault()

    const p = screenToSVG(evt.clientX, evt.clientY)

    if (page.mode === MODE_REGION_BOX) {
      const r = rectFromPoints(startPt, p)
      answer = { type: "rect", ...r }
      setOverlayD(buildRectD(r.x, r.y, r.width, r.height))
    } else if (page.mode === MODE_REGION_LASSO) {
      addLassoPoint(p)
      answer = { 
        type: "polygon", 
        closed: false, 
        points: lassoPts.map(pt => ({ x: pt.x, y: pt.y })), 
    }
      setOverlayD(buildPolyD(lassoPts, false))
    }
  }

  function onUp() {
    if (!drawing) return

    if (page.mode === MODE_REGION_LASSO) {
      answer = {
        type: "polygon",
        closed: false,
        points: lassoPts.map(pt => ({ x: pt.x, y: pt.y })),
      }
    }

    drawing = false
    wrapper.classList.remove("drawing-region")
    finalizeAnswer()
  }

  decorated.onFirstLoadSvg = function () {
    visualizer.onFirstLoadSvg()
    if (staticvis) return

    // Only show tools when the iframe was loaded for the Region question type
    // (survey page uses ?regionBox=true or ?regionLasso=true)
    const params = new URLSearchParams(window.location.search)
    const isRegionContext =
        params.get(MODE_REGION_BOX) === "true" || params.get(MODE_REGION_LASSO) === "true"

    if (!isRegionContext) return

    if (params.get("editor") === "true") return

    page.addTool("Box Region", MODE_REGION_BOX)
    page.addTool("Lasso Region", MODE_REGION_LASSO)
  }
  
  decorated.onChangeMode = function () {
    visualizer.onChangeMode()

    const isBox = (page.mode === MODE_REGION_BOX)
    const isLasso = (page.mode === MODE_REGION_LASSO)

     // add/remove helper classes for CSS cursor styling
    wrapper.classList.toggle("mode-region-box", isBox)
    wrapper.classList.toggle("mode-region-lasso", isLasso)

    // override default panning only in region modes
    if (isBox) {
      wrapper.onpointerdown = beginBox
    } else if (isLasso) {
      wrapper.onpointerdown = beginLasso
    } else {
      wrapper.onpointerdown = null
    }
  }

  document.addEventListener("pointermove", onMove)
  document.addEventListener("pointerup", onUp)
  document.addEventListener("pointercancel", onUp)  

  // Exposed API for survey saving + postMessage handlers
  decorated.getRegionAnswer = function () {
    if (drawing) {
      drawing = false
      wrapper.classList.remove("drawing-region")
      finalizeAnswer()
    }

    return cloneAnswer(answer)
  }

  decorated.clearRegion = function () {
    answer = null
    startPt = null
    lassoPts = []
    clearOverlay()
  }

  decorated.loadRegion = function (region) {
    if (!region) return decorated.clearRegion()

    answer = region
    if (region.type === "rect") {
      setOverlayD(buildRectD(region.x, region.y, region.width, region.height))
    } else if (region.type === "polygon") {
      setOverlayD(buildPolyD(region.points || [], true))
    }
  }

  return decorated
}