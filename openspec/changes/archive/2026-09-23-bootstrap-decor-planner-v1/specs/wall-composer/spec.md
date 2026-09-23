## Purpose

The interactive editor where pieces are placed and arranged on the wall at true scale, with helpers for alignment and spacing, so that compositions can be tried quickly and precisely.

## ADDED Requirements

### Requirement: To-scale rendering
The composer SHALL render the wall and all placed pieces and obstacles at the same scale derived from their real dimensions, so that relative sizes on screen match reality.

#### Scenario: Relative size
- **WHEN** a 50 cm wide piece is placed on a 300 cm wide wall
- **THEN** the piece occupies one sixth of the wall's rendered width

### Requirement: Zoom and pan
The composer SHALL support zoom and pan with pinch/drag on touch and wheel/trackpad on desktop, and a "fit wall" action.

#### Scenario: Fit wall
- **WHEN** the user triggers "fit wall"
- **THEN** the whole wall is visible and centred in the viewport

### Requirement: Placing pieces
The system SHALL let the user add any library piece or new placeholder to the wall. A newly added placement SHALL appear horizontally centred on the wall with its centre on the eye-level line. A piece MAY be placed more than once.

#### Scenario: Adding a piece
- **WHEN** the user adds a 40 × 50 cm piece to a 300 cm wall with eye level 145 cm
- **THEN** it is placed with its centre at 150 cm from the left and 145 cm from the floor

### Requirement: Moving pieces
The system SHALL let the user drag placements with touch or mouse, show the live position (distance of the frame from the left edge and floor) while dragging, and allow entering an exact position numerically. On desktop, arrow keys SHALL nudge the selection by 1 mm, and by 10 mm with Shift.

#### Scenario: Numeric position
- **WHEN** the user types 85 cm as the distance from the left for a selected piece
- **THEN** the piece's left edge moves to 850 mm from the wall's left edge

### Requirement: Snapping
While dragging, the system SHALL snap piece edges and centres to wall edges, wall centre lines, other pieces' edges and centres, obstacle edges, the eye-level line, and to equal gaps between neighbouring pieces, showing a guide line for the active snap. Snapping SHALL be toggleable in settings and temporarily disabled while a modifier is held (desktop).

#### Scenario: Top edges aligned
- **WHEN** the user drags a piece so that its top edge comes within the snap threshold of another piece's top edge
- **THEN** the top edges align exactly and a guide line is shown

#### Scenario: Equal spacing
- **WHEN** the user drags a third piece to the right of two pieces spaced 12 cm apart
- **THEN** it snaps to a 12 cm gap and the equal gaps are indicated

### Requirement: Gap readouts
When a placement is selected, the system SHALL display the distances to its nearest neighbours (pieces, obstacles or wall edges) horizontally and vertically.

#### Scenario: Neighbour distance
- **WHEN** a piece is selected 12 cm to the right of another piece
- **THEN** a "12 cm" gap indicator is shown between them

### Requirement: Eye-level guide
The composer SHALL show a horizontal eye-level guide line, default 145 cm from the floor, adjustable per project by dragging or numeric input, and SHALL provide an action to centre the current selection (as a group) vertically on it.

#### Scenario: Centre group on eye level
- **WHEN** three pieces spanning from 120 cm to 190 cm are selected and "centre on eye level" is used with eye level 145 cm
- **THEN** the group moves vertically so that its bounding box centre is at 145 cm, keeping the pieces' relative positions

### Requirement: Multi-selection and group operations
The system SHALL support selecting multiple placements and moving them together, aligning them (left, right, top, bottom, horizontal centre, vertical centre), distributing them with equal gaps horizontally or vertically, and centring the group horizontally on the wall or on a selected obstacle.

#### Scenario: Distribute horizontally
- **WHEN** four selected pieces are distributed horizontally
- **THEN** the outer pieces stay in place and the gaps between consecutive pieces are equal

#### Scenario: Centre over sofa
- **WHEN** a group is selected together with the obstacle "Sofa" and "centre on obstacle" is used
- **THEN** the group's horizontal centre matches the sofa's horizontal centre

### Requirement: Layering, locking and removal
The system SHALL let the user bring a placement forward/backward, lock a placement against accidental moves, and remove a placement from the wall (without deleting the piece from the library).

#### Scenario: Locked piece
- **WHEN** a locked placement is dragged
- **THEN** it does not move

### Requirement: Warnings
The system SHALL visually flag placements that extend beyond the wall boundary or overlap another placement or an obstacle.

#### Scenario: Off the wall
- **WHEN** a piece is dragged so that part of it is beyond the right wall edge
- **THEN** the piece is highlighted as out of bounds

### Requirement: Hanging point display
The composer SHALL be able to show each placement's hanging point markers (toggle), computed from the piece's hanging configuration.

#### Scenario: Showing nails
- **WHEN** the hanging point toggle is on
- **THEN** each placed piece shows its hanging point marker(s) at the configured position

### Requirement: Undo and redo
The system SHALL provide undo and redo (buttons, and Ctrl/Cmd+Z, Shift+Ctrl/Cmd+Z on desktop) for all composer and wall edits within the open project, with at least 100 steps. A continuous drag SHALL count as one step.

#### Scenario: Undo a drag
- **WHEN** the user drags a piece from A to B and presses undo
- **THEN** the piece returns to A, and redo moves it back to B
