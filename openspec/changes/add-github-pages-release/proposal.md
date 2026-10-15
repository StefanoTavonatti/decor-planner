## Why

Decor Planner is open source on GitHub, but there is no public, installable build: anyone who wants to use it has to clone and run it locally. Publishing the PWA on GitHub Pages makes it usable by anyone with a browser, and tying publication to semantic-version tags plus a Keep a Changelog file gives users and contributors a clear, deliberate release history instead of "whatever is on `main`".

## What Changes

- Add a GitHub Actions workflow that, when a tag matching `vMAJOR.MINOR.PATCH` is pushed, verifies the code (lint, typecheck, unit tests, end-to-end tests), builds the app for the repository's GitHub Pages sub-path, and deploys it to GitHub Pages.
- The workflow rejects tags that are not valid semantic versions, tags whose version does not match `package.json`, and tags whose version has no matching section in `CHANGELOG.md`; in those cases nothing is deployed.
- Pre-release tags (e.g. `v1.0.0-rc.1`) are not deployed to the public site.
- Make the build's base path configurable so the PWA (assets, manifest, service worker scope) works when served from `https://<owner>.github.io/decor-planner/`, while local dev, preview and e2e keep using `/`.
- Add a `CHANGELOG.md` at the repository root in the [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) format, with an `[Unreleased]` section and comparison links.
- Document the release procedure (bump version, move `[Unreleased]` to a dated version section, tag, push) in `CONTRIBUTING.md`, and link the live app and changelog from `README.md`.
- Require contributors to add a `CHANGELOG.md` entry under `[Unreleased]` for user-visible changes, and add the matching checkbox to the pull request template.

Assumption: the request mentioned "GitLab actions"; since the repository and the target (GitHub Pages) are both on GitHub, this change uses **GitHub Actions**.

## Capabilities

### New Capabilities
- `release-process`: semantic-version tagging, the tag-triggered GitHub Pages deployment and its guards, and the Keep a Changelog-formatted `CHANGELOG.md`.

### Modified Capabilities
- `contribution-process`: the pull request checklist gains a "CHANGELOG.md updated under [Unreleased]" item, and the contribution guide must describe when a changelog entry is required and how a release is cut.

## Impact

- New files: `.github/workflows/deploy-pages.yml`, `CHANGELOG.md`.
- Modified: `vite.config.ts` (configurable `base`), `CONTRIBUTING.md`, `README.md`, `.github/pull_request_template.md`.
- Repository settings: GitHub Pages must be set to "Source: GitHub Actions" (one-time manual step by the maintainer); the `github-pages` environment should allow deployments from `v*` tags.
- No runtime dependencies added; no change to app behavior or stored data. Users of an installed PWA on the Pages URL receive updates through the existing service-worker update prompt.
