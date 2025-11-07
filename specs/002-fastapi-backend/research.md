# Research: FastAPI Backend Layer

**Feature**: 002-fastapi-backend
**Date**: 2025-11-06
**Purpose**: Resolve technical unknowns and establish implementation patterns

---

## Research Tasks

### 1. FastAPI Request Timeout Implementation

**Question**: How to implement 5-second timeout for AI execution without blocking the event loop?

**Decision**: Use `asyncio.wait_for()` with timeout parameter

**Rationale**:
- FastAPI is built on `asyncio`, making `asyncio.wait_for()` the native solution
- Provides clean exception handling via `asyncio.TimeoutError`
- No external dependencies required (part of Python stdlib)
- Allows graceful state rollback on timeout

**Implementation Pattern**:
```python
import asyncio

async def execute_ai_turns(game_state, human_player_id):
    try:
        await asyncio.wait_for(
            _run_ai_logic(game_state, human_player_id),
            timeout=5.0
        )
    except asyncio.TimeoutError:
        # Rollback state and raise 500
        raise HTTPException(
            status_code=500,
            detail="AI execution timeout"
        )
```

**Alternatives Considered**:
- `threading.Timer`: Rejected - doesn't integrate with async/await
- `signal.alarm`: Rejected - not supported on Windows, conflicts with async
- Third-party libraries (timeout-decorator): Rejected - adds unnecessary dependency

---

### 2. UUID v4 Generation Best Practices

**Question**: Should we use Python's uuid module or external libraries? How to ensure uniqueness?

**Decision**: Use `uuid.uuid4()` from Python standard library

**Rationale**:
- Part of Python stdlib (no external dependency)
- Cryptographically secure random numbers via `os.urandom()`
- 122 bits of randomness (collision probability ~10^-36 for 1 billion games)
- Simple API: `str(uuid.uuid4())`

**Implementation Pattern**:
```python
import uuid

def create_game_id() -> str:
    return str(uuid.uuid4())  # Returns format: "550e8400-e29b-41d4-a716-446655440000"
```

**Collision Handling**:
- No explicit collision detection needed (probability negligible)
- If collision occurs (astronomically unlikely), subsequent operation will fail with existing game_id validation

**Alternatives Considered**:
- Sequential integers: Rejected - predictable, enumerable (security risk)
- `shortuuid`: Rejected - adds dependency for marginal benefit (shorter IDs)
- `secrets.token_urlsafe()`: Rejected - not standard UUID format, complicates debugging

---

### 3. In-Memory Game State Storage Pattern

**Question**: What data structure provides O(1) lookup while supporting periodic cleanup?

**Decision**: Dict with wrapper class for timestamp tracking

**Rationale**:
- Native Python `dict` provides O(1) get/set/delete
- Wrapper adds creation timestamp without modifying GameState
- Supports both immediate cleanup (on game end) and periodic cleanup (background task)

**Implementation Pattern**:
```python
from dataclasses import dataclass
from datetime import datetime
from typing import Dict

@dataclass
class GameSession:
    game_state: GameState
    created_at: datetime

# Global storage
GAMES: Dict[str, GameSession] = {}

# Immediate cleanup
def remove_game(game_id: str):
    GAMES.pop(game_id, None)

# Periodic cleanup (background task)
async def cleanup_old_games():
    while True:
        await asyncio.sleep(3600)  # Every hour
        now = datetime.now()
        expired = [
            gid for gid, session in GAMES.items()
            if (now - session.created_at).total_seconds() > 86400  # 24 hours
        ]
        for gid in expired:
            GAMES.pop(gid, None)
            logger.info(f"Cleaned up expired game: {gid}")
```

**Alternatives Considered**:
- `cachetools.TTLCache`: Rejected - adds dependency, automatic expiry conflicts with "immediate cleanup on end" requirement
- SQLite in-memory: Rejected - over-engineered for simple key-value storage
- Redis: Rejected - requires external service, violates "single-machine deployment" constraint

---

### 4. AI Decision Logic Architecture

**Question**: Where should AI decision logic live? Inline in API or separate module?

**Decision**: Separate `app/ai.py` module with simple rule-based functions

**Rationale**:
- Keeps API layer thin (constitution principle: "No business logic in API layer")
- Enables unit testing of AI logic independently
- Clear separation: `api.py` (routing) → `ai.py` (decisions) → `mahjong/services` (game rules)
- Future extensibility: can swap rule-based AI with ML model without changing API

**Implementation Pattern**:
```python
# app/ai.py
from mahjong.models import Player, Tile, GameState
from mahjong.constants import Suit

def choose_bury_tiles(player: Player) -> List[Tile]:
    """Choose 3 tiles from least common suit."""
    suit_counts = {suit: 0 for suit in Suit}
    for tile in player.hand:
        suit_counts[tile.suit] += 1

    min_suit = min(suit_counts, key=suit_counts.get)
    return [t for t in player.hand if t.suit == min_suit][:3]

def choose_discard_tile(player: Player) -> Tile:
    """Priority: missing suit > lone tiles > safe tiles."""
    # Check for missing suit tiles first
    missing_tiles = [t for t in player.hand if t.suit == player.missing_suit]
    if missing_tiles:
        return missing_tiles[0]

    # Find lone tiles (no adjacent ranks)
    # ... (simple heuristic logic)

    return player.hand[0]  # Fallback: first tile

def choose_response(player: Player, discarded_tile: Tile, game_state: GameState) -> str:
    """Priority: hu > gang > peng > skip."""
    from mahjong.services import WinChecker

    # Check if can win
    if WinChecker.is_hu(player, discarded_tile):
        return "hu"

    # Check if can kong
    if sum(1 for t in player.hand if t == discarded_tile) == 3:
        return "gang"

    # Check if can peng
    if sum(1 for t in player.hand if t == discarded_tile) == 2:
        return "peng"

    return "skip"
```

**Alternatives Considered**:
- Inline in API routes: Rejected - violates thin adapter principle, hard to test
- Inside `mahjong/services`: Rejected - pollutes game logic library with AI heuristics
- Separate microservice: Rejected - over-engineered for synchronous single-machine deployment

---

### 5. FastAPI Background Tasks for Cleanup

**Question**: How to run hourly cleanup without blocking request handling?

**Decision**: Use FastAPI's `@app.on_event("startup")` with `asyncio.create_task()`

**Rationale**:
- Native FastAPI lifecycle management
- Non-blocking: cleanup runs in background while serving requests
- Graceful shutdown: FastAPI cancels tasks on shutdown
- No external job scheduler needed (APScheduler, Celery)

**Implementation Pattern**:
```python
from fastapi import FastAPI
import asyncio

app = FastAPI()

@app.on_event("startup")
async def start_cleanup_task():
    asyncio.create_task(cleanup_old_games())

async def cleanup_old_games():
    while True:
        try:
            await asyncio.sleep(3600)  # 1 hour
            # Cleanup logic here
        except asyncio.CancelledError:
            logger.info("Cleanup task cancelled")
            break
```

**Alternatives Considered**:
- APScheduler: Rejected - adds dependency for single periodic task
- Celery: Rejected - requires Redis/RabbitMQ, massive overkill
- cron job: Rejected - requires external process, doesn't integrate with application state

---

### 6. HTTP Error Response Format

**Question**: What JSON structure for error responses? Should we use FastAPI's default or custom?

**Decision**: Use FastAPI's default `HTTPException` with consistent `detail` format

**Rationale**:
- FastAPI automatically formats HTTPException as `{"detail": "message"}`
- Consistent with OpenAPI/Swagger docs auto-generation
- Simple client parsing (single field)
- No custom exception handler needed

**Implementation Pattern**:
```python
from fastapi import HTTPException

# 404 - Game not found
raise HTTPException(status_code=404, detail="Game not found")

# 400 - Invalid action
raise HTTPException(
    status_code=400,
    detail=f"Invalid action: cannot discard {tile} in phase {phase}"
)

# 409 - Concurrent modification
raise HTTPException(
    status_code=409,
    detail="Game state changed, please refresh and retry"
)

# 500 - AI timeout
raise HTTPException(
    status_code=500,
    detail="AI execution timeout after 5 seconds"
)
```

**Error Logging Pattern**:
```python
try:
    game_state = PlayerActions.discard_tile(...)
except InvalidActionError as e:
    logger.error(f"Invalid action for game {game_id}: {e}")
    raise HTTPException(status_code=400, detail=str(e))
except Exception as e:
    logger.exception(f"Unexpected error in game {game_id}: {e}")
    raise HTTPException(status_code=500, detail="Internal server error")
```

**Alternatives Considered**:
- Custom error response format (e.g., `{error: {...}, code: "..."})`): Rejected - over-engineered, breaks FastAPI conventions
- Include stack traces in response: Rejected - security risk, already logged server-side
- Problem Details (RFC 7807): Rejected - adds complexity with minimal benefit for MVP

---

### 7. Pydantic Models for Request/Response Validation

**Question**: Should we define Pydantic models or use plain dicts for API contracts?

**Decision**: Use Pydantic v2 models for all request/response bodies

**Rationale**:
- FastAPI integrates deeply with Pydantic (auto-validation, OpenAPI docs)
- Compile-time type safety with mypy
- Automatic JSON serialization/deserialization
- Self-documenting: field descriptions appear in Swagger UI
- FastAPI dependency (already installed)

**Implementation Pattern**:
```python
from pydantic import BaseModel, Field
from typing import List, Literal

class CreateGameRequest(BaseModel):
    player_ids: List[str] | None = Field(
        None,
        description="List of player IDs. If not provided, generates 1 human + 3 AI."
    )

class PlayerActionRequest(BaseModel):
    player_id: str = Field(..., description="ID of the player taking action")
    action: Literal["bury", "discard", "peng", "gang", "hu", "skip"] = Field(
        ..., description="Type of action"
    )
    tiles: List[dict] | None = Field(
        None, description="Tiles involved in action (suit + rank)"
    )

class GameStateResponse(BaseModel):
    game_id: str
    game_phase: str
    current_player_index: int
    players: List[dict]
    public_discards: List[dict]
    wall_remaining_count: int

    class Config:
        json_schema_extra = {
            "example": {
                "game_id": "550e8400-e29b-41d4-a716-446655440000",
                "game_phase": "BURYING",
                "current_player_index": 0,
                "players": [...],
                # ...
            }
        }
```

**Alternatives Considered**:
- Plain dicts with manual validation: Rejected - error-prone, no auto-docs
- dataclasses: Rejected - no runtime validation, manual serialization
- marshmallow: Rejected - not FastAPI-native, redundant with Pydantic

---

## Summary of Decisions

| Topic | Decision | Key Rationale |
|-------|----------|---------------|
| AI Timeout | `asyncio.wait_for()` | Native async support, no dependencies |
| UUID Generation | `uuid.uuid4()` | Stdlib, 122-bit randomness, secure |
| State Storage | `Dict[str, GameSession]` | O(1) lookup, supports timestamp tracking |
| AI Logic Location | Separate `app/ai.py` | Thin API layer, testable, extensible |
| Periodic Cleanup | FastAPI startup + `asyncio.create_task()` | Native lifecycle, non-blocking |
| Error Format | FastAPI `HTTPException` | Standard, auto-docs, simple |
| Request/Response Models | Pydantic v2 | FastAPI-native, validation, type safety |

**No External Runtime Dependencies Beyond**:
- FastAPI (framework)
- Uvicorn (ASGI server)
- Pydantic (included with FastAPI)

**Development Dependencies Only**:
- httpx (for integration tests)
- pytest (already in project)

---

## Open Questions Resolved

All technical unknowns identified in plan.md Technical Context have been resolved. Implementation can proceed to Phase 1 (Design & Contracts).
