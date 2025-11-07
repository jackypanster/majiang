# Implementation Plan: 血战到底麻将 - 后端服务

**Branch**: `001-backend-logic` | **Date**: 2025-01-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-backend-logic/spec.md`

## Summary

实现"血战到底"麻将游戏的纯 Python 后端逻辑库。本服务为独立的游戏规则引擎，不包含网络通信、数据持久化或 UI 层。核心特性包括：血战到底模式（玩家第一次胡牌后手牌锁定但继续参与）、定缺埋牌、完整的胡牌判定和番数计算。

技术方案采用三层架构：Models（不可变数据结构）、Services（无状态规则逻辑）、未来的 API 层（HTTP 适配）。使用 Python 3.8+ 标准库实现，零外部运行时依赖，pytest 测试，ruff 代码质量保证。

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

- **I. Simplicity First**: **[PASS]** 使用简单的 `@dataclass` 定义模型，服务层采用无状态函数，避免过度抽象。函数保持在20行以内，重复优于错误的抽象。
- **II. Test-First (NON-NEGOTIABLE)**: **[PASS]** 所有测试使用真实的 `GameState`, `Player`, `Tile` 对象，禁止 mock。测试先于实现编写，遵循 Red-Green-Refactor 循环。
- **III. Library-First Architecture**: **[PASS]** 核心逻辑位于 `src/mahjong/`，零外部运行时依赖。Models/Services/API 三层清晰分离，FastAPI 层属于未来工作。
- **IV. Fast-Fail Error Handling**: **[PASS]** 异常默认向上传播，自定义 `InvalidActionError`/`InvalidGameStateError`。错误消息包含完整上下文（函数名、player_id、tile、原因）。实现日志记录（INFO/ERROR级别）。
- **V. Domain Model Integrity**: **[PASS]** 所有游戏规则严格遵循 `docs/PRD.md`。手牌数量限制、零和约束（总分=400）、血战到底规则均已在规格中明确。

## Project Structure

### Documentation (this feature)

```text
specs/001-backend-logic/
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
