from dataclasses import dataclass, field
from typing import List

from mahjong.constants.enums import GamePhase
from mahjong.models.player import Player
from mahjong.models.tile import Tile


@dataclass
class GameState:
    game_id: str
    players: List[Player] = field(default_factory=list)
    current_player_index: int = 0
    wall: List[Tile] = field(default_factory=list)
    public_discards: List[Tile] = field(default_factory=list)
    game_phase: GamePhase = GamePhase.PREPARING

    @property
    def wall_remaining_count(self) -> int:
        return len(self.wall)
