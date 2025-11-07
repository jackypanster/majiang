# Quickstart: FastAPI Backend Development

**Feature**: 002-fastapi-backend
**Purpose**: Get the FastAPI backend running locally in <5 minutes

---

## Prerequisites

- ✅ Python 3.8+ installed
- ✅ `uv` package manager installed ([instructions](https://github.com/astral-sh/uv))
- ✅ Existing `src/mahjong` library (already implemented)

---

## 1. Install Dependencies

```bash
# Add FastAPI dependencies to pyproject.toml
uv pip install fastapi uvicorn[standard] httpx
```

**What gets installed**:
- `fastapi`: Web framework
- `uvicorn[standard]`: ASGI server with auto-reload
- `httpx`: HTTP client for integration tests

---

## 2. Create Project Structure

```bash
# Create app directory
mkdir -p app
touch app/__init__.py app/main.py app/api.py app/ai.py app/models.py app/schemas.py app/converters.py

# Create integration tests
mkdir -p tests/api
touch tests/api/__init__.py tests/api/test_game_creation.py
```

**Directory layout**:
```
app/
├── __init__.py
├── main.py       # FastAPI app + startup/shutdown
├── api.py        # Route handlers
├── ai.py         # AI decision logic
├── models.py     # GameSession dataclass
├── schemas.py    # Pydantic request/response models
└── converters.py # TileInput → Tile conversion

tests/api/
├── __init__.py
└── test_game_creation.py
```

---

## 3. Minimal Working Example

### `app/main.py` (FastAPI Application)

```python
from fastapi import FastAPI
import asyncio
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

app = FastAPI(
    title="血战到底麻将 Backend",
    description="FastAPI HTTP backend for Blood Battle Mahjong",
    version="1.0.0"
)

# Global game storage
GAMES: dict = {}

# Import routes
from app.api import router
app.include_router(router)

@app.on_event("startup")
async def startup_event():
    """Start background cleanup task."""
    asyncio.create_task(cleanup_old_games())
    logging.info("FastAPI backend started")

async def cleanup_old_games():
    """Periodic cleanup of games older than 24 hours."""
    from datetime import datetime, timedelta

    while True:
        try:
            await asyncio.sleep(3600)  # Every hour
            now = datetime.now()
            expired = [
                gid for gid, session in GAMES.items()
                if (now - session.created_at) > timedelta(hours=24)
            ]
            for gid in expired:
                GAMES.pop(gid, None)
                logging.info(f"Cleaned up expired game: {gid}")
        except asyncio.CancelledError:
            logging.info("Cleanup task cancelled")
            break

@app.get("/")
async def root():
    return {
        "message": "血战到底麻将 Backend API",
        "docs": "/docs",
        "active_games": len(GAMES)
    }
```

### `app/models.py` (GameSession)

```python
from dataclasses import dataclass
from datetime import datetime
from mahjong.models import GameState

@dataclass
class GameSession:
    """API-layer wrapper for GameState."""
    game_id: str
    created_at: datetime
    game_state: GameState
```

### `app/api.py` (Route Handlers - Stub)

```python
from fastapi import APIRouter, HTTPException
from datetime import datetime
import uuid
import logging

from mahjong.services import GameManager
from app.models import GameSession
import app.main as main_module

router = APIRouter(prefix="/games", tags=["games"])
logger = logging.getLogger(__name__)

@router.post("")
async def create_game():
    """Create new game with default players."""
    try:
        # Generate game ID
        game_id = str(uuid.uuid4())

        # Create game using mahjong library
        player_ids = ["human", "ai_1", "ai_2", "ai_3"]
        game_state = GameManager.create_game(player_ids)
        game_state = GameManager.start_game(game_state)

        # Store session
        session = GameSession(game_id, datetime.now(), game_state)
        main_module.GAMES[game_id] = session

        logger.info(f"Created game {game_id} with players {player_ids}")

        # Return initial state
        state = game_state.to_dict_for_player("human")
        return {"game_id": game_id, "state": state}

    except Exception as e:
        logger.exception(f"Failed to create game: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/{game_id}")
async def get_game_state(game_id: str, player_id: str):
    """Query game state."""
    session = main_module.GAMES.get(game_id)
    if not session:
        raise HTTPException(status_code=404, detail="Game not found")

    state = session.game_state.to_dict_for_player(player_id)
    return {"game_id": game_id, **state}
```

---

## 4. Run the Server

```bash
# Start server with auto-reload
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Expected output**:
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     FastAPI backend started
INFO:     Application startup complete.
```

**Access points**:
- API root: http://localhost:8000/
- Interactive docs: http://localhost:8000/docs
- OpenAPI JSON: http://localhost:8000/openapi.json

---

## 5. Test Endpoints

### Using curl

```bash
# Create game
curl -X POST http://localhost:8000/games
# Returns: {"game_id": "...", "state": {...}}

# Query game state
curl "http://localhost:8000/games/{GAME_ID}?player_id=human"
```

### Using Swagger UI

1. Open http://localhost:8000/docs
2. Expand `POST /games`
3. Click "Try it out" → "Execute"
4. Copy `game_id` from response
5. Test `GET /games/{game_id}` with copied ID

---

## 6. Run Integration Tests

### Create Basic Test

`tests/api/test_game_creation.py`:
```python
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_create_game():
    """Test game creation returns valid ID and initial state."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post("/games")

        assert response.status_code == 200
        data = response.json()

        # Verify game_id exists and is UUID format
        assert "game_id" in data
        assert len(data["game_id"]) == 36  # UUID format

        # Verify initial state
        assert "state" in data
        state = data["state"]
        assert state["game_phase"] == "BURYING"
        assert len(state["players"]) == 4
        assert state["current_player_index"] == 0

@pytest.mark.asyncio
async def test_get_game_state():
    """Test querying game state after creation."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Create game
        create_resp = await client.post("/games")
        game_id = create_resp.json()["game_id"]

        # Query state
        get_resp = await client.get(f"/games/{game_id}?player_id=human")

        assert get_resp.status_code == 200
        state = get_resp.json()
        assert state["game_id"] == game_id
        assert state["game_phase"] == "BURYING"
```

### Run Tests

```bash
uv run pytest tests/api/ -v
```

**Expected output**:
```
tests/api/test_game_creation.py::test_create_game PASSED
tests/api/test_game_creation.py::test_get_game_state PASSED
==================== 2 passed in 0.15s ====================
```

---

## 7. Development Workflow

### Hot Reload

With `--reload` flag, the server automatically restarts on file changes:

1. Edit `app/api.py`
2. Save file
3. Server detects change and reloads
4. Test new endpoint immediately

### Logging

All logs appear in terminal with timestamps:

```
2025-11-06 12:34:56 - app.api - INFO - Created game 550e8400-... with players ['human', 'ai_1', 'ai_2', 'ai_3']
```

### Debugging

Add breakpoints using `import pdb; pdb.set_trace()` in route handlers for interactive debugging.

---

## 8. Next Steps

Once basic endpoints work:

1. **Implement action endpoint** (`POST /games/{game_id}/action`)
   - Add Pydantic request validation (`app/schemas.py`)
   - Add tile conversion logic (`app/converters.py`)
   - Call `PlayerActions` services

2. **Implement AI logic** (`app/ai.py`)
   - `choose_bury_tiles()`
   - `choose_discard_tile()`
   - `choose_response()`
   - `execute_ai_turns()` with timeout

3. **Add comprehensive tests**
   - Test full game flow (bury → discard → win)
   - Test error cases (404, 400, 409, 500)
   - Test AI timeout handling

4. **Document API**
   - Add Pydantic model examples
   - Add OpenAPI descriptions
   - Update README with deployment instructions

---

## Troubleshooting

### Port already in use

```bash
# Use different port
uv run uvicorn app.main:app --reload --port 8001
```

### Import errors

```bash
# Ensure you're in project root
cd /path/to/majiang

# Verify mahjong library is importable
uv run python -c "from mahjong.services import GameManager; print('OK')"
```

### Tests fail with "app not found"

```bash
# Run tests from project root with explicit PYTHONPATH
PYTHONPATH=. uv run pytest tests/api/
```

---

## Performance Checklist

Before deploying:

- [ ] Response times: Create game <2s, Action <5s, Query <500ms
- [ ] Test with 10 concurrent games
- [ ] Verify cleanup task removes old games
- [ ] Check logs for errors during AI execution
- [ ] Test edge cases (non-existent game_id, invalid actions)

---

## Production Deployment (Future)

```bash
# Install production ASGI server
uv pip install gunicorn

# Run with multiple workers
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

For now, `uvicorn` with single worker is sufficient for single-machine deployment.
