## Why

On desktop, photos of the wall and of the pictures are usually already on screen (Desktop, Finder, a browser tab). Going through a button and a file dialog every time is slower than dragging the image straight to where it is needed.

## What Changes

- Image files can be dragged from the device and dropped in three places:
  - **New project dialog** (while the wall choices are shown): same flow as "Choose a photo" — import (upright, downscaled) → four-corner straightening → project created.
  - **Wall panel** in the editor: same flow as "Replace photo" — the dropped photo is straightened and replaces the wall photo; wall dimensions come from the straightening step, placements keep their positions; undoable.
  - **Piece editor** (new or existing piece): the dropped image opens the straightening editor in flat-image mode (handles near the image edges, as for "Flat image / scan…"); on confirm it becomes the piece image and sets its outer size.
- While a file is dragged over one of these areas, a visible drop target is shown ("Drop a photo of the wall" / "Drop an image of the piece"); it disappears when the drag leaves or ends.
- Dropping a non-image file shows an error and changes nothing. If several files are dropped, the first image is used.
- Dropping a file elsewhere in the app no longer makes the browser navigate away to open the file (which would lose the page).
- Desktop-only hints ("or drag an image here") next to the relevant buttons; hidden on touch devices, where files cannot be dragged in.

Assumptions:
- In the piece editor a dropped file uses flat-image mode, because files dragged from a computer are usually scans or already-straight images; the corners can still be moved for an angled photo.
- The editor canvas itself is not a drop target (to avoid confusing "replace wall photo" with "add a piece"); dropping there is ignored like any stray drop.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `wall-setup`: adds requirements for dropping a wall photo onto the New project dialog and onto the Wall panel, and for ignoring stray file drops.
- `piece-library`: adds a requirement for dropping an image onto the piece editor.

## Impact

- `src/features/projects/NewProjectDialog.tsx`, `src/features/wall/WallSourcePicker.tsx`, `src/features/composer/panels.tsx` (Wall panel), `src/features/library/PieceEditor.tsx`; a shared drag-and-drop hook and drop-target component in `src/features/common/`; styles in `src/app/styles.css`; app-level guard in `src/app/App.tsx`.
- No new dependencies, no data model or file format changes.
