"""
Discarded Tile Model

记录打出的牌及其打牌者信息
"""

from dataclasses import dataclass
from mahjong.models.tile import Tile


@dataclass(frozen=True)
class DiscardedTile:
    """记录打出的牌及其打牌者

    Attributes:
        tile: 打出的麻将牌
        player_id: 打牌者ID（"human", "ai_1", "ai_2", "ai_3"）
        turn_index: 第几张打出的牌（从0开始，用于排序和动画）
    """
    tile: Tile
    player_id: str
    turn_index: int

    def to_dict(self) -> dict:
        """序列化为字典（用于API响应）"""
        return {
            "tile": {
                "suit": self.tile.suit.name,
                "rank": self.tile.rank
            },
            "playerId": self.player_id,
            "turnIndex": self.turn_index
        }
