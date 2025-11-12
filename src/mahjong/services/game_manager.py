import random
from typing import List

from mahjong.constants.enums import GamePhase, Suit
from mahjong.exceptions.game_errors import InvalidGameStateError
from mahjong.models.game_state import GameState
from mahjong.models.player import Player
from mahjong.models.tile import Tile
from mahjong.services import get_logger

logger = get_logger(__name__)


class GameManager:
    """Handles the lifecycle of the game."""

    @staticmethod
    def get_game_state(game_state: GameState, player_id: str) -> dict:
        """
        获取针对特定玩家过滤的游戏状态

        根据 PRD.md 第 3.1 节要求：
        "get_game_state(player_id): 获取当前游戏状态。
        为保证信息安全，应根据player_id过滤信息，例如只向该玩家展示其手牌。"

        Args:
            game_state: 当前游戏状态
            player_id: 请求查看状态的玩家ID

        Returns:
            过滤后的游戏状态字典，包含：
            - game_id, game_phase, current_player_index 等基础信息
            - wall_remaining_count: 牌墙剩余数量
            - public_discards: 公共弃牌堆（所有人可见）
            - players: 玩家列表
              - 请求玩家：包含完整 hand（手牌）
              - 其他玩家：只包含 hand_count（手牌数量）
              - 所有玩家：包含 melds（明牌）、buried_cards（埋牌）等公开信息

        Raises:
            ValueError: 如果 player_id 不在游戏中
        """
        return game_state.to_dict_for_player(player_id)

    @staticmethod
    def create_game(player_ids: List[str]) -> GameState:
        """Creates a new game with four players."""
        if len(player_ids) != 4:
            logger.error(
                f"Failed to create game in create_game (game_manager.py): "
                f"Invalid player count {len(player_ids)}, expected 4"
            )
            raise ValueError("A game must have exactly 4 players.")
        players = [Player(player_id=pid) for pid in player_ids]
        game_state = GameState(
            game_id="".join(random.choices("0123456789abcdef", k=8)), players=players
        )
        logger.info(f"Game {game_state.game_id}: Created with {len(player_ids)} players")
        return game_state

    @staticmethod
    def start_game(game_state: GameState) -> GameState:
        """Initializes the game by shuffling the wall and dealing hands."""
        if game_state.game_phase != GamePhase.PREPARING:
            logger.error(
                f"Failed in start_game (game_manager.py): "
                f"Game {game_state.game_id} in phase {game_state.game_phase.name}, expected PREPARING"
            )
            raise InvalidGameStateError(
                "Game can only be started from PREPARING phase."
            )

        # Create wall
        wall = []
        for suit in [Suit.TONG, Suit.TIAO, Suit.WAN]:
            for rank in range(1, 10):
                wall.extend([Tile(suit, rank)] * 4)
        random.shuffle(wall)
        game_state.wall = wall

        # Deal hands
        dealer_id = game_state.players[0].player_id
        logger.info(f"Game {game_state.game_id}: Starting game with dealer {dealer_id}")

        for i, player in enumerate(game_state.players):
            num_tiles = 14 if i == 0 else 13  # Dealer gets 14
            player.hand = sorted(
                game_state.wall[:num_tiles], key=lambda t: (t.suit.value, t.rank)
            )
            game_state.wall = game_state.wall[num_tiles:]

        game_state.game_phase = GamePhase.BURYING
        logger.info(f"Game {game_state.game_id}: Phase transition PREPARING → BURYING")
        return game_state

    @staticmethod
    def end_game(game_state: GameState) -> GameState:
        """
        结束游戏

        简化实现说明：
        - 游戏模式为 1 个真人 + 3 个 AI
        - AI 按规则严格执行，不会出现逻辑错误
        - 因此不需要"查花猪"、"查大叫"、"退杠分"等检查
        - 杠分已在发生时即时结算（刮风下雨）

        游戏结束条件：
        - 牌墙摸完（wall 为空）

        Returns:
            更新后的游戏状态
        """
        if game_state.game_phase == GamePhase.ENDED:
            return game_state

        # Log final scores for all players
        scores_summary = ", ".join(
            f"{p.player_id}={p.score}" for p in game_state.players
        )
        logger.info(f"Game {game_state.game_id}: Ending game with scores: {scores_summary}")

        # Cache previous phase before mutation for accurate logging
        prev_phase = game_state.game_phase
        game_state.game_phase = GamePhase.ENDED
        logger.info(f"Game {game_state.game_id}: Phase transition {prev_phase.name} → ENDED")
        return game_state
