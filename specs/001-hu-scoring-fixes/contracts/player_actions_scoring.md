# Service Contract: PlayerActions Scoring Extensions

**Service**: `PlayerActions`
**Location**: `src/mahjong/services/player_actions.py`
**Feature**: HU Scoring System Complete Implementation

## Modified Methods

### declare_action() - Enhanced HU Branch

**Signature**:
```python
@staticmethod
def declare_action(
    game_state: GameState,
    player_id: str,
    action_type: ActionType,
    target_tile: Tile,
    discard_player_id: Optional[str] = None,
    skip_next_draw: bool = False  # NEW PARAMETER
) -> GameState
```

**Purpose**: Process player actions, now with complete HU score settlement.

**Modified Behavior for ActionType.HU**:

#### Execution Order (Critical)

1. **Validate HU legality** (existing)
   ```python
   can_hu = WinChecker.is_hu(player, extra_tile)
   if not can_hu:
       raise InvalidActionError(...)
   ```

2. **Update gameplay state** (existing + minor modifications)
   ```python
   new_player = replace(player, is_hu=True, hu_tiles=[...])
   new_state = replace(game_state, players=[...])
   # ✅ CHECKPOINT: Gameplay state committed
   ```

3. **Calculate fan value** (NEW)
   ```python
   from mahjong.services.scorer import Scorer

   is_self_draw = (discard_player_id is None)
   fan_value = Scorer.calculate_score(
       player=new_player,
       extra_tile=None if is_self_draw else target_tile,
       is_self_drawn=is_self_draw,
       is_kong_flower=_determine_kong_flower(new_state),
       is_last_tile=(len(new_state.wall) == 0),
       is_tian_hu=False,  # TODO: Detect from game phase
       is_di_hu=False
   )
   ```

4. **Transfer scores** (NEW)
   ```python
   if is_self_draw:
       # Self-draw: winner gains 3x fan, each other player loses 1x fan
       new_players = []
       for p in new_state.players:
           if p.player_id == player_id:
               new_players.append(replace(p, score=p.score + fan_value * 3))
           else:
               new_players.append(replace(p, score=p.score - fan_value))
   else:
       # Discard: winner gains 1x fan, discarder loses 1x fan
       if not discard_player_id:
           raise InvalidActionError(
               f"discard_player_id required for discard HU in game {game_state.game_id}"
           )
       new_players = []
       for p in new_state.players:
           if p.player_id == player_id:
               new_players.append(replace(p, score=p.score + fan_value))
           elif p.player_id == discard_player_id:
               new_players.append(replace(p, score=p.score - fan_value))
           else:
               new_players.append(p)  # Unchanged

   new_state = replace(new_state, players=new_players)
   ```

5. **Validate zero-sum** (NEW)
   ```python
   new_state.verify_zero_sum()  # Log-only, non-blocking
   ```

6. **Update turn order** (MODIFIED for Issue #81)
   ```python
   if is_self_draw:
       # Self-draw: winner's next seat
       winner_index = next(i for i, p in enumerate(new_state.players)
                           if p.player_id == player_id)
       next_player_index = (winner_index + 1) % 4
   else:
       # Discard HU: discarder's next seat (FIX for Issue #81)
       discarder_index = next(i for i, p in enumerate(new_state.players)
                              if p.player_id == discard_player_id)
       next_player_index = (discarder_index + 1) % 4

   new_state = replace(new_state, current_player_index=next_player_index)
   ```

7. **Log HU event** (NEW)
   ```python
   logger.info(
       f"Game {game_state.game_id}: Player {player_id} HU "
       f"({'self-draw' if is_self_draw else 'discard'}), "
       f"fan_count={fan_value}, "
       f"score_change={'+'}{fan_value * 3 if is_self_draw else fan_value}"
   )
   ```

8. **Draw next tile** (existing, now conditional)
   ```python
   if not skip_next_draw:
       next_player = new_state.players[next_player_index]
       # ... existing draw logic ...
   ```

**Parameters**:
- `skip_next_draw` (bool, default=False): NEW parameter for multi-HU coordination
  - When `True`, skip drawing next tile (used in multi-HU to prevent premature draws)
  - When `False`, proceed with normal draw logic (default behavior)

**Returns**: `GameState` with:
- Winner's `is_hu` flag set to `True`
- Winner's `hu_tiles` list updated
- All players' `score` fields updated (zero-sum maintained)
- `current_player_index` set correctly based on HU type
- Next player's hand updated (if `skip_next_draw=False`)

**Raises**:
- `InvalidActionError`: If `discard_player_id` is None for discard HU
- `InvalidActionError`: If player cannot legally HU with `target_tile`

**Invariants Maintained**:
- Zero-sum property: `sum(player.score) == 400`
- Turn order: Next player determined by HU type, not winner position (Issue #81 fix)
- Architectural separation: Score errors logged but don't block gameplay

---

### process_responses() - Multi-HU Support

**Signature** (unchanged):
```python
@staticmethod
def process_responses(
    game_state: GameState,
    responses: List[PlayerResponse],
    discard_player_id: str,
) -> GameState
```

**Modified Behavior**:

#### Execution Flow

1. **Sort responses by priority** (existing)
   ```python
   sorted_responses = sorted(responses, key=lambda r: r.priority, reverse=True)
   ```

2. **Extract HU responses** (NEW)
   ```python
   hu_responses = [r for r in sorted_responses if r.action_type == ActionType.HU]
   ```

3. **Check for multi-HU** (NEW)
   ```python
   if len(hu_responses) > 1:
       # Multi-HU scenario: handle all HU responses
       return PlayerActions._handle_multiple_hu(
           game_state, hu_responses, discard_player_id
       )
   ```

4. **Handle single response** (existing logic, unchanged)
   ```python
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

**Returns**: `GameState` with:
- All HU responses processed (if multi-HU)
- Single highest-priority response processed (if not multi-HU)
- Turn order updated correctly

**Invariants**:
- HU responses always prioritized over KONG/PENG/PASS
- All HU responses executed, not just first one (Issue #82 fix)

---

## New Methods

### _handle_multiple_hu() - Multi-HU Settlement

**Signature**:
```python
@staticmethod
def _handle_multiple_hu(
    game_state: GameState,
    hu_responses: List[PlayerResponse],
    discard_player_id: str,
) -> GameState
```

**Purpose**: Process multiple HU responses to the same discard in seating order.

**Algorithm**:

#### Step 1: Sort HU responses by seating order

```python
def seat_priority(response: PlayerResponse) -> int:
    """
    Calculate priority based on clockwise distance from discarder's next seat.

    Returns: 0 (next seat), 1, 2, or 3 (furthest seat)
    """
    discarder_idx = next(i for i, p in enumerate(game_state.players)
                         if p.player_id == discard_player_id)
    resp_idx = next(i for i, p in enumerate(game_state.players)
                    if p.player_id == response.player_id)
    return (resp_idx - discarder_idx - 1) % 4

sorted_hu_responses = sorted(hu_responses, key=seat_priority)
```

**Example**:
```text
Players: [P0, P1, P2, P3]
Discarder: P0
HU responses: [P2, P3, P1]

Seating order priorities:
  P1: (1 - 0 - 1) % 4 = 0  (P0's next seat, highest priority)
  P2: (2 - 0 - 1) % 4 = 1
  P3: (3 - 0 - 1) % 4 = 2

Sorted order: [P1, P2, P3]
```

#### Step 2: Process each HU sequentially

```python
new_state = game_state
for i, response in enumerate(sorted_hu_responses):
    is_last = (i == len(sorted_hu_responses) - 1)

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

**Key Behavior**:
- Each HU is processed independently with its own fan calculation
- Discarder's score is reduced by sum of all fan values
- Only the LAST HU winner triggers next player draw
- Turn order based on discarder's position (Issue #81 fix applies to all HUs)

**Returns**: `GameState` with:
- All HU winners marked with `is_hu=True`
- Discarder's score reduced by sum of all fan_values
- Each winner's score increased by their respective fan_value
- `current_player_index` set to discarder's next seat
- Next player's hand updated (tile drawn)

**Preconditions**:
- `len(hu_responses) >= 2` (enforced by caller)
- All responses have `action_type == ActionType.HU`
- `discard_player_id` is valid and in `game_state.players`

**Invariants Maintained**:
- Zero-sum property after each individual HU settlement
- Seating order determines processing order (clarification #3)
- Architectural separation: each HU settlement is independent

---

## Error Handling

### InvalidActionError Scenarios

1. **Missing discard_player_id for discard HU** (FR-011)
   ```python
   if action_type == ActionType.HU and not is_self_draw and not discard_player_id:
       raise InvalidActionError(
           f"declare_action failed (player_actions.py:{line}): "
           f"discard_player_id required for discard HU, "
           f"game={game_state.game_id}, player={player_id}, tile={target_tile}"
       )
   ```

2. **Illegal HU attempt**
   ```python
   if not WinChecker.is_hu(player, extra_tile):
       raise InvalidActionError(
           f"declare_action failed (player_actions.py:{line}): "
           f"player cannot HU with tile, "
           f"game={game_state.game_id}, player={player_id}, tile={target_tile}, "
           f"is_self_draw={is_self_draw}"
       )
   ```

### Zero-Sum Validation Errors (Non-Blocking)

```python
def verify_zero_sum(self) -> None:
    total = sum(p.score for p in self.players)
    if total != 400:
        logger.error(
            f"GameState.verify_zero_sum failed (game_state.py:{line}): "
            f"zero-sum violation, game={self.game_id}, "
            f"total={total}, expected=400, "
            f"scores={[p.score for p in self.players]}"
        )
        # Does NOT raise exception (architectural separation)
```

---

## Testing Contract

### Unit Test Requirements

1. **Score transfer arithmetic**
   - Verify self-draw: winner +3x, others -1x
   - Verify discard: winner +1x, discarder -1x
   - Verify zero-sum after each transfer

2. **Turn order after HU**
   - Verify self-draw: winner's next seat
   - Verify discard (adjacent): discarder's next seat == winner's next seat
   - Verify discard (non-adjacent): discarder's next seat != winner's next seat

3. **Multi-HU settlement**
   - Verify seating order processing
   - Verify discarder pays sum of all fan_values
   - Verify each winner gets their own fan_value
   - Verify only last HU triggers draw

4. **Edge cases**
   - Negative scores allowed
   - Missing discard_player_id raises error
   - Multiple HU by same player across rounds (blood-battle)

5. **Architectural separation**
   - Gameplay logic testable without scoring
   - Zero-sum validation failure doesn't block turns

### Integration Test Requirements

1. **Full game flow**
   - Play game until HU, verify scores update
   - Verify blood-battle multi-win accumulation
   - Verify game continues after HU (not ended)

2. **Multi-HU end-to-end**
   - Construct scenario with 2-3 simultaneous HU responses
   - Verify all winners marked, scores correct
   - Verify turn order after multi-HU

See `tests/unit/test_hu_score_settlement.py` for complete test implementations.

---

## Implementation Checklist

- [ ] Add `skip_next_draw` parameter to `declare_action()`
- [ ] Implement fan calculation in HU branch (call `Scorer.calculate_score()`)
- [ ] Implement score transfer logic (self-draw vs discard)
- [ ] Call `verify_zero_sum()` after score transfer
- [ ] Fix turn order logic for discard HU (Issue #81)
- [ ] Add HU event logging with fan_count and score_change
- [ ] Add multi-HU detection in `process_responses()`
- [ ] Implement `_handle_multiple_hu()` method
- [ ] Implement seating-order sorting for multi-HU
- [ ] Write comprehensive unit tests
- [ ] Verify all existing tests still pass
- [ ] Manual integration test: play full game with HU
