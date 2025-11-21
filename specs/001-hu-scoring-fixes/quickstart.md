# Implementation Quickstart: HU Scoring System

**Feature**: HU Scoring System Complete Implementation
**Estimated Time**: 2-3 hours
**Difficulty**: Medium

## Prerequisites

- [ ] Read `spec.md` (understand 3 user stories and 6 clarifications)
- [ ] Read `research.md` (understand architectural separation principle)
- [ ] Read `contracts/player_actions_scoring.md` (understand modified methods)
- [ ] Familiar with existing `src/mahjong/services/player_actions.py` code

## Implementation Phases

### Phase 1: Preparation (15 minutes)

#### 1.1 Create Test File First (Test-First Principle)

```bash
# Create new test file
touch tests/unit/test_hu_score_settlement.py
```

Write skeleton tests (implementation comes later):

```python
# tests/unit/test_hu_score_settlement.py
"""
Tests for HU score settlement (Issue #80, #81, #82)
"""
import pytest
from mahjong.models.tile import Tile
from mahjong.models.game_state import GameState
from mahjong.constants.enums import Suit, ActionType
from mahjong.services.game_manager import GameManager
from mahjong.services.player_actions import PlayerActions

def test_hu_score_settlement_self_draw():
    """Self-draw: winner +3x fan, others -1x fan each"""
    # TODO: Implement

def test_hu_score_settlement_discard():
    """Discard: winner +1x fan, discarder -1x fan"""
    # TODO: Implement

def test_hu_turn_order_non_adjacent():
    """Issue #81: After discard HU, next player is discarder's next seat"""
    # TODO: Implement

def test_multiple_hu_same_discard():
    """Issue #82: Multiple players can HU same discard"""
    # TODO: Implement

def test_multiple_hu_score_settlement():
    """Issue #82: Discarder pays all winners"""
    # TODO: Implement

def test_zero_sum_after_hu():
    """Zero-sum property maintained after HU"""
    # TODO: Implement
```

Run tests to confirm they're discovered:
```bash
uv run pytest tests/unit/test_hu_score_settlement.py -v
# Should show 6 tests, all skipped (TODO)
```

#### 1.2 Review Existing Code

Read these sections in `src/mahjong/services/player_actions.py`:
- Lines 526-663: Current HU branch (what needs modification)
- Lines 97-116: Current `process_responses()` (what needs multi-HU logic)

Understand existing patterns:
- How `dataclasses.replace()` is used for immutability
- How `WinChecker.is_hu()` is called
- How `logger.info()` is used for event logging

---

### Phase 2: Implement Score Transfer (Issue #80) (45 minutes)

#### 2.1 Add Score Calculation in declare_action() HU Branch

**Location**: `src/mahjong/services/player_actions.py`, after line 558 (after HU validation)

**Step 1**: Import Scorer at top of file
```python
from mahjong.services.scorer import Scorer
```

**Step 2**: Determine HU type and calculate fan
```python
# After line 558: logger.info(f"Game {game_state.game_id}: Player {player_id} successfully HU...")

# Determine HU type
is_self_draw = (discard_player_id is None)

# Calculate fan value
fan_value = Scorer.calculate_score(
    player=new_player,  # Use updated player with is_hu=True
    extra_tile=None if is_self_draw else target_tile,
    is_self_drawn=is_self_draw,
    is_kong_flower=False,  # TODO: Detect from recent actions
    is_last_tile=(len(game_state.wall) == 0),
    is_tian_hu=False,      # TODO: Detect from game phase
    is_di_hu=False
)

logger.info(
    f"Game {game_state.game_id}: Player {player_id} HU "
    f"({'self-draw' if is_self_draw else 'discard'}), "
    f"fan_count={fan_value}"
)
```

#### 2.2 Implement Score Transfer Logic

```python
# Transfer scores based on HU type
if is_self_draw:
    # Self-draw: winner gains 3x fan_value, each other loses 1x fan_value
    score_changes = []
    for i, p in enumerate(new_players):
        if p.player_id == player_id:
            new_score = p.score + (fan_value * 3)
            new_players[i] = replace(p, score=new_score)
            score_changes.append(f"{player_id}: {p.score}→{new_score}")
        else:
            new_score = p.score - fan_value
            new_players[i] = replace(p, score=new_score)
            score_changes.append(f"{p.player_id}: {p.score}→{new_score}")
else:
    # Discard HU: winner gains 1x fan_value, discarder loses 1x fan_value
    if not discard_player_id:
        raise InvalidActionError(
            f"declare_action failed (player_actions.py): "
            f"discard_player_id required for discard HU, "
            f"game={game_state.game_id}, player={player_id}"
        )

    score_changes = []
    for i, p in enumerate(new_players):
        if p.player_id == player_id:
            new_score = p.score + fan_value
            new_players[i] = replace(p, score=new_score)
            score_changes.append(f"{player_id}: {p.score}→{new_score}")
        elif p.player_id == discard_player_id:
            new_score = p.score - fan_value
            new_players[i] = replace(p, score=new_score)
            score_changes.append(f"{discard_player_id}: {p.score}→{new_score}")
        # else: unchanged, no logging

logger.info(f"Score changes: {', '.join(score_changes)}")

# Update game state with new scores
game_state = replace(game_state, players=new_players)
```

#### 2.3 Add Zero-Sum Validation

```python
# Validate zero-sum property (log-only, non-blocking)
game_state.verify_zero_sum()
```

**Test**: Implement and run `test_hu_score_settlement_self_draw()` and `test_hu_score_settlement_discard()`
```bash
uv run pytest tests/unit/test_hu_score_settlement.py::test_hu_score_settlement_self_draw -v
uv run pytest tests/unit/test_hu_score_settlement.py::test_hu_score_settlement_discard -v
```

---

### Phase 3: Fix Turn Order (Issue #81) (30 minutes)

#### 3.1 Locate Current Turn Order Logic

**Location**: `src/mahjong/services/player_actions.py`, around line 617

**Current code** (WRONG):
```python
next_player_index = (player_index + 1) % 4  # Winner's next seat
```

#### 3.2 Implement Correct Turn Order Logic

**Replace with**:
```python
# Determine next player based on HU type
if is_self_draw:
    # Self-draw: winner's next seat (existing behavior)
    next_player_index = (player_index + 1) % 4
    logger.info(f"Next turn: player {next_player_index} (winner's next seat)")
else:
    # Discard HU: discarder's next seat (FIX for Issue #81)
    discarder_index = next(
        i for i, p in enumerate(game_state.players)
        if p.player_id == discard_player_id
    )
    next_player_index = (discarder_index + 1) % 4
    logger.info(f"Next turn: player {next_player_index} (discarder's next seat)")
```

**Test**: Implement and run `test_hu_turn_order_non_adjacent()`
```bash
uv run pytest tests/unit/test_hu_score_settlement.py::test_hu_turn_order_non_adjacent -v
```

---

### Phase 4: Implement Multi-HU (Issue #82) (60 minutes)

#### 4.1 Add skip_next_draw Parameter to declare_action()

**Location**: Function signature at top of `declare_action()`

**Modify**:
```python
@staticmethod
def declare_action(
    game_state: GameState,
    player_id: str,
    action_type: ActionType,
    target_tile: Tile,
    discard_player_id: Optional[str] = None,
    skip_next_draw: bool = False,  # NEW PARAMETER
) -> GameState:
```

**Update docstring**:
```python
"""
...
Args:
    ...
    skip_next_draw: If True, skip drawing next tile (for multi-HU coordination)
```

#### 4.2 Conditionally Skip Draw

**Location**: End of HU branch, around line 660 (where next player draws)

**Find**:
```python
next_player = new_players[next_player_index]
# ... draw logic ...
```

**Wrap in condition**:
```python
if not skip_next_draw:
    next_player = new_players[next_player_index]
    # ... existing draw logic ...
else:
    logger.info(f"Skipping draw (multi-HU coordination)")
```

#### 4.3 Modify process_responses() for Multi-HU Detection

**Location**: `src/mahjong/services/player_actions.py`, lines 97-116

**Current structure**:
```python
@staticmethod
def process_responses(...) -> GameState:
    sorted_responses = sorted(responses, key=lambda r: r.priority, reverse=True)
    highest_response = sorted_responses[0]
    # ... handle single response ...
```

**Modify to**:
```python
@staticmethod
def process_responses(
    game_state: GameState,
    responses: List[PlayerResponse],
    discard_player_id: str,
) -> GameState:
    """Process player responses to a discard, with multi-HU support."""
    sorted_responses = sorted(responses, key=lambda r: r.priority, reverse=True)

    # Extract all HU responses (NEW)
    hu_responses = [r for r in sorted_responses if r.action_type == ActionType.HU]

    # Check for multi-HU (NEW)
    if len(hu_responses) > 1:
        logger.info(
            f"Multi-HU detected: {len(hu_responses)} players, "
            f"players={[r.player_id for r in hu_responses]}"
        )
        return PlayerActions._handle_multiple_hu(
            game_state, hu_responses, discard_player_id
        )

    # Single response: existing logic
    highest_response = sorted_responses[0]
    if highest_response.action_type == ActionType.PASS:
        return PlayerActions._next_player_draw(game_state)

    return PlayerActions.declare_action(
        game_state,
        highest_response.player_id,
        highest_response.action_type,
        highest_response.target_tile,
        discard_player_id=discard_player_id
    )
```

#### 4.4 Implement _handle_multiple_hu() Method

**Location**: Add as new static method in `PlayerActions` class

```python
@staticmethod
def _handle_multiple_hu(
    game_state: GameState,
    hu_responses: List[PlayerResponse],
    discard_player_id: str,
) -> GameState:
    """
    Handle multi-HU (一炮多响): process all HU responses in seating order.

    Args:
        game_state: Current game state
        hu_responses: List of HU responses (len >= 2)
        discard_player_id: ID of player who discarded the tile

    Returns:
        Updated game state with all HU winners settled
    """
    # Step 1: Sort hu_responses by seating order (clockwise from discarder's next seat)
    def seat_priority(response: PlayerResponse) -> int:
        discarder_idx = next(
            i for i, p in enumerate(game_state.players)
            if p.player_id == discard_player_id
        )
        resp_idx = next(
            i for i, p in enumerate(game_state.players)
            if p.player_id == response.player_id
        )
        return (resp_idx - discarder_idx - 1) % 4

    sorted_hu_responses = sorted(hu_responses, key=seat_priority)
    logger.info(
        f"Multi-HU processing order: "
        f"{[r.player_id for r in sorted_hu_responses]}"
    )

    # Step 2: Process each HU sequentially
    new_state = game_state
    for i, response in enumerate(sorted_hu_responses):
        is_last = (i == len(sorted_hu_responses) - 1)

        logger.info(
            f"Processing HU {i+1}/{len(sorted_hu_responses)}: "
            f"player={response.player_id}, is_last={is_last}"
        )

        new_state = PlayerActions.declare_action(
            new_state,
            response.player_id,
            ActionType.HU,
            response.target_tile,
            discard_player_id=discard_player_id,
            skip_next_draw=(not is_last)  # Only last HU draws
        )

    return new_state
```

**Test**: Implement and run multi-HU tests
```bash
uv run pytest tests/unit/test_hu_score_settlement.py::test_multiple_hu_same_discard -v
uv run pytest tests/unit/test_hu_score_settlement.py::test_multiple_hu_score_settlement -v
```

---

### Phase 5: Write Comprehensive Tests (45 minutes)

#### 5.1 Implement Test Helper Functions

```python
# tests/unit/test_hu_score_settlement.py

def create_game_with_custom_scores(scores: list[int]) -> GameState:
    """Create game with specified player scores."""
    game_state = GameManager.create_game(["p0", "p1", "p2", "p3"])
    new_players = [
        replace(p, score=scores[i])
        for i, p in enumerate(game_state.players)
    ]
    return replace(game_state, players=new_players)

def setup_ready_hand_for_hu(game_state: GameState, player_id: str,
                             winning_tile: Tile) -> GameState:
    """Set up a player with a hand ready to HU on winning_tile."""
    # Build a valid hu hand (e.g., 1-2-3, 4-5-6, 7-8, 7-8 筒 + winning_tile completes)
    # This requires understanding WinChecker logic
    # Simplified example:
    hand = [
        Tile(Suit.TONG, 1), Tile(Suit.TONG, 2), Tile(Suit.TONG, 3),
        Tile(Suit.TONG, 4), Tile(Suit.TONG, 5), Tile(Suit.TONG, 6),
        Tile(Suit.TONG, 7), Tile(Suit.TONG, 7), Tile(Suit.TONG, 8),
        Tile(Suit.TONG, 8),
        # winning_tile would complete the hand
    ]
    # ... detailed hand construction ...
    return game_state
```

#### 5.2 Implement Full Test Cases

**Example test**:
```python
def test_hu_score_settlement_self_draw():
    """
    Self-draw: winner gains 3x fan, others lose 1x fan each.
    Verify zero-sum property maintained.
    """
    # Setup
    game_state = GameManager.create_game(["p0", "p1", "p2", "p3"])
    game_state = GameManager.start_game(game_state)

    # Manually set up p0 with ready hand (埋牌后 10 cards + 1 winning tile = HU)
    winning_tile = Tile(Suit.TONG, 5)
    game_state = setup_ready_hand_for_hu(game_state, "p0", winning_tile)

    # Trigger self-draw HU
    initial_scores = [p.score for p in game_state.players]
    game_state = PlayerActions.declare_action(
        game_state, "p0", ActionType.HU, winning_tile,
        discard_player_id=None  # Self-draw
    )

    # Assertions
    expected_fan = Scorer.calculate_score(
        game_state.players[0], extra_tile=None, is_self_drawn=True
    )
    expected_scores = [
        initial_scores[0] + (expected_fan * 3),  # p0: winner
        initial_scores[1] - expected_fan,        # p1: loser
        initial_scores[2] - expected_fan,        # p2: loser
        initial_scores[3] - expected_fan,        # p3: loser
    ]
    actual_scores = [p.score for p in game_state.players]

    assert actual_scores == expected_scores
    assert sum(actual_scores) == 400  # Zero-sum
    assert game_state.players[0].is_hu is True
```

Repeat for all 6 test cases in skeleton.

---

### Phase 6: Integration Testing & Validation (30 minutes)

#### 6.1 Run All Tests

```bash
# Run all new tests
uv run pytest tests/unit/test_hu_score_settlement.py -v

# Run all existing tests to ensure no regressions
uv run pytest tests/unit/ -v
```

#### 6.2 Manual Integration Test

Start a game and play until HU:
```bash
# Start backend server
uv run uvicorn app.main:app --reload

# In another terminal, use curl or Postman to:
# 1. Create game: POST /games
# 2. Bury cards: POST /games/{id}/action (埋牌)
# 3. Play until someone can HU
# 4. Declare HU: POST /games/{id}/action (胡牌)
# 5. Verify scores in response

# Check logs/backend.log for:
# - "Player X HU (self-draw/discard), fan_count=Y"
# - "Score changes: p0: 100→103, p1: 100→99"
# - No zero-sum violation errors
```

#### 6.3 Verify Checklist

- [ ] All 6 tests in `test_hu_score_settlement.py` pass
- [ ] All existing tests still pass (no regressions)
- [ ] Zero-sum property maintained in all scenarios
- [ ] Turn order correct after self-draw HU
- [ ] Turn order correct after discard HU (Issue #81 fixed)
- [ ] Multi-HU correctly settles all winners (Issue #82 fixed)
- [ ] Negative scores allowed, no crashes
- [ ] Logging outputs clear event descriptions
- [ ] Manual integration test confirms scores update in real game

---

## Common Pitfalls & Solutions

### Pitfall 1: Modifying Player Objects In-Place

**Wrong**:
```python
player.score += fan_value  # ❌ Mutates dataclass
```

**Right**:
```python
new_player = replace(player, score=player.score + fan_value)  # ✅ Immutable
```

### Pitfall 2: Forgetting to Update game_state After Score Changes

**Wrong**:
```python
new_players[i] = replace(p, score=new_score)
# ... but never: game_state = replace(game_state, players=new_players)
```

**Right**:
```python
new_players[i] = replace(p, score=new_score)
game_state = replace(game_state, players=new_players)  # ✅ Commit changes
```

### Pitfall 3: Wrong Turn Order After Discard HU

**Wrong**:
```python
next_player_index = (player_index + 1) % 4  # ❌ Winner's next seat
```

**Right**:
```python
discarder_index = next(i for i, p in enumerate(game_state.players)
                       if p.player_id == discard_player_id)
next_player_index = (discarder_index + 1) % 4  # ✅ Discarder's next seat
```

### Pitfall 4: Multi-HU Wrong Sorting Order

**Wrong**:
```python
sorted_hu = sorted(hu_responses, key=lambda r: r.player_id)  # ❌ Alphabetical
```

**Right**:
```python
sorted_hu = sorted(hu_responses, key=seat_priority)  # ✅ Seating order
```

---

## Completion Checklist

Implementation complete when:

- [ ] All 15 functional requirements (FR-001 to FR-015) implemented
- [ ] All 7 success criteria (SC-001 to SC-007) verified by tests
- [ ] All 6 clarifications from spec reflected in code
- [ ] Zero-sum property maintained (tested)
- [ ] Architectural separation respected (scoring doesn't block gameplay)
- [ ] Constitution principles followed (test-first, simplicity, immutability)
- [ ] All tests pass (new + existing)
- [ ] Code review confirms no violations

**Estimated Total Time**: 3.5 hours (includes testing and validation)

---

## Next Steps After Implementation

1. Commit changes with descriptive message:
   ```bash
   git add src/mahjong/services/player_actions.py tests/unit/test_hu_score_settlement.py
   git commit -m "feat: 完成 HU 计分系统 (Issues #80, #81, #82)

   实现内容:
   - Issue #80: 添加分数转移逻辑 (自摸和点炮)
   - Issue #81: 修正点炮后的回合顺序 (discarder's next seat)
   - Issue #82: 支持一炮多响机制 (多人同时胡牌)

   架构原则:
   - 分数系统作为观察者，不影响游戏流程 (FR-015)
   - 零和性质验证 (log-only，非阻塞)
   - 完整的测试覆盖 (6个测试用例)

   🤖 Generated with [Claude Code](https://claude.com/claude-code)
   Co-Authored-By: Claude <noreply@anthropic.com>"
   ```

2. Generate tasks breakdown:
   ```bash
   /speckit.tasks
   ```

3. Open PR and reference issues:
   ```bash
   gh pr create --title "feat: 完成 HU 计分系统" --body "Closes #80, #81, #82"
   ```

4. Manual smoke test with frontend (if available)

5. Update CLAUDE.md if new patterns emerged
