"""测试缺门优先打牌规则（PRD.md 第 2.2 节第 32 行）"""
import pytest
from mahjong.constants.enums import GamePhase, Suit
from mahjong.exceptions.game_errors import InvalidActionError
from mahjong.models.game_state import GameState
from mahjong.models.player import Player
from mahjong.models.tile import Tile
from mahjong.services.player_actions import PlayerActions


def test_discard_missing_suit_tile_success():
    """测试：手牌中有缺门牌时，可以打出缺门牌"""
    player = Player(
        player_id="p1",
        hand=[
            Tile(Suit.TONG, 1), Tile(Suit.TONG, 2),  # 缺门牌（筒）
            Tile(Suit.WAN, 3), Tile(Suit.WAN, 4), Tile(Suit.WAN, 5),
            Tile(Suit.TIAO, 6), Tile(Suit.TIAO, 7), Tile(Suit.TIAO, 8),
        ],
        missing_suit=Suit.TONG,  # 缺筒
    )
    game_state = GameState(
        game_id="test",
        players=[player, Player("p2"), Player("p3"), Player("p4")],
        wall=[Tile(Suit.WAN, 9)] * 10,
        public_discards=[],
        current_player_index=0,
        game_phase=GamePhase.PLAYING,
    )

    # 打出缺门牌（筒1）应该成功
    new_state = PlayerActions.discard_tile(game_state, "p1", Tile(Suit.TONG, 1))

    # 验证牌已打出
    assert Tile(Suit.TONG, 1) not in new_state.players[0].hand
    assert Tile(Suit.TONG, 1) in new_state.public_discards


def test_discard_non_missing_suit_with_missing_tiles_fails():
    """测试：手牌中有缺门牌时，不能打出非缺门牌"""
    player = Player(
        player_id="p1",
        hand=[
            Tile(Suit.TONG, 1), Tile(Suit.TONG, 2),  # 缺门牌（筒）
            Tile(Suit.WAN, 3), Tile(Suit.WAN, 4), Tile(Suit.WAN, 5),
            Tile(Suit.TIAO, 6), Tile(Suit.TIAO, 7), Tile(Suit.TIAO, 8),
        ],
        missing_suit=Suit.TONG,  # 缺筒
    )
    game_state = GameState(
        game_id="test",
        players=[player, Player("p2"), Player("p3"), Player("p4")],
        wall=[Tile(Suit.WAN, 9)] * 10,
        public_discards=[],
        current_player_index=0,
        game_phase=GamePhase.PLAYING,
    )

    # 尝试打出非缺门牌（万3）应该失败
    with pytest.raises(InvalidActionError, match="缺门优先规则违反"):
        PlayerActions.discard_tile(game_state, "p1", Tile(Suit.WAN, 3))


def test_discard_non_missing_suit_after_clearing_success():
    """测试：手牌中没有缺门牌后，可以打出其他花色牌"""
    player = Player(
        player_id="p1",
        hand=[
            # 没有筒牌了
            Tile(Suit.WAN, 3), Tile(Suit.WAN, 4), Tile(Suit.WAN, 5),
            Tile(Suit.TIAO, 6), Tile(Suit.TIAO, 7), Tile(Suit.TIAO, 8),
        ],
        missing_suit=Suit.TONG,  # 缺筒，但手牌中已经没有筒牌了
    )
    game_state = GameState(
        game_id="test",
        players=[player, Player("p2"), Player("p3"), Player("p4")],
        wall=[Tile(Suit.WAN, 9)] * 10,
        public_discards=[],
        current_player_index=0,
        game_phase=GamePhase.PLAYING,
    )

    # 打出万3应该成功（因为已经没有缺门牌了）
    new_state = PlayerActions.discard_tile(game_state, "p1", Tile(Suit.WAN, 3))

    # 验证牌已打出
    assert Tile(Suit.WAN, 3) not in new_state.players[0].hand
    assert Tile(Suit.WAN, 3) in new_state.public_discards


def test_discard_without_missing_suit_defined():
    """测试：玩家没有定义缺门时（埋牌前），可以打出任意牌"""
    player = Player(
        player_id="p1",
        hand=[
            Tile(Suit.TONG, 1), Tile(Suit.TONG, 2),
            Tile(Suit.WAN, 3), Tile(Suit.WAN, 4),
            Tile(Suit.TIAO, 6), Tile(Suit.TIAO, 7),
        ],
        missing_suit=None,  # 未定义缺门
    )
    game_state = GameState(
        game_id="test",
        players=[player, Player("p2"), Player("p3"), Player("p4")],
        wall=[Tile(Suit.WAN, 9)] * 10,
        public_discards=[],
        current_player_index=0,
        game_phase=GamePhase.PLAYING,
    )

    # 可以打出任意牌
    new_state = PlayerActions.discard_tile(game_state, "p1", Tile(Suit.WAN, 3))
    assert Tile(Suit.WAN, 3) not in new_state.players[0].hand


def test_multiple_missing_suit_tiles_enforcement():
    """测试：手牌中有多张缺门牌时，仍然必须优先打缺门牌"""
    player = Player(
        player_id="p1",
        hand=[
            Tile(Suit.TIAO, 1), Tile(Suit.TIAO, 2), Tile(Suit.TIAO, 3),  # 3张缺门牌
            Tile(Suit.WAN, 4), Tile(Suit.WAN, 5),
            Tile(Suit.TONG, 6), Tile(Suit.TONG, 7),
        ],
        missing_suit=Suit.TIAO,  # 缺条
    )
    game_state = GameState(
        game_id="test",
        players=[player, Player("p2"), Player("p3"), Player("p4")],
        wall=[Tile(Suit.WAN, 9)] * 10,
        public_discards=[],
        current_player_index=0,
        game_phase=GamePhase.PLAYING,
    )

    # 尝试打出筒6应该失败（还有3张缺门牌）
    with pytest.raises(InvalidActionError, match="还有 3 张缺门牌"):
        PlayerActions.discard_tile(game_state, "p1", Tile(Suit.TONG, 6))

    # 打出条1应该成功
    new_state = PlayerActions.discard_tile(game_state, "p1", Tile(Suit.TIAO, 1))
    assert Tile(Suit.TIAO, 1) in new_state.public_discards


def test_error_message_includes_suit_name():
    """测试：错误消息包含花色名称（中文）"""
    player = Player(
        player_id="p1",
        hand=[
            Tile(Suit.WAN, 1), Tile(Suit.WAN, 2),  # 缺万
            Tile(Suit.TONG, 3), Tile(Suit.TONG, 4),
        ],
        missing_suit=Suit.WAN,  # 缺万
    )
    game_state = GameState(
        game_id="test",
        players=[player, Player("p2"), Player("p3"), Player("p4")],
        wall=[Tile(Suit.WAN, 9)] * 10,
        public_discards=[],
        current_player_index=0,
        game_phase=GamePhase.PLAYING,
    )

    with pytest.raises(InvalidActionError) as exc_info:
        PlayerActions.discard_tile(game_state, "p1", Tile(Suit.TONG, 3))

    # 验证错误消息包含"万"
    assert "万" in str(exc_info.value)
    assert "缺门优先规则违反" in str(exc_info.value)
