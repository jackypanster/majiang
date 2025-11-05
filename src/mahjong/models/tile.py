from dataclasses import dataclass

from mahjong.constants.enums import Suit


@dataclass(frozen=True)
class Tile:
    suit: Suit
    rank: int

    def __post_init__(self):
        if not 1 <= self.rank <= 9:
            raise ValueError("Rank must be between 1 and 9")
