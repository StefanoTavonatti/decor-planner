# mounting-plan-export Specification

## Purpose

Produces the printable mounting map that tells the user exactly where to put each nail on the real wall, plus an image preview of the composition.

## Requirements

### Requirement: Nail coordinates
The system SHALL compute each placement's nail position(s) from the placement and the piece's hanging configuration, measured from the wall's bottom-left corner (floor + left corner): for 1 point, X = left edge + width / 2 and Y = top edge − offset; for 2 points, the two X values are the centre ∓ spacing / 2 with the same Y.

#### Scenario: Single hanging point
- **WHEN** a 40 × 50 cm piece with 1 point and offset 6 cm has its bottom-left corner at (65 cm, 118 cm)
- **THEN** its nail is at X = 85 cm, Y = 162 cm

#### Scenario: Two hanging points
- **WHEN** a 100 × 70 cm piece with 2 points, spacing 60 cm and offset 10 cm has its bottom-left corner at (150 cm, 95 cm)
- **THEN** its nails are at X = 170 cm and X = 230 cm, both at Y = 155 cm

### Requirement: PDF mounting map
The system SHALL export a PDF containing: the project name, date and drawing scale; a to-scale drawing of the wall outline, obstacles, numbered piece outlines and nail markers; dimension lines from the floor and the left edge to each nail; and a table listing for each placement its number, name, size, nail X value(s), nail Y and the top-edge height. All values SHALL use the current display unit.

#### Scenario: Export a composition
- **WHEN** the user exports a project with three placed pieces
- **THEN** a PDF is downloaded with a drawing showing pieces numbered 1–3 with nail markers, and a table with three rows of nail coordinates

#### Scenario: Imperial export
- **WHEN** the display unit is imperial and the user exports
- **THEN** all dimensions in the drawing and table are in feet/inches with fractions

### Requirement: Page setup and scale
The PDF SHALL use landscape A4 or Letter per the paper setting, and SHALL choose the largest standard scale (e.g. 1:10, 1:20, 1:25, 1:50) at which the wall fits the drawing area, stating it on the page. If the table does not fit on the first page, it SHALL continue on further pages.

#### Scenario: Scale choice
- **WHEN** a 320 cm wide wall is exported on A4
- **THEN** the drawing uses a standard scale at which the wall fits and the scale is printed on the page

### Requirement: Optional photo background
The export SHALL offer an option to include the wall photo as a faded background in the drawing; it SHALL be off by default.

#### Scenario: Default without photo
- **WHEN** the user exports without changing options
- **THEN** the drawing contains outlines only, without the wall photo

### Requirement: Placeholders in the plan
Placeholders SHALL be exported like other pieces, labeled with their name and size.

#### Scenario: Placeholder row
- **WHEN** a project containing a placeholder is exported
- **THEN** the placeholder appears in the drawing and in the nail table

### Requirement: Warnings before export
If any placement is out of bounds or overlapping, the system SHALL warn before exporting and let the user continue or cancel.

#### Scenario: Out-of-bounds warning
- **WHEN** the user exports while a piece extends beyond the wall
- **THEN** a warning is shown naming the piece, with options to continue or cancel

### Requirement: PNG preview export
The system SHALL export a PNG image of the composition as seen in the composer (wall background and pieces, without editing overlays).

#### Scenario: Preview image
- **WHEN** the user exports a PNG preview
- **THEN** an image of the wall with the placed pieces is downloaded
