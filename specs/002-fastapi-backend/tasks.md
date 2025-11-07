# Tasks: FastAPI HTTP Backend Layer

**Input**: Design documents from `/specs/002-fastapi-backend/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/openapi.yaml

**Tests**: Tests are NOT explicitly requested in the spec, but quickstart.md provides integration test examples. Including basic test tasks for quality assurance.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

Single project structure with new `app/` directory for FastAPI layer:
- FastAPI layer: `app/` at repository root
- Tests: `tests/api/` for integration tests
- Existing library: `src/mahjong/` (UNCHANGED)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependency installation

- [ ] T001 Install FastAPI dependencies using uv: `uv pip install fastapi uvicorn[standard] httpx`
- [ ] T002 [P] Create app directory structure: `app/__init__.py`, `app/main.py`, `app/api.py`, `app/ai.py`, `app/models.py`, `app/schemas.py`, `app/converters.py`
- [ ] T003 [P] Create tests/api directory structure: `tests/api/__init__.py`
- [ ] T004 [P] Configure Python logging in app/main.py with INFO level and timestamp format

**Checkpoint**: Project structure created, dependencies installed

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core FastAPI infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 Create FastAPI app instance in app/main.py with title, description, version
- [ ] T006 [P] Create global GAMES dictionary in app/main.py: `GAMES: Dict[str, GameSession] = {}`
- [ ] T007 [P] Implement GameSession dataclass in app/models.py with fields: game_id (str), created_at (datetime), game_state (GameState)
- [ ] T008 [P] Create base Pydantic schemas in app/schemas.py: TileInput (suit, rank), ErrorResponse (detail)
- [ ] T009 [P] Implement TileInput to Tile conversion in app/converters.py: `to_tile(tile_input: TileInput) -> Tile`
- [ ] T010 Setup APIRouter in app/api.py with prefix="/games" and tags=["games"]
- [ ] T011 Include router in FastAPI app in app/main.py: `app.include_router(router)`
- [ ] T012 [P] Create root endpoint "/" in app/main.py returning API info and active game count
- [ ] T013 [P] Configure FastAPI CORS middleware if needed (currently not required per spec)

**Checkpoint**: Foundation ready - FastAPI app runs, routes registered, basic models defined

---

## Phase 3: User Story 1 - Start New Game Session (Priority: P1) 🎯 MVP

**Goal**: Enable players to create a new mahjong game session with 3 AI opponents and receive initial game state

**Independent Test**: Call POST /games endpoint and verify:
- Valid UUID game_id returned
- Initial state shows 4 players in BURYING phase
- Dealer has 14 cards, others have 13 cards
- Human player sees full hand, AI hands are hidden

### Implementation for User Story 1

- [ ] T014 [P] [US1] Create CreateGameRequest schema in app/schemas.py with optional player_ids field
- [ ] T015 [P] [US1] Create CreateGameResponse schema in app/schemas.py with game_id and state fields
- [ ] T016 [US1] Implement POST /games endpoint in app/api.py that calls GameManager.create_game() and GameManager.start_game()
- [ ] T017 [US1] Generate UUID v4 for game_id in POST /games handler using uuid.uuid4()
- [ ] T018 [US1] Store GameSession in GAMES dict in POST /games handler
- [ ] T019 [US1] Return CreateGameResponse with game_id and filtered state (using to_dict_for_player("human")) from POST /games
- [ ] T020 [US1] Add error handling for game creation failures (return 500 with error detail)
- [ ] T021 [US1] Add logging for game creation: `logger.info(f"Created game {game_id} with players {player_ids}")`

### Tests for User Story 1

- [ ] T022 [P] [US1] Create test_game_creation.py with test_create_game_default_players using httpx.AsyncClient
- [ ] T023 [P] [US1] Add test_create_game_custom_players in test_game_creation.py (4 custom player IDs)
- [ ] T024 [P] [US1] Add test_create_game_returns_uuid in test_game_creation.py (verify UUID format)
- [ ] T025 [P] [US1] Add test_create_game_initial_state_burying in test_game_creation.py (verify BURYING phase)

**Checkpoint**: Can create games via HTTP POST /games, receive valid game_id and initial state. User Story 1 is fully functional and testable.

---

## Phase 4: User Story 4 - Query Current Game State (Priority: P2)

**Goal**: Enable players to view current game state at any time with proper information filtering

**Independent Test**: Create a game (using US1), then call GET /games/{game_id}?player_id=human and verify:
- Game state returned with all required fields
- Human player sees full hand
- AI players show hand_count only (hands hidden)
- Public information visible (discards, melds, scores)

**Note**: Implementing US4 before US2 because it's simpler and provides debugging capability for subsequent stories

### Implementation for User Story 4

- [ ] T026 [P] [US4] Create GameStateResponse schema in app/schemas.py with all GameState fields
- [ ] T027 [US4] Implement GET /games/{game_id} endpoint in app/api.py with player_id query parameter
- [ ] T028 [US4] Add game existence validation in GET /games/{game_id} (return 404 if not found)
- [ ] T029 [US4] Call game_state.to_dict_for_player(player_id) in GET /games/{game_id} handler
- [ ] T030 [US4] Return GameStateResponse with game_id and filtered state from GET /games/{game_id}
- [ ] T031 [US4] Add error handling for invalid player_id (return 400 with error detail)

### Tests for User Story 4

- [ ] T032 [P] [US4] Add test_get_game_state in test_game_creation.py (create game then query state)
- [ ] T033 [P] [US4] Add test_get_game_state_filters_ai_hands in test_game_creation.py (verify hand_count for AI)
- [ ] T034 [P] [US4] Add test_get_nonexistent_game_returns_404 in test_game_creation.py

**Checkpoint**: Can query game state via HTTP GET /games/{id}. User Story 4 is fully functional.

---

## Phase 5: User Story 2 - Submit Player Actions (Priority: P2)

**Goal**: Enable human players to submit game actions (bury, discard, peng/gang/hu/skip) and receive updated game state

**Independent Test**: Create game, submit bury action with 3 same-suit tiles, verify:
- Player's missing suit is set
- Game state updated correctly
- Clear error messages for invalid actions

### Implementation for User Story 2

- [ ] T035 [P] [US2] Create PlayerActionRequest schema in app/schemas.py with player_id, action (enum), tiles fields
- [ ] T036 [P] [US2] Add Pydantic validator in PlayerActionRequest to validate tiles count based on action type
- [ ] T037 [P] [US2] Implement tiles_from_request() helper in app/converters.py to convert List[TileInput] to List[Tile]
- [ ] T038 [US2] Implement POST /games/{game_id}/action endpoint in app/api.py
- [ ] T039 [US2] Add game existence validation in POST action endpoint (return 404 if not found)
- [ ] T040 [US2] Route action types to appropriate PlayerActions methods in action endpoint: bury → bury_cards(), discard → discard_tile(), peng/gang/hu → declare_action()
- [ ] T041 [US2] Convert TileInput list to Tile list before calling PlayerActions methods
- [ ] T042 [US2] Handle InvalidActionError exceptions and return 400 with detail message
- [ ] T043 [US2] Handle InvalidGameStateError exceptions and return 500 with detail message
- [ ] T044 [US2] Add logging for player actions: `logger.info(f"Game {game_id}: Player {player_id} {action} {tiles}")`
- [ ] T045 [US2] Return updated GameStateResponse after action processing (without AI execution yet - US3)

### Tests for User Story 2

- [ ] T046 [P] [US2] Create test_player_actions.py with test_bury_valid_tiles using httpx.AsyncClient
- [ ] T047 [P] [US2] Add test_bury_invalid_tile_count in test_player_actions.py (expect 400)
- [ ] T048 [P] [US2] Add test_bury_different_suits in test_player_actions.py (expect 400)
- [ ] T049 [P] [US2] Add test_discard_tile in test_player_actions.py (after burying phase)
- [ ] T050 [P] [US2] Add test_action_nonexistent_game in test_player_actions.py (expect 404)
- [ ] T051 [P] [US2] Add test_action_wrong_phase in test_player_actions.py (e.g., discard during BURYING, expect 400)

**Checkpoint**: Can submit player actions via HTTP POST /games/{id}/action. Actions validated and processed. User Story 2 functional (without AI yet).

---

## Phase 6: User Story 3 - Automatic AI Turn Execution (Priority: P3) 🔥 Complex

**Goal**: After human player action, automatically execute all AI turns until human's turn again or game ends

**Independent Test**: Submit human action, verify:
- Multiple AI turns executed automatically
- Game state shows AI actions (buried cards, discards, melds)
- Control returns to human or game ends
- Response time < 5 seconds

### AI Decision Logic Implementation

- [ ] T052 [P] [US3] Implement choose_bury_tiles(player: Player) in app/ai.py returning 3 tiles from least common suit
- [ ] T053 [P] [US3] Implement choose_discard_tile(player: Player) in app/ai.py with priority: missing suit > lone tiles
- [ ] T054 [P] [US3] Implement choose_response(player: Player, discarded_tile: Tile, game_state: GameState) in app/ai.py with priority: hu > gang > peng > skip
- [ ] T055 [US3] Implement execute_ai_turns(game_state: GameState, human_player_id: str) in app/ai.py as synchronous loop

### AI Turn Loop Logic

- [ ] T056 [US3] Add while loop in execute_ai_turns that continues until current_player == human_player_id or game_phase == ENDED
- [ ] T057 [US3] Check current AI player's phase in execute_ai_turns: if BURYING → call choose_bury_tiles() → call PlayerActions.bury_cards()
- [ ] T058 [US3] Handle AI discard in execute_ai_turns: if player needs_discard → call choose_discard_tile() → call PlayerActions.discard_tile()
- [ ] T059 [US3] Collect AI responses in execute_ai_turns using PlayerActions.collect_ai_responses() after each discard
- [ ] T060 [US3] Process best response in execute_ai_turns using PlayerActions.process_responses()
- [ ] T061 [US3] Add logging for each AI decision: `logger.info(f"AI {ai_id}: chose {action} because {reason}")`
- [ ] T062 [US3] Handle case where all AI players finish (game phase becomes PLAYING after burying)

### Timeout and Error Handling

- [ ] T063 [US3] Wrap execute_ai_turns() call with asyncio.wait_for(timeout=5.0) in POST action endpoint
- [ ] T064 [US3] Catch asyncio.TimeoutError and return 500 with detail "AI execution timeout after 5 seconds"
- [ ] T065 [US3] Save game_state before calling execute_ai_turns for rollback on timeout/error
- [ ] T066 [US3] Implement state rollback on timeout: restore game_state from saved copy
- [ ] T067 [US3] Log timeout as CRITICAL: `logger.critical(f"AI timeout in game {game_id}")`

### Game End Cleanup

- [ ] T068 [US3] Check if game_phase == ENDED after execute_ai_turns completes
- [ ] T069 [US3] Remove game from GAMES dict if game ended: `GAMES.pop(game_id, None)`
- [ ] T070 [US3] Log game end with final scores: `logger.info(f"Game {game_id} ended, winners: {winners}")`

### Tests for User Story 3

- [ ] T071 [P] [US3] Create test_ai_execution.py with test_ai_executes_after_human_action
- [ ] T072 [P] [US3] Add test_ai_buries_automatically in test_ai_execution.py (all 3 AI bury after human)
- [ ] T073 [P] [US3] Add test_ai_discards_automatically in test_ai_execution.py (AI discards in playing phase)
- [ ] T074 [P] [US3] Add test_game_ends_after_ai_wins in test_ai_execution.py (verify cleanup)
- [ ] T075 [P] [US3] Add test_ai_timeout_returns_500 in test_ai_execution.py (mock slow AI with sleep)
- [ ] T076 [P] [US3] Add test_full_game_flow in test_ai_execution.py (create → bury → play → end)

**Checkpoint**: AI executes automatically after human actions. Full game loop functional. User Story 3 complete.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Robustness, cleanup, logging, error handling

### Background Cleanup Task

- [ ] T077 [P] Implement cleanup_old_games() async function in app/main.py with while True loop sleeping 3600 seconds
- [ ] T078 [P] Add cleanup logic in cleanup_old_games() to remove games where (now - created_at) > 24 hours
- [ ] T079 [P] Log cleanup actions: `logger.info(f"Cleaned up expired game: {game_id}")`
- [ ] T080 Add @app.on_event("startup") handler in app/main.py to start cleanup task with asyncio.create_task()
- [ ] T081 Handle asyncio.CancelledError in cleanup_old_games() for graceful shutdown

### Comprehensive Error Handling

- [ ] T082 [P] Add 409 Conflict handling for concurrent modification scenario in POST action endpoint
- [ ] T083 [P] Verify all HTTPException responses include semantic status codes (404, 400, 409, 500) per FR-017
- [ ] T084 [P] Add catch-all exception handler for unexpected errors: log stack trace, return 500
- [ ] T085 [P] Verify error messages include context: game_id, player_id, action, reason per FR-009

### Logging Compliance

- [ ] T086 [P] Verify all key operations logged per FR-016: game creation, player actions, AI decisions, errors
- [ ] T087 [P] Add log message for AI key decision reasoning in app/ai.py
- [ ] T088 [P] Verify log format includes: timestamp, level, function name, game_id, player_id, action context

### Validation and Testing

- [ ] T089 [P] Create test_edge_cases.py for error scenarios
- [ ] T090 [P] Add test_404_nonexistent_game in test_edge_cases.py
- [ ] T091 [P] Add test_400_invalid_action_wrong_phase in test_edge_cases.py
- [ ] T092 [P] Add test_400_invalid_tiles in test_edge_cases.py
- [ ] T093 [P] Add test_409_concurrent_modification in test_edge_cases.py (if implemented)
- [ ] T094 [P] Add test_500_ai_timeout in test_edge_cases.py
- [ ] T095 [P] Create test_cleanup.py for cleanup task testing
- [ ] T096 [P] Add test_cleanup_removes_ended_games in test_cleanup.py
- [ ] T097 [P] Add test_cleanup_removes_old_games in test_cleanup.py (mock datetime)
- [ ] T098 [P] Add test_cleanup_task_starts_on_startup in test_cleanup.py

### Performance Validation

- [ ] T099 Run all integration tests and verify response times meet success criteria (SC-001 to SC-005)
- [ ] T100 Test game creation response time < 2 seconds (SC-001)
- [ ] T101 Test action processing response time < 5 seconds including AI (SC-002)
- [ ] T102 Test state query response time < 500ms (SC-005)
- [ ] T103 Verify existing 108 unit tests still pass: `uv run pytest tests/unit/`

### Documentation

- [ ] T104 [P] Verify OpenAPI docs auto-generated at /docs endpoint
- [ ] T105 [P] Add API usage examples to quickstart.md if missing
- [ ] T106 [P] Update README.md with server startup commands and endpoint summary

**Checkpoint**: All features complete, robust error handling, cleanup working, tests passing, documentation updated

---

## Dependencies & Execution Order

### Story Dependencies (Parallel Opportunities)

```
Phase 1 (Setup) → Phase 2 (Foundation)
                    ↓
         ┌──────────┼──────────┐
         ↓          ↓          ↓
    US1 (P1)   US4 (P2)   US2 (P2)  ← Can start in parallel after Phase 2
         ↓          ↓          ↓
         └──────────┴──────────┘
                    ↓
               US3 (P3)  ← Depends on US1, US2, US4
                    ↓
               Phase 7 (Polish)
```

**Parallel Execution Opportunities**:

1. **After Phase 2**: US1, US2, US4 can be implemented in parallel (different endpoints)
2. **Within each user story**: Tasks marked [P] can run in parallel
3. **Test writing**: All test tasks ([P] [US#]) can be written in parallel before implementation

### Recommended Implementation Order

**MVP (Minimum Viable Product)**: Phase 1 → Phase 2 → Phase 3 (US1)
- Delivers basic game creation capability
- Testable independently
- ~5-7 hours of work

**Incremental Delivery**:
1. MVP (US1) → Deploy/Test
2. Add US4 (Query) → Deploy/Test
3. Add US2 (Actions) → Deploy/Test
4. Add US3 (AI) → Deploy/Test (Full functionality)
5. Add Phase 7 (Polish) → Production ready

---

## Task Summary

**Total Tasks**: 106

**By Phase**:
- Phase 1 (Setup): 4 tasks
- Phase 2 (Foundation): 9 tasks
- Phase 3 (US1 - Create Game): 12 tasks (8 implementation + 4 tests)
- Phase 4 (US4 - Query State): 9 tasks (6 implementation + 3 tests)
- Phase 5 (US2 - Submit Actions): 17 tasks (11 implementation + 6 tests)
- Phase 6 (US3 - AI Execution): 25 tasks (19 implementation + 6 tests)
- Phase 7 (Polish): 30 tasks (cleanup, errors, logging, validation, docs)

**Parallelizable Tasks**: 67 tasks marked [P] (63%)

**By User Story**:
- US1: 12 tasks (MVP foundation)
- US2: 17 tasks (player interaction)
- US3: 25 tasks (AI automation - most complex)
- US4: 9 tasks (state querying)
- Infrastructure/Polish: 43 tasks

**Independent Test Criteria**:
- ✅ US1: Can create game and receive valid state → `test_create_game_default_players()`
- ✅ US2: Can submit actions and get updated state → `test_bury_valid_tiles()`
- ✅ US3: AI executes automatically after human action → `test_ai_executes_after_human_action()`
- ✅ US4: Can query game state with proper filtering → `test_get_game_state()`

**Estimated Total Time**: 14-20 hours (from plan.md Phase estimation)

---

## Format Validation

✅ All tasks follow required format: `- [ ] [ID] [P?] [Story?] Description with file path`
✅ Sequential task IDs: T001 through T106
✅ User story labels present: [US1], [US2], [US3], [US4]
✅ Parallel markers applied: 67 tasks marked [P]
✅ File paths included in all implementation tasks
✅ Checkboxes present on all tasks

---

## Next Steps

1. **Start with MVP**: Complete Phase 1 → Phase 2 → Phase 3 (US1) first
2. **Run tests frequently**: After each task or group of related tasks
3. **Use parallel execution**: Leverage [P] tasks when multiple developers available
4. **Incremental delivery**: Deploy after each user story completion for early feedback
5. **Track progress**: Check off tasks as completed in this file

**Ready to begin implementation!** Start with T001.
