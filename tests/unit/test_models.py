import pytest

from mahjong.constants.enums import ActionType, GamePhase, Suit
from mahjong.models.game_state import GameState
from mahjong.models.meld import Meld
from mahjong.models.player import Player
from mahjong.models.tile import Tile


def test_tile_creation():
    tile = Tile(Suit.TONG, 1)
    assert tile.suit == Suit.TONG
    assert tile.rank == 1


def test_tile_invalid_rank():
    with pytest.raises(ValueError):
        Tile(Suit.TONG, 0)
    with pytest.raises(ValueError):
        Tile(Suit.TONG, 10)


def test_meld_creation():
    tile1 = Tile(Suit.WAN, 2)
    meld = Meld(ActionType.PONG, [tile1, tile1, tile1])
    assert meld.meld_type == ActionType.PONG
    assert len(meld.tiles) == 3


def test_player_creation():
    player = Player(player_id="p1")
    assert player.player_id == "p1"
    assert player.hand == []
    assert player.score == 0
    assert not player.is_hu


def test_game_state_creation():
    game = GameState(game_id="g1")
    assert game.game_id == "g1"
    assert game.game_phase == GamePhase.PREPARING
    assert game.wall_remaining_count == 0
