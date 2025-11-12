# Implementation Plan: HU Scoring System Complete Implementation

**Branch**: `001-hu-scoring-fixes` | **Date**: 2025-11-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-hu-scoring-fixes/spec.md`

## Summary

This feature completes the HU scoring system by implementing three critical fixes:
1. **Score transfer mechanism** (Issue #80): Integrate Scorer.calculate_score and implement point transfers for self-draw and discard HU
2. **Turn order correction** (Issue #81): Fix current_player_index rotation after discard HU to use discarder's next seat
3. **Multi-HU support** (Issue #82): Enable multiple players to win on same discard with proper score settlement

**Technical approach**: Modify `PlayerActions.declare_action()` HU branch to add score calculation and transfer logic AFTER gameplay state changes (architectural separation principle), and refactor `PlayerActions.process_responses()` to handle multi-HU scenarios.

## Technical Context

**Language/Version**: Python 3.8+ (dataclass support required)
**Primary Dependencies**: None (core library is stdlib-only per constitution)
**Storage**: In-memory GameState (no persistence layer)
**Testing**: pytest with real objects (NO mocks per constitution)
**Target Platform**: Python runtime (library layer)
**Project Type**: Single project (library-first architecture)
**Performance Goals**: Sub-millisecond score calculation, immediate state updates
**Constraints**:
  - Architectural separation: scoring MUST NOT block gameplay
  - Zero-sum property: sum(player scores) == 400 always
  - Immutability: use `dataclasses.replace()`, never modify objects directly
**Scale/Scope**:
  - Single file modification: `src/mahjong/services/player_actions.py`
  - New test file: `tests/unit/test_hu_score_settlement.py`
  - ~150-200 LOC addition (score transfer + multi-HU logic)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Implementation Gates

✅ **Simplicity First**
- Modification targets single service file (`player_actions.py`)
- Score transfer logic is straightforward arithmetic (add/subtract fan values)
- Multi-HU handled by list iteration, no complex abstractions needed

✅ **Test-First (NON-NEGOTIABLE)**
- Plan includes comprehensive test file (`test_hu_score_settlement.py`)
- Tests use real GameState/Player objects per constitution
- 6+ test scenarios defined in spec acceptance criteria

✅ **Library-First Architecture**
- Changes confined to service layer (`services/player_actions.py`)
- No API dependencies (works with in-memory GameState)
- Maintains clear Models → Services boundary

✅ **Fast-Fail Error Handling**
- Spec defines InvalidActionError for discard_player_id=None (FR-011)
- Zero-sum validation failures logged but don't block progression (FR-015)
- Comprehensive error context in messages (game_id, player_id, fan_count, scores)

✅ **Domain Model Integrity**
- Implements PRD §2.5 scoring rules (total fan = score transfer)
- Respects blood-battle multi-win mechanic (FR-015 clarification #5)
- Maintains zero-sum constraint (SC-003)

### Constitution Compliance

| Principle | Status | Notes |
|-----------|--------|-------|
| Simplicity First | ✅ Pass | Single-file modification, ~150 LOC addition |
| Test-First | ✅ Pass | Test file planned before implementation |
| Library-First | ✅ Pass | Service layer only, no external dependencies |
| Fast-Fail | ✅ Pass | InvalidActionError + logging specified |
| Domain Integrity | ✅ Pass | Implements PRD §2.5 scoring rules exactly |

**No violations detected. Proceed to Phase 0.**

## Project Structure

### Documentation (this feature)

```text
specs/001-hu-scoring-fixes/
├── spec.md              # Feature specification (completed)
├── plan.md              # This file (current phase)
├── research.md          # Phase 0 output (next)
├── data-model.md        # Phase 1 output (N/A - no new models)
├── quickstart.md        # Phase 1 output (implementation guide)
└── tasks.md             # Phase 2 output (/speckit.tasks - not created here)
```

### Source Code (repository root)

```text
src/mahjong/
├── models/
│   ├── game_state.py       # Existing: GameState (no changes)
│   └── player.py           # Existing: Player.score field (no changes)
├── services/
│   ├── player_actions.py   # 🔧 MODIFY: declare_action() HU branch + process_responses()
│   └── scorer.py           # Existing: calculate_score() (no changes, already implemented)
└── constants/
    └── enums.py            # Existing: ActionType (no changes)

tests/unit/
├── test_hu_score_settlement.py  # ✨ NEW: Comprehensive HU scoring tests
├── test_player_actions_hu.py    # Existing: May need updates for new behavior
└── test_blood_battle_rules.py   # Existing: May reference scoring logic
```

**Structure Decision**: This is a focused bug fix / feature completion within the existing single-project library structure. All changes occur in the service layer (`player_actions.py`), with no model modifications needed since `Player.score` field already exists. The architectural separation principle (scoring as observer) means no changes to game flow logic, only additions to the HU handling branch.

## Complexity Tracking

**No violations requiring justification.**

All complexity constraints satisfied:
- Single service file modification
- No new abstraction layers
- Functions remain under 20 lines (score transfer is simple arithmetic)
- Test-first approach with real objects

---

## Phase 0: Research & Decisions

### Research Tasks

#### R1: Score Transfer Patterns in Turn-Based Games

**Question**: What are best practices for score transfer in turn-based games where multiple players can win simultaneously?

**Key Decisions Needed**:
- Order of operations: when to calculate vs. when to transfer scores
- Atomicity: should multi-HU be one transaction or multiple?
- Error handling: what if zero-sum validation fails mid-transfer?

**Expected Outcome**: Confirmation that architectural separation (score-as-observer) is industry best practice, with examples from similar game engines.

#### R2: Python Immutability Patterns with Dataclasses

**Question**: Best practices for immutable state updates in Python dataclasses when modifying nested list fields (player scores in GameState.players list)?

**Key Decisions Needed**:
- Use `dataclasses.replace()` for Player objects inside GameState.players list?
- Create new list vs. modify in place?
- Performance implications of full GameState copy vs. selective updates?

**Expected Outcome**: Patterns for clean immutable updates that satisfy constitution's simplicity principle while maintaining correctness.

#### R3: Multi-Winner Settlement Order (Mahjong Domain)

**Question**: Confirm that seating-order processing (clarification #3) aligns with traditional mahjong multi-HU rules.

**Key Decisions Needed**:
- Is clockwise-from-discarder standard across mahjong variants?
- Do all winners settle before next turn, or interleaved?
- Precedence: does first-settled winner have priority for next action?

**Expected Outcome**: Validation that spec's clarification #3 (seating order) matches blood-battle mahjong conventions, with references to rule sources.

#### R4: Zero-Sum Validation Strategy

**Question**: How to validate zero-sum property without blocking game flow (per FR-015 architectural separation)?

**Key Decisions Needed**:
- Validate before or after state commit?
- Log-only vs. raise exception on violation?
- Recovery strategy if sum != 400?

**Expected Outcome**: Lightweight validation approach that detects errors without disrupting gameplay, potentially with automatic correction logic.

### Deferred to Planning Phase

No technical unknowns require external research. All decisions can be made based on:
- Existing codebase patterns (Player/GameState immutability)
- Constitution principles (simplicity, fast-fail)
- Spec clarifications (seating order, architectural separation)

**Research phase can be completed through code review and constitution alignment check only.**

---

## Phase 1: Design & Contracts

*(To be filled during plan execution)*

### 1.1 Data Model

**No new models needed.** Existing entities sufficient:
- `Player.score` (int): Already exists, will be modified
- `GameState.players` (List[Player]): Already exists, contains scores
- Score transfer uses existing Scorer.calculate_score() method

See `data-model.md` for detailed entity definitions (to be generated).

### 1.2 API Contracts

**No external API contracts needed.** This is internal service layer logic.

**Internal Service Contract** (modified behavior):

```python
# src/mahjong/services/player_actions.py

@staticmethod
def declare_action(
    game_state: GameState,
    player_id: str,
    action_type: ActionType,
    target_tile: Tile,
    discard_player_id: Optional[str] = None,
    skip_next_draw: bool = False  # NEW: For multi-HU coordination
) -> GameState:
    """
    Declares a player action and updates game state.

    For ActionType.HU:
      1. Validates HU legality (existing logic)
      2. Updates gameplay state: is_hu flag, hu_tiles list (existing logic)
      3. Calculates fan value using Scorer.calculate_score() (NEW)
      4. Transfers scores between players (NEW)
      5. Updates current_player_index based on HU type (MODIFIED)
      6. Validates zero-sum property (NEW)
      7. Triggers next player draw (existing logic, conditionally skipped for multi-HU)

    Architectural separation: Steps 3-4 occur AFTER step 2 completes.
    If score calculation fails, gameplay state remains valid (fast-fail logging).

    Args:
        skip_next_draw: If True, skip draw step for multi-HU coordination

    Raises:
        InvalidActionError: If discard_player_id is None for discard HU
    """
    pass

@staticmethod
def process_responses(
    game_state: GameState,
    responses: List[PlayerResponse],
    discard_player_id: str,
) -> GameState:
    """
    Processes player responses to a discard, with multi-HU support.

    Modified behavior:
      1. Sort responses by priority (existing)
      2. Extract all HU responses (NEW)
      3. If len(hu_responses) > 1: call _handle_multiple_hu() (NEW)
      4. Else: handle single highest-priority response (existing)

    Multi-HU processing order: clockwise from discarder's next seat (clarification #3)
    """
    pass

@staticmethod
def _handle_multiple_hu(
    game_state: GameState,
    hu_responses: List[PlayerResponse],
    discard_player_id: str,
) -> GameState:
    """
    Handles multi-HU (一炮多响) by processing all HU responses in seating order.

    NEW FUNCTION. See contracts/ for detailed specification.
    """
    pass
```

See `contracts/player_actions_scoring.md` for full method specifications (to be generated).

### 1.3 Implementation Quickstart

See `quickstart.md` for step-by-step implementation guide (to be generated in Phase 1).

---

## Next Steps

1. **Complete Phase 0**: Generate `research.md` with decisions on R1-R4 (can skip external research, use codebase review)
2. **Complete Phase 1**: Generate `data-model.md` (simplified, no new entities), `contracts/player_actions_scoring.md`, and `quickstart.md`
3. **Update Agent Context**: Run `.specify/scripts/bash/update-agent-context.sh claude` to add "HU scoring architectural separation" to known patterns
4. **Execute Phase 2**: Run `/speckit.tasks` to generate task breakdown from this plan

**Estimated Effort**:
- Research: 30 minutes (code review + pattern validation)
- Design: 1 hour (contracts + quickstart)
- Implementation: 2-3 hours (code + tests)
- Total: 3.5-4.5 hours

**Risk Level**: Low
- Single file modification
- Clear acceptance criteria
- No external dependencies
- Architectural separation reduces blast radius
