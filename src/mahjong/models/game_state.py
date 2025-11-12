from dataclasses import dataclass, field
from typing import List

from mahjong.constants.enums import GamePhase
from mahjong.models.player import Player
from mahjong.models.tile import Tile
from mahjong.models.discarded_tile import DiscardedTile


@dataclass
class GameState:
    game_id: str
    players: List[Player] = field(default_factory=list)
    current_player_index: int = 0
    wall: List[Tile] = field(default_factory=list)
    public_discards: List[DiscardedTile] = field(default_factory=list)
    game_phase: GamePhase = GamePhase.PREPARING
    base_score: int = 1  # 底分（杠分计算用）
    initial_total_score: int = 400  # 初始总分（4人×100分，用于验证零和）

    @property
    def wall_remaining_count(self) -> int:
        return len(self.wall)

    def verify_zero_sum(self) -> None:
        """验证零和性质：所有玩家分数总和必须等于初始总分"""
        total = sum(p.score for p in self.players)
        if total != self.initial_total_score:
            raise RuntimeError(
                f"Zero-sum violation in game {self.game_id}: "
                f"total={total}, expected={self.initial_total_score}"
            )

    def to_dict_for_player(self, player_id: str) -> dict:
        """
        返回针对特定玩家过滤的游戏状态字典

        根据 PRD.md 第 3.1 节要求：
        "为保证信息安全，应根据player_id过滤信息，例如只向该玩家展示其手牌"

        过滤规则：
        - 请求玩家的手牌：完整显示
        - 其他玩家的手牌：只显示数量
        - 所有公开信息：完整显示（明牌、弃牌堆、埋牌等）

        Args:
            player_id: 请求查看状态的玩家ID

        Returns:
            过滤后的游戏状态字典
        """
        # 验证玩家存在
        player_ids = [p.player_id for p in self.players]
        if player_id not in player_ids:
            raise ValueError(f"Player {player_id} not found in game {self.game_id}")

        return {
            "game_id": self.game_id,
            "game_phase": self.game_phase.name,
            "current_player_index": self.current_player_index,
            "wall_remaining_count": self.wall_remaining_count,
            "public_discards": [
                discard.to_dict()
                for discard in self.public_discards
            ],
            "base_score": self.base_score,
            "players": [
                self._filter_player_data(p, p.player_id == player_id)
                for p in self.players
            ],
        }

    def _filter_player_data(self, player: Player, is_viewer: bool) -> dict:
        """
        过滤单个玩家的数据

        Args:
            player: 玩家对象
            is_viewer: 是否是请求查看的玩家

        Returns:
            过滤后的玩家数据字典
        """
        data = {
            "player_id": player.player_id,
            "score": player.score,
            "is_hu": player.is_hu,
            "missing_suit": player.missing_suit.name if player.missing_suit else None,
            "melds": [
                {
                    "meld_type": meld.meld_type.name,
                    "tiles": [
                        {"suit": tile.suit.name, "rank": tile.rank}
                        for tile in meld.tiles
                    ],
                }
                for meld in player.melds
            ],
            "hu_tiles": [
                {"suit": tile.suit.name, "rank": tile.rank}
                for tile in player.hu_tiles
            ],
            "buried_cards": [
                {"suit": tile.suit.name, "rank": tile.rank}
                for tile in player.buried_cards
            ],
        }

        # 只有请求的玩家能看到自己的完整手牌和最后摸的牌
        if is_viewer:
            data["hand"] = [
                {"suit": tile.suit.name, "rank": tile.rank}
                for tile in player.hand
            ]
            # 最后摸的牌（用于自摸胡牌检测）
            data["last_drawn_tile"] = (
                {"suit": player.last_drawn_tile.suit.name, "rank": player.last_drawn_tile.rank}
                if player.last_drawn_tile
                else None
            )
        else:
            # 其他玩家只能看到手牌数量
            data["hand_count"] = len(player.hand)

        return data
