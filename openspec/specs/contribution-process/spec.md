# contribution-process Specification

## Purpose

Defines how the project is licensed and the process every contribution — human-written or AI-assisted — must follow, so that the OpenSpec specs remain the single source of truth for the product's behavior.

## Requirements

### Requirement: Open-source license
The repository SHALL be licensed under the MIT License, with the full license text in a `LICENSE` file at the repository root naming the copyright holder and year, and the package manifest SHALL declare the same license identifier.

#### Scenario: License is discoverable
- **WHEN** someone opens the repository root
- **THEN** a `LICENSE` file containing the standard MIT License text with "Copyright (c) 2026 Stefano Tavonatti" is present

#### Scenario: Manifest declares license
- **WHEN** tooling reads `package.json`
- **THEN** its `license` field is `MIT`

### Requirement: Contribution guide
The repository SHALL provide a `CONTRIBUTING.md` at its root that explains how to set up the project locally, the mandatory OpenSpec workflow, the checks a pull request must pass, the project conventions to respect, and that contributions are accepted under the project license. The README SHALL link to both the contribution guide and the license.

#### Scenario: Guide is linked from README
- **WHEN** a visitor reads `README.md`
- **THEN** it contains a "Contributing" section linking to `CONTRIBUTING.md` and a "License" section linking to `LICENSE`

#### Scenario: Contribution licensing is stated
- **WHEN** a contributor reads `CONTRIBUTING.md`
- **THEN** it states that by submitting a contribution they agree it is licensed under the project's MIT License

### Requirement: Every contribution uses OpenSpec
Every pull request SHALL include an OpenSpec change describing it (proposal, delta specs, design when needed, and tasks) alongside the implementation. Before merge, the change SHALL be archived and its delta specs synced into `openspec/specs/` within the same pull request. Changes with no behavior impact (documentation, tooling, refactoring) SHALL still use an OpenSpec change, marked `skip_specs: true`. Pull requests without an OpenSpec change SHALL NOT be merged.

#### Scenario: Feature contribution
- **WHEN** a contributor opens a pull request adding or changing app behavior
- **THEN** the pull request contains the archived OpenSpec change for it and the updated main specs, and `openspec validate --all --strict` passes

#### Scenario: Docs-only contribution
- **WHEN** a contributor fixes a typo in the documentation
- **THEN** the pull request still contains an OpenSpec change, with `skip_specs: true` and no delta specs

#### Scenario: Missing OpenSpec change
- **WHEN** a pull request contains code changes but no OpenSpec change
- **THEN** the contribution guide states it will not be merged until one is added

### Requirement: AI-assisted contributions welcome
The contribution guide SHALL explicitly welcome contributions produced with AI coding agents, provided they follow the OpenSpec workflow. It SHALL point to the OpenSpec commands/skills already committed in the repository for supported agents, state that the human submitting the pull request is responsible for reviewing and standing behind the result, and ask contributors to mention the AI tool used in the pull request description.

#### Scenario: Contributor uses an AI agent
- **WHEN** a contributor reads `CONTRIBUTING.md` intending to use an AI coding agent
- **THEN** the guide tells them AI contributions are welcome, which OpenSpec commands to run (propose, apply, archive), and that they remain accountable for the submitted change

### Requirement: Pull request checklist
The repository SHALL provide a pull request template that is pre-filled for every new pull request and lists the OpenSpec change name, whether AI tools were used, and checkboxes for: OpenSpec change included and archived, main specs synced, lint, typecheck, unit tests, end-to-end tests, build and `openspec validate --all --strict` passing.

#### Scenario: Opening a pull request
- **WHEN** a contributor opens a new pull request on the hosting platform
- **THEN** the description is pre-filled with the OpenSpec checklist
