## 1. Project setup

- [x] 1.1 Scaffold Vite + React + TypeScript app (strict TS), add ESLint/Prettier, `.gitignore`, npm scripts (`dev`, `build`, `preview`, `test`, `lint`)
- [x] 1.2 Add dependencies: konva, react-konva, zustand, immer, dexie, fflate, pdf-lib, vite-plugin-pwa; dev: vitest, @testing-library/react, playwright
- [x] 1.3 Create folder layout `src/{core,storage,workers,features,app}` per design D5 and a lint rule/convention that `core/` does not import React or features
- [x] 1.4 Configure Vitest (jsdom for UI, node for core) and a minimal Playwright smoke test that loads the app

## 2. Core: units

- [x] 2.1 Implement `core/units` formatting: mm (0 decimals), cm (≤1 decimal), m (≤3 decimals), trailing zeros removed
- [x] 2.2 Implement imperial formatting: inches rounded to 1/16" with reduced fractions, feet-inches for ≥ 12" (e.g. 850 mm → `2' 9 7/16"`)
- [x] 2.3 Implement parsing: number with optional unit (`mm`, `cm`, `m`, `in`, `"`, `ft`, `'`), feet-inches with fractions, comma decimal separator, unitless → current display unit
- [x] 2.4 Implement validation helpers (unparseable, zero/negative for positive sizes) returning typed errors
- [x] 2.5 Unit tests covering every scenario in `specs/measurement-units/spec.md`

## 3. Core: geometry, homography, nails, snapping

- [x] 3.1 Implement `core/geometry`: rect types in mm (bottom-left origin, y up), bounds, overlap, containment, and `worldToView`/`viewToWorld` (scale + y-flip) per D1
- [x] 3.2 Implement `core/homography`: 4-point DLT solve (h33 = 1), point transform, inverse, and quadrilateral validity check (convex, non-self-intersecting); unit tests with known transforms
- [x] 3.3 Implement `core/nails`: nail coordinates for 1 and 2 hanging points per D7; tests for both spec scenarios in `mounting-plan-export`
- [x] 3.4 Implement hanging configuration validation (offset ≤ height, 0 < spacing ≤ width for 2 points); tests
- [x] 3.5 Implement `core/snapping`: candidate lines from wall edges/centres, other pieces' edges/centres, obstacles, eye level; threshold snapping returning snapped position + active guides; tests
- [x] 3.6 Implement equal-gap snapping and neighbour gap computation (nearest piece/obstacle/wall edge horizontally and vertically); tests
- [x] 3.7 Implement group operations: bounding box, align (left/right/top/bottom/h-centre/v-centre), distribute with equal gaps (outer items fixed), centre on wall/obstacle/eye level; tests

## 4. Core: domain model and file format

- [x] 4.1 Define TypeScript types for Piece, Project, Wall, Placement, Obstacle, Settings, image refs per D6, plus factories with defaults (hanging: 1 point, offset 0; eye level 1450 mm)
- [x] 4.2 Implement `core/format` `.decorplan` writer: manifest (`format`, `formatVersion: 1`, `appVersion`, `exportedAt`), `project.json`, `pieces.json` (referenced only), `images/*` via fflate
- [x] 4.3 Implement `.decorplan` reader: validate manifest and schema, migration chain scaffold (v1 → current), errors for invalid/corrupt/newer-version files
- [x] 4.4 Round-trip tests (write → read gives equal project/pieces/images) and error-case tests

## 5. Storage and autosave

- [x] 5.1 Define Dexie database (`projects`, `pieces`, `blobs`, `settings`) with versioned schema
- [x] 5.2 Implement repositories: projects CRUD (create, rename, duplicate with "(copy)" suffix, delete), pieces CRUD with "used in N projects" query, blob put/get/delete
- [x] 5.3 Implement cascading piece deletion (remove placements of the piece in all projects) and orphan blob cleanup
- [x] 5.4 Implement autosave: store subscription, ~500 ms debounce, flush on `visibilitychange`/`pagehide`
- [x] 5.5 Call `navigator.storage.persist()` on startup (guarded when unsupported)
- [x] 5.6 Tests with fake-indexeddb for repositories, cascade delete and autosave/reload behaviour

## 6. App shell and settings

- [x] 6.1 App layout and routing: project list, library, project editor (wall setup / composer), settings; returning from library restores the previous project view
- [x] 6.2 Responsive layout for ≥ 360 px phones and desktop; 44 × 44 px minimum touch targets; no horizontal page scroll
- [x] 6.3 Settings screen and store: display unit (default cm), paper size (default Letter for US/CA locale, else A4), snapping on/off; persisted
- [x] 6.4 Shared `LengthInput` component using the units parser (inline errors, keeps previous value) and `Length` display component
- [x] 6.5 PWA: vite-plugin-pwa manifest ("Decor Planner", icons, standalone), precache for full offline use, update-available prompt that reloads on confirmation after flushing autosave

## 7. Image import and photo rectification

- [x] 7.1 Image import: file/camera input (`accept="image/*"`), EXIF orientation applied, downscale to ≤ 3000 px long edge, store as JPEG blob
- [x] 7.2 Rectification worker: inverse mapping with bilinear sampling on ImageData/OffscreenCanvas, output size with aspect W:H; low-res preview mode
- [x] 7.3 Corner editor UI: image with 4 draggable handles (initially inset), quadrilateral outline, invalid-quad indicator disabling confirm
- [x] 7.4 Loupe (magnified view) while dragging a handle, for touch precision
- [x] 7.5 Width/height inputs (required), result preview, confirm; returns original image id, corners, dimensions and rectified image id
- [x] 7.6 Re-edit mode: open with saved corners/dimensions and regenerate on confirm

## 8. Wall setup and obstacles

- [x] 8.1 New project flow requiring wall setup: choose photo (→ rectification) or blank wall (W × H)
- [x] 8.2 Wall settings panel: edit dimensions, replace photo, re-rectify, remove photo; placements keep mm positions
- [x] 8.3 Obstacles: add/edit/delete with name, position and size; rendered distinctly (e.g. hatched) in the composer

## 9. Piece library

- [x] 9.1 Library screen: grid of pieces with image/placeholder preview, name and size
- [x] 9.2 Piece editor: name, outer W × H, image via rectification or flat import + rectangular crop, "used in N projects" indicator
- [x] 9.3 Placeholders: create without image, size presets (21 × 29.7, 30 × 40, 40 × 50, 50 × 70, 70 × 100 cm) and custom; coloured labeled rendering; attaching an image later turns it into a regular piece
- [x] 9.4 Hanging configuration editor: 1/2 points, offset, spacing, live preview of markers, validation errors, wire-measuring tip
- [x] 9.5 Delete piece with warning listing affected project count (uses cascade from 5.3)

## 10. Composer

- [x] 10.1 Konva stage rendering wall (background image or neutral), obstacles and placements to scale; zoom/pan (pinch, wheel/trackpad) and "fit wall"
- [x] 10.2 Add piece/placeholder to wall (from library picker or quick placeholder): horizontally centred, centred on eye level; allow multiple placements
- [x] 10.3 Drag placements with live position readout (left, floor distances); respect locked state
- [x] 10.4 Snapping integration with guide lines, toggle from settings, modifier key to temporarily disable on desktop
- [x] 10.5 Selection panel: numeric position inputs, gap readouts to neighbours, layer forward/backward, lock, remove from wall
- [x] 10.6 Keyboard nudging (arrows 1 mm, Shift 10 mm) on desktop
- [x] 10.7 Eye-level guide: draggable line + numeric input per project; "centre selection on eye level"
- [x] 10.8 Multi-select (tap/shift-click and marquee on desktop), group move, align, distribute, centre on wall / on selected obstacle
- [x] 10.9 Warning highlights for out-of-bounds and overlapping placements
- [x] 10.10 Hanging point marker toggle using `core/nails`
- [x] 10.11 Undo/redo per D8 (Immer snapshots, cap 100, drag = one step) with buttons and Ctrl/Cmd+Z / Shift+Ctrl/Cmd+Z; covers composer and wall edits

## 11. Export

- [x] 11.1 PDF generator (pdf-lib): page setup (A4/Letter landscape), header with project name, date and scale; standard-scale selection that fits the wall
- [x] 11.2 PDF drawing: wall outline, hatched obstacles, numbered piece outlines with placeholder labels, nail crosshairs, dimension lines from floor and left edge to each nail
- [x] 11.3 PDF nail table (number, name, size, nail X value(s), nail Y, top edge height) in current display unit, continuing on extra pages when needed
- [x] 11.4 Optional faded wall photo background (off by default) in the export dialog
- [x] 11.5 Pre-export warning listing out-of-bounds/overlapping pieces with continue/cancel
- [x] 11.6 PNG preview export of the composition without editing overlays
- [x] 11.7 Tests: PDF generation smoke test (page count, table rows) and nail values matching `core/nails`

## 12. Projects and .decorplan

- [x] 12.1 Project list screen: name, thumbnail, last modified; create, open, rename, duplicate, delete with confirmation
- [x] 12.2 Thumbnail generation on save (small PNG of the composition)
- [x] 12.3 Export project as `<name>.decorplan` download; record `lastExportedAt`
- [x] 12.4 Import `.decorplan` as a new project with piece reuse by id; clear error messages for invalid/corrupt/newer files without changing data
- [x] 12.5 "Last exported" display and non-blocking reminder when modified and not exported for > 14 days

## 13. Verification

- [x] 13.1 Playwright end-to-end: create blank wall project → add pieces/placeholder → arrange → export PDF and `.decorplan` → re-import
- [x] 13.2 Offline check: build + preview, load once, go offline, verify app loads and exports work
- [ ] 13.3 Manual test on a phone (iOS Safari and Android Chrome): camera import, rectification with loupe, touch drag/pinch, install to home screen
- [ ] 13.4 Real-world accuracy check: plan one real wall, print the PDF, verify nail positions with a tape measure
- [x] 13.5 Run `openspec validate bootstrap-decor-planner-v1 --strict`, lint, type-check and full test suite green
