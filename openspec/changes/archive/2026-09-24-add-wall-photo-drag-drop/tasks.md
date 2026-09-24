## 1. Shared drag-and-drop building blocks

- [x] 1.1 Add a `useFileDrop` hook in `src/features/common/` that tracks drag-over state for an element (enter/leave counter so child elements don't flicker), reacts only to drags that carry files, stops propagation on drop, and returns the first `image/*` file or a "no image" result
- [x] 1.2 Add a `DropZone` wrapper component that renders the dashed overlay with a message while files are dragged over it and calls back with the chosen image (or shows the "Only image files can be used" error)
- [x] 1.3 Unit-test the file selection logic (first image among mixed files, no image → error, empty drop)

## 2. New project dialog

- [x] 2.1 Add a `startWithFile(file)` entry point to `useWallPhotoFlow` (import → `RectifyEditor`), shared by the picker buttons and drops
- [x] 2.2 Wrap the wall choices of `NewProjectDialog` in `DropZone` ("Drop a photo of the wall"); a dropped image goes through `startWithFile` and creates the project on confirm
- [x] 2.3 Desktop-only hint on the "Choose a photo" card ("or drag it here"), hidden on `pointer: coarse`

## 3. Wall panel (replace photo)

- [x] 3.1 Wrap the Wall panel's photo section in `DropZone` ("Drop a photo of the wall"); a dropped image goes through `startWithFile` and on confirm commits the new wall (undoable), placements unchanged; cancel leaves the wall as is
- [x] 3.2 Desktop-only hint next to "Replace photo"/"Choose photo"

## 4. Piece editor

- [x] 4.1 Wrap the piece editor body in `DropZone` ("Drop an image of the piece"); a dropped image is imported and opens `RectifyEditor` in `full` (flat) mode with the current size prefilled; on confirm set image, image source and outer size like "Flat image / scan…"
- [x] 4.2 Ensure drops on the piece editor modal don't also reach the dialog or panel underneath (nested drop zones: innermost wins)
- [x] 4.3 Desktop-only hint under the image buttons ("or drag an image here")

## 5. App-level guard

- [x] 5.1 In `App`, prevent the default `dragover`/`drop` behaviour on `window` for file drags outside drop targets so the browser never navigates to the dropped file (covers the project list and the editor canvas)

## 6. Verification

- [x] 6.1 Playwright helper that dispatches a synthetic file drop (DataTransfer built from `e2e/fixtures/wall-photo.jpg`) onto a locator
- [x] 6.2 Playwright: drop onto the New project dialog → corner editor → 320 × 270 → editor shows the wall with photo
- [x] 6.3 Playwright: drop onto the Wall panel → confirm → wall photo replaced, a placement keeps its position, undo restores the old photo; cancel leaves it unchanged
- [x] 6.4 Playwright: drop onto the piece editor → confirm 40 × 50 → save → library shows the piece with image
- [x] 6.5 Playwright: non-image drop shows the error in each place; drop on the project list and on the canvas keeps the page
- [x] 6.6 Manual check in desktop Safari, Chrome and Firefox: drag from Finder/Desktop, overlays appear and clear correctly
- [x] 6.7 Lint, type-check, unit and e2e suites green; `openspec validate add-wall-photo-drag-drop --strict`
