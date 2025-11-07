# Data Model: FastAPI Backend Layer

**Feature**: 002-fastapi-backend
**Date**: 2025-11-06
**Purpose**: Define API-layer data structures (not game logic models which already exist in `src/mahjong/models`)

---

## Design Principles

1. **Thin Adapter**: API models map to/from existing `mahjong` library models
2. **No Duplication**: Reuse `GameState.to_dict_for_player()` for response filtering
3. **Pydantic V2**: Leverage FastAPI-native validation and serialization
4. **Explicit Contracts**: Every endpoint has typed request/response models

---

## Entity Definitions

### 1. GameSession (API Layer Storage)

**Purpose**: Wrapper around `GameState` adding metadata for lifecycle management

**Location**: `app/models.py` (new file)

```python
from dataclasses import dataclass
from datetime import datetime
from mahjong.models import GameState

@dataclass
class GameSession:
    """
    API-layer wrapper for GameState with lifecycle metadata.

    Attributes:
        game_id: UUID v4 identifier
        created_at: Timestamp for periodic cleanup (24-hour threshold)
        game_state: Core game logic state from mahjong library
    """
    game_id: str
    created_at: datetime
    game_state: GameState
```

**Relationships**:
- Contains: 1 `GameState` (from `mahjong.models`)
- Stored in: Global `GAMES: Dict[str, GameSession]`

**Lifecycle**:
- Created: On POST /games
- Updated: Never (immutable wrapper; only `game_state` field mutates)
- Deleted: Immediately on game end OR after 24 hours

---

### 2. Request Models (Pydantic)

**Location**: `app/schemas.py` (new file)

#### 2.1 CreateGameRequest

```python
from pydantic import BaseModel, Field
from typing import List, Optional

class CreateGameRequest(BaseModel):
    """
    Request body for POST /games.

    Optional Configuration:
        player_ids: Custom player IDs (must be exactly 4).
                    If omitted, generates ["human", "ai_1", "ai_2", "ai_3"].
    """
    player_ids: Optional[List[str]] = Field(
        None,
        min_length=4,
        max_length=4,
        description="List of 4 player IDs. Default: 1 human + 3 AI."
    )

    class Config:
        json_schema_extra = {
            "example": {
                "player_ids": ["alice", "ai_1", "ai_2", "ai_3"]
            }
        }
```

**Validation Rules**:
- `player_ids` optional; defaults to `["human", "ai_1", "ai_2", "ai_3"]`
- If provided, must be exactly 4 unique strings
- No other configuration supported (aligns with FR-001 "configurable players")

---

#### 2.2 PlayerActionRequest

```python
from pydantic import BaseModel, Field, field_validator
from typing import List, Literal, Optional

class TileInput(BaseModel):
    """Represents a mahjong tile in API requests."""
    suit: Literal["TONG", "TIAO", "WAN"] = Field(..., description="Tile suit")
    rank: int = Field(..., ge=1, le=9, description="Tile rank (1-9)")

class PlayerActionRequest(BaseModel):
    """
    Request body for POST /games/{game_id}/action.

    Action Types:
        - bury: Requires 3 tiles (埋牌阶段)
        - discard: Requires 1 tile (出牌)
        - peng/gang/hu: Requires tile from opponent's discard
        - skip: No tiles required
    """
    player_id: str = Field(..., description="ID of the player taking action")
    action: Literal["bury", "discard", "peng", "gang", "hu", "skip"] = Field(
        ..., description="Action type"
    )
    tiles: Optional[List[TileInput]] = Field(
        None, description="Tiles involved (required for bury/discard/peng/gang)"
    )

    @field_validator("tiles")
    @classmethod
    def validate_tiles_for_action(cls, v, info):
        action = info.data.get("action")
        if action == "bury" and (not v or len(v) != 3):
            raise ValueError("Bury action requires exactly 3 tiles")
        if action in ["discard"] and (not v or len(v) != 1):
            raise ValueError(f"{action} action requires exactly 1 tile")
        if action in ["skip"] and v:
            raise ValueError("Skip action should not include tiles")
        return v

    class Config:
        json_schema_extra = {
            "examples": [
                {
                    "player_id": "human",
                    "action": "bury",
                    "tiles": [
                        {"suit": "TONG", "rank": 1},
                        {"suit": "TONG", "rank": 2},
                        {"suit": "TONG", "rank": 3}
                    ]
                },
                {
                    "player_id": "human",
                    "action": "discard",
                    "tiles": [{"suit": "WAN", "rank": 5}]
                },
                {
                    "player_id": "human",
                    "action": "skip",
                    "tiles": None
                }
            ]
        }
```

**Validation Rules**:
- `player_id`: Must match a player in the game
- `action`: Enum constrained to valid actions
- `tiles`: Count validated based on action type
- Tile suit/rank constraints enforced by `TileInput`

**Conversion to mahjong.models.Tile**:
```python
from mahjong.models import Tile
from mahjong.constants import Suit

def to_tile(tile_input: TileInput) -> Tile:
    return Tile(suit=Suit[tile_input.suit], rank=tile_input.rank)
```

---

### 3. Response Models (Pydantic)

#### 3.1 CreateGameResponse

```python
class CreateGameResponse(BaseModel):
    """
    Response for POST /games.

    Returns:
        game_id: UUID for subsequent API calls
        state: Initial game state (filtered for human player)
    """
    game_id: str = Field(..., description="UUID v4 identifier")
    state: dict = Field(..., description="Initial game state (burying phase)")

    class Config:
        json_schema_extra = {
            "example": {
                "game_id": "550e8400-e29b-41d4-a716-446655440000",
                "state": {
                    "game_phase": "BURYING",
                    "current_player_index": 0,
                    "players": [
                        {
                            "id": "human",
                            "hand": [...],  # Full hand visible
                            "melds": [],
                            "score": 100
                        },
                        {
                            "id": "ai_1",
                            "hand_count": 13,  # Hidden for AI
                            "melds": [],
                            "score": 100
                        }
                        # ... ai_2, ai_3
                    ],
                    "public_discards": [],
                    "wall_remaining_count": 92  # 136 total - 14 dealer - 13*3 others
                }
            }
        }
```

---

#### 3.2 GameStateResponse

```python
class GameStateResponse(BaseModel):
    """
    Response for GET /games/{game_id} and POST /games/{game_id}/action.

    Returns filtered view based on `player_id` query parameter.
    Reuses `GameState.to_dict_for_player()` output.
    """
    game_id: str = Field(..., description="Game UUID")
    game_phase: Literal["BURYING", "PLAYING", "ENDED"] = Field(
        ..., description="Current game phase"
    )
    current_player_index: int = Field(..., description="Index of current turn player (0-3)")
    players: List[dict] = Field(..., description="Player states (filtered by viewer)")
    public_discards: List[dict] = Field(..., description="All discarded tiles (public)")
    wall_remaining_count: int = Field(..., description="Tiles left in wall")
    winners: Optional[List[dict]] = Field(None, description="Win details if game ended")

    class Config:
        json_schema_extra = {
            "example": {
                "game_id": "550e8400-e29b-41d4-a716-446655440000",
                "game_phase": "PLAYING",
                "current_player_index": 2,
                "players": [...],
                "public_discards": [...],
                "wall_remaining_count": 45,
                "winners": None  # or [{player_id, fan, score}] if ended
            }
        }
```

**Filtering Logic** (delegated to `GameState.to_dict_for_player()`):
- Requesting player: sees own full hand
- Other players: sees `hand_count` instead of `hand`
- All players: see `melds` (明牌), `buried_cards`, `score`

---

#### 3.3 ErrorResponse

```python
class ErrorResponse(BaseModel):
    """
    Standard error response (FastAPI default format).

    Automatically generated by HTTPException.
    """
    detail: str = Field(..., description="Human-readable error message")

    class Config:
        json_schema_extra = {
            "examples": [
                {"detail": "Game not found"},
                {"detail": "Invalid action: cannot discard tile not in hand"},
                {"detail": "Game state changed, please refresh and retry"},
                {"detail": "AI execution timeout after 5 seconds"}
            ]
        }
```

---

## Data Flow Examples

### Example 1: Create Game

**Request**:
```http
POST /games
Content-Type: application/json

{}  # Empty body uses defaults
```

**Process**:
1. Generate `game_id = str(uuid.uuid4())`
2. Call `GameManager.create_game(["human", "ai_1", "ai_2", "ai_3"])`
3. Call `GameManager.start_game(game_state)`  # Deals cards
4. Create `GameSession(game_id, datetime.now(), game_state)`
5. Store in `GAMES[game_id]`
6. Return `CreateGameResponse` with filtered state

**Response**:
```json
{
  "game_id": "550e8400-...",
  "state": { "game_phase": "BURYING", ... }
}
```

---

### Example 2: Submit Action (Bury)

**Request**:
```http
POST /games/550e8400-.../action
Content-Type: application/json

{
  "player_id": "human",
  "action": "bury",
  "tiles": [
    {"suit": "TONG", "rank": 1},
    {"suit": "TONG", "rank": 2},
    {"suit": "TONG", "rank": 3}
  ]
}
```

**Process**:
1. Validate game exists (`GAMES[game_id]`)
2. Convert `TileInput[]` → `Tile[]`
3. Call `PlayerActions.bury_cards(game_state, "human", tiles)`
4. Run `execute_ai_turns()` with 5-second timeout
5. Check if game ended → remove from `GAMES` if phase=ENDED
6. Return updated state

**Response**:
```json
{
  "game_id": "550e8400-...",
  "game_phase": "PLAYING",  # All players buried
  "current_player_index": 0,
  ...
}
```

---

### Example 3: Query State

**Request**:
```http
GET /games/550e8400-...?player_id=human
```

**Process**:
1. Lookup `session = GAMES[game_id]`
2. Call `session.game_state.to_dict_for_player("human")`
3. Wrap in `GameStateResponse`

**Response**:
```json
{
  "game_id": "550e8400-...",
  "game_phase": "PLAYING",
  "players": [
    {
      "id": "human",
      "hand": [...],  # Full hand
      ...
    },
    {
      "id": "ai_1",
      "hand_count": 10,  # Hidden
      ...
    }
  ]
}
```

---

## Validation Summary

| Field | Validation | Error if Violated |
|-------|------------|-------------------|
| `player_ids` | Length=4, unique | 400 "Must provide exactly 4 unique player IDs" |
| `action` | Enum[bury, discard, ...] | 422 Pydantic validation error |
| `tiles` (bury) | Length=3 | 400 "Bury requires exactly 3 tiles" |
| `tiles` (discard) | Length=1 | 400 "Discard requires exactly 1 tile" |
| `tile.suit` | Enum[TONG, TIAO, WAN] | 422 Pydantic validation error |
| `tile.rank` | 1-9 | 422 Pydantic validation error |
| `game_id` | Exists in GAMES | 404 "Game not found" |

**422 vs 400 Distinction**:
- 422 (Unprocessable Entity): Pydantic validation failures (malformed JSON, wrong types)
- 400 (Bad Request): Business logic validation (game rules, action constraints)

---

## State Transitions

```
GameSession Lifecycle:
┌──────────┐  POST /games   ┌──────────┐
│ Not      │─────────────────→│ BURYING  │
│ Exists   │                 │ (phase)  │
└──────────┘                 └──────────┘
                                   │
                                   │ All players bury
                                   ↓
                             ┌──────────┐
                             │ PLAYING  │
                             │ (phase)  │
                             └──────────┘
                                   │
                                   │ 3 wins OR draw
                                   ↓
                             ┌──────────┐  Immediate cleanup
                             │ ENDED    │─────────────────→ Deleted from GAMES
                             │ (phase)  │
                             └──────────┘
                                   │
                                   │ OR after 24h (periodic cleanup)
                                   ↓
                             ┌──────────┐
                             │ Deleted  │
                             └──────────┘
```

**Cleanup Triggers**:
1. **Immediate**: When `game_state.game_phase == GamePhase.ENDED`
2. **Periodic**: Hourly task removes games where `(now - created_at) > 24h`

---

## Dependencies on Existing Models

**From `mahjong.models` (already implemented)**:
- `GameState`: Core game state (used inside `GameSession`)
- `Player`: Player state (accessed via `game_state.players`)
- `Tile`: Mahjong tile (converted from `TileInput`)
- `Meld`: Peng/Gang combinations (exposed in filtered state)

**Conversion Functions Needed**:
```python
# app/converters.py
from mahjong.models import Tile
from mahjong.constants import Suit
from app.schemas import TileInput

def to_tile(tile_input: TileInput) -> Tile:
    return Tile(suit=Suit[tile_input.suit], rank=tile_input.rank)

def tiles_from_request(tiles: List[TileInput]) -> List[Tile]:
    return [to_tile(t) for t in tiles]
```

---

## API Models File Structure

```
app/
├── __init__.py
├── models.py          # GameSession (dataclass)
├── schemas.py         # Pydantic request/response models
└── converters.py      # TileInput → Tile conversion
```

**No ORM, No Database Models**: All models are transient in-memory structures.
