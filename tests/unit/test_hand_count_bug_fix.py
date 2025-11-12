"""测试修复：AI打牌循环导致的手牌累积bug（17张手牌）"""
import pytest
from mahjong.constants.enums import GamePhase, Suit
from mahjong.models.game_state import GameState
from mahjong.models.player import Player
from mahjong.models.tile import Tile
from mahjong.services.player_actions import PlayerActions


def test_no_hand_accumulation_with_skip_responses():
    """
    测试：使用 skip_responses=True 时，不会导致手牌累积

    之前的bug：
    - AI_1 打牌（skip_responses=True）→ _next_player_draw → AI_2 摸牌
    - api.py 收集响应，调用 process_responses → _next_player_draw → AI_3 摸牌
    - 结果：每轮打牌导致2次摸牌，手牌累积到17张

    修复后：
    - AI_1 打牌（skip_responses=True）→ 只返回打牌后的状态，不摸牌
    - api.py 收集响应，调用 process_responses → _next_player_draw → 下一个玩家摸牌
    - 结果：每轮打牌只摸1次牌，手牌数量正确
    """
    # 设置初始游戏状态
    game_state = GameState(
        game_id="test",
        players=[
            Player("human", hand=[Tile(Suit.TONG, 1)] * 10, missing_suit=Suit.TIAO),
            Player("AI_1", hand=[Tile(Suit.TONG, 2)] * 11, missing_suit=Suit.TIAO),
            Player("AI_2", hand=[Tile(Suit.TONG, 3)] * 10, missing_suit=Suit.TIAO),
            Player("AI_3", hand=[Tile(Suit.TONG, 4)] * 10, missing_suit=Suit.TIAO),
        ],
        wall=[Tile(Suit.WAN, 5)] * 50,  # 足够的牌
        game_phase=GamePhase.PLAYING,
        current_player_index=1,  # AI_1 的回合
        public_discards=[],
    )

    # AI_1 打牌（使用 skip_responses=True，模拟 api.py 中的调用）
    tile_to_discard = Tile(Suit.TONG, 2)
    game_state_after_discard = PlayerActions.discard_tile(
        game_state, "AI_1", tile_to_discard, skip_responses=True
    )

    # 验证1：打牌后，current_player_index 没有改变（还是 AI_1 的回合）
    assert game_state_after_discard.current_player_index == 1, \
        "skip_responses=True 时，current_player_index 不应该改变"

    # 验证2：AI_1 的手牌减少1张（11 → 10）
    ai_1_after = game_state_after_discard.players[1]
    assert len(ai_1_after.hand) == 10, \
        f"AI_1 should have 10 cards after discarding, got {len(ai_1_after.hand)}"

    # 验证3：其他玩家的手牌没有改变
    human_after = game_state_after_discard.players[0]
    ai_2_after = game_state_after_discard.players[2]
    ai_3_after = game_state_after_discard.players[3]

    assert len(human_after.hand) == 10, "Human should still have 10 cards"
    assert len(ai_2_after.hand) == 10, "AI_2 should still have 10 cards"
    assert len(ai_3_after.hand) == 10, "AI_3 should still have 10 cards"

    # 验证4：弃牌堆增加1张
    assert len(game_state_after_discard.public_discards) == 1
    assert game_state_after_discard.public_discards[-1] == tile_to_discard

    # 模拟 api.py 的后续操作：收集响应并处理
    responses = PlayerActions.collect_ai_responses(
        game_state_after_discard, tile_to_discard, "AI_1"
    )
    game_state_after_responses = PlayerActions.process_responses(
        game_state_after_discard, responses, "AI_1"
    )

    # 验证5：process_responses 后，下一个玩家（AI_2）摸牌
    assert game_state_after_responses.current_player_index == 2, \
        "After process_responses, should be AI_2's turn"

    ai_2_final = game_state_after_responses.players[2]
    assert len(ai_2_final.hand) == 11, \
        f"AI_2 should have 11 cards after drawing, got {len(ai_2_final.hand)}"

    # 验证6：其他玩家手牌没有继续累积
    human_final = game_state_after_responses.players[0]
    ai_1_final = game_state_after_responses.players[1]
    ai_3_final = game_state_after_responses.players[3]

    assert len(human_final.hand) == 10, "Human should still have 10 cards"
    assert len(ai_1_final.hand) == 10, "AI_1 should still have 10 cards"
    assert len(ai_3_final.hand) == 10, "AI_3 should still have 10 cards"


def test_multiple_ai_turns_no_accumulation():
    """
    测试：多轮 AI 打牌后，手牌数量保持正确（不累积到17张）
    """
    game_state = GameState(
        game_id="test",
        players=[
            Player("human", hand=[Tile(Suit.TONG, 1)] * 10, missing_suit=Suit.TIAO),
            Player("AI_1", hand=[Tile(Suit.TONG, 2)] * 11, missing_suit=Suit.TIAO),
            Player("AI_2", hand=[Tile(Suit.TONG, 3)] * 10, missing_suit=Suit.TIAO),
            Player("AI_3", hand=[Tile(Suit.TONG, 4)] * 10, missing_suit=Suit.TIAO),
        ],
        wall=[Tile(Suit.WAN, i) for i in range(1, 10)] * 20,
        game_phase=GamePhase.PLAYING,
        current_player_index=1,
        public_discards=[],
    )

    # 模拟 AI 循环：AI_1 → AI_2 → AI_3 → 轮到 human
    for ai_player_id, tile_rank in [("AI_1", 2), ("AI_2", 3), ("AI_3", 4)]:
        current_player_idx = game_state.current_player_index
        current_player = game_state.players[current_player_idx]

        # 确认轮到正确的玩家
        assert current_player.player_id == ai_player_id, \
            f"Expected {ai_player_id}'s turn, but current player is {current_player.player_id}"

        # AI 打牌（skip_responses=True）
        tile = Tile(Suit.TONG, tile_rank)
        game_state = PlayerActions.discard_tile(game_state, ai_player_id, tile, skip_responses=True)

        # 收集并处理响应
        responses = PlayerActions.collect_ai_responses(game_state, tile, ai_player_id)
        game_state = PlayerActions.process_responses(game_state, responses, ai_player_id)

    # 验证：轮到 human
    assert game_state.current_player_index == 0, "Should be human's turn after AI cycle"

    # 验证：所有玩家的手牌数量正确
    human = game_state.players[0]
    ai_1 = game_state.players[1]
    ai_2 = game_state.players[2]
    ai_3 = game_state.players[3]

    # human 应该摸了1张牌（10 → 11）
    assert len(human.hand) == 11, f"Human should have 11 cards, got {len(human.hand)}"

    # 每个 AI 都打出1张牌，摸了1张牌，最终应该还是10张
    assert len(ai_1.hand) == 10, f"AI_1 should have 10 cards, got {len(ai_1.hand)}"
    assert len(ai_2.hand) == 10, f"AI_2 should have 10 cards, got {len(ai_2.hand)}"
    assert len(ai_3.hand) == 10, f"AI_3 should have 10 cards, got {len(ai_3.hand)}"

    # 验证：没有任何玩家累积到超过14张（之前的bug会导致17张）
    for player in game_state.players:
        assert len(player.hand) <= 11, \
            f"Player {player.player_id} has {len(player.hand)} cards, should not exceed 11"
