# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

**Language/Version**: Python 3.11+
**Primary Dependencies**: None (standard library only)
**Storage**: N/A (In-memory only as per spec)
**Testing**: pytest
**Target Platform**: Any platform with a Python interpreter
**Project Type**: Single project (library)
**Performance Goals**: Actions reflected in `GameState` < 500ms
**Constraints**: No data persistence
**Scale/Scope**: Core logic for a 4-player game

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. 极简实现 (Simplicity and Minimalism)**: **[PASS]** The design will use simple Python data classes for models and avoid external frameworks, focusing on core logic.
- **II. 快速失败 (Fail Fast and Explicitly)**: **[PASS]** The API contract will specify that invalid operations (e.g., playing a non-existent tile) must raise exceptions.
- **III. 真实测试 (Realistic and Direct Testing)**: **[PASS]** Testing will be performed on the actual game logic engine without using mocks.
- **IV. 高效工具 (Modern and Efficient Tooling)**: **[PASS]** The project will use Python, `uv`, and `ruff` as defined in the constitution.
- **V. 透明问题管理 (Transparent Issue Management)**: **[PASS]** All work will be tracked via GitHub Issues.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
```text
src/
└── mahjong/
    ├── models/         # Data structures (Tile, Player, GameState)
    ├── services/       # Core game logic (GameManager, PlayerActions)
    ├── constants/      # Game constants (e.g., Suits, Ranks, GamePhases)
    └── exceptions/     # Custom exceptions for invalid game states or actions

tests/
├── integration/
└── unit/
```

**Structure Decision**: A single project structure is chosen for simplicity and to reflect the feature's nature as a self-contained library. The `majiang` package will encapsulate all core logic, with a clear separation between data models, services, and constants.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
