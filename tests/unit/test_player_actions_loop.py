import pytest

from mahjong.constants.enums import Suit
from mahjong.services.game_manager import GameManager
from mahjong.services.player_actions import PlayerActions


@pytest.fixture
def playing_game_state():
    player_ids = ["p1", "p2", "p3", "p4"]
    game_state = GameManager.create_game(player_ids)
    game_state = GameManager.start_game(game_state)
    for player in game_state.players:
        suit_counts = {s: sum(1 for t in player.hand if t.suit == s) for s in Suit}
        suit_to_bury = next(s for s, c in suit_counts.items() if c >= 3)
        tiles_to_bury = [t for t in player.hand if t.suit == suit_to_bury][:3]
        game_state = PlayerActions.bury_cards(
            game_state, player.player_id, tiles_to_bury
        )
    return game_state


def test_discard_tile(playing_game_state):
    game_state = playing_game_state
    current_player = game_state.players[game_state.current_player_index]
    tile_to_discard = current_player.hand[0]

    game_state = PlayerActions.discard_tile(
        game_state, current_player.player_id, tile_to_discard
    )

    # Re-fetch current_player from the updated game_state
    current_player = game_state.players[(game_state.current_player_index - 1 + 4) % 4] # Get the player who just discarded

    assert tile_to_discard in game_state.public_discards
    assert tile_to_discard not in current_player.hand
    assert game_state.current_player_index == 1
