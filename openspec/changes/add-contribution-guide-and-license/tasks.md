## 1. License

- [ ] 1.1 Add `LICENSE` at repo root with the standard MIT text, "Copyright (c) 2026 Stefano Tavonatti"
- [ ] 1.2 Add `"license": "MIT"` to `package.json` (keep `"private": true`)

## 2. Contribution guide

- [ ] 2.1 Create `CONTRIBUTING.md` with: welcome + AI-assisted contributions welcome statement; prerequisites (Node/npm, OpenSpec CLI install, `npx playwright install`); local setup
- [ ] 2.2 Document the mandatory OpenSpec workflow: explore (optional) → propose → apply → archive, with archived change and synced specs committed in the same PR; `skip_specs: true` for docs/tooling changes; PRs without a change are not merged
- [ ] 2.3 Document using AI agents: point to the committed OpenSpec commands/skills (`.claude/`, `.cursor/`, `.opencode/`, etc.), human accountability, mention the AI tool in the PR
- [ ] 2.4 Add a short worked example for a small docs-only fix using a `skip_specs` change
- [ ] 2.5 List required checks (`npm run lint`, `npm run typecheck`, `npm test`, `npm run e2e`, `npm run build`, `openspec validate --strict`) and key project conventions, linking to `openspec/config.yaml` and `openspec/specs/`
- [ ] 2.6 State that contributions are licensed under the project's MIT License

## 3. Pull request template

- [ ] 3.1 Create `.github/pull_request_template.md` with fields for summary, OpenSpec change name, AI tools used, and the checklist from the `contribution-process` spec

## 4. README

- [ ] 4.1 Add "Contributing" section linking to `CONTRIBUTING.md` (one-line summary of the OpenSpec rule)
- [ ] 4.2 Add "License" section linking to `LICENSE`

## 5. Verify

- [ ] 5.1 Run `openspec validate add-contribution-guide-and-license --strict` and `npm run lint` (prettier/eslint unaffected)
- [ ] 5.2 Check every scenario in `specs/contribution-process/spec.md` against the new files
