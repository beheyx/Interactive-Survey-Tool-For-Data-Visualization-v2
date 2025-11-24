# ADR-VIS-010: Lasso Region Representation as Polygons

**Status:** Accepted  
**Date:** 2025-11-23  
**Owner:** Edward Htoon  
**Related Components:** `visual-api`, `visual-ui`  
**Related ADRs:**  
- ADR-VIS-011 — Unified Region API for All Tools  
- ADR-PERF-013 — Client-Side Geometry Simplification for Lasso  

---

## Context

We are adding a **Lasso creation tool** to the visualization editor so survey designers can draw free-form regions over images (e.g., medical scans, maps, diagrams). These regions must:

- Be **persisted** in the backend (`visual-api`) as part of the visualization definition.  
- Be **rendered and edited** in the front-end (`visual-ui`) alongside existing region types (boxes, highlights).  
- Support **hit-testing** so participant clicks can be mapped reliably to survey responses.  
- Be **renderer-agnostic**, so we are not locked into a single front-end technology (e.g., SVG only).

The existing region model already supports rectangular regions (`type: "box"`) and simple highlights. We need to extend it to support arbitrary, free-form shapes created by the Lasso tool.

We considered multiple ways to represent lasso geometry:

1. **Raw mouse path samples**  
   - Store all captured mouse positions as a dense path.
   - Pros: Easy to generate from mouse events.  
   - Cons: Potentially huge payloads, no clear semantics, awkward for hit-testing.

2. **SVG path strings**  
   - Save an SVG `d` attribute (e.g., `"M 10 10 L 20 20 ..."`) as the canonical geometry.
   - Pros: Maps directly to SVG rendering.  
   - Cons: Couples the backend to SVG syntax; harder to use with other renderers; more complex to validate.

3. **Canonical polygons (ordered list of points)**  
   - Store geometry as `[[x1, y1], [x2, y2], ...]` in image coordinates.
   - Pros: Simple, numeric, renderer-agnostic; standard for hit-testing; compatible with both SVG and canvas.

We need a representation that is:

- **Consistent** with the rest of our data model.  
- **Efficient** enough for network payloads and runtime hit-testing.  
- **Extensible** for future features (e.g., grouping, layering, editing vertices).

---

## Decision

We will represent all lasso-created regions as **polygons**, where geometry is stored as an ordered list of points in image coordinates.

### Data Model

For Lasso regions:

- `type` must be `"polygon"`.
- `tool` must be `"Lasso"` for editor traceability.
- `geometry.points` is an array of `[x, y]` pairs in **image pixel coordinates**.
- The polygon is assumed to be **closed**:
  - Either the first point is repeated at the end by the editor, or  
  - The backend will conceptually close the polygon when performing hit-tests.

Example:

```json
{
  "id": "reg-lasso-1",
  "type": "polygon",
  "label": "Tumor Boundary",
  "selectable": true,
  "tool": "Lasso",
  "geometry": {
    "points": [
      [210, 320],
      [230, 310],
      [260, 315],
      [275, 340],
      [260, 365],
      [230, 370],
      [210, 350]
    ]
  },
  "metadata": {
    "closed": true,
    "simplified": true
  }
}
