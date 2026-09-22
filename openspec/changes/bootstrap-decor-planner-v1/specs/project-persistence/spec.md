## Purpose

Keeps projects and the piece library safely on the device with automatic saving, and lets projects be exported to and imported from portable `.decorplan` files for backup and sharing.

## ADDED Requirements

### Requirement: Project list
The system SHALL show a list of projects with name, thumbnail and last modified date, and SHALL allow creating, opening, renaming, duplicating and deleting projects. Deleting SHALL require confirmation.

#### Scenario: Duplicate a project
- **WHEN** the user duplicates the project "Living room"
- **THEN** a new project "Living room (copy)" with the same wall, obstacles and placements appears, referencing the same library pieces

### Requirement: Local autosave
The system SHALL automatically save all changes to projects, pieces and settings on the device, without an explicit save action, within about one second of a change and when the app is hidden or closed.

#### Scenario: Reload keeps work
- **WHEN** the user moves a piece and reloads the page after two seconds
- **THEN** the project opens with the piece in the new position

### Requirement: Persistent storage request
The system SHALL request persistent storage from the browser so that local data is not evicted automatically where supported.

#### Scenario: First launch
- **WHEN** the app starts for the first time
- **THEN** it requests persistent storage from the browser

### Requirement: Export .decorplan
The system SHALL export a project as a single `.decorplan` file that is self-contained: it includes the project (wall, obstacles, placements, eye level), all pieces it references, and all images needed (original and rectified wall image, piece images), plus a manifest with a format identifier and format version.

#### Scenario: Export and open elsewhere
- **WHEN** the user exports "Living room" and imports the file in a fresh browser with an empty library
- **THEN** the project opens identically, including images, and the referenced pieces are added to the library

### Requirement: Import .decorplan
The system SHALL import a `.decorplan` file as a new project (never overwriting an existing project). Pieces whose id already exists in the library SHALL be reused rather than duplicated; others SHALL be added. Files from older supported format versions SHALL be migrated.

#### Scenario: Importing twice
- **WHEN** the same file is imported twice
- **THEN** two separate projects exist and the library contains each piece only once

### Requirement: Import errors
The system SHALL reject files that are not valid `.decorplan` archives, are corrupted, or have a newer format version than supported, with a clear message and without changing existing data.

#### Scenario: Newer format
- **WHEN** the user imports a file with a format version newer than the app supports
- **THEN** an error says the file was made with a newer version of the app and nothing is imported

### Requirement: Backup reminder
The system SHALL show when each project was last exported and SHALL show a non-blocking reminder to export when a project has been modified and not exported for more than 14 days.

#### Scenario: Stale backup
- **WHEN** a project modified today was last exported 20 days ago
- **THEN** the project list shows a reminder to export it
