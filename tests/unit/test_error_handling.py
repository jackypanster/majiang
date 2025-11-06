"""测试错误处理（Issue #41 - Part 2）"""
import pytest
from mahjong.constants.enums import GamePhase, Suit, ActionType
from mahjong.models.game_state import GameState
from mahjong.models.player import Player
from mahjong.models.tile import Tile
from mahjong.services.player_actions import PlayerActions
from mahjong.exceptions.game_errors import InvalidActionError


def test_discard_tile_not_in_hand():
    """测试：打出不在手牌中的牌应该失败"""
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

    # 尝试打出一张不在手牌中的牌
    tile_not_in_hand = Tile(Suit.WAN, 5)
    with pytest.raises(InvalidActionError, match="not in player's hand"):
        PlayerActions.discard_tile(game_state, "p1", tile_not_in_hand)


# 注意：bury_tiles 方法尚未实现，相关测试跳过


def test_action_in_wrong_phase_discard_in_preparing():
    """测试：在准备阶段尝试打牌应该失败"""
    from mahjong.exceptions.game_errors import InvalidGameStateError

    game_state = GameState(
        game_id="test",
        players=[Player(f"p{i}") for i in range(1, 5)],
        wall=[Tile(Suit.WAN, 9)] * 108,
        game_phase=GamePhase.PREPARING,  # 准备阶段
        current_player_index=0,
    )

    with pytest.raises(InvalidGameStateError, match="Cannot discard tile outside of PLAYING phase"):
        PlayerActions.discard_tile(game_state, "p1", Tile(Suit.TONG, 1))


def test_declare_action_not_current_turn():
    """测试：非当前玩家尝试声明动作（非响应式）"""
    # 注意：declare_action 主要用于响应式动作（碰/杠/胡），不检查回合
    # 这个测试验证只有响应式动作允许非当前玩家执行
    game_state = GameState(
        game_id="test",
        players=[
            Player("p1", hand=[Tile(Suit.TONG, 1)] * 11, missing_suit=Suit.TIAO),
            Player("p2", hand=[Tile(Suit.TONG, 2)] * 3 + [Tile(Suit.WAN, 1)] * 8, missing_suit=Suit.TIAO),
            Player("p3", hand=[Tile(Suit.TONG, 3)] * 11, missing_suit=Suit.TIAO),
            Player("p4", hand=[Tile(Suit.TONG, 4)] * 11, missing_suit=Suit.TIAO),
        ],
        wall=[Tile(Suit.WAN, 9)] * 20,
        game_phase=GamePhase.PLAYING,
        current_player_index=0,  # p1 是当前玩家
        public_discards=[Tile(Suit.TONG, 2)],  # p1 刚打出 TONG 2
    )

    # p2 可以响应碰牌（即使不是他的回合）
    # 这是允许的，因为 declare_action 是响应式的
    game_state = PlayerActions.declare_action(
        game_state, "p2", ActionType.PONG, Tile(Suit.TONG, 2)
    )
    assert len(game_state.players[1].melds) == 1


def test_pong_without_enough_tiles():
    """测试：没有足够的牌进行碰应该失败"""
    game_state = GameState(
        game_id="test",
        players=[
            Player("p1", hand=[Tile(Suit.TONG, 1)] * 11, missing_suit=Suit.TIAO),
            Player(
                "p2",
                hand=[Tile(Suit.TONG, 2)] * 1 + [Tile(Suit.WAN, 1)] * 10,  # 只有1张 TONG 2
                missing_suit=Suit.TIAO,
            ),
            Player("p3", hand=[Tile(Suit.TONG, 3)] * 11, missing_suit=Suit.TIAO),
            Player("p4", hand=[Tile(Suit.TONG, 4)] * 11, missing_suit=Suit.TIAO),
        ],
        wall=[Tile(Suit.WAN, 9)] * 20,
        game_phase=GamePhase.PLAYING,
        current_player_index=0,
        public_discards=[Tile(Suit.TONG, 2)],
    )

    # p2 尝试碰 TONG 2，但只有1张
    with pytest.raises(InvalidActionError, match="only has 1 in hand"):
        PlayerActions.declare_action(
            game_state, "p2", ActionType.PONG, Tile(Suit.TONG, 2)
        )


def test_kong_exposed_without_enough_tiles():
    """测试：没有足够的牌进行明杠应该失败"""
    game_state = GameState(
        game_id="test",
        players=[
            Player("p1", hand=[Tile(Suit.TONG, 1)] * 11, missing_suit=Suit.TIAO),
            Player(
                "p2",
                hand=[Tile(Suit.TONG, 2)] * 2 + [Tile(Suit.WAN, 1)] * 9,  # 只有2张 TONG 2
                missing_suit=Suit.TIAO,
            ),
            Player("p3", hand=[Tile(Suit.TONG, 3)] * 11, missing_suit=Suit.TIAO),
            Player("p4", hand=[Tile(Suit.TONG, 4)] * 11, missing_suit=Suit.TIAO),
        ],
        wall=[Tile(Suit.WAN, 9)] * 20,
        game_phase=GamePhase.PLAYING,
        current_player_index=0,
        public_discards=[Tile(Suit.TONG, 2)],
    )

    # p2 尝试明杠 TONG 2，但只有2张
    with pytest.raises(InvalidActionError, match="only has 2 in hand"):
        PlayerActions.declare_action(
            game_state, "p2", ActionType.KONG_EXPOSED, Tile(Suit.TONG, 2)
        )


def test_kong_concealed_without_four_tiles():
    """测试：没有4张相同牌无法暗杠"""
    game_state = GameState(
        game_id="test",
        players=[
            Player(
                "p1",
                hand=[Tile(Suit.TONG, 1)] * 3 + [Tile(Suit.WAN, 1)] * 8,  # 只有3张 TONG 1
                missing_suit=Suit.TIAO,
            ),
            Player("p2", hand=[Tile(Suit.TONG, 2)] * 11, missing_suit=Suit.TIAO),
            Player("p3", hand=[Tile(Suit.TONG, 3)] * 11, missing_suit=Suit.TIAO),
            Player("p4", hand=[Tile(Suit.TONG, 4)] * 11, missing_suit=Suit.TIAO),
        ],
        wall=[Tile(Suit.WAN, 9)] * 20,
        game_phase=GamePhase.PLAYING,
        current_player_index=0,
    )

    # p1 尝试暗杠 TONG 1，但只有3张
    with pytest.raises(InvalidActionError, match="only has 3 in hand"):
        PlayerActions.declare_action(
            game_state, "p1", ActionType.KONG_CONCEALED, Tile(Suit.TONG, 1)
        )


def test_kong_upgrade_without_pong():
    """测试：没有碰过的牌无法补杠"""
    from mahjong.models.meld import Meld

    game_state = GameState(
        game_id="test",
        players=[
            Player(
                "p1",
                hand=[Tile(Suit.TONG, 1)] * 1 + [Tile(Suit.WAN, 1)] * 10,
                melds=[
                    Meld(ActionType.PONG, (Tile(Suit.TONG, 2),) * 3, is_concealed=False)
                ],  # 碰的是 TONG 2
                missing_suit=Suit.TIAO,
            ),
            Player("p2", hand=[Tile(Suit.TONG, 2)] * 11, missing_suit=Suit.TIAO),
            Player("p3", hand=[Tile(Suit.TONG, 3)] * 11, missing_suit=Suit.TIAO),
            Player("p4", hand=[Tile(Suit.TONG, 4)] * 11, missing_suit=Suit.TIAO),
        ],
        wall=[Tile(Suit.WAN, 9)] * 20,
        game_phase=GamePhase.PLAYING,
        current_player_index=0,
    )

    # p1 尝试补杠 TONG 1，但没有碰过 TONG 1
    with pytest.raises(InvalidActionError, match="no existing PONG found"):
        PlayerActions.declare_action(
            game_state, "p1", ActionType.KONG_UPGRADE, Tile(Suit.TONG, 1)
        )


def test_invalid_player_id():
    """测试：使用不存在的玩家ID应该失败"""
    game_state = GameState(
        game_id="test",
        players=[Player(f"p{i}", hand=[Tile(Suit.TONG, i)] * 11) for i in range(1, 5)],
        wall=[Tile(Suit.WAN, 9)] * 20,
        game_phase=GamePhase.PLAYING,
        current_player_index=0,
    )

    # 使用不存在的玩家ID（会因为不是该玩家回合而报错）
    with pytest.raises(InvalidActionError, match="not player .* turn"):
        PlayerActions.discard_tile(game_state, "invalid_player", Tile(Suit.TONG, 1))
