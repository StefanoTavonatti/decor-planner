# wall-setup Specification

## Purpose

Defines the single wall of a project — its real dimensions, optional photo background and fixed obstacles — which serves as the to-scale canvas for composing.

## Requirements

### Requirement: One wall per project
Each project SHALL have exactly one wall with a width and height in real units.

#### Scenario: New project requires a wall
- **WHEN** the user creates a new project
- **THEN** the user is asked to set up the wall (from a photo or blank) before composing

### Requirement: Wall from photo
The system SHALL allow creating the wall from a photo via photo rectification; the entered real dimensions become the wall dimensions and the rectified image becomes the wall background.

#### Scenario: Photo wall
- **WHEN** the user rectifies a wall photo with dimensions 320 × 270 cm
- **THEN** the project's wall is 3200 × 2700 mm with the rectified image as background

### Requirement: Blank wall
The system SHALL allow creating a wall from width and height only, rendered as a plain neutral surface.

#### Scenario: Blank wall
- **WHEN** the user chooses a blank wall and enters 400 × 280 cm
- **THEN** the project's wall is 4000 × 2800 mm without a background image

### Requirement: Editing wall dimensions or photo
The system SHALL allow changing the wall dimensions, replacing the photo, re-rectifying, or removing the photo later. Existing placements MUST keep their positions in mm relative to the bottom-left corner.

#### Scenario: Widening the wall
- **WHEN** a piece is placed at 850 mm from the left and the wall width is changed from 3200 to 3500 mm
- **THEN** the piece is still 850 mm from the left

### Requirement: Obstacles
The system SHALL allow adding rectangular obstacles (e.g. sofa, switch, window, TV) to the wall, each with a name, position and size in real units. Obstacles SHALL be visually distinct from pieces, SHALL act as snapping targets, SHALL NOT have hanging points, and SHALL be drawn in the mounting plan.

#### Scenario: Adding a sofa
- **WHEN** the user adds an obstacle "Sofa" 220 cm wide, 85 cm high at 50 cm from the left and 0 cm from the floor
- **THEN** a distinct rectangle labeled "Sofa" appears at that position on the wall

#### Scenario: Obstacles not in nail table
- **WHEN** the mounting plan is exported for a wall with an obstacle
- **THEN** the obstacle is drawn on the plan but does not appear in the nail coordinates table

### Requirement: Wall photo by drag and drop in the New project dialog
While the New project dialog offers the wall setup choices, the system SHALL accept an image file dragged from the device (e.g. the desktop) and dropped onto the dialog, and SHALL process it exactly like a photo chosen with "Choose a photo" (import, then photo rectification, then project creation). While a file is dragged over the dialog, the system SHALL show a visible drop target. If several files are dropped, the system SHALL use the first image among them. If no dropped file is an image, the system SHALL show an error message and leave the dialog unchanged.

#### Scenario: Dropping a wall photo
- **WHEN** the user drags a JPEG from the desktop onto the New project dialog and drops it
- **THEN** the four-corner straightening editor opens with that photo, and after confirming with 320 × 270 cm the project is created with a 3200 × 2700 mm wall and the straightened photo as background

#### Scenario: Drop target while dragging
- **WHEN** the user drags a file over the New project dialog
- **THEN** a drop target reading "Drop a photo of the wall" is shown, and it disappears when the drag leaves the dialog without dropping

#### Scenario: Dropping a non-image file
- **WHEN** the user drops a PDF onto the New project dialog
- **THEN** an error says that only image files can be used, and the dialog still shows the wall setup choices

#### Scenario: Multiple files dropped
- **WHEN** the user drops a text file and two photos at once
- **THEN** the first photo is used for the wall

### Requirement: Replace wall photo by drag and drop
In the project editor, the Wall panel SHALL accept a dropped image file and process it like "Replace photo": the photo is straightened with the four-corner editor, then replaces the wall photo and sets the wall dimensions, while existing placements keep their positions in mm. The replacement SHALL be undoable. The same drop target, multiple-file and non-image rules as in the New project dialog SHALL apply.

#### Scenario: Replacing the wall photo by dropping
- **WHEN** a project has a piece placed 850 mm from the left and the user drops a new wall photo onto the Wall panel and confirms it with 320 × 270 cm
- **THEN** the wall shows the new straightened photo, is 3200 × 2700 mm, the piece is still 850 mm from the left, and undo restores the previous photo

#### Scenario: Cancelling after a drop
- **WHEN** the user drops a photo onto the Wall panel and cancels the straightening editor
- **THEN** the wall photo and dimensions are unchanged

### Requirement: Stray file drops do not leave the app
The system SHALL prevent the browser's default behaviour of opening a dropped file when a file is dropped anywhere in the app outside a drop target, so that the current page and unsaved state are kept.

#### Scenario: Drop outside a drop target
- **WHEN** the user drops an image onto the project list or onto the editor canvas
- **THEN** the app stays on the current screen and nothing is imported
