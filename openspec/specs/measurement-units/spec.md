# measurement-units Specification

## Purpose

Defines how lengths are stored, entered and displayed so that every dimension in the app is exact and consistent across metric and imperial units.

## Requirements

### Requirement: Lengths stored in millimetres
The system SHALL store every length (wall, obstacle, piece, placement, hanging offset, eye level) as a number of millimetres, independent of the unit shown in the UI. Changing the display unit MUST NOT change any stored value.

#### Scenario: Switching units does not alter data
- **WHEN** a piece is entered as 50 cm wide and the user switches the display unit to imperial and back to cm
- **THEN** the piece width is still displayed as 50 cm and its stored width is 500 mm

### Requirement: Selectable display unit
The system SHALL provide an app setting for the display unit with the options mm, cm, m and imperial, with cm as the default. All dimension displays, inputs and exports MUST use the selected unit.

#### Scenario: Default unit
- **WHEN** the app is used for the first time
- **THEN** all dimensions are displayed in cm

#### Scenario: Imperial selected
- **WHEN** the user selects imperial in settings
- **THEN** dimensions are displayed in inches, and lengths of 12 inches or more are displayed as feet and inches (e.g. `5' 4 3/8"`)

### Requirement: Metric formatting
The system SHALL display metric lengths with at most 1 decimal in cm, 0 decimals in mm and 3 decimals in m, omitting trailing zeros.

#### Scenario: Formatting in cm
- **WHEN** a stored length of 1625 mm is displayed with unit cm
- **THEN** it is shown as `162.5 cm`

### Requirement: Imperial formatting with fractions
The system SHALL display imperial lengths rounded to the nearest 1/16 inch, using reduced fractions (e.g. `1/2`, `3/8`) instead of decimals.

#### Scenario: Fraction rounding
- **WHEN** a stored length of 850 mm is displayed in imperial
- **THEN** it is shown as `2' 9 7/16"`

### Requirement: Length input parsing
The system SHALL accept length input as a number optionally followed by a unit (`mm`, `cm`, `m`, `in`, `"`, `ft`, `'`), including imperial forms with feet, inches and fractions (e.g. `5' 4 3/8"`, `33 1/2`, `33.5in`). A number without a unit MUST be interpreted in the current display unit (inches when imperial). A comma MUST be accepted as a decimal separator.

#### Scenario: Unitless input in current unit
- **WHEN** the display unit is cm and the user enters `85,5`
- **THEN** the stored value is 855 mm

#### Scenario: Explicit unit overrides display unit
- **WHEN** the display unit is cm and the user enters `850mm`
- **THEN** the stored value is 850 mm

#### Scenario: Imperial feet-inches input
- **WHEN** the user enters `5' 4 3/8"`
- **THEN** the stored value is 1635.1 mm (±0.1 mm)

### Requirement: Invalid input rejected
The system SHALL reject input that cannot be parsed or that is zero or negative where a positive size is required, show an inline error, and keep the previous value.

#### Scenario: Unparseable input
- **WHEN** the user enters `abc` as a piece width
- **THEN** an inline error is shown and the piece width is unchanged
