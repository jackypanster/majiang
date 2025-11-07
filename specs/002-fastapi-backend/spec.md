# Feature Specification: FastAPI HTTP Backend Layer

**Feature Branch**: `002-fastapi-backend`
**Created**: 2025-11-06
**Status**: Draft
**Input**: User description: "FastAPI HTTP layer for mahjong game backend - thin adapter layer providing REST endpoints for game management, player actions, and AI turn execution"

## Clarifications

### Session 2025-11-06

- Q: How should game IDs be generated (security vs simplicity tradeoff)? → A: UUID v4 (random 128-bit identifier, unpredictable, Python standard library support)
- Q: What operations should be logged at INFO level for observability? → A: Game creation, player action submissions, AI key decisions, all errors
- Q: What HTTP status codes should be returned for different edge cases? → A: Fine-grained codes: 404 (game not found), 400 (invalid action), 409 (concurrent conflict), 500 (AI exception)
- Q: Should there be timeout protection for AI execution to prevent hung requests? → A: Yes - AI execution has 5-second timeout (aligned with SC-002), returns 500 on timeout. Human player actions have no timeout limit.
- Q: When should in-memory game sessions be cleaned up to prevent memory leaks? → A: Immediately upon game end + periodic cleanup (every hour) removes games older than 24 hours regardless of state

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Start New Game Session (Priority: P1)

A human player wants to start a new mahjong game session with 3 AI opponents.

**Why this priority**: This is the fundamental entry point for the entire game. Without the ability to create and initialize a game session, no other functionality can be tested or used.

**Independent Test**: Can be fully tested by calling the game creation endpoint and verifying that a valid game ID is returned with initial game state showing 4 players (1 human + 3 AI) in the burying phase.

**Acceptance Scenarios**:

1. **Given** no active game exists, **When** the player requests to create a new game, **Then** the system returns a unique game ID and initial state showing 4 players with dealt cards in burying phase
2. **Given** a game creation request, **When** the system processes it, **Then** all 4 players (1 human + 3 AI) are assigned with the correct starting hands (dealer: 14 cards, others: 13 cards)
3. **Given** a newly created game, **When** queried for state, **Then** the human player sees only their own hand cards while AI cards are hidden

---

### User Story 2 - Submit Player Actions (Priority: P2)

A human player wants to submit their game actions (bury cards, discard tiles, respond to opponent actions) and see the resulting game state.

**Why this priority**: This enables the core gameplay interaction. Once a game is created, players need to take actions to progress the game.

**Independent Test**: Can be tested by creating a game (using Story 1), then submitting a valid burying action with 3 same-suit tiles, and verifying that the game state updates correctly with the player's missing suit set.

**Acceptance Scenarios**:

1. **Given** a player is in burying phase, **When** they submit 3 same-suit tiles to bury, **Then** the system updates their missing suit and moves them to waiting state
2. **Given** a player's turn to discard, **When** they submit a valid tile to discard, **Then** the system processes the discard and triggers AI responses if applicable
3. **Given** an opponent discards a tile, **When** the player responds with Peng/Gang/Hu action, **Then** the system validates and processes the response according to game rules
4. **Given** a player submits an invalid action (wrong phase, invalid tile), **When** the system processes it, **Then** the system returns a clear error message explaining why the action is invalid

---

### User Story 3 - Automatic AI Turn Execution (Priority: P3)

After the human player completes their action, the system automatically executes AI turns in sequence until it's the human player's turn again or the game ends.

**Why this priority**: This automates AI opponent behavior, making the single-player experience seamless. It depends on Stories 1 and 2 but can be tested independently by monitoring state changes after a human action.

**Independent Test**: Can be tested by creating a game, submitting a human action, and verifying that the game state shows multiple AI actions have been processed automatically before returning control to the human player.

**Acceptance Scenarios**:

1. **Given** the human player discards a tile, **When** no AI wants to respond (all skip), **Then** the next AI draws and discards automatically
2. **Given** an AI draws a tile, **When** the AI decides to discard, **Then** the system processes subsequent AI responses automatically
3. **Given** an AI wins (Hu), **When** the system detects this, **Then** the game continues with remaining players until 3 players win or tiles are exhausted
4. **Given** all AIs have completed their turns, **When** it's the human player's turn, **Then** the system returns the updated state and waits for human input

---

### User Story 4 - Query Current Game State (Priority: P2)

A player wants to view the current state of their game at any time to understand the board situation.

**Why this priority**: Essential for the player to make informed decisions. This is slightly less critical than taking actions but necessary for gameplay flow.

**Independent Test**: Can be tested by creating a game (Story 1), taking some actions (Story 2), and then querying the state to verify all visible information is correctly returned.

**Acceptance Scenarios**:

1. **Given** an active game in progress, **When** the human player queries game state, **Then** they receive their hand, discard pile, all players' open melds, scores, and current phase
2. **Given** the game is in a waiting state (AI turn), **When** the player queries state, **Then** they see the most recent state with indicators showing whose turn it is
3. **Given** the game has ended (3 wins or draw), **When** the player queries state, **Then** they see final scores and game outcome

---

### Edge Cases

- **Non-existent game ID**: When a player submits an action for a non-existent game ID (never created or already cleaned up) → Return **404 Not Found** with message "Game not found"
- **Invalid action (wrong turn/phase)**: When a player takes an action out of turn or in the wrong phase → Return **400 Bad Request** with explanation of why action is invalid
- **Invalid action (illegal move)**: When a player submits invalid tiles or action parameters → Return **400 Bad Request** with specific validation error
- **AI execution exception**: When AI execution encounters an unexpected exception during automated turn processing → Return **500 Internal Server Error**, log full stack trace, and preserve game state before AI execution began
- **AI execution timeout**: When AI execution exceeds 5-second timeout (indicates bug) → Return **500 Internal Server Error** with message "AI execution timeout", log critical error, and preserve game state before AI execution began
- **Idempotency (duplicate request)**: When the same action is submitted again (connection lost mid-action) → Return **409 Conflict** if game state has changed since original request, otherwise process normally
- **Concurrent requests**: When multiple concurrent requests are made for the same game (e.g., rapid clicks) → Process sequentially; return **409 Conflict** for requests that arrive after state has changed
- **Draw condition**: When the game reaches a draw condition (tiles exhausted with fewer than 3 wins) → End game normally, return final state with game_phase=ENDED
- **AI invalid action state**: When an AI needs to make a decision but all available actions are invalid (should never happen with correct logic) → Return **500 Internal Server Error** and log as critical bug

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide an endpoint to create a new game session with a configurable number of players (default: 1 human + 3 AI)
- **FR-002**: System MUST assign a unique game ID (UUID v4 format) to each created game session for unpredictable access control
- **FR-003**: System MUST initialize game state using the existing mahjong logic library (src/mahjong) without duplicating game rules
- **FR-004**: System MUST provide an endpoint to query current game state filtered for a specific player (hiding opponent hand cards)
- **FR-005**: System MUST provide an endpoint to submit player actions (bury, discard, draw, peng, gang, hu, skip)
- **FR-006**: System MUST validate all player actions against current game state and phase before processing
- **FR-007**: System MUST automatically execute AI turns in sequence after processing a human player action
- **FR-008**: System MUST continue AI turn execution until the game returns to human player's turn or reaches an end state
- **FR-009**: System MUST return clear error messages for invalid actions with explanations of why the action failed
- **FR-010**: System MUST store active game states in memory (no database required for single-machine deployment)
- **FR-011**: System MUST handle game lifecycle from creation through burying, playing, and ending phases
- **FR-012**: System MUST support the "blood battle" rule where up to 3 players can win in a single game
- **FR-013**: System MUST return game state updates synchronously after each action (no websockets or polling required)
- **FR-014**: System MUST preserve game state consistency during AI turn execution (no concurrent modification)
- **FR-015**: System MUST provide endpoints with standard HTTP methods (POST for actions, GET for queries)
- **FR-016**: System MUST log game creation events (with game_id), player action submissions (player_id, action type, tiles), AI key decisions (action + reasoning), and all errors at INFO level
- **FR-017**: System MUST return semantic HTTP status codes: 404 (game not found), 400 (invalid action/parameters), 409 (concurrent modification conflict), 500 (AI execution error or invalid AI state)
- **FR-018**: System MUST enforce a 5-second timeout for AI execution within action requests; timeout triggers 500 error with game state rollback. Human player actions have no timeout limit.
- **FR-019**: System MUST remove game sessions from memory immediately upon game end (phase=ENDED)
- **FR-020**: System MUST periodically cleanup (every hour) game sessions older than 24 hours regardless of game state to prevent memory leaks

### Key Entities

- **Game Session**: Represents an active game instance with a unique ID (UUID v4), creation timestamp, current game state, list of players (1 human + 3 AI), and lifecycle phase (burying, playing, ended). Stored in-memory as a dictionary mapping game_id to GameState objects. Sessions are cleaned up immediately upon end or after 24 hours.

- **Player Action Request**: Represents a player's intended action submission containing player ID, action type (bury/discard/peng/gang/hu/skip), and associated tiles. Validated against current game state before execution.

- **Game State View**: Represents the filtered view of game state for a specific player, containing visible information (own hand cards, all open melds, discard pile, scores, current turn) while hiding opponent hand cards.

- **AI Turn Sequence**: Represents the automated execution flow after human action, containing ordered list of AI players, their decision logic invocation, and state transitions until returning to human turn.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A player can create a new game and receive a valid game ID with initial state in under 2 seconds
- **SC-002**: A player can submit an action and receive the updated game state (including all AI turns) in under 5 seconds (applies to AI execution time; human players can take unlimited time to decide actions)
- **SC-003**: The system correctly handles 100% of valid game actions without crashes or state corruption
- **SC-004**: Players receive error responses within 1 second for invalid actions with clear explanations
- **SC-005**: The game state query returns complete information (all visible data) within 500 milliseconds
- **SC-006**: AI turns execute automatically without requiring additional player requests after a human action
- **SC-007**: The system maintains zero-sum game integrity (total scores always equal 400 points) across all operations
- **SC-008**: A complete game from creation to end (3 wins or draw) can be played without any manual intervention beyond human player actions

## Assumptions

1. **Deployment Model**: Single-machine deployment with one human player interacting via HTTP requests. No horizontal scaling or distributed state management required.

2. **Concurrency**: Only one human player per game session. No need to handle multiple concurrent human players modifying the same game state simultaneously.

3. **AI Implementation**: AI decision logic already exists in the mahjong library or will be provided as simple rule-based logic. The backend only needs to invoke AI actions, not implement AI strategy.

4. **State Persistence**: Game state loss on server restart is acceptable. No requirement for saving/loading games or recovering from crashes. Games are automatically cleaned from memory upon completion or after 24 hours of inactivity.

5. **Authentication**: No user authentication or authorization required for MVP. Game access is controlled solely by knowing the game ID.

6. **Error Recovery**: If an unexpected error or timeout occurs during AI turn execution, the entire action request fails and returns an error. Game state rolls back to the state before AI execution began (preserving the state for debugging).

7. **Performance**: Target response times assume local network or localhost connections. No optimization needed for high-latency or unreliable networks.

8. **API Versioning**: Initial version (v1) is sufficient. No backward compatibility or API versioning strategy required for MVP.

9. **Logging Level**: Standard console logging (INFO level) is sufficient for debugging. Must log: game creation (with game_id), player action submissions (player_id, action type, tiles), AI key decisions (chosen action and reasoning), and all errors. No structured logging, metrics collection, or observability tooling required.

10. **Testing Strategy**: Integration tests using httpx.AsyncClient cover the main scenarios. Comprehensive unit tests for edge cases are handled at the mahjong library level.

## Dependencies

- **Internal**: Existing `src/mahjong` library providing all game logic (GameManager, PlayerActions, WinChecker, Scorer)
- **External**: FastAPI framework for HTTP routing, Uvicorn as ASGI server, httpx for testing

## Constraints

- **Technology Stack**: Must use FastAPI (per architecture document) and integrate with existing Python mahjong library
- **No Database**: State must be stored in-memory only (per architecture document section 1)
- **Synchronous AI**: AI turns execute synchronously in the same HTTP request thread (per architecture document section 5)
- **Minimal Abstraction**: Backend must be a "thin adapter layer" with no business logic duplication (per architecture document section 1)

## Out of Scope

- User authentication and authorization
- Multiple human players in a single game
- Websockets or real-time push notifications
- State persistence across server restarts (saving/loading games)
- Replay functionality or game history
- Spectator mode or game observation by non-players
- Performance optimization for high concurrency (>100 concurrent games)
- Rate limiting or DDoS protection
- Internationalization (i18n) or localization (l10n)
- Admin endpoints for game management or monitoring
- Integration with external services (analytics, monitoring, payment, etc.)

## Open Questions

None - the architecture document provides clear guidance on all implementation aspects. All requirements are concrete and testable.
