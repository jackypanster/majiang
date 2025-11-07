from mahjong.constants.enums import ActionType, GamePhase, Suit
from mahjong.models.game_state import GameState
from mahjong.models.player import Player
from mahjong.models.tile import Tile
from mahjong.services.player_actions import PlayerActions


def test_ai_response_pong():
    """Test AI responds with PONG when possible"""
    # p1 打出 TONG 1，p2 有两张 TONG 1，应该碰
    player_p1 = Player(
        player_id="p1",
        hand=[
            Tile(Suit.TONG, 1), Tile(Suit.TONG, 2), Tile(Suit.TONG, 3),
            Tile(Suit.TONG, 4), Tile(Suit.TONG, 5), Tile(Suit.TONG, 6),
            Tile(Suit.TONG, 7), Tile(Suit.TONG, 8), Tile(Suit.TONG, 9),
            Tile(Suit.TIAO, 1), Tile(Suit.TIAO, 1),
        ],
        missing_suit=Suit.WAN,  # 缺万，手牌中没有万牌
    )
    player_p2 = Player(
        player_id="p2",
        hand=[
            Tile(Suit.TONG, 1), Tile(Suit.TONG, 1),  # 能碰 TONG 1
            Tile(Suit.TONG, 2), Tile(Suit.TONG, 3),
            Tile(Suit.TIAO, 4), Tile(Suit.TIAO, 5), Tile(Suit.TIAO, 6),
            Tile(Suit.TIAO, 7), Tile(Suit.TIAO, 8), Tile(Suit.TIAO, 9),
            Tile(Suit.TIAO, 1),
        ],
        missing_suit=Suit.WAN,  # 缺万，手牌中没有万牌
    )
    game_state = GameState(
        game_id="test",
        players=[player_p1, player_p2, Player("p3"), Player("p4")],
        wall=[Tile(Suit.TONG, 9)] * 10,
        public_discards=[],
        current_player_index=0,
        game_phase=GamePhase.PLAYING,
    )

    # p1 打出 TONG 1
    new_state = PlayerActions.discard_tile(game_state, "p1", Tile(Suit.TONG, 1))

    # p2 应该碰了
    assert len(new_state.players[1].melds) == 1
    assert new_state.players[1].melds[0].meld_type == ActionType.PONG
    assert len(new_state.players[1].melds[0].tiles) == 3

    # p2 成为当前玩家
    assert new_state.current_player_index == 1


def test_ai_response_kong_over_pong():
    """Test AI responds with KONG when both KONG and PONG are possible (priority)"""
    # p1 打出 TONG 1，p2 有三张 TONG 1，应该杠（而不是碰）
    player_p1 = Player(
        player_id="p1",
        hand=[
            Tile(Suit.TONG, 1), Tile(Suit.TONG, 2), Tile(Suit.TONG, 3),
            Tile(Suit.TONG, 4), Tile(Suit.TONG, 5), Tile(Suit.TONG, 6),
            Tile(Suit.TONG, 7), Tile(Suit.TONG, 8), Tile(Suit.TONG, 9),
            Tile(Suit.TIAO, 1), Tile(Suit.TIAO, 1),
        ],
        missing_suit=Suit.WAN,  # 缺万，手牌中没有万牌
    )
    player_p2 = Player(
        player_id="p2",
        hand=[
            Tile(Suit.TONG, 1), Tile(Suit.TONG, 1), Tile(Suit.TONG, 1),  # 能杠
            Tile(Suit.TONG, 2), Tile(Suit.TONG, 3),
            Tile(Suit.TIAO, 4), Tile(Suit.TIAO, 5), Tile(Suit.TIAO, 6),
            Tile(Suit.TIAO, 7), Tile(Suit.TIAO, 8), Tile(Suit.TIAO, 9),
            Tile(Suit.TIAO, 1),
        ],
        missing_suit=Suit.WAN,  # 缺万，手牌中没有万牌
    )
    game_state = GameState(
        game_id="test",
        players=[player_p1, player_p2, Player("p3"), Player("p4")],
        wall=[Tile(Suit.TONG, 9)] * 10,
        public_discards=[],
        current_player_index=0,
        game_phase=GamePhase.PLAYING,
    )

    # p1 打出 TONG 1
    new_state = PlayerActions.discard_tile(game_state, "p1", Tile(Suit.TONG, 1))

    # p2 应该杠了（而不是碰）
    assert len(new_state.players[1].melds) == 1
    assert new_state.players[1].melds[0].meld_type == ActionType.KONG_EXPOSED
    assert len(new_state.players[1].melds[0].tiles) == 4

    # p2 成为当前玩家
    assert new_state.current_player_index == 1

    # 杠分已结算（明杠：p1付2分）
    assert new_state.players[0].score == 98  # -2
    assert new_state.players[1].score == 102  # +2


def test_ai_response_hu_over_all():
    """Test AI responds with HU when possible (highest priority)"""
    # p1 打出 TONG 1，p2 能胡，应该胡（而不是碰/杠）
    player_p1 = Player(
        player_id="p1",
        hand=[
            Tile(Suit.TONG, 1), Tile(Suit.TONG, 2), Tile(Suit.TONG, 3),
            Tile(Suit.TONG, 4), Tile(Suit.TONG, 5), Tile(Suit.TONG, 6),
            Tile(Suit.TONG, 7), Tile(Suit.TONG, 8), Tile(Suit.TONG, 9),
            Tile(Suit.TIAO, 1), Tile(Suit.TIAO, 1),
        ],
        missing_suit=Suit.WAN,  # 缺万，手牌中没有万牌
    )
    player_p2 = Player(
        player_id="p2",
        hand=[
            Tile(Suit.TONG, 1),  # 加上打出的TONG 1，凑成将（一对）
            Tile(Suit.TONG, 2), Tile(Suit.TONG, 2), Tile(Suit.TONG, 2),  # 刻子
            Tile(Suit.TONG, 3), Tile(Suit.TONG, 3), Tile(Suit.TONG, 3),  # 刻子
            Tile(Suit.TIAO, 4), Tile(Suit.TIAO, 4), Tile(Suit.TIAO, 4),  # 刻子
            # 10张手牌 + 1张打出的 = 11张，能胡
        ],
        missing_suit=Suit.WAN,  # 缺万，手牌中没有万牌
    )
    game_state = GameState(
        game_id="test",
        players=[player_p1, player_p2, Player("p3"), Player("p4")],
        wall=[Tile(Suit.TONG, 9)] * 10,
        public_discards=[],
        current_player_index=0,
        game_phase=GamePhase.PLAYING,
    )

    # p1 打出 TONG 1
    new_state = PlayerActions.discard_tile(game_state, "p1", Tile(Suit.TONG, 1))

    # p2 应该胡了
    assert new_state.players[1].is_hu


def test_ai_no_response():
    """Test when no AI can respond, next player draws"""
    # p1 打出 TONG 1，没人能碰/杠/胡，p2 应该摸牌
    player_p1 = Player(
        player_id="p1",
        hand=[
            Tile(Suit.TONG, 1), Tile(Suit.TONG, 2), Tile(Suit.TONG, 3),
            Tile(Suit.TONG, 4), Tile(Suit.TONG, 5), Tile(Suit.TONG, 6),
            Tile(Suit.TONG, 7), Tile(Suit.TONG, 8), Tile(Suit.TONG, 9),
            Tile(Suit.TIAO, 1), Tile(Suit.TIAO, 1),
        ],
        missing_suit=Suit.WAN,  # 缺万，手牌中没有万牌
    )
    player_p2 = Player(
        player_id="p2",
        hand=[
            Tile(Suit.TONG, 2), Tile(Suit.TONG, 3),  # 没有 TONG 1
            Tile(Suit.TONG, 4), Tile(Suit.TONG, 5),
            Tile(Suit.TIAO, 6), Tile(Suit.TIAO, 7), Tile(Suit.TIAO, 8),
            Tile(Suit.TIAO, 1), Tile(Suit.TIAO, 2), Tile(Suit.TIAO, 3),
        ],
        missing_suit=Suit.WAN,  # 缺万，手牌中没有万牌
    )
    game_state = GameState(
        game_id="test",
        players=[player_p1, player_p2, Player("p3"), Player("p4")],
        wall=[Tile(Suit.TONG, 9)] * 10,
        public_discards=[],
        current_player_index=0,
        game_phase=GamePhase.PLAYING,
    )

    wall_size_before = len(game_state.wall)

    # p1 打出 TONG 1
    new_state = PlayerActions.discard_tile(game_state, "p1", Tile(Suit.TONG, 1))

    # 没人响应，p2 成为当前玩家并摸了牌
    assert new_state.current_player_index == 1
    assert len(new_state.wall) == wall_size_before - 1  # 摸了一张牌
    assert len(new_state.players[1].hand) == 11  # 10 + 1
