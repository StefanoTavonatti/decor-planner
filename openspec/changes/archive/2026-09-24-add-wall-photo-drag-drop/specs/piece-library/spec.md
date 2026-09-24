## ADDED Requirements

### Requirement: Piece image by drag and drop
The piece editor (for a new or an existing piece) SHALL accept an image file dragged from the device and dropped onto it. The dropped image SHALL open the four-corner straightening editor in flat-image mode (handles starting near the image edges); on confirm it SHALL become the piece image and set the piece's outer width and height, exactly as with "Flat image / scan…". While a file is dragged over the piece editor, the system SHALL show a drop target reading "Drop an image of the piece". If several files are dropped, the first image SHALL be used; if none is an image, an error SHALL be shown and the piece left unchanged.

#### Scenario: Dropping a scan onto a new piece
- **WHEN** the user opens "New piece", drops a scan of a print and confirms the straightening editor with 40 × 50 cm
- **THEN** the piece editor shows the image, the outer size is 40 × 50 cm, and saving adds the piece to the library with that image

#### Scenario: Replacing an existing piece's image by dropping
- **WHEN** the user edits a piece that already has an image, drops a new image and confirms it
- **THEN** the new image replaces the old one after saving, and every placement of the piece shows it

#### Scenario: Dropping a non-image onto the piece editor
- **WHEN** the user drops a text file onto the piece editor
- **THEN** an error says that only image files can be used, and the piece's image and size are unchanged
