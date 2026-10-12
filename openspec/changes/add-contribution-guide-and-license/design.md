## Context

See proposal.md — Why. The repo already commits OpenSpec workflow files for several agents (`.claude/`, `.cursor/`, `.opencode/`, `.agent/`, `.agents/`, `.pi/`), so a contributor's agent can run `/opsx:propose`, `/opsx:apply`, `/opsx:archive` without extra setup beyond installing the OpenSpec CLI. Existing work (e.g. PR #1, drag and drop) already follows the pattern "spec commit → implementation commit → archive commit" inside one PR; the guide documents that pattern rather than inventing a new one. The repo has no `.github/` directory and no CI.

## Goals / Non-Goals

**Goals:**
- A newcomer (human or agent) can go from clone to a mergeable PR by reading only `CONTRIBUTING.md`.
- The OpenSpec rule is unambiguous and has no exceptions to argue about.

**Non-Goals:**
- CI that automatically enforces the rule (GitHub Actions, a check that an archived change exists). Can be a later change.
- Code of conduct, security policy, issue templates, CLA/DCO.
- Changing the GitHub repository visibility itself (done manually by the maintainer).

## Decisions

- **MIT, single `LICENSE` file at root, no per-file headers.** Simplest and what the maintainer asked for; GitHub detects it automatically. Alternative (Apache-2.0 for its patent grant) not needed for a small client-side app.
- **No exemption for trivial changes; use `skip_specs: true` instead.** OpenSpec already supports behavior-free changes, so "always open a change" costs little and avoids judgment calls about what counts as trivial. Alternative (exempt typo fixes) rejected to keep the rule absolute.
- **Archive inside the contributor's PR.** Keeps `openspec/specs/` consistent with `main` at every merge and matches existing history. Alternative (maintainer archives after merge) would leave stale active changes on `main`.
- **Inbound = outbound licensing, no CLA/DCO.** A sentence in CONTRIBUTING.md is enough for an MIT hobby project and adds no friction.
- **AI disclosure is requested, not policed.** A PR-template field ("AI tools used") gives reviewers context without gatekeeping. The human submitter is accountable.
- **Guide lists the exact npm scripts** from `package.json` (`lint`, `typecheck`, `test`, `e2e`, `build`) plus `openspec validate --strict`, and notes that e2e needs `npx playwright install` once.
- **Conventions are referenced, not duplicated.** CONTRIBUTING.md summarises the key rules (mm internally, local-first, no backend) and points to `openspec/config.yaml` and `openspec/specs/` as authoritative, so the guide doesn't drift.

## Risks / Trade-offs

- [Rule is heavy for first-time contributors fixing a typo] → Guide includes a short "small fix" example showing a minimal `skip_specs` change.
- [Without CI, unarchived or invalid changes may slip into PRs] → PR template checklist plus maintainer review; CI can be added later.
- [Contributors without OpenSpec installed] → Guide gives the install command (`npm install -g @fission-ai/openspec`) and notes the agent files are already in the repo.
- [Low-quality AI-generated PRs] → Accountability statement and the requirement that specs, tasks and all checks are present raise the bar.

## Migration Plan

Add the files in one PR before switching the repository to public. Rollback is reverting the commit.
