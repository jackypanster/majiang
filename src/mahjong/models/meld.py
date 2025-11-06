from dataclasses import dataclass
from typing import Tuple

from mahjong.constants.enums import ActionType
from mahjong.models.tile import Tile


@dataclass(frozen=True)
class Meld:
    """
    表示明牌组合（碰、杠）

    使用 frozen=True 确保不可变性。
    tiles 使用 Tuple 而非 List，保持类型一致性：
    - Tuple 是不可变的，与 frozen=True 语义一致
    - List 是可变的，会破坏不可变保证

    Attributes:
        meld_type: 明牌类型（PONG, KONG_EXPOSED, KONG_CONCEALED, KONG_UPGRADE）
        tiles: 牌的元组（不可变）
        is_concealed: 是否暗杠（用于判断门清）
            - True: 暗杠（不破坏门清）
            - False: 碰/明杠/补杠（破坏门清）
    """
    meld_type: ActionType
    tiles: Tuple[Tile, ...]
    is_concealed: bool = False
