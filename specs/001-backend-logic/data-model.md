# Data Model: Mahjong Game

This document outlines the core data structures for the Mahjong backend logic, derived from the feature specification.

## Enums and Constants

These provide controlled vocabularies for game states and rules.

-   **`Suit(Enum)`**: Defines the card suits.
    -   `TONG` (Dots)
    -   `TIAO` (Bamboos)
    -   `WAN` (Characters)

-   **`GamePhase(Enum)`**: Defines the lifecycle of the game.
    -   `PREPARING` (Game created, waiting for players)
    -   `BURYING` (Players are selecting their missing suit)
    -   `PLAYING` (Main game loop is active)
    -   `ENDED` (Game is over, scores are final)

-   **`ActionType(Enum)`**: Defines the possible player actions.
    -   `PONG`
    -   `KONG` (Can be further specified as `BRIGHT`, `DARK`, `ADDED`)
    -   `HU`
    -   `PASS`

## Core Entities

### Tile

Represents a single mahjong tile.

-   **`suit`**: `Suit` - The suit of the tile.
-   **`rank`**: `int` - The rank/number of the tile (1-9).

### Meld

Represents a combination of tiles that a player has openly declared (Pong or Kong).

-   **`meld_type`**: `ActionType` - The type of meld (`PONG`, `KONG`).
-   **`tiles`**: `List[Tile]` - The tiles that form the meld.

### Player

Represents a player's state within the game.

-   **`player_id`**: `str` - A unique identifier for the player.
-   **`hand`**: `List[Tile]` - The player's private hand.
-   **`melds`**: `List[Meld]` - The player's open melds.
-   **`buried_cards`**: `List[Tile]` - The three tiles buried at the start.
-   **`missing_suit`**: `Suit` - The suit the player has declared as missing.
-   **`score`**: `int` - The player's current score.
-   **`is_hu`**: `bool` - Flag indicating if the player has won.

### GameState

Represents the complete state of a single game at any point in time. This is the primary object that will be passed between the logic engine and the client.

-   **`game_id`**: `str` - A unique identifier for the game session.
-   **`players`**: `List[Player]` - The list of players in the game (always 4).
-   **`current_player_index`**: `int` - The index of the player whose turn it is.
-   **`wall_remaining_count`**: `int` - The number of tiles left in the wall.
-   **`public_discards`**: `List[Tile]` - The list of tiles that have been discarded publicly.
-   **`game_phase`**: `GamePhase` - The current phase of the game.
