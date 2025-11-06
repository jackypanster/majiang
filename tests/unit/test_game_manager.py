import pytest

from mahjong.constants.enums import GamePhase
from mahjong.services.game_manager import GameManager


def test_create_game():
    player_ids = ["p1", "p2", "p3", "p4"]
    game_state = GameManager.create_game(player_ids)
    assert len(game_state.players) == 4
    assert game_state.game_phase == GamePhase.PREPARING


def test_create_game_invalid_player_count():
    with pytest.raises(ValueError):
        GameManager.create_game(["p1", "p2"])


def test_start_game():
    player_ids = ["p1", "p2", "p3", "p4"]
    game_state = GameManager.create_game(player_ids)
    game_state = GameManager.start_game(game_state)

    assert game_state.game_phase == GamePhase.BURYING
    assert len(game_state.players[0].hand) == 14
    assert len(game_state.players[1].hand) == 13
    assert game_state.wall_remaining_count == 108 - 14 - 13 * 3
