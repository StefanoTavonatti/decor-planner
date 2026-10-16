## MODIFIED Requirements

### Requirement: Pull request checklist
The repository SHALL provide a pull request template that is pre-filled for every new pull request and lists the OpenSpec change name, whether AI tools were used, and checkboxes for: OpenSpec change included and archived, main specs synced, `CHANGELOG.md` updated under `[Unreleased]` (or not needed because the change is not user-visible), lint, typecheck, unit tests, end-to-end tests, build and `openspec validate --all --strict` passing.

#### Scenario: Opening a pull request
- **WHEN** a contributor opens a new pull request on the hosting platform
- **THEN** the description is pre-filled with the OpenSpec checklist, including the changelog checkbox

## ADDED Requirements

### Requirement: Changelog entries and release procedure documented
The contribution guide SHALL state that every user-visible change adds an entry to the `[Unreleased]` section of `CHANGELOG.md` under the appropriate Keep a Changelog category, and SHALL describe the maintainer's release procedure: choose the next semantic version, update `package.json`, move the `[Unreleased]` entries into a dated version section and update the comparison links, merge, then push a `vX.Y.Z` tag to trigger the GitHub Pages deployment. The README SHALL link to the published app and to `CHANGELOG.md`.

#### Scenario: Contributor adds a feature
- **WHEN** a contributor reads `CONTRIBUTING.md` before submitting a new feature
- **THEN** it tells them to add an `### Added` entry under `## [Unreleased]` in `CHANGELOG.md`

#### Scenario: Maintainer cuts a release
- **WHEN** the maintainer reads `CONTRIBUTING.md` to publish a new version
- **THEN** it lists the steps from version bump to pushing the tag, and explains that the tag must match `package.json` and have a changelog section

#### Scenario: Visitor finds the live app
- **WHEN** a visitor reads `README.md`
- **THEN** it links to the GitHub Pages URL of the app and to `CHANGELOG.md`
