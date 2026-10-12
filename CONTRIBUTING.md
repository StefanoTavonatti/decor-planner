# Contributing to Decor Planner

Thanks for wanting to help! Bug fixes, features and docs are all welcome. That includes **contributions made with AI coding agents**, as long as they follow the workflow below.

## The one rule: every contribution goes through OpenSpec

This project is built with [OpenSpec](https://github.com/Fission-AI/OpenSpec), a spec-driven workflow. The specs in [`openspec/specs/`](openspec/specs/) are the source of truth for how the app behaves. Every change to the app is planned as an **OpenSpec change** before the code is written.

So **every pull request must include an OpenSpec change** for what it does:

- **Behavior changes** (features, bug fixes that change what the user sees, new file formats, and so on) need a proposal, delta specs, a design when the change needs one, and tasks.
- **Changes with no behavior impact** (docs, tooling, refactoring, typo fixes) still need a change. Set `skip_specs: true` in its `.openspec.yaml` and leave out the delta specs.
- **Before merge**, the change must be **archived in the same PR**, and its delta specs synced into `openspec/specs/`. That way `main` always has up-to-date specs and no leftover active changes.

Pull requests without an OpenSpec change will not be merged until one is added.

## Getting set up

Prerequisites:

- Node.js 24 and npm
- The OpenSpec CLI: `npm install -g @fission-ai/openspec`
- Playwright browsers for the end-to-end tests (run once): `npx playwright install`

```sh
git clone <your fork>
cd decor_planner
npm install
npm run dev        # http://localhost:5173
```

## The workflow

1. **Explore** (optional). Think the idea through, read the relevant specs in `openspec/specs/`, and open an issue for bigger ideas so we can agree on direction first.
2. **Propose.** Create the change and its planning artifacts:
   - with an agent: `/opsx:propose <what you want to build>`
   - by hand: `openspec new change <kebab-case-name>`, then fill in the files under `openspec/changes/<name>/` (`openspec instructions <artifact> --change <name>` explains what each file should contain)
3. **Apply.** Implement the tasks in `tasks.md` and tick them off as you go (`/opsx:apply`).
4. **Archive.** When everything is done and the checks pass, archive the change (`/opsx:archive`, or `openspec archive <name>`). This moves it to `openspec/changes/archive/` and merges its delta specs into `openspec/specs/`. Commit the result.

One PR should contain all of it: the planning artifacts, the implementation and the archive commit. For an example, look at how [`2026-09-24-add-wall-photo-drag-drop`](openspec/changes/archive/2026-09-24-add-wall-photo-drag-drop/) was done.

### Example: a small docs fix

Even a typo fix uses a (tiny) change:

```sh
openspec new change fix-readme-typo
```

Then:

- add `skip_specs: true` to `openspec/changes/fix-readme-typo/.openspec.yaml`
- write a two-line `proposal.md` (why and what) and a `tasks.md` with one checkbox
- fix the typo and tick the task
- run `openspec validate fix-readme-typo --strict`, then `openspec archive fix-readme-typo`

## Using AI coding agents

AI-assisted contributions are welcome, as long as they use the OpenSpec workflow. The repository already includes the OpenSpec commands and skills for several agents, so they work as soon as you clone:

| Agent        | Location                                    |
| ------------ | ------------------------------------------- |
| Claude Code  | `.claude/commands/opsx/`, `.claude/skills/` |
| Cursor       | `.cursor/commands/`, `.cursor/skills/`      |
| OpenCode     | `.opencode/commands/`, `.opencode/skills/`  |
| Pi           | `.pi/prompts/`, `.pi/skills/`               |
| Other agents | `.agent/`, `.agents/skills/`                |

The commands are `/opsx:explore`, `/opsx:propose`, `/opsx:apply`, `/opsx:archive`, and also `/opsx:update` and `/opsx:sync`. Project background for the agent is in [`openspec/config.yaml`](openspec/config.yaml).

Some ground rules:

- **You are responsible for what you submit.** Read and understand the proposal, the specs and the code your agent produced before opening the PR. Make sure they are correct, focused and tested.
- **Say which AI tool you used** in the PR description (the template has a field for it).
- Keep PRs focused. One change per PR is easier to review than a big batch of agent output.

## Before you open a pull request

All of these must pass:

```sh
npm run lint
npm run typecheck
npm test
npm run e2e
npm run build
openspec validate --all --strict
```

Then fill in the pull request template. It includes the same checklist.

## Project conventions

The full context is in [`openspec/config.yaml`](openspec/config.yaml) and the specs. The key points:

- **Local-first.** No backend, no accounts, no tracking. User data stays on the device.
- **Millimetres internally.** All lengths are stored as millimetres. Pixels are only for display; never store pixel geometry as the source of truth. Unit conversion goes through the shared parse/format layer.
- **The wall origin is bottom-left** (floor + left corner).
- **The app must keep working offline** as an installable PWA, on phones (touch) and on desktop.
- Formatting is done by Prettier (`npm run format`), and linting by ESLint.

## License

Decor Planner is released under the [MIT License](LICENSE). By submitting a contribution, you agree that it is licensed under the project's MIT License.
