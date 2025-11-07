# Implementation Plan: FastAPI HTTP Backend Layer

**Branch**: `002-fastapi-backend` | **Date**: 2025-11-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-fastapi-backend/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement a thin FastAPI HTTP adapter layer that provides REST endpoints for the existing麻将 game logic library. The backend handles game session management, player action submission, and automatic AI turn execution for a single-player (1 human + 3 AI) blood battle mahjong game. All game state is stored in-memory with automatic cleanup. Target response times: <2s for game creation, <5s for actions (including AI execution), <500ms for state queries.

**Primary Technologies**: FastAPI (routing), Uvicorn (ASGI server), Python asyncio (AI timeout), Python stdlib (UUID, logging, datetime)

## Technical Context

**Language/Version**: Python 3.8+ (required for modern dataclass support, already in project)
**Primary Dependencies**:
- FastAPI 0.104+ (HTTP routing, OpenAPI docs)
- Uvicorn[standard] (ASGI server with hot reload)
- httpx (integration testing with AsyncClient)
- Pydantic v2 (included with FastAPI - request/response validation)

**Storage**: In-memory only (dict-based `GAMES: Dict[str, GameSession]`, no database)
**Testing**: pytest with httpx.AsyncClient for API integration tests; existing pytest suite for game logic (108 tests)
**Target Platform**: Single-machine deployment (macOS/Linux server, localhost development)
**Project Type**: Web backend (adds `app/` directory to existing single-project structure)
**Performance Goals**:
- Game creation: <2 seconds (FR-001 via SC-001)
- Action processing (including AI execution): <5 seconds (FR-007, FR-008 via SC-002)
- State query: <500ms (SC-005)
- AI execution timeout: 5 seconds hard limit (FR-018)

**Constraints**:
- Synchronous AI execution (no WebSockets, no async AI polling) - FR-013
- No database (in-memory only) - FR-010, Constraint "No Database"
- Thin adapter (no business logic duplication) - Constraint "Minimal Abstraction"
- Single human player per game - Assumption #2
- No authentication - Assumption #5

**Scale/Scope**:
- Concurrent games: <100 (single-machine, assumption #1)
- Players per game: Fixed at 4 (1 human + 3 AI)
- Endpoints: 3 (POST /games, GET /games/{id}, POST /games/{id}/action)
- Game session lifetime: Until ended OR 24 hours (FR-019, FR-020)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ PASS - All Principles Satisfied

#### I. Simplicity First
- ✅ API routes are simple functions (<20 lines per handler)
- ✅ AI logic uses straightforward rule-based decisions (no ML complexity)
- ✅ Storage: plain dict (no ORM, no caching library)
- ✅ Pydantic models replace manual validation (Pythonic)

#### II. Test-First (NON-NEGOTIABLE)
- ✅ Integration tests use httpx.AsyncClient (real HTTP calls to FastAPI app)
- ✅ Tests use real GameState from mahjong library (no mocks)
- ✅ Test structure: `tests/api/test_*.py` (follows existing pattern)

#### III. Library-First Architecture
- ✅ `src/mahjong/` remains untouched (zero API dependencies)
- ✅ `app/` layer only maps HTTP → services (thin adapter)
- ✅ Clear boundaries: HTTP (app/api.py) → AI decisions (app/ai.py) → Game logic (src/mahjong/services)

#### IV. Fast-Fail Error Handling
- ✅ HTTPException for business errors (404, 400, 409, 500 with semantic codes)
- ✅ Error messages include context: game_id, player_id, action, reason (FR-009, FR-017)
- ✅ Logging at key operations: game creation, actions, AI decisions, errors (FR-016)
- ✅ Format: `logger.info(f"Game {game_id}: Player {player_id} {action} {tile}")`

#### V. Domain Model Integrity
- ✅ All game rules handled by `src/mahjong/services` (already PRD-compliant)
- ✅ API layer does not modify or interpret game rules
- ✅ Zero-sum verification delegated to GameState.verify_zero_sum()

### Technical Standards Compliance

**✅ Dependencies**: FastAPI + Uvicorn + httpx (3 external deps for API layer, zero for mahjong library)
**✅ Code Structure**: Adds app/ layer (API adapter) without modifying src/mahjong/ (models/services)
**✅ Observability**: Uses Python logging module, logs at INFO/ERROR levels (FR-016)
**✅ Naming**: Functions use verb-noun (create_game, execute_ai_turns), files match primary class

---

## Project Structure

### Documentation (this feature)

```text
specs/002-fastapi-backend/
├── spec.md              # Feature specification (input to /speckit.plan)
├── plan.md              # This file (output of /speckit.plan)
├── research.md          # Phase 0 - Technical decisions and patterns
├── data-model.md        # Phase 1 - API models and data flow
├── quickstart.md        # Phase 1 - Developer setup guide
├── contracts/           # Phase 1 - API contracts
│   └── openapi.yaml     # OpenAPI 3.1 specification
└── tasks.md             # Phase 2 - Implementation tasks (/speckit.tasks - NOT created yet)
```

### Source Code (repository root)

```text
app/                     # NEW: FastAPI HTTP adapter layer
├── __init__.py
├── main.py              # FastAPI app + GAMES dict + startup/shutdown
├── api.py               # Route handlers (POST /games, GET /games/{id}, POST /games/{id}/action)
├── ai.py                # AI decision logic (choose_bury, choose_discard, choose_response, execute_ai_turns)
├── models.py            # GameSession dataclass (wrapper for GameState + metadata)
├── schemas.py           # Pydantic request/response models (CreateGameRequest, PlayerActionRequest, etc.)
└── converters.py        # TileInput → Tile conversion utilities

src/mahjong/             # EXISTING: Core game logic library (UNCHANGED)
├── models/              # GameState, Player, Tile, Meld, PlayerResponse
├── services/            # GameManager, PlayerActions, WinChecker, Scorer
├── constants/           # Enums (GamePhase, ActionType, Suit, MeldType)
└── exceptions/          # InvalidActionError, InvalidGameStateError

tests/
├── unit/                # EXISTING: 108 tests for mahjong library (UNCHANGED)
│   ├── test_game_manager.py
│   ├── test_player_actions_*.py
│   ├── test_win_and_scoring.py
│   └── ...
└── api/                 # NEW: Integration tests for FastAPI layer
    ├── __init__.py
    ├── test_game_creation.py      # POST /games, GET /games/{id}
    ├── test_player_actions.py     # POST /games/{id}/action (bury, discard)
    ├── test_ai_execution.py       # AI automatic turn execution
    ├── test_edge_cases.py         # 404, 400, 409, 500 error scenarios
    └── test_cleanup.py            # Game session cleanup (immediate + periodic)
```

**Structure Decision**: Extended existing single-project structure with new `app/` directory for HTTP layer. This maintains library-first architecture (constitution principle III) where `src/mahjong/` remains a pure library with zero external dependencies, and `app/` provides a thin HTTP adapter on top.

---

## Complexity Tracking

*No constitution violations detected - no justification required.*

All design decisions align with simplicity-first principle and three-layer architecture (Models → Services → API).

---

## Phase 0: Research (Completed)

**Status**: ✅ Complete
**Output**: [research.md](./research.md)

### Key Decisions

| Topic | Decision | Rationale |
|-------|----------|-----------|
| AI Timeout Implementation | `asyncio.wait_for()` with 5s timeout | Native async support, no dependencies |
| UUID Generation | `uuid.uuid4()` from stdlib | Secure (122-bit randomness), unpredictable |
| State Storage | `Dict[str, GameSession]` | O(1) lookup, supports timestamp tracking |
| AI Logic Location | Separate `app/ai.py` module | Thin API layer, testable, extensible |
| Background Cleanup | `@app.on_event("startup")` + `asyncio.create_task()` | FastAPI-native, non-blocking |
| Error Response Format | FastAPI `HTTPException` | Standard format, auto-docs, simple client parsing |
| Request/Response Validation | Pydantic v2 models | FastAPI-native, type safety, auto validation/docs |

**No external runtime dependencies beyond**: FastAPI, Uvicorn, Pydantic (included with FastAPI)

**Development dependencies only**: httpx (testing), pytest (already in project)

---

## Phase 1: Design & Contracts (Completed)

**Status**: ✅ Complete
**Outputs**:
- [data-model.md](./data-model.md) - API models and data flow
- [contracts/openapi.yaml](./contracts/openapi.yaml) - OpenAPI 3.1 spec
- [quickstart.md](./quickstart.md) - Developer setup guide

### Data Model Summary

#### API-Layer Entities

1. **GameSession** (Python dataclass)
   - Wraps `GameState` with metadata (`game_id`, `created_at`)
   - Stored in `GAMES: Dict[str, GameSession]`
   - Lifecycle: Created → Playing → Ended (auto-cleanup) OR 24h timeout

2. **Pydantic Request Models**
   - `CreateGameRequest`: Optional `player_ids` (defaults to ["human", "ai_1", "ai_2", "ai_3"])
   - `PlayerActionRequest`: `player_id`, `action`, `tiles[]`
   - `TileInput`: Validated `suit` (enum) + `rank` (1-9)

3. **Pydantic Response Models**
   - `CreateGameResponse`: `game_id` + initial `state`
   - `GameStateResponse`: Filtered game state (uses `GameState.to_dict_for_player()`)
   - `ErrorResponse`: FastAPI standard `{"detail": "message"}`

#### Conversion Layer

`app/converters.py` provides `TileInput → Tile` conversion:
```python
def to_tile(tile_input: TileInput) -> Tile:
    return Tile(suit=Suit[tile_input.suit], rank=tile_input.rank)
```

### API Contract Summary

**Endpoints** (3 total):

1. `POST /games`
   - Creates game, deals cards, returns UUID + initial state
   - 200: Success, 400: Invalid player count

2. `GET /games/{game_id}?player_id={player_id}`
   - Returns filtered game state
   - 200: Success, 404: Game not found

3. `POST /games/{game_id}/action`
   - Processes action + executes AI turns automatically
   - 200: Success, 400: Invalid action, 404: Not found, 409: Conflict, 500: AI timeout/error

**HTTP Status Code Strategy** (from clarifications):
- 404: Game not found (never created or cleaned up)
- 400: Invalid action (wrong phase, illegal tiles, not your turn)
- 409: Concurrent modification conflict
- 500: AI execution timeout or unexpected AI error

**Complete OpenAPI spec**: See [contracts/openapi.yaml](./contracts/openapi.yaml) with all schemas and examples.

---

## Phase 2: Implementation Tasks

**Status**: ⏳ Pending - Generated by `/speckit.tasks` command

**Prerequisites before starting implementation**:
- ✅ All research questions resolved
- ✅ Data model defined
- ✅ API contracts specified
- ⏳ Task breakdown (run `/speckit.tasks` next)

**Estimated Implementation Phases** (from gap analysis):

1. **Phase 1 - Minimal Viable API** (5-7 hours)
   - Install dependencies (FastAPI, Uvicorn, httpx)
   - Create `app/` structure
   - Implement `POST /games` and `GET /games/{id}` endpoints
   - Basic integration tests

2. **Phase 2 - Player Actions** (3-4 hours)
   - Implement `POST /games/{id}/action` endpoint
   - Add Pydantic request validation
   - Add tile conversion logic
   - Test bury/discard flow

3. **Phase 3 - AI Execution** (4-6 hours)
   - Implement AI decision logic (`app/ai.py`)
   - Implement `execute_ai_turns()` with timeout
   - Handle state rollback on error/timeout
   - Test full 1 human + 3 AI game flow

4. **Phase 4 - Robustness** (2-3 hours)
   - Add game session cleanup (immediate + periodic)
   - Add comprehensive error handling (404/400/409/500)
   - Add logging at key operations
   - Performance validation (response time tests)

**Total Estimated Time**: 14-20 hours

---

## Testing Strategy

### Integration Tests (New - `tests/api/`)

**Test Categories**:

1. **Game Creation** (`test_game_creation.py`)
   - Create game with default players
   - Create game with custom players
   - Verify initial state (BURYING phase, 4 players)
   - Query state for different players (verify filtering)

2. **Player Actions** (`test_player_actions.py`)
   - Submit bury action (valid + invalid)
   - Submit discard action (valid + invalid)
   - Submit peng/gang/hu actions
   - Verify state updates after each action

3. **AI Execution** (`test_ai_execution.py`)
   - Verify AI executes after human action
   - Verify multiple AI turns execute automatically
   - Verify game state returns when human's turn again
   - Verify AI timeout handling (mock slow AI)

4. **Edge Cases** (`test_edge_cases.py`)
   - 404: Non-existent game_id
   - 400: Invalid action (wrong phase, invalid tiles, not your turn)
   - 409: Concurrent requests on same game
   - 500: AI execution timeout, AI invalid state

5. **Cleanup** (`test_cleanup.py`)
   - Verify game removed on ENDED phase
   - Verify periodic cleanup removes 24h+ games
   - Verify cleanup task starts on app startup

**Test Pattern** (using httpx.AsyncClient):
```python
@pytest.mark.asyncio
async def test_create_game():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post("/games")
        assert response.status_code == 200
        data = response.json()
        assert "game_id" in data
        assert data["state"]["game_phase"] == "BURYING"
```

### Unit Tests (Existing - `tests/unit/`)

**No changes required** - 108 existing tests for mahjong library remain unchanged and continue to provide core game logic coverage.

---

## Risk Mitigation

### Risk 1: AI Timeout Implementation

**Risk**: `asyncio.wait_for()` might not cancel AI execution cleanly, causing state corruption.

**Mitigation**:
- Test with intentionally slow AI (sleep in decision logic)
- Verify state rollback to pre-AI state on timeout
- Log timeout events as CRITICAL for investigation
- Add integration test: `test_ai_timeout_rollback()`

### Risk 2: Concurrent Request Handling

**Risk**: Multiple requests to same game_id could cause race conditions in state mutation.

**Mitigation**:
- Document assumption: single human player per game (no concurrent humans)
- Return 409 if game state changed between request arrival and processing
- Future enhancement: Add per-game lock if needed (not in MVP)

### Risk 3: Memory Leak from Unfinished Games

**Risk**: Games that never reach ENDED phase accumulate in memory.

**Mitigation**:
- Implement 24-hour cleanup task (FR-020)
- Add test: `test_periodic_cleanup_removes_old_games()`
- Add monitoring: log GAMES dict size on each cleanup cycle

### Risk 4: AI Decision Logic Bugs

**Risk**: AI makes invalid decisions, triggering InvalidActionError at runtime.

**Mitigation**:
- Extensive integration tests covering all AI decision paths
- Log all AI decisions with reasoning (FR-016)
- Catch InvalidActionError and return 500 (treat as critical bug)
- Add test: `test_ai_invalid_action_treated_as_500()`

---

## Development Workflow

### 1. Setup Environment

```bash
# Install dependencies
uv pip install fastapi uvicorn[standard] httpx

# Create app directory
mkdir -p app tests/api
```

### 2. Implement Incrementally

Follow quickstart.md for minimal working example, then expand:

1. ✅ Basic FastAPI app + health endpoint
2. ✅ POST /games (no AI)
3. ✅ GET /games/{id}
4. ✅ POST /games/{id}/action (human only)
5. ✅ AI decision logic
6. ✅ AI execution loop
7. ✅ Timeout handling
8. ✅ Cleanup tasks
9. ✅ Error handling (404/400/409/500)
10. ✅ Comprehensive tests

### 3. Testing Each Step

Run integration tests after each increment:
```bash
uv run pytest tests/api/test_game_creation.py -v
```

Ensure existing tests still pass:
```bash
uv run pytest tests/unit/ -v
```

### 4. Local Development

```bash
# Run server with hot reload
uv run uvicorn app.main:app --reload

# Access interactive docs
open http://localhost:8000/docs

# Run full test suite
uv run pytest -v
```

---

## Success Criteria Validation

**Before considering implementation complete, verify**:

- ✅ **SC-001**: Game creation responds in <2 seconds
- ✅ **SC-002**: Action processing (with AI) responds in <5 seconds
- ✅ **SC-003**: 100% of valid actions succeed without crashes (integration test coverage)
- ✅ **SC-004**: Invalid actions return errors in <1 second with clear messages
- ✅ **SC-005**: State queries respond in <500ms
- ✅ **SC-006**: AI executes automatically (no additional requests needed)
- ✅ **SC-007**: Zero-sum integrity maintained (existing GameState.verify_zero_sum())
- ✅ **SC-008**: Full game can be played end-to-end (integration test: `test_full_game_flow()`)

**Performance testing**:
```bash
# Use httpx or pytest-benchmark to measure response times
uv run pytest tests/api/ --benchmark-only
```

---

## Next Steps

1. **Run `/speckit.tasks`** to generate detailed implementation tasks (tasks.md)
2. **Review generated tasks** and adjust priorities if needed
3. **Begin implementation** following Phase 1 → Phase 2 → Phase 3 → Phase 4 sequence
4. **Run tests frequently** (after each task completion)
5. **Update documentation** if implementation reveals new patterns or constraints

---

## References

- **Feature Spec**: [spec.md](./spec.md) - Requirements and success criteria
- **Research**: [research.md](./research.md) - Technical decisions and alternatives
- **Data Model**: [data-model.md](./data-model.md) - API entities and data flow
- **API Contract**: [contracts/openapi.yaml](./contracts/openapi.yaml) - Complete OpenAPI spec
- **Quickstart**: [quickstart.md](./quickstart.md) - Developer setup guide
- **Constitution**: `/.specify/memory/constitution.md` - Project principles and standards
- **Architecture**: `/docs/backend_architecture.md` - Original design document
- **Game Rules**: `/docs/PRD.md` - Blood battle mahjong rules (authority)

---

**Plan Version**: 1.0
**Last Updated**: 2025-11-06
**Status**: Ready for task generation (`/speckit.tasks`)
