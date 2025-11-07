"""API-layer data models."""

from dataclasses import dataclass
from datetime import datetime
from typing import List

from mahjong.models.game_state import GameState


@dataclass
class GameSession:
    """API-layer wrapper for GameState with lifecycle metadata.

    Attributes:
        game_id: UUID v4 identifier
        created_at: Timestamp for periodic cleanup (24-hour threshold)
        game_state: Core game logic state from mahjong library
        ai_order: Fixed order of AI player IDs for deterministic turn execution
    """
    game_id: str
    created_at: datetime
    game_state: GameState
    ai_order: List[str]  # e.g., ["ai_1", "ai_2", "ai_3"]
