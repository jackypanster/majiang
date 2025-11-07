"""AI decision logic for computer players."""

import logging
from typing import List, Optional
import random

from mahjong.constants.enums import Suit, ActionType
from mahjong.models.player import Player
from mahjong.models.tile import Tile
from mahjong.models.game_state import GameState
from mahjong.models.response import PlayerResponse
from mahjong.services.win_checker import WinChecker

logger = logging.getLogger(__name__)


def choose_bury_tiles(player: Player) -> List[Tile]:
    """Choose 3 tiles to bury from least common suit.

    Args:
        player: Player with dealt hand

    Returns:
        List of 3 tiles from least common suit
    """
    suit_counts = {suit: 0 for suit in Suit}
    for tile in player.hand:
        suit_counts[tile.suit] += 1

    min_suit = min(suit_counts, key=suit_counts.get)
    tiles_of_min_suit = [t for t in player.hand if t.suit == min_suit]

    # Return first 3 tiles of that suit
    return tiles_of_min_suit[:3]


def choose_discard_tile(player: Player, game_state: GameState) -> Tile:
    """Choose a tile to discard using simple heuristics.

    Priority:
    1. Tiles from missing suit (must discard if present)
    2. Lone tiles (no adjacent ranks in same suit)
    3. Random from hand

    Args:
        player: Player whose turn it is
        game_state: Current game state

    Returns:
        Tile to discard
    """
    # Priority 1: Missing suit tiles
    if player.missing_suit:
        missing_tiles = [t for t in player.hand if t.suit == player.missing_suit]
        if missing_tiles:
            return missing_tiles[0]

    # Priority 2: Find lone tiles (simplified heuristic)
    # A tile is "lone" if it has no adjacent ranks nearby
    lone_tiles = []
    for tile in player.hand:
        adjacent_count = sum(
            1 for t in player.hand
            if t.suit == tile.suit and abs(t.rank - tile.rank) == 1
        )
        if adjacent_count == 0:
            lone_tiles.append(tile)

    if lone_tiles:
        return lone_tiles[0]

    # Priority 3: Random tile
    return random.choice(player.hand) if player.hand else player.hand[0]


def choose_response(
    player: Player,
    discarded_tile: Tile,
    game_state: GameState
) -> PlayerResponse:
    """Choose response to opponent's discard.

    Priority: hu > gang > peng > skip

    Args:
        player: Player responding to discard
        discarded_tile: Tile that was just discarded
        game_state: Current game state

    Returns:
        PlayerResponse with action and optional tiles
    """
    # Priority 1: Check if can win (hu)
    if WinChecker.is_hu(player, discarded_tile):
        logger.info(f"AI {player.id} chooses HU on {discarded_tile}")
        return PlayerResponse(action_type=ActionType.HU, tiles=[discarded_tile])

    # Priority 2: Check if can gang (need 3 matching tiles in hand)
    gang_count = sum(1 for t in player.hand if t == discarded_tile)
    if gang_count == 3:
        logger.info(f"AI {player.id} chooses GANG on {discarded_tile}")
        return PlayerResponse(action_type=ActionType.GANG, tiles=[discarded_tile])

    # Priority 3: Check if can peng (need 2 matching tiles in hand)
    peng_count = sum(1 for t in player.hand if t == discarded_tile)
    if peng_count == 2:
        logger.info(f"AI {player.id} chooses PENG on {discarded_tile}")
        return PlayerResponse(action_type=ActionType.PENG, tiles=[discarded_tile])

    # Priority 4: Skip
    logger.info(f"AI {player.id} skips on {discarded_tile}")
    return PlayerResponse(action_type=ActionType.SKIP, tiles=[])
