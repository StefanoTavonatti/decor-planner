# photo-rectification Specification

## Purpose

Turns a photo taken at an angle into a flat, uniformly scaled image of a rectangular surface of known size, used for both walls and pieces.

## Requirements

### Requirement: Image import
The system SHALL let the user pick an image from the device (including taking a photo with the camera on mobile). Imported images MUST respect EXIF orientation and MUST be downscaled so that the longest edge is at most 3000 px.

#### Scenario: Phone photo with rotation metadata
- **WHEN** the user imports a portrait photo whose pixels are stored landscape with an EXIF rotation flag
- **THEN** the image is shown upright

#### Scenario: Large photo downscaled
- **WHEN** the user imports a 6000 × 4000 px photo
- **THEN** the stored image is 3000 × 2000 px

### Requirement: Four-corner selection
The system SHALL display the imported image with four draggable corner handles, initially placed inset from the image edges, which the user positions on the corners of the real rectangle. While a handle is being dragged, the system SHALL show a magnified view (loupe) around the handle for precise placement with touch.

#### Scenario: Adjusting a corner
- **WHEN** the user drags the top-left handle onto the wall's top-left corner
- **THEN** the handle follows the pointer, a loupe shows the magnified area, and the outlined quadrilateral updates

### Requirement: Real dimensions entry
The system SHALL require the user to enter the real width and height of the selected rectangle before completing rectification.

#### Scenario: Missing dimension
- **WHEN** the user tries to confirm without entering a height
- **THEN** confirmation is blocked and the height field is marked as required

### Requirement: Invalid quadrilateral rejected
The system SHALL reject a corner configuration that is self-intersecting or not convex, and indicate the problem to the user.

#### Scenario: Crossed corners
- **WHEN** the user drags the top-left handle to the right of the top-right handle so that the edges cross
- **THEN** the outline is shown as invalid and confirmation is disabled

### Requirement: Perspective-corrected output
On confirmation, the system SHALL produce a flat image of the region inside the quadrilateral, corrected for perspective, whose aspect ratio equals the entered width : height, so that the scale is uniform across the image. A preview of the result SHALL be shown before it is used.

#### Scenario: Angled wall photo
- **WHEN** the user rectifies a wall photo taken at an angle with corners set and dimensions 320 × 270 cm
- **THEN** the resulting image has an aspect ratio of 320:270 and lines that are straight and parallel on the real wall appear straight and parallel

### Requirement: Re-editable rectification
The system SHALL keep the original image and corner positions so that the user can later reopen the corner editor, adjust the corners or dimensions, and regenerate the rectified image.

#### Scenario: Correcting a corner later
- **WHEN** the user reopens rectification for an existing wall and moves one corner
- **THEN** the corners start at their previously saved positions and the rectified image is regenerated on confirm
