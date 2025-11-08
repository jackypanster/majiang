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
        List of 3 tiles from least common suit (guaranteed to be exactly 3)
    """
    suit_counts = {suit: 0 for suit in Suit}
    for tile in player.hand:
        suit_counts[tile.suit] += 1

    # Sort suits by count (ascending), filter out suits with < 3 tiles
    valid_suits = [
        (suit, count) for suit, count in suit_counts.items() if count >= 3
    ]

    if not valid_suits:
        # Edge case: no suit has 3+ tiles (shouldn't happen with 14 cards)
        logger.error(f"AI {player.player_id}: No suit has 3+ tiles, suit_counts={suit_counts}")
        # Fallback: return any 3 tiles
        return player.hand[:3]

    # Choose suit with minimum count (but at least 3 tiles)
    min_suit = min(valid_suits, key=lambda x: x[1])[0]
    tiles_of_min_suit = [t for t in player.hand if t.suit == min_suit]

    # Return first 3 tiles of that suit
    return tiles_of_min_suit[:3]


def choose_discard_tile(player: Player, game_state: GameState) -> Tile:
    """Choose a tile to discard using simple heuristics.

    Priority:
    0. Already-hu players: MUST discard last_drawn_tile ("摸什么打什么")
    1. Tiles from missing suit (must discard if present)
    2. Lone tiles (no adjacent ranks in same suit)
    3. Random from hand

    Args:
        player: Player whose turn it is
        game_state: Current game state

    Returns:
        Tile to discard
    """
    # Priority 0: Already-hu players must discard last_drawn_tile
    if player.is_hu:
        if player.last_drawn_tile and player.last_drawn_tile in player.hand:
            logger.info(f"AI {player.player_id} is already hu, must discard last_drawn_tile {player.last_drawn_tile}")
            return player.last_drawn_tile
        else:
            # Fallback: This shouldn't happen, but if it does, log error and pick first tile
            logger.error(f"AI {player.player_id} is already hu but last_drawn_tile not in hand! last_drawn_tile={player.last_drawn_tile}, hand={player.hand}")
            return player.hand[0] if player.hand else None

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

    Priority: hu > gang > peng > pass

    Args:
        player: Player responding to discard
        discarded_tile: Tile that was just discarded
        game_state: Current game state

    Returns:
        PlayerResponse with action and target tile
    """
    # Priority 1: Check if can win (hu)
    if WinChecker.is_hu(player, discarded_tile):
        logger.info(f"AI {player.player_id} chooses HU on {discarded_tile}")
        return PlayerResponse(
            player_id=player.player_id,
            action_type=ActionType.HU,
            target_tile=discarded_tile,
            priority=PlayerResponse.get_priority(ActionType.HU)
        )

    # Priority 2: Check if can gang (need 3 matching tiles in hand)
    gang_count = sum(1 for t in player.hand if t == discarded_tile)
    if gang_count == 3:
        logger.info(f"AI {player.player_id} chooses GANG on {discarded_tile}")
        return PlayerResponse(
            player_id=player.player_id,
            action_type=ActionType.KONG_EXPOSED,
            target_tile=discarded_tile,
            priority=PlayerResponse.get_priority(ActionType.KONG_EXPOSED)
        )

    # Priority 3: Check if can peng (need 2 matching tiles in hand)
    peng_count = sum(1 for t in player.hand if t == discarded_tile)
    if peng_count == 2:
        logger.info(f"AI {player.player_id} chooses PENG on {discarded_tile}")
        return PlayerResponse(
            player_id=player.player_id,
            action_type=ActionType.PONG,
            target_tile=discarded_tile,
            priority=PlayerResponse.get_priority(ActionType.PONG)
        )

    # Priority 4: Pass
    logger.info(f"AI {player.player_id} passes on {discarded_tile}")
    return PlayerResponse(
        player_id=player.player_id,
        action_type=ActionType.PASS,
        target_tile=discarded_tile,
        priority=PlayerResponse.get_priority(ActionType.PASS)
    )
