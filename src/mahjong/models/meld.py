from dataclasses import dataclass
from typing import List

from mahjong.constants.enums import ActionType
from mahjong.models.tile import Tile


@dataclass(frozen=True)
class Meld:
    meld_type: ActionType
    tiles: List[Tile]
