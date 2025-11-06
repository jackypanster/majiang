from dataclasses import dataclass

from mahjong.constants.enums import ActionType
from mahjong.models.tile import Tile


@dataclass
class PlayerResponse:
    """玩家对打出牌的响应"""
    player_id: str
    action_type: ActionType  # HU, KONG_EXPOSED, PONG, PASS
    target_tile: Tile
    priority: int  # 优先级：HU=3, KONG=2, PONG=1, PASS=0

    @staticmethod
    def get_priority(action_type: ActionType) -> int:
        """获取动作优先级"""
        if action_type == ActionType.HU:
            return 3
        elif action_type in (ActionType.KONG, ActionType.KONG_EXPOSED):
            return 2
        elif action_type == ActionType.PONG:
            return 1
        else:  # PASS
            return 0
