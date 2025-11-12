# Data Model: HU Scoring System

**Feature**: HU Scoring System Complete Implementation
**Date**: 2025-11-12

## Overview

This feature does NOT introduce new data models. All required entities already exist in the codebase. This document describes how existing models are used for score transfer and multi-HU settlement.

## Existing Entities (No Changes)

### Player

**Location**: `src/mahjong/models/player.py`

```python
@dataclass
class Player:
    player_id: str
    score: int  # ✅ USED: Modified by score transfer logic
    hand: List[Tile]
    melds: List[Meld]
    hu_tiles: List[Tile]
    buried_cards: List[Tile]
    last_drawn_tile: Optional[Tile]
    missing_suit: Optional[Suit]
    is_hu: bool  # ✅ USED: Marks player as having won
    hand_locked: bool
    position: int
```

**Relevant Fields for Scoring**:
- `score` (int): Player's current points, modified by HU score transfers
  - Initial value: 100 (per PRD)
  - Can be negative (no floor constraint per clarification #2)
  - Constrained by zero-sum property: `sum(all_players.score) == 400`

- `is_hu` (bool): Marks player as having won at least once
  - Set to `True` when player declares HU
  - In blood-battle mode, players with `is_hu=True` can win multiple times

**Invariants**:
- Score changes MUST maintain zero-sum: total of all 4 players == 400
- `is_hu` flag is monotonic: once True, remains True (can't "unwon")

### GameState

**Location**: `src/mahjong/models/game_state.py`

```python
@dataclass
class GameState:
    game_id: str
    players: List[Player]  # ✅ USED: Contains Player.score fields
    current_player_index: int  # ✅ USED: Updated after HU based on type
    game_phase: GamePhase
    wall: List[Tile]
    discard_pile: List[Tile]
    round_wind: Optional[Suit]
    dealer_position: int

    def verify_zero_sum(self) -> None:
        """Validates zero-sum property: sum(player scores) == 400"""
```

**Relevant Fields for Scoring**:
- `players` (List[Player]): Contains all player state including scores
  - Score transfers modify Player objects in this list
  - List order determines seating positions (used in multi-HU)

- `current_player_index` (int): Index into `players` list
  - **Modified by Issue #81 fix**: After discard HU, set to discarder's next seat
  - After self-draw HU, set to winner's next seat (existing behavior)

**Invariants**:
- `len(players) == 4` always (per assumptions)
- `current_player_index` in range [0, 3]
- Zero-sum property enforced by `verify_zero_sum()`

### PlayerResponse

**Location**: `src/mahjong/models/response.py`

```python
@dataclass
class PlayerResponse:
    player_id: str
    action_type: ActionType  # ✅ USED: Filter for HU responses in multi-HU
    target_tile: Tile
    priority: int
```

**Relevant Fields for Multi-HU**:
- `action_type`: Used to filter HU responses from KONG/PENG/PASS
- `player_id`: Used to determine seating order for processing
- Multiple PlayerResponse objects with `action_type == ActionType.HU` trigger multi-HU logic

---

## Score Transfer Data Flow

### Self-Draw HU (自摸)

```text
Initial State:
  Player 0 (winner): score=100
  Player 1: score=100
  Player 2: score=100
  Player 3: score=100
  Total: 400

Fan Calculation:
  fan_value = Scorer.calculate_score(player0, is_self_drawn=True)
  # Example: fan_value = 2

Score Transfer:
  Player 0: 100 + (2 * 3) = 106  (winner gains 3x fan_value)
  Player 1: 100 - 2 = 98         (each other player loses fan_value)
  Player 2: 100 - 2 = 98
  Player 3: 100 - 2 = 98
  Total: 106 + 98 + 98 + 98 = 400 ✅
```

### Discard HU (点炮)

```text
Initial State:
  Player 0 (discarder): score=100
  Player 1 (winner): score=100
  Player 2: score=100
  Player 3: score=100
  Total: 400

Fan Calculation:
  fan_value = Scorer.calculate_score(player1, extra_tile=discard_tile, is_self_drawn=False)
  # Example: fan_value = 3

Score Transfer:
  Player 0: 100 - 3 = 97   (discarder loses fan_value)
  Player 1: 100 + 3 = 103  (winner gains fan_value)
  Player 2: 100            (no change)
  Player 3: 100            (no change)
  Total: 97 + 103 + 100 + 100 = 400 ✅
```

### Multi-HU (一炮多响)

```text
Initial State:
  Player 0 (discarder): score=100
  Player 1 (winner): score=100
  Player 2 (winner): score=100
  Player 3: score=100
  Total: 400

Fan Calculation (per winner):
  fan_value_p1 = Scorer.calculate_score(player1, extra_tile=discard_tile, ...)
  fan_value_p2 = Scorer.calculate_score(player2, extra_tile=discard_tile, ...)
  # Example: fan_value_p1 = 2, fan_value_p2 = 3

Score Transfer (sequential):
  After Player 1 HU:
    Player 0: 100 - 2 = 98
    Player 1: 100 + 2 = 102
    Total: 98 + 102 + 100 + 100 = 400 ✅

  After Player 2 HU:
    Player 0: 98 - 3 = 95    (discarder pays both)
    Player 2: 100 + 3 = 103
    Total: 95 + 102 + 103 + 100 = 400 ✅
```

---

## State Transitions

### declare_action(ActionType.HU) Flow

```text
Input:
  game_state: GameState
  player_id: str (winner)
  target_tile: Tile (winning tile)
  discard_player_id: Optional[str] (None for self-draw)

State Mutations (ordered):
  1. Validate HU legality (existing logic)
     - WinChecker.is_hu(player, target_tile)

  2. Update gameplay state (existing + modified)
     - player.is_hu = True
     - player.hu_tiles.append(target_tile)
     - player.hand updated (remove winning tile if self-draw)
     ✅ COMMITTED: Gameplay state finalized

  3. Calculate fan value (NEW)
     - fan_value = Scorer.calculate_score(player, ...)

  4. Transfer scores (NEW)
     - Update winner's score: +fan_value (or +fan_value*3 for self-draw)
     - Update loser(s) score: -fan_value each

  5. Validate zero-sum (NEW)
     - game_state.verify_zero_sum() (log-only, non-blocking)

  6. Update turn order (MODIFIED for Issue #81)
     - If self-draw: current_player_index = (winner_index + 1) % 4
     - If discard: current_player_index = (discarder_index + 1) % 4

  7. Draw next tile (existing, conditional for multi-HU)
     - If skip_next_draw=False: next player draws from wall

Output:
  Updated GameState with:
    - Modified Player.score values
    - is_hu flags set
    - Correct current_player_index
```

### process_responses(multi-HU) Flow

```text
Input:
  game_state: GameState
  responses: List[PlayerResponse] (contains multiple HU responses)
  discard_player_id: str

Processing:
  1. Filter HU responses
     hu_responses = [r for r in responses if r.action_type == ActionType.HU]

  2. Sort by seating order (clockwise from discarder's next seat)
     sorted_hu = sort_by_seat_priority(hu_responses, discarder_id)

  3. Process each HU sequentially
     new_state = game_state
     for i, response in enumerate(sorted_hu):
       is_last = (i == len(sorted_hu) - 1)
       new_state = declare_action(
         new_state, response.player_id, ActionType.HU, response.target_tile,
         discard_player_id=discard_player_id,
         skip_next_draw=(not is_last)  # Only last HU draws
       )

Output:
  GameState with:
    - Multiple players with is_hu=True
    - Discarder's score reduced by sum of all fan_values
    - All winners' scores increased by their respective fan_values
    - current_player_index = (discarder_index + 1) % 4
```

---

## Validation Rules

### Zero-Sum Property

**Rule**: At all times, `sum(player.score for player in game_state.players) == 400`

**Enforcement**:
- Validated after every score transfer (log-only)
- Test assertions check this property (strict)
- Initial state guarantees: 4 players × 100 points = 400

**Violation Handling**:
```python
def verify_zero_sum(self) -> None:
    total = sum(p.score for p in self.players)
    if total != 400:
        logger.error(
            f"Zero-sum violation: total={total}, expected=400, "
            f"scores={[p.score for p in self.players]}"
        )
        # Does NOT raise exception (architectural separation)
```

### Score Bounds

**Rule**: Player scores can be negative (no minimum constraint per clarification #2)

**Examples**:
```text
Legal states:
  [150, 120, 90, 40]   ✅ Total=400
  [200, 150, 100, -50] ✅ Total=400 (negative allowed)
  [250, 100, 50, 0]    ✅ Total=400 (zero allowed)

Illegal states:
  [100, 100, 100, 99]  ❌ Total=399 (zero-sum violation)
  [101, 100, 100, 100] ❌ Total=401 (zero-sum violation)
```

---

## Implementation Notes

### Immutability Pattern

All state updates use `dataclasses.replace()`:

```python
# Update player score (immutable)
new_player = replace(player, score=player.score + fan_value)

# Update players list (immutable)
new_players = [
    replace(p, score=p.score + delta) if p.player_id == player_id else p
    for p in game_state.players
]

# Update game state (immutable)
new_state = replace(game_state, players=new_players)
```

### No New Models Required

This feature is purely a logic enhancement. No schema changes, no new dataclass definitions. All data structures already exist and support the required operations.

---

## Testing Considerations

### Test Data Setup

Use existing helper functions from test fixtures:

```python
# Create game with specific scores
def create_game_with_scores(scores: List[int]) -> GameState:
    game_state = GameManager.create_game(["p0", "p1", "p2", "p3"])
    new_players = [
        replace(p, score=scores[i])
        for i, p in enumerate(game_state.players)
    ]
    return replace(game_state, players=new_players)

# Verify zero-sum in tests (strict assertion)
def assert_zero_sum(game_state: GameState):
    total = sum(p.score for p in game_state.players)
    assert total == 400, f"Zero-sum violated: total={total}"
```

### Key Test Scenarios

1. **Self-draw score transfer**: Verify winner +3x, others -1x
2. **Discard score transfer**: Verify discarder -1x, winner +1x
3. **Multi-HU settlement**: Verify discarder pays sum, each winner gets own fan_value
4. **Negative scores**: Verify no floor constraint, zero-sum maintained
5. **Turn order**: Verify current_player_index correct after HU
6. **Zero-sum preservation**: Assert after every score transfer

See `test_hu_score_settlement.py` for full test implementations.
