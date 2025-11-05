# API Contracts: Mahjong Logic Library

This document defines the public API for the Mahjong game logic library. The library is designed to be stateless where possible, with the `GameState` object acting as the single source of truth that is passed into and returned from functions.

## Core Concepts

-   **Exceptions**: The library will raise specific exceptions for invalid operations (e.g., `InvalidActionError`, `InvalidGameStateError`). This aligns with the "Fail Fast" principle.
-   **Immutability**: While not strictly enforced by Python, the design encourages treating the `GameState` object as immutable. Each function call should return a *new* `GameState` object representing the updated state, rather than modifying the input object in place.

## Modules

### 1. `GameManager`

This module handles the lifecycle of the game.

---

#### `create_game(player_ids: List[str]) -> GameState`

-   **Description**: Creates a new game with four players.
-   **Parameters**:
    -   `player_ids`: A list of four unique string identifiers for the players.
-   **Returns**: A new `GameState` object in the `PREPARING` phase, with an empty wall and no hands dealt.
-   **Raises**: `ValueError` if the number of players is not exactly four.

---

#### `start_game(game_state: GameState) -> GameState`

-   **Description**: Initializes the game by shuffling the wall, dealing initial hands, and setting the game phase to `BURYING`.
-   **Parameters**:
    -   `game_state`: The current game state, must be in the `PREPARING` phase.
-   **Returns**: An updated `GameState` with hands dealt and the phase set to `BURYING`.
-   **Raises**: `InvalidGameStateError` if the game is not in the `PREPARING` phase.

---

### 2. `PlayerActions`

This module handles all actions taken by players during the game. **Note**: The 5-second response window for player actions is managed by the calling client; this library only processes the declared actions.

---

#### `bury_cards(game_state: GameState, player_id: str, tiles: List[Tile]) -> GameState`

-   **Description**: Allows a player to bury three tiles of the same suit to declare their missing suit.
-   **Parameters**:
    -   `game_state`: The current game state, must be in the `BURYING` phase.
    -   `player_id`: The ID of the player performing the action.
    -   `tiles`: A list of exactly three `Tile` objects of the same suit from the player's hand.
-   **Returns**: An updated `GameState`. If all players have buried their cards, the phase will be advanced to `PLAYING`.
-   **Raises**:
    -   `InvalidGameStateError` if the game is not in the `BURYING` phase.
    -   `InvalidActionError` if the tiles are invalid (not 3, not same suit, not in hand).

---

#### `discard_tile(game_state: GameState, player_id: str, tile: Tile) -> GameState`

-   **Description**: A player discards a tile from their hand.
-   **Parameters**:
    -   `game_state`: The current game state, must be in the `PLAYING` phase.
    -   `player_id`: The ID of the current player.
    -   `tile`: The `Tile` to be discarded from the player's hand.
-   **Returns**: An updated `GameState` reflecting the discarded tile.
-   **Raises**:
    -   `InvalidGameStateError` if it's not the specified player's turn.
    -   `InvalidActionError` if the tile is not in the player's hand.

---

#### `declare_action(game_state: GameState, player_id: str, action: Action) -> GameState`

-   **Description**: A player declares an action (Pong, Kong, Hu, or Pass) in response to another player's discard.
-   **Parameters**:
    -   `game_state`: The current game state.
    -   `player_id`: The ID of the player declaring the action.
    -   `action`: An `Action` object detailing the action type and target tile.
-   **Returns**: An updated `GameState` after applying the action. The logic will handle action priorities (`Hu > Kong > Pong`).
-   **Raises**: `InvalidActionError` if the declared action is not valid based on the player's hand and the current game state.
