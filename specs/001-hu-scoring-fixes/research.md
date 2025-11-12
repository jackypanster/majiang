# Research: HU Scoring System Implementation

**Date**: 2025-11-12
**Feature**: HU Scoring System Complete Implementation
**Purpose**: Resolve technical unknowns and validate design decisions before implementation

## R1: Score Transfer Patterns in Turn-Based Games

### Question
What are best practices for score transfer in turn-based games where multiple players can win simultaneously?

### Decision
**Adopt "Score-as-Observer" pattern**: Calculate and transfer scores AFTER all gameplay state mutations are complete.

### Rationale
1. **Separation of Concerns**: Game rules (who can HU, turn order) are independent of accounting (score transfers)
2. **Error Isolation**: Score calculation bugs cannot corrupt core game state (is_hu flags, hand tiles, turn order)
3. **Testability**: Game logic can be tested without scoring layer, and vice versa
4. **Constitution Alignment**: Matches "Fast-Fail Error Handling" principle - let score errors fail loudly without blocking gameplay

### Implementation Pattern
```python
# CORRECT: Gameplay first, scoring second
def declare_action_hu(game_state, player_id, tile):
    # Step 1: Validate HU
    if not WinChecker.is_hu(player, tile):
        raise InvalidActionError(...)

    # Step 2: Update gameplay state (committed, irreversible)
    new_player = replace(player, is_hu=True, hu_tiles=[...])
    new_state = replace(game_state, players=[...])

    # Step 3: Calculate and transfer scores (observer pattern)
    try:
        fan_value = Scorer.calculate_score(new_player, ...)
        new_state = _transfer_scores(new_state, player_id, fan_value, ...)
        new_state.verify_zero_sum()  # Validate but don't block
    except Exception as e:
        logger.error(f"Score transfer failed: {e}")
        # Game state remains valid, gameplay continues

    return new_state
```

### Alternatives Considered
- **Scoring-First**: Calculate scores before gameplay mutations
  - Rejected: Violates architectural separation, creates coupling
- **Transactional**: Rollback gameplay if scoring fails
  - Rejected: Adds complexity, violates fast-fail principle
- **Deferred Scoring**: Calculate scores at game end only
  - Rejected: Breaks blood-battle real-time score visibility requirement

### References
- Spec FR-015: "score calculation and transfer MUST execute after gameplay state changes are finalized"
- Constitution IV (Fast-Fail): "Let errors propagate... don't catch unless you can fix"

---

## R2: Python Immutability Patterns with Dataclasses

### Question
Best practices for immutable state updates in Python dataclasses when modifying nested list fields (player scores in GameState.players list)?

### Decision
**Use list comprehension + `dataclasses.replace()` for targeted updates**.

### Rationale
1. **Simplicity**: Matches constitution "Simplicity First" principle
2. **Clarity**: Intent is explicit (which player, what change)
3. **Performance**: Minimal copying (only modified Player object + list rebuild)
4. **Existing Pattern**: Codebase already uses this pattern in player_actions.py

### Implementation Pattern
```python
from dataclasses import replace

# Update single player's score
def update_player_score(game_state: GameState, player_id: str, delta: int) -> GameState:
    new_players = []
    for player in game_state.players:
        if player.player_id == player_id:
            new_players.append(replace(player, score=player.score + delta))
        else:
            new_players.append(player)
    return replace(game_state, players=new_players)

# Or using list comprehension (preferred for readability):
def update_player_score(game_state: GameState, player_id: str, delta: int) -> GameState:
    new_players = [
        replace(p, score=p.score + delta) if p.player_id == player_id else p
        for p in game_state.players
    ]
    return replace(game_state, players=new_players)
```

### Codebase Evidence
Existing pattern in `src/mahjong/services/player_actions.py:561-568`:
```python
new_hand = list(player.hand)  # Copy list
new_hu_tiles = list(player.hu_tiles)
# ... mutations ...
new_player = replace(player, hand=new_hand, hu_tiles=new_hu_tiles)
```

This confirms the project uses shallow copy + replace pattern.

### Alternatives Considered
- **Full GameState copy**: `copy.deepcopy(game_state)`
  - Rejected: Overkill, performance overhead, violates simplicity
- **Mutable updates**: `game_state.players[i].score += delta`
  - Rejected: Violates constitution immutability expectations
- **Custom immutable containers**: Use `tuple` instead of `list`
  - Rejected: Breaks existing dataclass definitions

### References
- Python dataclasses docs: `replace()` creates shallow copy with field overrides
- Constitution I (Simplicity): "Prefer functions over classes"

---

## R3: Multi-Winner Settlement Order (Mahjong Domain)

### Question
Confirm that seating-order processing (clarification #3) aligns with traditional mahjong multi-HU rules.

### Decision
**Process multi-HU winners in clockwise seating order starting from discarder's next seat**.

### Rationale
1. **Traditional Rule**: Mahjong priority always follows turn order (East → South → West → North)
2. **Consistency**: Matches blood-battle mahjong conventions where turn priority determines action order
3. **Determinism**: Eliminates race conditions in simultaneous HU declarations
4. **Constitution Alignment**: Domain Model Integrity principle requires matching PRD rules

### Implementation Detail
```python
def _handle_multiple_hu(game_state, hu_responses, discard_player_id):
    # Step 1: Find discarder's position
    discarder_idx = next(i for i, p in enumerate(game_state.players)
                         if p.player_id == discard_player_id)

    # Step 2: Sort hu_responses by seating order (clockwise from next seat)
    def seat_priority(response):
        resp_idx = next(i for i, p in enumerate(game_state.players)
                        if p.player_id == response.player_id)
        # Distance clockwise from discarder's next seat
        return (resp_idx - discarder_idx - 1) % 4

    sorted_hu = sorted(hu_responses, key=seat_priority)

    # Step 3: Process each HU sequentially
    new_state = game_state
    for i, response in enumerate(sorted_hu):
        is_last = (i == len(sorted_hu) - 1)
        new_state = PlayerActions.declare_action(
            new_state, response.player_id, ActionType.HU, response.target_tile,
            discard_player_id=discard_player_id,
            skip_next_draw=(not is_last)  # Only last HU triggers draw
        )
    return new_state
```

### Domain Validation
- **Blood-battle rule**: Multiple players can win on same discard (一炮多响)
- **PRD §2.5**: "点炮时由点炮者支付该番数" - discarder pays ALL winners
- **Turn order**: Clockwise rotation (0 → 1 → 2 → 3 → 0) per PRD §2.2

### Alternatives Considered
- **Fan-value priority**: Process highest scorer first
  - Rejected: Not a mahjong rule, creates unfair advantage
- **Response arrival order**: First to declare wins priority
  - Rejected: Violates turn-based determinism
- **Parallel processing**: Settle all HU simultaneously
  - Rejected: Complicates error handling, unclear semantics

### References
- Spec clarification #3: "Process in seating order (clockwise), starting from the discarder's next seat"
- PRD §4.5: "一炮多响：一家打出的牌可以被多家同时胡牌"

---

## R4: Zero-Sum Validation Strategy

### Question
How to validate zero-sum property without blocking game flow (per FR-015 architectural separation)?

### Decision
**Log-only validation after each score transfer, with optional auto-correction**.

### Rationale
1. **Non-Blocking**: Validation errors don't prevent turn advancement (architectural separation)
2. **Fast-Fail**: Errors logged immediately with full context for debugging
3. **Safety Net**: Detects logic bugs in score transfer arithmetic
4. **Constitution Compliance**: Fast-fail principle with detailed error messages

### Implementation Pattern
```python
def verify_zero_sum(game_state: GameState) -> None:
    """
    Verifies zero-sum property: sum(player scores) == 400.

    Logs error if violated but does NOT raise exception (non-blocking).
    """
    total = sum(p.score for p in game_state.players)
    if total != 400:
        scores = {p.player_id: p.score for p in game_state.players}
        logger.error(
            f"Zero-sum violation in game {game_state.game_id}: "
            f"total={total}, expected=400, scores={scores}"
        )
        # Optional: Auto-correct by distributing error evenly
        # correction = (400 - total) // 4
        # (not implemented initially, kept as TODO for future)
```

### Validation Points
1. **After score transfer** (in declare_action HU branch)
2. **After multi-HU settlement** (in _handle_multiple_hu)
3. **At game end** (optional sanity check)

### Error Scenarios & Handling
| Scenario | Total | Action |
|----------|-------|--------|
| Correct arithmetic | 400 | Silent pass |
| Rounding error | 399-401 | Log warning, document cause |
| Logic bug | <390 or >410 | Log error, flag for investigation |

### Alternatives Considered
- **Raise exception on violation**: Blocks gameplay
  - Rejected: Violates FR-015 architectural separation
- **No validation**: Silent corruption
  - Rejected: Violates Domain Model Integrity (zero-sum is PRD constraint)
- **Validation-only mode**: Separate test flag
  - Deferred: Adds complexity, implement if needed

### References
- Spec FR-015: "score calculation errors (if any) MUST NOT block game progression"
- Spec SC-003: "sum of all four players' scores equals exactly 400"
- Constitution IV: "Complete context enables fast debugging"

---

## Summary of Decisions

| Research Area | Decision | Confidence |
|---------------|----------|------------|
| R1: Score Transfer Pattern | Score-as-Observer (after gameplay) | ✅ High |
| R2: Immutability Pattern | List comp + dataclasses.replace() | ✅ High |
| R3: Multi-HU Order | Clockwise from discarder's next seat | ✅ High |
| R4: Zero-Sum Validation | Log-only, non-blocking | ✅ High |

**All technical unknowns resolved. Ready for Phase 1 design.**

### Implementation Risks

| Risk | Mitigation | Severity |
|------|------------|----------|
| Score calculation bug corrupts game | Architectural separation isolates impact | Low |
| Multi-HU ordering wrong | Test with all 3-player permutations | Low |
| Zero-sum violation unnoticed | Comprehensive logging + test assertions | Low |
| Immutability pattern violated | Code review + constitution check | Low |

**Overall Risk**: Minimal. Clear patterns, existing codebase guidance, comprehensive spec.

---

## Next Actions

1. ✅ Research complete - all decisions made
2. ⏭️ Proceed to Phase 1: Generate `data-model.md`, `contracts/`, and `quickstart.md`
3. ⏭️ Update agent context with architectural separation pattern
4. ⏭️ Generate tasks via `/speckit.tasks`
