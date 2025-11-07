"""测试 GameState 过滤功能（PRD.md 第 3.1 节）"""
import pytest
from mahjong.constants.enums import GamePhase, Suit, ActionType
from mahjong.models.game_state import GameState
from mahjong.models.meld import Meld
from mahjong.models.player import Player
from mahjong.models.tile import Tile
from mahjong.services.game_manager import GameManager


def test_get_game_state_shows_own_hand():
    """测试：玩家可以看到自己的完整手牌"""
    player1 = Player(
        player_id="p1",
        hand=[Tile(Suit.TONG, 1), Tile(Suit.TONG, 2), Tile(Suit.TONG, 3)],
    )
    player2 = Player(
        player_id="p2",
        hand=[Tile(Suit.WAN, 4), Tile(Suit.WAN, 5)],
    )
    game_state = GameState(
        game_id="test",
        players=[player1, player2, Player("p3"), Player("p4")],
        game_phase=GamePhase.PLAYING,
    )

    # p1 请求查看状态
    filtered_state = GameManager.get_game_state(game_state, "p1")

    # 验证 p1 能看到自己的手牌
    p1_data = next(p for p in filtered_state["players"] if p["player_id"] == "p1")
    assert "hand" in p1_data
    assert len(p1_data["hand"]) == 3
    assert p1_data["hand"][0] == {"suit": "TONG", "rank": 1}


def test_get_game_state_hides_other_hands():
    """测试：玩家看不到其他玩家的完整手牌"""
    player1 = Player(
        player_id="p1",
        hand=[Tile(Suit.TONG, 1), Tile(Suit.TONG, 2), Tile(Suit.TONG, 3)],
    )
    player2 = Player(
        player_id="p2",
        hand=[Tile(Suit.WAN, 4), Tile(Suit.WAN, 5)],
    )
    game_state = GameState(
        game_id="test",
        players=[player1, player2, Player("p3"), Player("p4")],
        game_phase=GamePhase.PLAYING,
    )

    # p1 请求查看状态
    filtered_state = GameManager.get_game_state(game_state, "p1")

    # 验证 p1 看不到 p2 的手牌，只能看到数量
    p2_data = next(p for p in filtered_state["players"] if p["player_id"] == "p2")
    assert "hand" not in p2_data
    assert "hand_count" in p2_data
    assert p2_data["hand_count"] == 2


def test_get_game_state_shows_public_info():
    """测试：所有玩家都能看到公开信息（明牌、弃牌堆等）"""
    player1 = Player(
        player_id="p1",
        hand=[Tile(Suit.TONG, 1)],
        melds=[Meld(ActionType.PONG, (Tile(Suit.WAN, 5),) * 3)],
    )
    player2 = Player(
        player_id="p2",
        hand=[Tile(Suit.TIAO, 1)],
    )
    game_state = GameState(
        game_id="test",
        players=[player1, player2, Player("p3"), Player("p4")],
        public_discards=[Tile(Suit.TONG, 9), Tile(Suit.WAN, 1)],
        game_phase=GamePhase.PLAYING,
    )

    # p2 请求查看状态
    filtered_state = GameManager.get_game_state(game_state, "p2")

    # 验证公共弃牌堆可见
    assert len(filtered_state["public_discards"]) == 2
    assert filtered_state["public_discards"][0] == {"suit": "TONG", "rank": 9}

    # 验证 p1 的明牌（碰）可见
    p1_data = next(p for p in filtered_state["players"] if p["player_id"] == "p1")
    assert len(p1_data["melds"]) == 1
    assert p1_data["melds"][0]["meld_type"] == "PONG"
    assert len(p1_data["melds"][0]["tiles"]) == 3


def test_get_game_state_shows_buried_cards():
    """测试：埋牌对所有玩家可见"""
    player1 = Player(
        player_id="p1",
        hand=[Tile(Suit.TONG, 1)],
        buried_cards=[Tile(Suit.WAN, 1), Tile(Suit.WAN, 2), Tile(Suit.WAN, 3)],
        missing_suit=Suit.WAN,
    )
    player2 = Player(player_id="p2", hand=[Tile(Suit.TIAO, 1)])
    game_state = GameState(
        game_id="test",
        players=[player1, player2, Player("p3"), Player("p4")],
        game_phase=GamePhase.PLAYING,
    )

    # p2 请求查看状态
    filtered_state = GameManager.get_game_state(game_state, "p2")

    # 验证 p1 的埋牌可见
    p1_data = next(p for p in filtered_state["players"] if p["player_id"] == "p1")
    assert len(p1_data["buried_cards"]) == 3
    assert p1_data["buried_cards"][0] == {"suit": "WAN", "rank": 1}
    assert p1_data["missing_suit"] == "WAN"


def test_get_game_state_includes_game_info():
    """测试：包含游戏基础信息"""
    game_state = GameState(
        game_id="game123",
        players=[Player("p1"), Player("p2"), Player("p3"), Player("p4")],
        wall=[Tile(Suit.TONG, 9)] * 50,
        current_player_index=2,
        game_phase=GamePhase.PLAYING,
        base_score=2,
    )

    filtered_state = GameManager.get_game_state(game_state, "p1")

    # 验证基础信息
    assert filtered_state["game_id"] == "game123"
    assert filtered_state["game_phase"] == "PLAYING"
    assert filtered_state["current_player_index"] == 2
    assert filtered_state["wall_remaining_count"] == 50
    assert filtered_state["base_score"] == 2


def test_get_game_state_invalid_player():
    """测试：请求不存在的玩家ID应该抛出错误"""
    game_state = GameState(
        game_id="test",
        players=[Player("p1"), Player("p2"), Player("p3"), Player("p4")],
    )

    with pytest.raises(ValueError, match="Player invalid not found"):
        GameManager.get_game_state(game_state, "invalid")


def test_get_game_state_different_players_see_different_hands():
    """测试：不同玩家看到不同的手牌视图"""
    player1 = Player(
        player_id="p1",
        hand=[Tile(Suit.TONG, 1), Tile(Suit.TONG, 2)],
    )
    player2 = Player(
        player_id="p2",
        hand=[Tile(Suit.WAN, 3), Tile(Suit.WAN, 4), Tile(Suit.WAN, 5)],
    )
    game_state = GameState(
        game_id="test",
        players=[player1, player2, Player("p3"), Player("p4")],
    )

    # p1 的视图
    p1_view = GameManager.get_game_state(game_state, "p1")
    p1_hand = next(p for p in p1_view["players"] if p["player_id"] == "p1")
    p2_from_p1 = next(p for p in p1_view["players"] if p["player_id"] == "p2")

    assert "hand" in p1_hand
    assert len(p1_hand["hand"]) == 2
    assert "hand" not in p2_from_p1
    assert p2_from_p1["hand_count"] == 3

    # p2 的视图
    p2_view = GameManager.get_game_state(game_state, "p2")
    p2_hand = next(p for p in p2_view["players"] if p["player_id"] == "p2")
    p1_from_p2 = next(p for p in p2_view["players"] if p["player_id"] == "p1")

    assert "hand" in p2_hand
    assert len(p2_hand["hand"]) == 3
    assert "hand" not in p1_from_p2
    assert p1_from_p2["hand_count"] == 2
