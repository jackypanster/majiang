"""测试血战到底规则（Issue #45 回归测试）"""
import pytest
from dataclasses import replace
from mahjong.constants.enums import GamePhase, Suit, ActionType
from mahjong.models.game_state import GameState
from mahjong.models.player import Player
from mahjong.models.tile import Tile
from mahjong.services.player_actions import PlayerActions
from mahjong.exceptions.game_errors import InvalidActionError


def test_winner_can_continue_to_hu():
    """测试：已胡玩家可以继续胡牌（二次胡）"""
    game_state = GameState(
        game_id="test",
        players=[
            Player("p1", hand=[Tile(Suit.TONG, 1)] * 10 + [Tile(Suit.WAN, 5)], missing_suit=Suit.TIAO),
            # p2 已经胡牌，但仍可以继续胡
            Player(
                "p2",
                hand=[
                    Tile(Suit.TONG, 1), Tile(Suit.TONG, 2), Tile(Suit.TONG, 3),
                    Tile(Suit.TONG, 4), Tile(Suit.TONG, 5), Tile(Suit.TONG, 6),
                    Tile(Suit.WAN, 1), Tile(Suit.WAN, 2), Tile(Suit.WAN, 3),
                    Tile(Suit.WAN, 5),  # 差一张 WAN 5
                ],
                is_hu=True,  # 已经胡过一次
                missing_suit=Suit.TIAO,
            ),
            Player("p3", hand=[Tile(Suit.TONG, 3)] * 11, missing_suit=Suit.TIAO),
            Player("p4", hand=[Tile(Suit.TONG, 4)] * 11, missing_suit=Suit.TIAO),
        ],
        wall=[Tile(Suit.WAN, 9)] * 20,
        game_phase=GamePhase.PLAYING,
        current_player_index=0,
        public_discards=[],
    )

    # p1 打出 WAN 5
    game_state = PlayerActions.discard_tile(game_state, "p1", Tile(Suit.WAN, 5))

    # p2 应该能够胡牌（二次胡）
    # discard_tile 会自动处理 AI 响应，检查 p2 是否仍标记为 is_hu
    assert game_state.players[1].is_hu is True


def test_winner_must_discard_drawn_tile():
    """测试：已胡玩家必须打出刚摸的牌（摸什么打什么）"""
    player = Player(
        "p1",
        hand=[
            Tile(Suit.TONG, 1), Tile(Suit.TONG, 2), Tile(Suit.TONG, 3),
            Tile(Suit.WAN, 1), Tile(Suit.WAN, 2),
        ],
        is_hu=True,
        last_drawn_tile=Tile(Suit.WAN, 2),  # 刚摸的牌
        missing_suit=Suit.TIAO,
    )

    game_state = GameState(
        game_id="test",
        players=[
            player,
            Player("p2", hand=[Tile(Suit.TONG, 2)] * 11, missing_suit=Suit.TIAO),
            Player("p3", hand=[Tile(Suit.TONG, 3)] * 11, missing_suit=Suit.TIAO),
            Player("p4", hand=[Tile(Suit.TONG, 4)] * 11, missing_suit=Suit.TIAO),
        ],
        wall=[Tile(Suit.WAN, 9)] * 20,
        game_phase=GamePhase.PLAYING,
        current_player_index=0,
    )

    # 尝试打出其他牌应该失败
    with pytest.raises(InvalidActionError, match="必须打出刚摸的牌"):
        PlayerActions.discard_tile(game_state, "p1", Tile(Suit.TONG, 1))

    # 打出刚摸的牌应该成功
    game_state_after = PlayerActions.discard_tile(game_state, "p1", Tile(Suit.WAN, 2))
    # 验证 last_drawn_tile 被清除
    assert game_state_after.players[0].last_drawn_tile is None


def test_winner_cannot_pong_or_kong():
    """测试：已胡玩家不能碰/杠（手牌已锁定）"""
    game_state = GameState(
        game_id="test",
        players=[
            Player("p1", hand=[Tile(Suit.TONG, 1)] * 11, missing_suit=Suit.TIAO),
            Player(
                "p2",
                hand=[Tile(Suit.TONG, 5)] * 3 + [Tile(Suit.WAN, 1)] * 8,
                is_hu=True,  # 已经胡牌
                missing_suit=Suit.TIAO,
            ),
            Player("p3", hand=[Tile(Suit.TONG, 3)] * 11, missing_suit=Suit.TIAO),
            Player("p4", hand=[Tile(Suit.TONG, 4)] * 11, missing_suit=Suit.TIAO),
        ],
        wall=[Tile(Suit.WAN, 9)] * 20,
        game_phase=GamePhase.PLAYING,
        current_player_index=1,
        public_discards=[Tile(Suit.TONG, 5)],
    )

    # p2 尝试碰应该失败
    with pytest.raises(InvalidActionError, match="手牌已锁定"):
        PlayerActions.declare_action(
            game_state, "p2", ActionType.PONG, Tile(Suit.TONG, 5)
        )

    # p2 尝试明杠应该失败
    with pytest.raises(InvalidActionError, match="手牌已锁定"):
        PlayerActions.declare_action(
            game_state, "p2", ActionType.KONG_EXPOSED, Tile(Suit.TONG, 5)
        )


def test_winner_cannot_concealed_kong():
    """测试：已胡玩家不能暗杠"""
    game_state = GameState(
        game_id="test",
        players=[
            Player(
                "p1",
                hand=[Tile(Suit.TONG, 1)] * 4 + [Tile(Suit.WAN, 1)] * 7,
                is_hu=True,  # 已经胡牌
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

    # p1 尝试暗杠应该失败
    with pytest.raises(InvalidActionError, match="手牌已锁定"):
        PlayerActions.declare_action(
            game_state, "p1", ActionType.KONG_CONCEALED, Tile(Suit.TONG, 1)
        )


def test_empty_wall_with_no_winner_triggers_draw():
    """测试：牌墙为空且无人胡牌时触发流局"""
    game_state = GameState(
        game_id="test",
        players=[
            Player("p1", hand=[Tile(Suit.TONG, 1)] * 11, is_hu=False, missing_suit=Suit.TIAO),
            Player("p2", hand=[Tile(Suit.TONG, 2)] * 11, is_hu=False, missing_suit=Suit.TIAO),
            Player("p3", hand=[Tile(Suit.TONG, 3)] * 11, is_hu=False, missing_suit=Suit.TIAO),
            Player("p4", hand=[Tile(Suit.TONG, 4)] * 11, is_hu=False, missing_suit=Suit.TIAO),
        ],
        wall=[],  # 牌墙为空
        game_phase=GamePhase.PLAYING,
        current_player_index=0,
        public_discards=[],
    )

    # p1 打牌，无人响应，应该触发流局
    game_state = PlayerActions.discard_tile(game_state, "p1", Tile(Suit.TONG, 1))

    # 验证游戏结束
    assert game_state.game_phase == GamePhase.ENDED


def test_empty_wall_with_winner_ends_game():
    """测试：牌墙为空且有人胡牌时正常结束游戏"""
    game_state = GameState(
        game_id="test",
        players=[
            Player("p1", hand=[Tile(Suit.TONG, 1)] * 11, is_hu=True, missing_suit=Suit.TIAO),  # 已胡
            Player("p2", hand=[Tile(Suit.TONG, 2)] * 11, is_hu=False, missing_suit=Suit.TIAO),
            Player("p3", hand=[Tile(Suit.TONG, 3)] * 11, is_hu=False, missing_suit=Suit.TIAO),
            Player("p4", hand=[Tile(Suit.TONG, 4)] * 11, is_hu=False, missing_suit=Suit.TIAO),
        ],
        wall=[],  # 牌墙为空
        game_phase=GamePhase.PLAYING,
        current_player_index=1,
        public_discards=[],
    )

    # p2 打牌，无人响应，应该结束游戏（有人胡牌）
    game_state = PlayerActions.discard_tile(game_state, "p2", Tile(Suit.TONG, 2))

    # 验证游戏结束
    assert game_state.game_phase == GamePhase.ENDED


def test_drawn_tile_recorded_correctly():
    """测试：摸牌后正确记录 last_drawn_tile"""
    game_state = GameState(
        game_id="test",
        players=[
            Player("p1", hand=[Tile(Suit.TONG, 1)] * 10, is_hu=True, missing_suit=Suit.TIAO),
            Player("p2", hand=[Tile(Suit.TONG, 2)] * 11, missing_suit=Suit.TIAO),
            Player("p3", hand=[Tile(Suit.TONG, 3)] * 11, missing_suit=Suit.TIAO),
            Player("p4", hand=[Tile(Suit.TONG, 4)] * 11, missing_suit=Suit.TIAO),
        ],
        wall=[Tile(Suit.WAN, 5), Tile(Suit.WAN, 9)] * 10,
        game_phase=GamePhase.PLAYING,
        current_player_index=0,
    )

    # p1 打牌，触发摸牌
    game_state = PlayerActions.discard_tile(game_state, "p1", Tile(Suit.TONG, 1))

    # 验证下一个玩家（p2）摸到了牌
    # 注意：current_player_index 会变成 1（p2）
    next_player = game_state.players[game_state.current_player_index]
    assert next_player.last_drawn_tile is not None
    assert len(next_player.hand) == 12  # 11 + 1
