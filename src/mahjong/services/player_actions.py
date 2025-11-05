from collections import Counter
from dataclasses import replace
from typing import List

from mahjong.constants.enums import ActionType, GamePhase
from mahjong.exceptions.game_errors import InvalidActionError, InvalidGameStateError
from mahjong.models.game_state import GameState
from mahjong.models.player import Player
from mahjong.models.tile import Tile
from mahjong.services.win_checker import WinChecker


class PlayerActions:
    @staticmethod
    def bury_cards(
        game_state: GameState, player_id: str, tiles: List[Tile]
    ) -> GameState:
        if game_state.game_phase != GamePhase.BURYING:
            raise InvalidGameStateError("Cannot bury cards outside of BURYING phase.")

        player = next((p for p in game_state.players if p.player_id == player_id), None)
        if not player:
            raise ValueError(f"Player {player_id} not found.")

        if len(tiles) != 3:
            raise InvalidActionError("Must bury exactly 3 tiles.")
        if not all(t.suit == tiles[0].suit for t in tiles):
            raise InvalidActionError("Buried tiles must be of the same suit.")

        # Check if all tiles are in hand and count is sufficient
        hand_counts = Counter(player.hand)
        bury_counts = Counter(tiles)

        for tile, count in bury_counts.items():
            if hand_counts[tile] < count:
                raise InvalidActionError(
                    f"Not enough copies of tile {tile} in player's hand to bury."
                )

        # Create a new hand for the player
        new_hand = list(player.hand)
        for tile in tiles:
            new_hand.remove(tile)

        updated_player = replace(
            player,
            missing_suit=tiles[0].suit,
            buried_cards=tiles,
            hand=new_hand,
        )

        # Update players list
        new_players = list(game_state.players)
        player_index = next(i for i, p in enumerate(new_players) if p.player_id == player_id)
        new_players[player_index] = updated_player

        # Check if all players have buried their cards
        new_game_phase = game_state.game_phase
        if all(p.missing_suit is not None for p in new_players):
            new_game_phase = GamePhase.PLAYING

        return replace(
            game_state, players=new_players, game_phase=new_game_phase
        )

    @staticmethod
    def discard_tile(game_state: GameState, player_id: str, tile: Tile) -> GameState:
        if game_state.game_phase != GamePhase.PLAYING:
            raise InvalidGameStateError("Cannot discard tile outside of PLAYING phase.")

        current_player_index = game_state.current_player_index
        current_player = game_state.players[current_player_index]
        if current_player.player_id != player_id:
            raise InvalidActionError(f"It is not player {player_id}'s turn.")

        # Create a new hand for the current player
        new_current_player_hand = list(current_player.hand)
        try:
            new_current_player_hand.remove(tile)
        except ValueError:
            raise InvalidActionError(f"Tile {tile} not in player's hand.")

        updated_current_player = replace(current_player, hand=new_current_player_hand)

        # Create a new public_discards list
        new_public_discards = list(game_state.public_discards)
        new_public_discards.append(tile)

        # Update players list with the updated current player
        new_players = list(game_state.players)
        new_players[current_player_index] = updated_current_player

        # Simple turn progression for now
        new_current_player_index = (current_player_index + 1) % 4

        # Create a new wall list
        new_wall = list(game_state.wall)

        # Draw a tile for the new current player
        if new_wall:
            drawn_tile = new_wall.pop(0)
            next_player = new_players[new_current_player_index]
            updated_next_player_hand = list(next_player.hand)
            updated_next_player_hand.append(drawn_tile)
            updated_next_player = replace(next_player, hand=updated_next_player_hand)
            new_players[new_current_player_index] = updated_next_player

        return replace(
            game_state,
            players=new_players,
            public_discards=new_public_discards,
            wall=new_wall,
            current_player_index=new_current_player_index,
        )

    @staticmethod
    def declare_action(
        game_state: GameState,
        player_id: str,
        action_type: ActionType,
        target_tile: Tile,
    ) -> GameState:
        # This is a placeholder for the complex action declaration logic.
        # In a real implementation, this would involve:
        # 1. Collecting actions from all other players.
        # 2. Resolving priorities (Hu > Kong > Pong).
        # 3. Updating the game state accordingly (changing current player,
        #    adding melds, etc.).

        player = next((p for p in game_state.players if p.player_id == player_id), None)
        if not player:
            raise ValueError(f"Player {player_id} not found.")

        if action_type == ActionType.HU:
            if not WinChecker.is_hu(player):
                raise InvalidActionError("Not a winning hand.")
            player.is_hu = True
            # Scoring logic would be called here...

        if action_type == ActionType.PONG:
            if player.hand.count(target_tile) < 2:
                raise InvalidActionError("Cannot PONG without two matching tiles.")
            # Logic to handle PONG would go here...

        if action_type == ActionType.KONG:
            if player.hand.count(target_tile) < 3:
                raise InvalidActionError("Cannot KONG without three matching tiles.")
            # Logic to handle KONG would go here...

        # For now, we'll just print the declared action
        print(f"Player {player_id} declared {action_type.name} on {target_tile}")

        return game_state
