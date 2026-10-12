## Why

The repository is about to be made public. Right now it has no license (so nobody may legally use, copy or modify it) and no contribution guide, so outside contributors would not know how changes are expected to be made. The project is built entirely with the OpenSpec spec-driven workflow, and the maintainer wants every contribution — explicitly including AI-assisted ones — to follow that same workflow so the specs stay the source of truth.

## What Changes

- Add an MIT `LICENSE` file at the repository root (copyright 2026 Stefano Tavonatti) and declare `"license": "MIT"` in `package.json`.
- Add a `CONTRIBUTING.md` at the repository root that states:
  - **Every contribution goes through OpenSpec**: a pull request MUST contain an OpenSpec change (proposal, delta specs, design when needed, tasks) together with its implementation. Docs-only or tooling-only changes still use a change, marked `skip_specs: true`.
  - The expected loop: explore (optional) → propose → apply → archive, with the archived change and the synced main specs committed in the same PR (matching how existing work in this repo is done).
  - **AI-assisted contributions are welcome** when they use the OpenSpec workflow; the OpenSpec commands/skills already committed for Claude Code, Cursor, OpenCode and other agents can be used directly. The human opening the PR remains responsible for the result, and should mention which AI tool was used.
  - Local setup and the checks a PR must pass before review (`npm run lint`, `npm run typecheck`, `npm test`, `npm run e2e`, `npm run build`, `openspec validate --strict`).
  - Project conventions contributors must respect (millimetres as internal unit, local-first / no backend, etc. — pointing to `openspec/config.yaml` and `openspec/specs/`).
  - That contributions are accepted under the project's MIT license.
- Add a GitHub pull request template that reminds contributors of the OpenSpec checklist.
- Add "Contributing" and "License" sections to `README.md` linking to the new files.

Assumptions:
- Copyright holder is "Stefano Tavonatti", year 2026.
- No exemption for "trivial" fixes: even a typo fix uses a (small, `skip_specs`) OpenSpec change, to keep the rule simple and absolute as requested.
- No Contributor License Agreement or DCO sign-off is required; inbound = outbound under MIT.
- No CI enforcement yet; the checks are documented and verified by the maintainer at review.

## Capabilities

### New Capabilities
- `contribution-process`: the public contract for how the project is licensed and how contributions (human or AI-assisted) must be made — license, contribution guide, mandatory OpenSpec workflow, PR checklist.

### Modified Capabilities
<!-- None -->

## Impact

- New files: `LICENSE`, `CONTRIBUTING.md`, `.github/pull_request_template.md`.
- Edited: `README.md` (new sections), `package.json` (`license` field only; `"private": true` stays, it only prevents accidental npm publishing).
- No application code, dependencies, data model or file format changes.
