## Purpose

Defines how Decor Planner is versioned, how a release is published to GitHub Pages from a semantic-version tag, and how changes are recorded in a Keep a Changelog-formatted changelog.

## ADDED Requirements

### Requirement: Semantic version tags
Releases SHALL be identified by Git tags of the form `vMAJOR.MINOR.PATCH` following Semantic Versioning 2.0.0 (e.g. `v1.4.2`), optionally with a pre-release suffix (e.g. `v1.0.0-rc.1`). The version in the tag (without the leading `v`) SHALL equal the `version` field of `package.json` at the tagged commit.

#### Scenario: Valid release tag
- **WHEN** the maintainer pushes tag `v0.2.0` on a commit whose `package.json` version is `0.2.0`
- **THEN** the tag is accepted as a release of version `0.2.0`

#### Scenario: Tag does not match package version
- **WHEN** the maintainer pushes tag `v0.3.0` on a commit whose `package.json` version is `0.2.0`
- **THEN** the release workflow fails with a message stating the mismatch and nothing is deployed

#### Scenario: Tag is not a semantic version
- **WHEN** a tag such as `v1.2`, `release-1` or `v1.2.3.4` is pushed
- **THEN** no deployment to GitHub Pages happens

### Requirement: Tag-triggered GitHub Pages deployment
Pushing a stable release tag (`vMAJOR.MINOR.PATCH` with no pre-release suffix) SHALL automatically build the app and publish it to the repository's GitHub Pages site. Pushes to branches, pull requests and pre-release tags SHALL NOT publish to GitHub Pages. The maintainer SHALL be able to re-run the deployment for an existing tag manually.

#### Scenario: Stable tag is published
- **WHEN** a valid stable tag `v1.0.0` is pushed and all checks pass
- **THEN** the app built from that tag is live at the repository's GitHub Pages URL

#### Scenario: Push to main does not publish
- **WHEN** commits are pushed to `main` without a tag
- **THEN** the GitHub Pages site is unchanged

#### Scenario: Pre-release tag is not published
- **WHEN** tag `v1.1.0-rc.1` is pushed
- **THEN** the GitHub Pages site keeps serving the latest stable release

### Requirement: Release is gated on checks
Before deploying, the release workflow SHALL run lint, typecheck, unit tests, end-to-end tests and the production build on the tagged commit. If any of them fails, the workflow SHALL fail and the GitHub Pages site SHALL remain on the previous release.

#### Scenario: Failing test blocks release
- **WHEN** a release tag is pushed and a unit test fails
- **THEN** the workflow fails and the previously deployed version stays live

### Requirement: App works from the GitHub Pages sub-path
The published app SHALL work when served from the repository sub-path (`https://<owner>.github.io/<repository>/`): all assets, icons, the web app manifest and the service worker SHALL load from that sub-path, the app SHALL be installable as a PWA from it and SHALL work offline after the first visit. Local development, preview and end-to-end tests SHALL keep serving the app from `/`.

#### Scenario: Opening the published app
- **WHEN** a user opens `https://<owner>.github.io/decor-planner/`
- **THEN** the app loads with no 404 errors for scripts, styles, icons or manifest

#### Scenario: Offline after install
- **WHEN** a user has opened the published app once and later opens it without network
- **THEN** the app loads from the service worker cache

#### Scenario: Update of an installed app
- **WHEN** a new release is deployed and a user opens the previously installed app
- **THEN** the existing update prompt offers to reload into the new version

### Requirement: Keep a Changelog
The repository SHALL contain a `CHANGELOG.md` at its root following Keep a Changelog 1.1.0: a header stating that it follows Keep a Changelog and Semantic Versioning, an `## [Unreleased]` section at the top, one `## [X.Y.Z] - YYYY-MM-DD` section per release in reverse chronological order, entries grouped under `### Added`, `### Changed`, `### Deprecated`, `### Removed`, `### Fixed` or `### Security`, and link references at the bottom comparing each version with the previous one on GitHub.

#### Scenario: Changelog structure
- **WHEN** someone opens `CHANGELOG.md`
- **THEN** it starts with the Keep a Changelog header, followed by `## [Unreleased]`, and every version heading has a matching link reference at the bottom

### Requirement: Release has a changelog entry
A release tag SHALL only be deployed if `CHANGELOG.md` at the tagged commit contains a `## [X.Y.Z] - YYYY-MM-DD` section for the tagged version.

#### Scenario: Missing changelog section
- **WHEN** tag `v0.4.0` is pushed but `CHANGELOG.md` has no `## [0.4.0]` section
- **THEN** the workflow fails with a message asking to add the changelog section, and nothing is deployed
