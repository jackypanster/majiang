# Quickstart: Using the Mahjong Logic Library

This guide provides a basic example of how to use the Mahjong logic library to run a game.

## Basic Game Flow

The library is designed around a simple loop: call a function with the current `GameState` and get a new `GameState` back.

### 1. Initialization

First, create a new game and start it.

```python
from mahjong.services import GameManager

# Player IDs for the new game
player_ids = ["player_1", "player_2", "player_3", "player_4"]

# Create the game state
game_state = GameManager.create_game(player_ids)

# Start the game (deals tiles)
game_state = GameManager.start_game(game_state)

print(f"Game started. Phase: {game_state.game_phase}")
# Expected output: Game started. Phase: GamePhase.BURYING
```

### 2. Burying Cards

Each player must now bury three cards of the same suit.

```python
from mahjong.services import PlayerActions
from mahjong.models import Tile, Suit

# This is a simplified example. In a real application,
# you would get the selected tiles from each player.
for player in game_state.players:
    # Assume each player chooses to bury the first three TONG tiles they have.
    suit_to_bury = Suit.TONG
    tiles_to_bury = [tile for tile in player.hand if tile.suit == suit_to_bury][:3]
    
    game_state = PlayerActions.bury_cards(
        game_state=game_state,
        player_id=player.player_id,
        tiles=tiles_to_bury
    )

print(f"All players have buried cards. Phase: {game_state.game_phase}")
# Expected output: All players have buried cards. Phase: GamePhase.PLAYING
```

### 3. Main Game Loop

Once the game is in the `PLAYING` phase, the main loop begins. The current player discards a tile, and other players can react.

```python
# Example: The first player discards a tile.
current_player = game_state.players[game_state.current_player_index]
tile_to_discard = current_player.hand[0]

game_state = PlayerActions.discard_tile(
    game_state=game_state,
    player_id=current_player.player_id,
    tile=tile_to_discard
)

print(f"{current_player.player_id} discarded {tile_to_discard}")

# Now, other players can declare actions.
# The client application would be responsible for collecting these actions
# and sending them to the `declare_action` function.
```

### 4. Ending the Game

The game ends when three players have won (`is_hu == True`) or the wall runs out. The final scores can then be calculated. (Note: `end_game` function to be detailed in implementation).

## Error Handling

The library uses exceptions to signal invalid operations. Always wrap calls in `try...except` blocks.

```python
try:
    # Trying to discard a tile that the player doesn't have
    invalid_tile = Tile(Suit.WAN, 9)
    game_state = PlayerActions.discard_tile(
        game_state=game_state,
        player_id=current_player.player_id,
        tile=invalid_tile
    )
except InvalidActionError as e:
    print(f"Caught an error: {e}")
```
