## Why

Hanging several pictures on a wall is guesswork: it is hard to picture how a composition will look at real scale, and once a layout is chosen, turning it into accurate nail positions means error-prone measuring by hand. Decor Planner lets me try compositions on a photo of my own wall, in true scale, and then export a mounting map that says exactly where to put each nail.

## What Changes

- New installable, offline-capable PWA (Vite + React + TypeScript), local-first with no backend.
- Unit system: lengths stored in mm; UI in mm / cm (default) / m, or imperial (inches, feet-inches with fractions) via a setting.
- Perspective correction: drag 4 corners on a photo and enter real width x height to get a flat, uniformly scaled image. Used for both wall photos and piece photos.
- Wall setup: one wall per project, from a rectified photo or as a blank wall of given width x height; fixed obstacles (e.g. sofa, switch, window) can be marked.
- Piece library: pieces (paintings, prints, mirrors…) with a cropped photo, outer frame W x H and a hanging configuration (1 or 2 hanging points, offset from top, spacing). Placeholder pieces with only dimensions. The library is shared across projects.
- Composer: place pieces on the wall at real scale; drag, snap, align, equal spacing, eye-level guide line, group move, z-order, lock; undo/redo.
- Mounting plan export: PDF with a to-scale drawing, nail markers and dimension lines measured from the floor + left corner, plus a table of nail coordinates; PNG preview.
- Project persistence: debounced autosave to IndexedDB; export/import of self-contained `.decorplan` archives (versioned JSON + images); project list (create, open, rename, duplicate, delete).

## Capabilities

### New Capabilities
- `measurement-units`: internal mm model, display/input units (metric and imperial), parsing and formatting of lengths.
- `photo-rectification`: 4-corner perspective correction of a photo to a flat image with known real dimensions; reused for walls and pieces.
- `wall-setup`: defining the project's single wall (photo-based or blank), its dimensions and obstacles.
- `piece-library`: managing pieces and placeholders with outer dimensions, image and hanging points, reusable across projects.
- `wall-composer`: interactive to-scale placement and arrangement of pieces on the wall, with snapping, alignment helpers, eye-level guide and undo/redo.
- `mounting-plan-export`: generating the PDF mounting map with nail coordinates and a PNG preview.
- `project-persistence`: project list, local autosave, and `.decorplan` export/import.
- `app-shell`: installable PWA shell, offline support, navigation and app settings.

### Modified Capabilities
<!-- None: this is the first change in the project. -->

## Impact

- New codebase from scratch (repository currently contains only tooling/OpenSpec config).
- New dependencies: react, react-dom, konva, react-konva, dexie, fflate (or jszip), pdf-lib (or jspdf), vite-plugin-pwa, plus dev tooling (TypeScript, Vite, a test runner).
- Browser APIs: IndexedDB, `navigator.storage.persist()`, File/Blob APIs, canvas/WebGL, service worker.
- No servers, accounts, or network services.
