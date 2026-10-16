## Context

- The repo (`StefanoTavonatti/decor-planner`) has no CI workflows yet; `.github/` only holds the PR template.
- `vite.config.ts` sets no `base`, so the build assumes it is served from `/`. GitHub Pages project sites are served from `/decor-planner/`, which would break every absolute asset URL and the service worker scope.
- The app already resolves its own asset URLs through `import.meta.env.BASE_URL` (`src/app/App.tsx`) and the manifest uses `start_url: '.'`; `index.html` uses root-absolute paths (`/icon.svg`, `/src/main.tsx`) that Vite rewrites to the configured base at build time. There is no client-side router, so no deep links need a 404 fallback.
- Playwright runs against `vite preview` on `http://localhost:4173` at `/`.
- `package.json` is at `0.1.0` and no tags exist yet.

## Goals / Non-Goals

**Goals:**
- One workflow file that validates, builds and deploys a stable tag to GitHub Pages using the official Pages actions (no `gh-pages` branch).
- Base path set only for the Pages build, so local dev, preview and e2e are untouched.
- Guards (semver format, `package.json` match, changelog section) run first and fail fast.

**Non-Goals:**
- Creating GitHub Releases or generating release notes from the changelog.
- Automated version bumping, tag creation or changelog generation (e.g. release-please, semantic-release, conventional-commit tooling).
- A CI workflow for pull requests (worth a separate change).
- Custom domain setup.
- Preview deployments for pre-release tags.

## Decisions

### GitHub Actions, official Pages deployment
Use `actions/configure-pages` + `actions/upload-pages-artifact` + `actions/deploy-pages` with `permissions: { contents: read, pages: write, id-token: write }`, deploying to the `github-pages` environment.
*Alternative:* push `dist/` to a `gh-pages` branch (`peaceiris/actions-gh-pages`). Rejected: needs write access to the repo, pollutes history, and is no longer GitHub's recommended path.
Use the current major versions of these actions at implementation time.

### Trigger and tag filtering
```yaml
on:
  push:
    tags: ['v[0-9]+.[0-9]+.[0-9]+']
  workflow_dispatch:
```
The glob excludes pre-release tags (`v1.0.0-rc.1`) and malformed tags at trigger level, so they never start a run. `workflow_dispatch` lets the maintainer re-deploy by choosing an existing tag in "Use workflow from". Because the glob is looser than SemVer (it accepts leading zeros like `v01.2.3`) and `workflow_dispatch` can be started from a branch, the first job re-validates `GITHUB_REF` with a strict regex:
`^refs/tags/v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$`.

### Guard job (`validate`)
Inline shell, no extra dependencies:
1. Strict regex on the ref (above) → else fail "not a stable semver tag".
2. `node -p "require('./package.json').version"` must equal the tag without `v` → else fail with both values.
3. `grep -E "^## \[$VERSION\] - [0-9]{4}-[0-9]{2}-[0-9]{2}$" CHANGELOG.md` → else fail "add a `## [X.Y.Z] - YYYY-MM-DD` section to CHANGELOG.md".
Kept inline rather than in a `scripts/` file because it is ~15 lines and only used here.

### Jobs layout
`validate` → `verify` → `build` → `deploy`, each `needs` the previous.
- `verify`: `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npx playwright install --with-deps`, `npm run e2e` (builds and previews at `/`, as locally). Upload the Playwright report as an artifact on failure.
- `build`: `npm ci`, `npm run build` with `BASE_PATH=/${{ github.event.repository.name }}/`, then `upload-pages-artifact` with `path: dist`.
- `deploy`: `deploy-pages`, exposing `page_url` as the environment URL.
Separating `verify` from `build` keeps the Pages artifact built from a clean, base-path-specific build, distinct from the `/`-based build used by e2e.
Node 24 via `actions/setup-node` with `cache: npm` (matches CONTRIBUTING prerequisites).
`concurrency: { group: pages, cancel-in-progress: false }` so two quick tags don't race and a running deploy isn't cut off.

### Configurable base path
In `vite.config.ts`: `base: process.env.BASE_PATH ?? '/'`. vite-plugin-pwa derives the service worker scope and manifest `scope` from Vite's `base`, and `start_url: '.'` is relative, so no other PWA changes are needed.
*Alternative:* hard-code `base: '/decor-planner/'`. Rejected: breaks dev/preview/e2e and forks of the repo with a different name.
*Alternative:* `base: './'` (relative). Rejected: works for assets, but makes service worker scope and manifest resolution fragile.

### CHANGELOG.md content
Keep a Changelog 1.1.0 header, `## [Unreleased]` listing the existing feature set (wall setup and photo rectification, piece library, wall composer, project persistence and `.decorplan` import/export, mounting-plan PDF export, metric/imperial units, wall-photo drag and drop, offline PWA) plus this release pipeline. No version section is invented now: the first release (`0.1.0`) is cut by the maintainer following the documented procedure, which moves these entries into `## [0.1.0] - <date>`.
Link references: while untagged, `[Unreleased]: https://github.com/StefanoTavonatti/decor-planner/commits/main`; after a release, `[Unreleased]: …/compare/vX.Y.Z...HEAD` and `[X.Y.Z]: …/compare/vPREV...vX.Y.Z` (first release: `…/releases/tag/v0.1.0`).

## Risks / Trade-offs

- [GitHub Pages source not switched to "GitHub Actions"] → the deploy job fails with a clear error; the one-time setting is documented in CONTRIBUTING's release section.
- [`github-pages` environment protection rules only allow the default branch by default] → deploys from tags are rejected; document adding a `v*` tag rule to the environment's deployment branches/tags (or relying on the default created on first use).
- [Tag pushed on a commit not on `main`] → still deployed if checks pass. Accepted: the procedure says to tag merged `main` commits; adding an ancestry check is easy later if needed.
- [Installed PWAs keep the old version until reload] → handled by the existing `registerType: 'prompt'` update banner.
- [e2e adds several minutes to each release] → acceptable for an infrequent, deliberate action; it is the same gate contributors must pass.

## Migration Plan

1. Merge this change (workflow, config, changelog, docs).
2. Maintainer sets Settings → Pages → Source: "GitHub Actions" once.
3. Cut `0.1.0` following the documented procedure and push `v0.1.0`.
4. Rollback: re-run the workflow (`workflow_dispatch`) on the previous good tag, or push a new patch tag with a fix.
