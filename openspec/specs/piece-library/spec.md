# piece-library Specification

## Purpose

Manages the reusable collection of pieces (paintings, prints, mirrors…) and placeholders, with their outer frame size, image and hanging configuration, shared across all projects.

## Requirements

### Requirement: Piece with outer dimensions
The system SHALL let the user create a piece with a name and the outer frame width and height in real units. Only the outer dimensions are modelled.

#### Scenario: Creating a piece
- **WHEN** the user creates a piece "Harbour print" of 40 × 50 cm
- **THEN** the piece appears in the library with size 400 × 500 mm

### Requirement: Piece image
The system SHALL allow attaching an image to a piece, either via photo rectification (corners of the frame + dimensions, which set the piece dimensions) or by importing an already-flat image and cropping it to a rectangle. The image SHALL be displayed stretched to the piece's outer dimensions.

#### Scenario: Photo of a framed painting
- **WHEN** the user rectifies a photo of a painting with dimensions 70 × 100 cm
- **THEN** the piece has dimensions 700 × 1000 mm and the rectified image

### Requirement: Placeholders
The system SHALL support placeholder pieces that have dimensions but no image, rendered as a labeled coloured rectangle showing their size. The system SHALL offer presets for common sizes (at least 21 × 29.7, 30 × 40, 40 × 50, 50 × 70, 70 × 100 cm) and custom sizes, and SHALL allow creating a placeholder directly from the composer.

#### Scenario: Placeholder from preset
- **WHEN** the user adds a 50 × 70 placeholder from the presets
- **THEN** a placeholder piece of 500 × 700 mm is created and can be placed on the wall

#### Scenario: Replacing a placeholder with an image later
- **WHEN** the user attaches an image to an existing placeholder
- **THEN** it becomes a regular piece and every placement of it shows the image

### Requirement: Hanging configuration
Each piece SHALL have a hanging configuration: 1 point (centred horizontally) or 2 points (symmetric around the centre, with a spacing), and a vertical offset from the top edge of the frame to the hanging point(s). The default SHALL be 1 point with offset 0. For wire-hung pieces the UI SHALL explain that the offset is measured with the wire pulled taut toward the top.

#### Scenario: Default hanging
- **WHEN** a new piece is created without editing hanging settings
- **THEN** it has 1 hanging point at the top centre with offset 0

#### Scenario: Two D-rings
- **WHEN** the user sets 2 points with spacing 40 cm and offset 8 cm on a 60 cm wide piece
- **THEN** the piece shows two hanging markers 40 cm apart, centred, 8 cm below the top edge

### Requirement: Hanging configuration validation
The system SHALL reject an offset greater than the piece height and a spacing greater than the piece width, and require a positive spacing for 2 points.

#### Scenario: Spacing too large
- **WHEN** the user sets a spacing of 70 cm on a 60 cm wide piece
- **THEN** an inline error is shown and the value is not applied

### Requirement: Shared library across projects
Pieces SHALL live in a library shared by all projects. Editing a piece SHALL update every placement of it in every project. The piece editor SHALL show how many projects use the piece.

#### Scenario: Editing a used piece
- **WHEN** a piece used in two projects is resized from 40 × 50 to 50 × 60 cm
- **THEN** both projects show the piece at 50 × 60 cm and the editor indicates "used in 2 projects"

### Requirement: Deleting pieces
The system SHALL allow deleting a piece. If the piece is placed in any project, the system SHALL warn with the number of affected projects, and on confirmation SHALL remove the piece and its placements.

#### Scenario: Deleting a placed piece
- **WHEN** the user deletes a piece placed in one project and confirms the warning
- **THEN** the piece is removed from the library and its placement disappears from that project
