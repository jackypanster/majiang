# Feature Tasks: 血战到底麻将 - 后端服务

This document breaks down the implementation of the Mahjong backend logic into actionable, dependency-ordered tasks.

## Phase 1: Project Setup

- [X] T001 Create the project directory structure as defined in `plan.md`: `src/mahjong`, `tests`.
- [X] T002 Initialize a Python project using `uv`: `uv init`.
- [X] T003 Add `pytest` for testing: `uv pip install pytest`.
- [X] T004 Configure `ruff` for linting and formatting by creating a `ruff.toml` or `pyproject.toml` section.

## Phase 2: Foundational Models & Exceptions

- [X] T005 [P] Implement `Suit`, `GamePhase`, and `ActionType` enums in `src/mahjong/constants/enums.py`.
- [X] T006 [P] Implement the `Tile` data class in `src/mahjong/models/tile.py`.
- [X] T007 [P] Implement custom exceptions (`InvalidActionError`, `InvalidGameStateError`) in `src/mahjong/exceptions/game_errors.py`.
- [X] T008 Implement the `Meld` data class in `src/mahjong/models/meld.py`.
- [X] T009 Implement the `Player` data class in `src/mahjong/models/player.py`.
- [X] T010 Implement the `GameState` data class in `src/mahjong/models/game_state.py`.
- [X] T011 Create unit tests for all models to ensure data integrity in `tests/unit/test_models.py`.

## Phase 3: User Story 1 - Game Preparation & Start

**Goal**: Implement the logic to create, start, and handle the initial card burying phase.
**Independent Test**: Call `create_game`, `start_game`, and `bury_cards` for all players. Verify the final `GameState` is in the `PLAYING` phase with correct player hands and missing suits.

- [X] T012 [US1] Implement `GameManager.create_game` in `src/mahjong/services/game_manager.py`.
- [X] T013 [US1] Implement `GameManager.start_game` (including wall creation, shuffling, and dealing) in `src/mahjong/services/game_manager.py`.
- [X] T014 [US1] Implement `PlayerActions.bury_cards` in `src/mahjong/services/player_actions.py`.
- [X] T015 [US1] Add a check in `PlayerActions.bury_cards` to transition `game_phase` to `PLAYING` after the last player buries their cards.
- [X] T016 [US1] Create unit tests in `tests/unit/test_game_manager.py` for `create_game` and `start_game`.
- [X] T017 [US1] Create unit tests in `tests/unit/test_player_actions_setup.py` for `bury_cards`, covering valid and invalid scenarios.

## Phase 4: User Story 2 - Core Game Loop

**Goal**: Implement the logic for a player to discard a tile and for other players to respond with actions like Pong, Kong, or Hu.
**Independent Test**: From a `PLAYING` state, simulate a player discarding a tile. Simulate other players declaring actions. Verify the `GameState` is updated correctly according to action priority (`Hu > Kong > Pong`).

- [X] T018 [US2] Implement `PlayerActions.discard_tile` in `src/mahjong/services/player_actions.py`.
- [X] T019 [US2] Implement the basic structure of `PlayerActions.declare_action` in `src/mahjong/services/player_actions.py`.
- [X] T020 [US2] Implement the validation logic for `PONG` within `declare_action`.
- [X] T021 [US2] Implement the validation logic for `KONG` (all types) within `declare_action`.
- [X] T022 [US2] Implement the action priority resolution logic (`Hu > Kong > Pong`) within `declare_action`.
- [X] T023 [US2] Create unit tests in `tests/unit/test_player_actions_loop.py` for `discard_tile` and `declare_action`, covering various scenarios.

## Phase 5: User Story 3 - Game End & Settlement

**Goal**: Implement the logic for winning (Hu), scoring, and handling a drawn game (flow bureau).
**Independent Test**: Set up a `GameState` where a player is one tile away from winning. Simulate the winning discard/draw. Verify the player's `is_hu` status and score are updated correctly. Also, test the flow bureau logic by setting the wall count to zero.

- [X] T024 [US3] Implement the core win condition checking logic (`is_hu`) as a helper function in `src/mahjong/services/win_checker.py`.
- [X] T025 [US3] Integrate the `is_hu` check into `PlayerActions.declare_action`.
- [X] T026 [US3] Implement the scoring logic based on fan types (e.g., `带根`, `清一色`) in `src/mahjong/services/scorer.py`.
- [X] T027 [US3] Implement the "blood battle" logic where the game continues after one player wins.
- [X] T028 [US3] Implement the flow bureau logic (`查花猪`, `查大叫`) when the wall is empty.
- [X] T029 [US3] Implement the logic for a game to end when three players have won or a flow bureau occurs.
- [X] T030 [US3] Implement `GameManager.end_game` in `src/mahjong/services/game_manager.py` for final game settlement.
- [X] T031 [US3] Create unit tests in `tests/unit/test_win_and_scoring.py` for win conditions, all fan types, and flow bureau scenarios.

## Phase 6: Polish & Documentation

- [X] T032 [P] Add comprehensive docstrings to all public classes and functions in the `src/mahjong` directory.
- [X] T033 [P] Create a `README.md` for the library inside `src/mahjong`.
- [X] T034 Review all service functions that return `GameState` to ensure information filtering (e.g., hiding other players' hands) is correctly implemented as per FR-011.
- [X] T035 Run `ruff check .` and `ruff format .` to ensure code quality and consistency.
- [X] T036 Run all tests with `pytest` and ensure they all pass.

**性能验证策略 (针对 SC-002)**:
SC-002要求"玩家的任何有效动作必须在500毫秒内更新GameState对象"。该要求通过以下方式验证：
- 所有服务方法采用简单算法，时间复杂度为O(1)或O(n)，其中n为手牌数量（最大14张）
- 胡牌检查使用递归回溯，最坏情况为O(14!)，但实际剪枝后远低于此
- 单元测试（T011, T016, T017, T023, T031）覆盖所有关键路径，在标准开发机上执行时间远低于100ms
- 如未来需要显式性能基准测试，可在Phase 7后添加专门的性能测试任务

## Phase 7: Observability (Constitution v1.0.1 Compliance)

**Purpose**: Implement logging infrastructure per Constitution IV (Fast-Fail Error Handling) and Technical Standards (Observability)

**Constitution Requirements**:
- Log at key operations: game creation, phase transitions, player actions, errors
- Use Python's `logging` module with INFO for operations, ERROR for exceptions
- Log format MUST include: game_id, player_id, action_type, relevant data
- Example: `logger.info(f"Game {game_id}: Player {player_id} discarded {tile}")`

**Tasks**:

- [X] T037 [P] Configure logging module in `src/mahjong/services/__init__.py` with standardized formatter
- [X] T038 Add INFO-level logging to GameManager (`src/mahjong/services/game_manager.py`):
  - Log game creation with game_id and player count
  - Log game start with dealer assignment
  - Log phase transitions (BURYING → PLAYING → ENDED)
  - Log game end with final scores
- [X] T039 Add INFO-level logging to PlayerActions (`src/mahjong/services/player_actions.py`):
  - Log bury_cards with player_id, tiles, and missing_suit
  - Log discard_tile with player_id and tile
  - Log declare_action with player_id, action_type, and target_tile
  - Log successful pong/kong/hu operations
- [X] T040 Add ERROR-level logging to exception handlers in all services:
  - Wrap InvalidActionError with context logging before raising
  - Wrap InvalidGameStateError with context logging before raising
  - Include full context: function name, game_id, player_id, action data
- [X] T041 Create unit test in `tests/unit/test_logging.py`:
  - Verify log format matches constitution requirements
  - Test INFO logs appear for key operations
  - Test ERROR logs appear with full context on exceptions
  - Use pytest's caplog fixture to capture and validate log output

## Dependencies

- **User Story 1** is a prerequisite for all other user stories.
- **User Story 2** is a prerequisite for User Story 3.
- **Phase 7 (Observability)** should be completed after Phase 6 (Polish) and can run in parallel with final testing.
- The phases should be completed in order: `Setup -> Foundational -> US1 -> US2 -> US3 -> Polish -> Observability`.

## Parallel Execution

- Within the **Foundational** phase, tasks T005, T006, and T007 can be done in parallel.
- Within the **Polish** phase, tasks T032 and T033 can be done in parallel.
- Within the **Observability** phase, tasks T038, T039 can be done in parallel after T037 completes.
- Most tasks within a single User Story phase are sequential, as they build upon each other (e.g., model -> service -> test).

## Implementation Strategy

The implementation will follow the user stories in priority order, starting with User Story 1 as the Minimum Viable Product (MVP). Each user story represents a testable, deliverable increment of functionality. This ensures that the core game setup is working before moving on to the more complex game loop and settlement logic.

**Phase 7 (Observability)** was added to ensure Constitution v1.0.1 compliance. Logging is essential for production readiness and debugging, providing visibility into game state transitions and player actions.
