## Purpose

Provides the installable, offline-capable application frame: navigation between projects, library and editor, responsive layout for phone and desktop, and global settings.

## ADDED Requirements

### Requirement: Installable PWA
The app SHALL be installable to the home screen/desktop via a web app manifest with name "Decor Planner", icons and standalone display mode.

#### Scenario: Install on phone
- **WHEN** the user opens the app in a supporting mobile browser and chooses "Add to Home Screen"
- **THEN** the app launches standalone without browser UI

### Requirement: Offline operation
After the first successful load, the app SHALL work fully offline, including creating and editing projects, importing images and exporting PDF, PNG and `.decorplan` files.

#### Scenario: Offline use
- **WHEN** the device has no network and the user opens the installed app
- **THEN** the app loads and all features work

### Requirement: Update notification
When a new version of the app is available, the app SHALL notify the user and apply the update on their confirmation, without losing unsaved state.

#### Scenario: New version
- **WHEN** a new version has been deployed and the app is opened
- **THEN** a non-blocking message offers to reload into the new version

### Requirement: Responsive, touch-friendly layout
The app SHALL be usable on phone screens (from 360 px wide) with touch and on desktop with mouse and keyboard; interactive targets on touch devices SHALL be at least 44 × 44 px.

#### Scenario: Composing on a phone
- **WHEN** the composer is opened on a 390 px wide phone
- **THEN** the wall canvas fills the available space and tools are reachable without horizontal page scrolling

### Requirement: Navigation
The app SHALL provide navigation between the project list, the piece library, the project editor (wall setup and composer) and settings.

#### Scenario: From project to library
- **WHEN** the user is in a project and opens the library
- **THEN** the library is shown and returning brings the user back to the same project view

### Requirement: Settings
The app SHALL provide global settings for display unit, paper size for PDF export (default based on browser locale: Letter for US/CA, otherwise A4) and snapping on/off, persisted on the device.

#### Scenario: Paper default
- **WHEN** the browser locale is en-US and settings were never changed
- **THEN** the PDF paper size setting is Letter
