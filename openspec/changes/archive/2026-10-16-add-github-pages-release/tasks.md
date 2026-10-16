## 1. Base path

- [x] 1.1 In `vite.config.ts`, set `base: process.env.BASE_PATH ?? '/'`
- [x] 1.2 Run `BASE_PATH=/decor-planner/ npm run build` and check `dist/index.html`, `dist/manifest.webmanifest` and `dist/sw.js` reference `/decor-planner/` paths (scripts, styles, icons, SW scope)
- [x] 1.3 Serve `dist/` under `/decor-planner/` locally (e.g. `npx vite preview --base /decor-planner/` after that build) and confirm the app loads with no 404s and the service worker registers
- [x] 1.4 Confirm a plain `npm run build` still emits `/`-based paths and `npm run e2e` passes unchanged

## 2. Changelog

- [x] 2.1 Create `CHANGELOG.md` with the Keep a Changelog 1.1.0 header (mentions Keep a Changelog and Semantic Versioning, with links)
- [x] 2.2 Add `## [Unreleased]` with `### Added` entries for the existing feature set and the GitHub Pages release pipeline
- [x] 2.3 Add the link reference `[Unreleased]: https://github.com/StefanoTavonatti/decor-planner/commits/main` at the bottom
- [x] 2.4 Make sure Prettier leaves the file's structure intact (`npm run format` / `.prettierignore` if needed)

## 3. Deploy workflow

- [x] 3.1 Create `.github/workflows/deploy-pages.yml` triggered by `push` of tags `v[0-9]+.[0-9]+.[0-9]+` and by `workflow_dispatch`, with `concurrency: { group: pages, cancel-in-progress: false }` and minimal default permissions (`contents: read`)
- [x] 3.2 Add the `validate` job: strict SemVer regex on `GITHUB_REF` (stable tags only), `package.json` version equals tag without `v`, and `CHANGELOG.md` contains `## [X.Y.Z] - YYYY-MM-DD`; each failure prints an actionable error
- [x] 3.3 Add the `verify` job (needs `validate`): Node 24 with npm cache, `npm ci`, lint, typecheck, unit tests, `npx playwright install --with-deps`, `npm run e2e`; upload `playwright-report` on failure
- [x] 3.4 Add the `build` job (needs `verify`): `actions/configure-pages`, `npm ci`, `npm run build` with `BASE_PATH=/${{ github.event.repository.name }}/`, `actions/upload-pages-artifact` from `dist`
- [x] 3.5 Add the `deploy` job (needs `build`): `pages: write` + `id-token: write`, environment `github-pages` with `url: ${{ steps.deployment.outputs.page_url }}`, `actions/deploy-pages`
- [x] 3.6 Use the current major versions of all actions; lint the workflow (e.g. `actionlint` if available) and test the `validate` shell logic locally against good and bad refs/versions/changelogs (actionlint not run: Docker daemon unavailable; YAML structure and tag filter checked with Python instead)

## 4. Documentation

- [x] 4.1 In `CONTRIBUTING.md`, add a "Changelog" section: user-visible changes add an entry under `## [Unreleased]` in the right category (Added/Changed/Deprecated/Removed/Fixed/Security); internal-only changes don't need one
- [x] 4.2 In `CONTRIBUTING.md`, add a "Releasing" section for maintainers: pick the next SemVer, update `package.json` (`npm version X.Y.Z --no-git-tag-version`), move `[Unreleased]` entries to `## [X.Y.Z] - YYYY-MM-DD`, update comparison links, merge to `main`, then `git tag vX.Y.Z && git push origin vX.Y.Z`; mention pre-release tags are not deployed, how to re-deploy via "Run workflow", and the one-time Pages setup (Source: GitHub Actions, allow `v*` tags in the `github-pages` environment)
- [x] 4.3 Add a changelog checkbox to `.github/pull_request_template.md`
- [x] 4.4 In `README.md`, link the live app (`https://stefanotavonatti.github.io/decor-planner/`) and `CHANGELOG.md`

## 5. Verify

- [x] 5.1 Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run e2e`, `npm run build`
- [x] 5.2 Run `openspec validate add-github-pages-release --strict`
- [x] 5.3 Check every scenario in `specs/release-process/spec.md` and `specs/contribution-process/spec.md` against the new files (deployment scenarios are verified after merge by the maintainer's first `v0.1.0` tag push)
