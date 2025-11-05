from dataclasses import dataclass, field
from typing import List, Optional

from mahjong.constants.enums import Suit
from mahjong.models.meld import Meld
from mahjong.models.tile import Tile


@dataclass
class Player:
    player_id: str
    hand: List[Tile] = field(default_factory=list)
    melds: List[Meld] = field(default_factory=list)
    buried_cards: List[Tile] = field(default_factory=list)
    missing_suit: Optional[Suit] = None
    score: int = 0
    is_hu: bool = False
