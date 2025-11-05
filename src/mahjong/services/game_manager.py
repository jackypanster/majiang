import random
from typing import List

from mahjong.constants.enums import GamePhase, Suit
from mahjong.exceptions.game_errors import InvalidGameStateError
from mahjong.models.game_state import GameState
from mahjong.models.player import Player
from mahjong.models.tile import Tile


class GameManager:
    """Handles the lifecycle of the game."""

    @staticmethod
    def create_game(player_ids: List[str]) -> GameState:
        """Creates a new game with four players."""
        if len(player_ids) != 4:
            raise ValueError("A game must have exactly 4 players.")
        players = [Player(player_id=pid) for pid in player_ids]
        return GameState(
            game_id="".join(random.choices("0123456789abcdef", k=8)), players=players
        )

    @staticmethod
    def start_game(game_state: GameState) -> GameState:
        """Initializes the game by shuffling the wall and dealing hands."""
        if game_state.game_phase != GamePhase.PREPARING:
            raise InvalidGameStateError(
                "Game can only be started from PREPARING phase."
            )

        # Create wall
        wall = []
        for suit in [Suit.TONG, Suit.TIAO, Suit.WAN]:
            for rank in range(1, 10):
                wall.extend([Tile(suit, rank)] * 4)
        random.shuffle(wall)
        game_state.wall = wall

        # Deal hands
        for i, player in enumerate(game_state.players):
            num_tiles = 14 if i == 0 else 13  # Dealer gets 14
            player.hand = sorted(
                game_state.wall[:num_tiles], key=lambda t: (t.suit.value, t.rank)
            )
            game_state.wall = game_state.wall[num_tiles:]

        game_state.game_phase = GamePhase.BURYING
        return game_state

    @staticmethod
    def end_game(game_state: GameState) -> GameState:
        """Ends the game and performs final settlement."""
        # Placeholder for end game logic.
        # This would handle:
        # 1. Final scoring.
        # 2. Flow bureau (查花猪, 查大叫).
        # 3. Determining the winner.
        game_state.game_phase = GamePhase.ENDED
        print("Game has ended.")
        return game_state
