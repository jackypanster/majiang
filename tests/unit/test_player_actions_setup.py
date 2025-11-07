import pytest

from mahjong.constants.enums import GamePhase, Suit
from mahjong.exceptions.game_errors import InvalidActionError
from mahjong.services.game_manager import GameManager
from mahjong.services.player_actions import PlayerActions


def test_bury_cards():
    player_ids = ["p1", "p2", "p3", "p4"]
    game_state = GameManager.create_game(player_ids)
    game_state = GameManager.start_game(game_state)

    for player in game_state.players:
        # Find a suit with at least 3 tiles to bury
        suit_counts = {s: sum(1 for t in player.hand if t.suit == s) for s in Suit}
        suit_to_bury = next(s for s, c in suit_counts.items() if c >= 3)
        tiles_to_bury = [t for t in player.hand if t.suit == suit_to_bury][:3]

        game_state = PlayerActions.bury_cards(
            game_state, player.player_id, tiles_to_bury
        )
        # Re-fetch player from the updated game_state
        player = next(p for p in game_state.players if p.player_id == player.player_id)

        assert player.missing_suit == suit_to_bury
        assert len(player.hand) == (11 if player.player_id == "p1" else 10)

    assert game_state.game_phase == GamePhase.PLAYING


def test_bury_invalid_cards():
    player_ids = ["p1", "p2", "p3", "p4"]
    game_state = GameManager.create_game(player_ids)
    game_state = GameManager.start_game(game_state)
    player = game_state.players[0]

    with pytest.raises(InvalidActionError):
        # Not in hand
        PlayerActions.bury_cards(game_state, player.player_id, [player.hand[0]] * 3)
