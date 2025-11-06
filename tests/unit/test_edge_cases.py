"""测试边界情况（Issue #41 - Part 1）"""
import pytest
from mahjong.constants.enums import GamePhase, Suit, ActionType
from mahjong.models.game_state import GameState
from mahjong.models.player import Player
from mahjong.models.tile import Tile
from mahjong.services.game_manager import GameManager
from mahjong.services.player_actions import PlayerActions
from mahjong.exceptions.game_errors import InvalidActionError


# 注意：draw_tile 方法不存在，摸牌是在 discard_tile 自动处理的


def test_zero_tiles_remaining_count():
    """测试：牌墙为空时 wall_remaining_count 为0"""
    game_state = GameState(
        game_id="test",
        players=[Player(f"p{i}", hand=[Tile(Suit.TONG, 1)] * 11) for i in range(1, 5)],
        wall=[],
        game_phase=GamePhase.PLAYING,
    )

    assert game_state.wall_remaining_count == 0


def test_single_tile_remaining():
    """测试：牌墙只剩一张牌的状态"""
    game_state = GameState(
        game_id="test",
        players=[
            Player("p1", hand=[Tile(Suit.TONG, 1)] * 11, missing_suit=Suit.TIAO),
            Player("p2", hand=[Tile(Suit.TONG, 2)] * 11, missing_suit=Suit.TIAO),
            Player("p3", hand=[Tile(Suit.TONG, 3)] * 11, missing_suit=Suit.TIAO),
            Player("p4", hand=[Tile(Suit.TONG, 4)] * 11, missing_suit=Suit.TIAO),
        ],
        wall=[Tile(Suit.WAN, 9)],  # 只剩一张
        game_phase=GamePhase.PLAYING,
        current_player_index=0,
    )

    # 验证牌墙状态
    assert len(game_state.wall) == 1
    assert game_state.wall_remaining_count == 1


def test_wall_empty_after_kong_fails():
    """测试：杠牌后牌墙为空的情况会失败"""
    game_state = GameState(
        game_id="test",
        players=[
            Player(
                "p1",
                hand=[Tile(Suit.TONG, 1)] * 4 + [Tile(Suit.WAN, 1)] * 7,
                missing_suit=Suit.TIAO,
            ),
            Player("p2", hand=[Tile(Suit.TONG, 2)] * 11, missing_suit=Suit.TIAO),
            Player("p3", hand=[Tile(Suit.TONG, 3)] * 11, missing_suit=Suit.TIAO),
            Player("p4", hand=[Tile(Suit.TONG, 4)] * 11, missing_suit=Suit.TIAO),
        ],
        wall=[],  # 牌墙为空
        game_phase=GamePhase.PLAYING,
        current_player_index=0,
    )

    # 尝试暗杠应该失败（因为无法补牌）
    with pytest.raises(InvalidActionError, match="no tiles left in wall"):
        PlayerActions.declare_action(
            game_state, "p1", ActionType.KONG_CONCEALED, Tile(Suit.TONG, 1)
        )


def test_three_players_hu_ends_game():
    """测试：三家胡牌后游戏应结束"""
    game_state = GameState(
        game_id="test",
        players=[
            Player("p1", is_hu=True, score=80),   # 已胡
            Player("p2", is_hu=True, score=110),  # 已胡
            Player("p3", is_hu=True, score=130),  # 已胡
            Player("p4", is_hu=False, score=80),  # 未胡
        ],
        wall=[Tile(Suit.TONG, 1)] * 10,
        game_phase=GamePhase.PLAYING,
    )

    # 检查是否达到结束条件（3家胡牌）
    hu_count = sum(1 for p in game_state.players if p.is_hu)
    assert hu_count == 3

    # 调用 end_game 结束游戏
    game_state = GameManager.end_game(game_state)
    assert game_state.game_phase == GamePhase.ENDED


def test_wall_count_property():
    """测试：wall_remaining_count 属性正确反映牌墙数量"""
    game_state = GameState(
        game_id="test",
        players=[
            Player("p1", hand=[Tile(Suit.TONG, 1)] * 11, missing_suit=Suit.TIAO),
            Player("p2", hand=[Tile(Suit.TONG, 2)] * 11, missing_suit=Suit.TIAO),
            Player("p3", hand=[Tile(Suit.TONG, 3)] * 11, missing_suit=Suit.TIAO),
            Player("p4", hand=[Tile(Suit.TONG, 4)] * 11, missing_suit=Suit.TIAO),
        ],
        wall=[Tile(Suit.WAN, 9)] * 20,
        game_phase=GamePhase.PLAYING,
        current_player_index=0,
    )

    assert game_state.wall_remaining_count == 20
    assert len(game_state.wall) == 20
