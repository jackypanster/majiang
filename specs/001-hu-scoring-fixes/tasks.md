# Tasks: HU Scoring System Complete Implementation

**Input**: Design documents from `/specs/001-hu-scoring-fixes/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/player_actions_scoring.md

**Tests**: This feature follows Test-First principle (Constitution II). ALL test tasks are MANDATORY before implementation.

**Organization**: Tasks are grouped by user story (Issue #80, #81, #82) to enable independent implementation and testing of each component.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- Target file: `src/mahjong/services/player_actions.py`
- Test file: `tests/unit/test_hu_score_settlement.py`

---

## Phase 1: Setup (Prerequisites)

**Purpose**: Verify environment and create test infrastructure

- [ ] T001 Verify Python 3.8+ and pytest environment setup
- [ ] T002 Create test file tests/unit/test_hu_score_settlement.py with skeleton tests
- [ ] T003 Review existing src/mahjong/services/player_actions.py structure (lines 526-663 HU branch, lines 97-116 process_responses)

**Checkpoint**: Test environment ready, existing code reviewed

---

## Phase 2: Foundational (Test Scaffolding)

**Purpose**: Write all failing tests FIRST per Test-First principle

**⚠️ CRITICAL**: All tests MUST be written and FAIL before implementation begins

### Test Helper Functions

- [ ] T004 [P] Implement create_game_with_custom_scores() helper in tests/unit/test_hu_score_settlement.py
- [ ] T005 [P] Implement setup_ready_hand_for_hu() helper in tests/unit/test_hu_score_settlement.py
- [ ] T006 [P] Implement assert_zero_sum() validation helper in tests/unit/test_hu_score_settlement.py

### User Story 1 Tests (Score Transfer)

- [ ] T007 [P] [US1] Write test_hu_score_settlement_self_draw() in tests/unit/test_hu_score_settlement.py (MUST FAIL)
- [ ] T008 [P] [US1] Write test_hu_score_settlement_discard() in tests/unit/test_hu_score_settlement.py (MUST FAIL)
- [ ] T009 [P] [US1] Write test_hu_zero_sum_maintained() in tests/unit/test_hu_score_settlement.py (MUST FAIL)
- [ ] T010 [P] [US1] Write test_negative_scores_allowed() in tests/unit/test_hu_score_settlement.py (MUST FAIL)

### User Story 2 Tests (Turn Order)

- [ ] T011 [P] [US2] Write test_hu_turn_order_adjacent() in tests/unit/test_hu_score_settlement.py (MUST FAIL)
- [ ] T012 [P] [US2] Write test_hu_turn_order_non_adjacent() in tests/unit/test_hu_score_settlement.py (MUST FAIL)
- [ ] T013 [P] [US2] Write test_self_draw_turn_order() in tests/unit/test_hu_score_settlement.py (MUST FAIL)

### User Story 3 Tests (Multi-HU)

- [ ] T014 [P] [US3] Write test_multiple_hu_same_discard() in tests/unit/test_hu_score_settlement.py (MUST FAIL)
- [ ] T015 [P] [US3] Write test_multiple_hu_score_settlement() in tests/unit/test_hu_score_settlement.py (MUST FAIL)
- [ ] T016 [P] [US3] Write test_multiple_hu_seating_order() in tests/unit/test_hu_score_settlement.py (MUST FAIL)

**Verification**: Run `uv run pytest tests/unit/test_hu_score_settlement.py -v` - ALL 13 tests MUST FAIL before proceeding

**Checkpoint**: Test-first complete - all tests written and failing

---

## Phase 3: User Story 1 - Score Transfer on Winning (Priority: P0) 🎯 MVP

**Goal**: Implement score calculation and transfer logic for self-draw and discard HU (Issue #80)

**Independent Test**: Run tests T007-T010 - they should pass after this phase

### Implementation

- [ ] T017 [US1] Add Scorer import at top of src/mahjong/services/player_actions.py
- [ ] T018 [US1] Locate HU branch in declare_action() (after line 558) and add is_self_draw determination logic
- [ ] T019 [US1] Implement fan calculation using Scorer.calculate_score() with correct parameters in src/mahjong/services/player_actions.py
- [ ] T020 [US1] Implement self-draw score transfer logic (winner +3x fan, others -1x fan each) in src/mahjong/services/player_actions.py
- [ ] T021 [US1] Implement discard score transfer logic (winner +1x fan, discarder -1x fan) in src/mahjong/services/player_actions.py
- [ ] T022 [US1] Add discard_player_id validation (raise InvalidActionError if None for discard HU) in src/mahjong/services/player_actions.py
- [ ] T023 [US1] Call game_state.verify_zero_sum() after score transfer (log-only, non-blocking) in src/mahjong/services/player_actions.py
- [ ] T024 [US1] Add comprehensive logging for HU events (player_id, HU type, fan_count, score_changes) in src/mahjong/services/player_actions.py
- [ ] T025 [US1] Update game_state with new player scores using dataclasses.replace() pattern in src/mahjong/services/player_actions.py

**Verification**: Run `uv run pytest tests/unit/test_hu_score_settlement.py::test_hu_score_settlement_self_draw -v` - MUST PASS
**Verification**: Run `uv run pytest tests/unit/test_hu_score_settlement.py::test_hu_score_settlement_discard -v` - MUST PASS
**Verification**: Run `uv run pytest tests/unit/test_hu_score_settlement.py::test_hu_zero_sum_maintained -v` - MUST PASS
**Verification**: Run `uv run pytest tests/unit/test_hu_score_settlement.py::test_negative_scores_allowed -v` - MUST PASS

**Checkpoint**: At this point, User Story 1 (score transfer) should be fully functional - Issue #80 RESOLVED

---

## Phase 4: User Story 2 - Correct Turn Order After Discard Win (Priority: P1)

**Goal**: Fix current_player_index rotation after discard HU to use discarder's next seat (Issue #81)

**Independent Test**: Run tests T011-T013 - they should pass after this phase

### Implementation

- [ ] T026 [US2] Locate turn order logic in declare_action() HU branch (around line 617) in src/mahjong/services/player_actions.py
- [ ] T027 [US2] Replace existing next_player_index calculation with conditional logic (self-draw vs discard) in src/mahjong/services/player_actions.py
- [ ] T028 [US2] Implement self-draw turn order (winner's next seat) in src/mahjong/services/player_actions.py
- [ ] T029 [US2] Implement discard HU turn order (discarder's next seat) using discard_player_id in src/mahjong/services/player_actions.py
- [ ] T030 [US2] Add logging for next turn player and reason (winner's seat vs discarder's seat) in src/mahjong/services/player_actions.py

**Verification**: Run `uv run pytest tests/unit/test_hu_score_settlement.py::test_hu_turn_order_adjacent -v` - MUST PASS
**Verification**: Run `uv run pytest tests/unit/test_hu_score_settlement.py::test_hu_turn_order_non_adjacent -v` - MUST PASS
**Verification**: Run `uv run pytest tests/unit/test_hu_score_settlement.py::test_self_draw_turn_order -v` - MUST PASS

**Checkpoint**: User Story 2 (turn order fix) complete - Issue #81 RESOLVED

---

## Phase 5: User Story 3 - Multiple Players Win Same Discard (Priority: P1)

**Goal**: Implement multi-HU (一炮多响) mechanism where multiple players can win on same discard (Issue #82)

**Independent Test**: Run tests T014-T016 - they should pass after this phase

### Implementation

- [ ] T031 [US3] Add skip_next_draw parameter to declare_action() signature in src/mahjong/services/player_actions.py
- [ ] T032 [US3] Update declare_action() docstring to document skip_next_draw parameter in src/mahjong/services/player_actions.py
- [ ] T033 [US3] Wrap next player draw logic in conditional (if not skip_next_draw) at end of HU branch in src/mahjong/services/player_actions.py
- [ ] T034 [US3] Modify process_responses() to extract all HU responses (filter by ActionType.HU) in src/mahjong/services/player_actions.py
- [ ] T035 [US3] Add multi-HU detection logic (len(hu_responses) > 1) in process_responses() in src/mahjong/services/player_actions.py
- [ ] T036 [US3] Call _handle_multiple_hu() when multi-HU detected in src/mahjong/services/player_actions.py
- [ ] T037 [US3] Implement _handle_multiple_hu() static method skeleton in src/mahjong/services/player_actions.py
- [ ] T038 [US3] Implement seat_priority() function for seating order sorting (clockwise from discarder's next seat) in src/mahjong/services/player_actions.py
- [ ] T039 [US3] Sort hu_responses by seat_priority in _handle_multiple_hu() in src/mahjong/services/player_actions.py
- [ ] T040 [US3] Implement sequential HU processing loop in _handle_multiple_hu() with skip_next_draw control in src/mahjong/services/player_actions.py
- [ ] T041 [US3] Add logging for multi-HU detection and processing order in src/mahjong/services/player_actions.py

**Verification**: Run `uv run pytest tests/unit/test_hu_score_settlement.py::test_multiple_hu_same_discard -v` - MUST PASS
**Verification**: Run `uv run pytest tests/unit/test_hu_score_settlement.py::test_multiple_hu_score_settlement -v` - MUST PASS
**Verification**: Run `uv run pytest tests/unit/test_hu_score_settlement.py::test_multiple_hu_seating_order -v` - MUST PASS

**Checkpoint**: User Story 3 (multi-HU support) complete - Issue #82 RESOLVED

---

## Phase 6: Integration & Validation

**Purpose**: Verify all user stories work together and no regressions introduced

- [ ] T042 Run all new tests: `uv run pytest tests/unit/test_hu_score_settlement.py -v` (ALL 13 MUST PASS)
- [ ] T043 Run all existing tests: `uv run pytest tests/unit/ -v` (verify no regressions)
- [ ] T044 Verify code follows constitution principles (simplicity, immutability, fast-fail)
- [ ] T045 [P] Code review: check all FR-001 to FR-015 requirements implemented
- [ ] T046 [P] Code review: verify SC-001 to SC-007 success criteria met
- [ ] T047 [P] Code review: confirm all 6 clarifications from spec reflected in code
- [ ] T048 Verify architectural separation: scoring doesn't block gameplay (try disabling Scorer to test)

**Checkpoint**: All user stories integrated and verified

---

## Phase 7: Polish & Documentation

**Purpose**: Finalize implementation with documentation and cleanup

- [ ] T049 [P] Review and update code comments for clarity
- [ ] T050 [P] Verify logging messages are clear and informative
- [ ] T051 [P] Update CLAUDE.md if new patterns emerged (architectural separation pattern)
- [ ] T052 Manual integration test: start game, play until HU, verify scores update correctly
- [ ] T053 Check logs/backend.log for correct HU event logging and zero-sum validation
- [ ] T054 Validate against quickstart.md completion checklist (all 15 FR, 7 SC, 6 clarifications)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - start immediately
- **Foundational (Phase 2)**: Depends on Setup (T001-T003) - BLOCKS all implementation
- **User Story 1 (Phase 3)**: Depends on Foundational (T004-T016) - BLOCKS US2 and US3
- **User Story 2 (Phase 4)**: Depends on US1 (T017-T025) - Can run parallel with US3
- **User Story 3 (Phase 5)**: Depends on US1 (T017-T025) - Can run parallel with US2
- **Integration (Phase 6)**: Depends on US1, US2, US3 all complete
- **Polish (Phase 7)**: Depends on Integration passing

### User Story Dependencies

- **User Story 1 (P0 - Score Transfer)**: Foundation for other stories
  - US2 needs score transfer to test turn order with correct scores
  - US3 needs score transfer to verify multi-HU settlement
- **User Story 2 (P1 - Turn Order)**: Independent of US3, depends on US1
- **User Story 3 (P1 - Multi-HU)**: Independent of US2, depends on US1

### Within Each User Story

- Tests written FIRST, MUST FAIL before implementation
- Implementation tasks follow test-driven order
- Each story completes before moving to next priority

### Parallel Opportunities

#### Phase 2 (Foundational - Tests)
```bash
# All test writing tasks can run in parallel:
T007, T008, T009, T010  # US1 tests
T011, T012, T013        # US2 tests
T014, T015, T016        # US3 tests
```

#### Phase 3 (User Story 1 - Implementation)
Tasks are sequential - each modifies same HU branch in player_actions.py

#### Phase 4 & 5 (User Stories 2 & 3)
```bash
# US2 and US3 can run in parallel (different code sections):
Developer A: T026-T030 (US2 - turn order fix)
Developer B: T031-T041 (US3 - multi-HU support)
```

#### Phase 6 (Integration)
```bash
# Code review tasks can run in parallel:
T045, T046, T047  # Different review focuses
```

#### Phase 7 (Polish)
```bash
# Documentation tasks can run in parallel:
T049, T050, T051  # Comments, logging, docs
```

---

## Parallel Example: Phase 2 (All Tests)

```bash
# Launch all test writing tasks together (different test functions):
Task T007: "Write test_hu_score_settlement_self_draw() - MUST FAIL"
Task T008: "Write test_hu_score_settlement_discard() - MUST FAIL"
Task T009: "Write test_hu_zero_sum_maintained() - MUST FAIL"
Task T010: "Write test_negative_scores_allowed() - MUST FAIL"
Task T011: "Write test_hu_turn_order_adjacent() - MUST FAIL"
Task T012: "Write test_hu_turn_order_non_adjacent() - MUST FAIL"
Task T013: "Write test_self_draw_turn_order() - MUST FAIL"
Task T014: "Write test_multiple_hu_same_discard() - MUST FAIL"
Task T015: "Write test_multiple_hu_score_settlement() - MUST FAIL"
Task T016: "Write test_multiple_hu_seating_order() - MUST FAIL"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only - Issue #80)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational Tests (T004-T016) - All tests written and FAILING
3. Complete Phase 3: User Story 1 (T017-T025) - Score transfer working
4. **STOP and VALIDATE**: Run tests T007-T010 - should all PASS
5. Verify: Create game, declare HU, check scores updated

**Deliverable**: Score transfer functional, zero-sum maintained (Issue #80 resolved)

### Incremental Delivery (All 3 Stories)

1. Complete Setup + Foundational → Test infrastructure ready
2. Add User Story 1 → Tests T007-T010 pass → Score transfer works (MVP!)
3. Add User Story 2 → Tests T011-T013 pass → Turn order fixed (Issue #81 resolved)
4. Add User Story 3 → Tests T014-T016 pass → Multi-HU works (Issue #82 resolved)
5. Integration → ALL tests pass → Production ready

### Parallel Team Strategy

With 2 developers after US1 completes:

1. Team completes Setup + Foundational together (T001-T016)
2. Developer A: User Story 1 (T017-T025) - BLOCKING
3. Once US1 done, parallel work:
   - Developer A: User Story 2 (T026-T030) - Turn order fix
   - Developer B: User Story 3 (T031-T041) - Multi-HU support
4. Team reconvenes for Integration (T042-T048)

---

## Task Summary

| Phase | Tasks | Story | Can Parallelize |
|-------|-------|-------|-----------------|
| Phase 1: Setup | T001-T003 (3 tasks) | N/A | No (sequential setup) |
| Phase 2: Foundational | T004-T016 (13 tasks) | N/A | Yes (10 parallel test tasks) |
| Phase 3: User Story 1 | T017-T025 (9 tasks) | US1 | No (same file edits) |
| Phase 4: User Story 2 | T026-T030 (5 tasks) | US2 | No (same file edits) |
| Phase 5: User Story 3 | T031-T041 (11 tasks) | US3 | No (same file edits) |
| Phase 6: Integration | T042-T048 (7 tasks) | N/A | Partial (review tasks) |
| Phase 7: Polish | T049-T054 (6 tasks) | N/A | Partial (doc tasks) |
| **TOTAL** | **54 tasks** | 3 stories | 13 tasks can run in parallel |

### Task Count by User Story

- **US1 (Score Transfer)**: 9 implementation + 4 tests = 13 tasks
- **US2 (Turn Order Fix)**: 5 implementation + 3 tests = 8 tasks
- **US3 (Multi-HU)**: 11 implementation + 3 tests = 14 tasks

### Estimated Timeline

- Setup: 15 minutes (T001-T003)
- Foundational (Tests): 45 minutes (T004-T016, parallelizable)
- User Story 1: 45 minutes (T017-T025)
- User Story 2: 30 minutes (T026-T030)
- User Story 3: 60 minutes (T031-T041)
- Integration: 30 minutes (T042-T048)
- Polish: 30 minutes (T049-T054)
- **Total: 3.75 hours** (sequential execution)
- **Total: 3 hours** (with parallel test writing)

---

## Notes

- **[P] tasks**: Different files or independent test functions, no dependencies
- **[Story] label**: Maps task to specific user story for traceability
- **Test-First**: ALL tests written and failing before implementation (Constitution II)
- **Architectural Separation**: Scoring logic added AFTER gameplay state changes (FR-015)
- **Zero-Sum Property**: Validated after every score transfer (SC-003)
- **Immutability**: Use `dataclasses.replace()` pattern throughout (research.md R2)
- **Single File**: All implementation in `src/mahjong/services/player_actions.py`
- **Verify tests fail**: Run `uv run pytest tests/unit/test_hu_score_settlement.py -v` after Phase 2 - MUST show 13 failures
- **Constitution compliance**: Verify Simplicity, Test-First, Library-First, Fast-Fail, Domain Integrity principles
- **Commit strategy**: Commit after each phase or user story completion
- **Stop at checkpoints**: Validate each story independently before proceeding
