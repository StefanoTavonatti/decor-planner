## Context

Greenfield project: the repository holds only tooling and OpenSpec config. See proposal.md for motivation and scope. Constraints: runs entirely in the browser as a PWA, no backend; must be usable with touch on a phone and with mouse/keyboard on desktop; the only thing that must be *accurate* is the geometry that ends up in the mounting plan.

## Goals / Non-Goals

**Goals:**
- A single, unit-agnostic geometric model (mm) that drives both the editor and the export, so what you see is what you measure.
- Pure, well-tested core logic (units, homography, nail coordinates, snapping, file format) separated from UI.
- A file format that can evolve without breaking older `.decorplan` files.

**Non-Goals:**
- Rendering pieces *in perspective* on the original photo (realistic preview mode) — later.
- Piece rotation, frames/mats styling, background removal, multiple walls, 1:1 printable templates, AR measuring, cloud sync, accounts.
- Lens-distortion correction; walls are assumed planar and rectangular.

## Decisions

### D1. World model in millimetres, wall coordinates with origin bottom-left, y up
All geometry (wall size, obstacles, placements, hanging offsets) is stored in mm as numbers. The wall frame has its origin at the floor + left corner with y growing upward, matching how you measure with a tape. Konva's screen space is y-down; the conversion (`worldToView` / `viewToWorld` with a single scale + flip) lives in one module and is the only place pixels meet mm.
*Alternatives:* storing pixels + scale (breaks on re-rectification, rounding drift); y-down world (every export number would need flipping — error-prone).

### D2. Rectify once, compose flat (vs. projecting into the original photo)
At wall/piece setup the user places 4 corners and enters real W × H; we compute the homography and warp the photo into a flat image whose aspect ratio equals W:H. The editor then works on a plain 2D wall. The original image and corner points are kept so rectification can be re-edited.
*Why:* snapping, dragging and export stay trivial 2D math; the export is flat anyway. The same homography can later power a perspective preview.
*Alternative:* keep the photo in perspective and transform every piece — more realistic but complicates all interaction.

### D3. Own homography + worker-based warp, no OpenCV
Homography from 4 point pairs via the standard 8×8 linear solve (DLT with h33 = 1). Warp by inverse mapping with bilinear sampling in a Web Worker on an `OffscreenCanvas`/`ImageData` (max ~3000 px long edge ≈ 9 Mpx → acceptable latency). A lower-resolution live preview is shown while dragging corners.
*Alternative:* opencv.js (~8 MB, overkill); WebGL warp (faster but more code/fallbacks — can replace the worker later behind the same interface).

### D4. Stack
Vite + React + TypeScript; react-konva for the canvas; **Zustand** for app state; **Dexie** for IndexedDB; **fflate** for zip; **pdf-lib** for vector PDF generation (no DOM dependency, precise units); vite-plugin-pwa (Workbox) for service worker/manifest; **Vitest** for unit tests of core logic, Playwright for a few end-to-end smoke tests.

### D5. Module layout
```
src/
  core/        pure TS, no React: units, geometry, homography, nails, snapping, format (decorplan)
  storage/     Dexie schema, repositories, autosave, persist() request
  workers/     rectify.worker.ts
  features/    wall-setup, rectify, library, composer, export, projects, settings
  app/         shell, routing, PWA registration
```
`core/` is the tested heart; features depend on core, never the reverse.

### D6. Data model
```
Piece      { id, name, widthMm, heightMm, imageId?, color?, hanging: { type: 1|2, offsetTopMm, spacingMm? }, createdAt, updatedAt }
Project    { id, name, wall: Wall, placements: Placement[], obstacles: Obstacle[], eyeLevelMm, createdAt, updatedAt, lastExportedAt? }
Wall       { widthMm, heightMm, source: 'blank' | { originalImageId, rectifiedImageId, corners: [4× {x,y} in source px] } }
Placement  { id, pieceId, xMm, yMm /* bottom-left of outer frame */, locked }   // z-order = array order
Obstacle   { id, name, xMm, yMm, widthMm, heightMm }
Image store { id, bytes: ArrayBuffer, mime, width, height }   // ArrayBuffer: more robust than Blob in IndexedDB (Safari)
Settings   { units: 'mm'|'cm'|'m'|'imperial', paper: 'A4'|'Letter', snapping: boolean }
```
Pieces live in a global library and are referenced by id from placements; editing a piece updates every project using it (it is the same physical object).

### D7. Nail coordinates
For a placement at (x, y) with piece W × H and hanging offset o:
- 1 point: `nail = (x + W/2, y + H − o)`
- 2 points with spacing s: `nails = (x + W/2 − s/2, y + H − o)` and `(x + W/2 + s/2, y + H − o)`
Computed in `core/nails.ts`, used by both the composer overlay and the PDF, so they can never disagree.

### D8. Undo/redo via state snapshots of the project document
The editable project document is immutable (Immer-produced); each committed user action pushes the previous document onto an undo stack (cap 100). Continuous gestures (drag) commit once on release. History is in-memory only, per open project.
*Alternative:* command pattern with inverse ops — more code, no benefit at this document size.

### D9. Autosave
A store subscription writes the current project to Dexie, debounced ~500 ms and flushed on `visibilitychange`/`pagehide`. On startup the app calls `navigator.storage.persist()`.

### D10. `.decorplan` format
Zip containing `manifest.json` (`{ format: "decorplan", formatVersion: 1, appVersion, exportedAt }`), `project.json`, `pieces.json` (only pieces referenced by the project), `images/<imageId>.<ext>`. Import runs a migration chain `vN → vN+1` up to current; newer-than-supported versions are rejected. Imported project always gets a new project id; pieces are matched by id (reuse if present, else insert).

### D11. Images
On import, images are decoded with EXIF orientation applied and downscaled to ≤ 3000 px long edge, stored as JPEG (quality ~0.9) Blobs. Rectified outputs are stored separately; originals kept for re-rectification.

Flat images (scans, already-straight photos) use the same 4-corner editor with handles starting near the image edges, so "crop" and "straighten" are one tool.

### D12. PDF layout
Landscape A4/Letter. Top: title, date, scale. Middle: vector drawing of wall outline, obstacles (hatched), piece outlines numbered, nail crosshairs, dimension lines from the floor and the left edge to each nail. Bottom/next page: nail table. The wall photo as faded background is optional (default off). Scale = largest standard ratio (1:10, 1:20, 1:25, 1:50…) that fits.

## Risks / Trade-offs

- [Safari/iOS may evict IndexedDB data] → request persistent storage, show "last exported" indicator and nudge to export `.decorplan` as backup.
- [Photo accuracy is limited by corner placement and non-planar walls] → zoom loupe for corner placement; the export numbers come from entered dimensions, never from pixel measurements of the photo.
- [Large photos exhaust memory on phones] → downscale at import, warp in a worker, release object URLs.
- [Imperial rounding to 1/16" loses precision] → storage stays in mm; rounding only at display time.
- [Shared library: editing a piece silently changes other projects] → acceptable (same physical object); show "used in N projects" on the piece editor.
- [iOS PWA quirks (file input, install flow)] → test on iOS Safari early; use standard `<input type="file" accept="image/*">`.

## Migration Plan

Not applicable (first release). The file format carries `formatVersion` from day one; IndexedDB schema uses Dexie versioning for future upgrades.

## Open Questions

- Exact visual style of the PDF (fonts, line weights) — can be tuned without changing specs.
- Whether to replace the worker-based warp with WebGL for speed — interface stays the same.
