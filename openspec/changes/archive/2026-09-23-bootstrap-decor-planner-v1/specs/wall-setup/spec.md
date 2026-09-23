## Purpose

Defines the single wall of a project — its real dimensions, optional photo background and fixed obstacles — which serves as the to-scale canvas for composing.

## ADDED Requirements

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
