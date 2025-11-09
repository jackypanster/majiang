from typing import Optional, Dict, Tuple
from collections import Counter
import logging

from mahjong.models.player import Player
from mahjong.models.tile import Tile
from mahjong.constants.enums import Suit

logger = logging.getLogger(__name__)


class WinChecker:
    @staticmethod
    def is_hu(player: Player, extra_tile: Optional[Tile] = None) -> bool:
        """
        Check if player can win (hu).

        Args:
            player: The player to check
            extra_tile: Optional tile (for winning off someone else's discard)

        Returns:
            True if player can hu, False otherwise
        """
        # 📊 LOG: 胡牌检查开始
        hand_count = len(player.hand)
        melds_count = sum(len(m.tiles) for m in player.melds)
        kong_count = sum(1 for m in player.melds if len(m.tiles) == 4)
        logger.info(
            f"[WinChecker] === HU CHECK START === player={player.player_id}, "
            f"is_hu={player.is_hu}, extra_tile={extra_tile}"
        )
        logger.info(
            f"[WinChecker]   hand_count={hand_count}, hand={player.hand}"
        )
        logger.info(
            f"[WinChecker]   melds_count={melds_count}, melds={player.melds}"
        )
        logger.info(
            f"[WinChecker]   kong_count={kong_count}"
        )
        logger.info(
            f"[WinChecker]   hu_tiles={player.hu_tiles}"
        )
        logger.info(
            f"[WinChecker]   missing_suit={player.missing_suit}"
        )

        # Collect all tiles: hand + melds + extra_tile
        all_tiles = list(player.hand)
        if extra_tile:
            all_tiles.append(extra_tile)

        # Flatten melds
        for meld in player.melds:
            all_tiles.extend(meld.tiles)

        # 📊 LOG: 总牌数
        logger.info(
            f"[WinChecker]   total_tiles_count={len(all_tiles)} "
            f"(hand={hand_count} + extra={1 if extra_tile else 0} + melds={melds_count})"
        )
        logger.info(
            f"[WinChecker]   Expected: 10 + kong_count + 1 = {10 + kong_count + 1} tiles for hu"
        )

        if not all_tiles:
            return False

        # Check 1: Must not have tiles of missing suit
        if player.missing_suit:
            for tile in all_tiles:
                if tile.suit == player.missing_suit:
                    logger.info(
                        f"[WinChecker] HU failed: tile {tile} has missing_suit {player.missing_suit}. "
                        f"all_tiles={all_tiles}"
                    )
                    return False

        # Check 2: Must use at most 2 suits (缺门 = missing one suit)
        suits_used = set(tile.suit for tile in all_tiles)
        if len(suits_used) > 2:
            logger.info(
                f"[WinChecker] HU failed: using {len(suits_used)} suits {suits_used}, max allowed is 2. "
                f"all_tiles={all_tiles}"
            )
            return False

        # Check 3: Valid hand structure (one pair + three sets)
        structure_valid = WinChecker._check_hand_structure(all_tiles)
        if not structure_valid:
            logger.info(
                f"[WinChecker] HU failed: invalid hand structure. "
                f"all_tiles ({len(all_tiles)} tiles)={all_tiles}"
            )
        else:
            logger.info(f"[WinChecker] HU success: all checks passed, all_tiles={all_tiles}")
        return structure_valid

    @staticmethod
    def _check_hand_structure(tiles: list[Tile]) -> bool:
        """
        Check if tiles form valid winning structure: one pair + N sets.
        Sets can be: triplet (3 same), quad (4 same), or sequence (3 consecutive).
        """
        # Count tiles by (suit, rank)
        tile_counts: Dict[Tuple[Suit, int], int] = Counter(
            (tile.suit, tile.rank) for tile in tiles
        )

        # Try each possible pair as the "jiang" (eye/pair)
        for (suit, rank), count in tile_counts.items():
            if count >= 2:
                # Try using this as the pair
                temp_counts = tile_counts.copy()
                temp_counts[(suit, rank)] -= 2
                if temp_counts[(suit, rank)] == 0:
                    del temp_counts[(suit, rank)]

                # Check if remaining tiles can form sets
                if WinChecker._check_sets(temp_counts):
                    return True

        return False

    @staticmethod
    def _check_sets(counts: Dict[Tuple[Suit, int], int]) -> bool:
        """
        Recursively check if all tiles can be formed into sets.
        A set is either:
        - Quad (4 same tiles)
        - Triplet (3 same tiles)
        - Sequence (3 consecutive tiles of same suit)
        """
        # Base case: no tiles left
        if not counts:
            return True

        # Get first tile to process (sorted by suit and rank to ensure deterministic order)
        (suit, rank), count = min(counts.items(), key=lambda x: (x[0][0].value, x[0][1]))

        # Try removing a quad (4 same tiles)
        if count >= 4:
            new_counts = counts.copy()
            new_counts[(suit, rank)] -= 4
            if new_counts[(suit, rank)] == 0:
                del new_counts[(suit, rank)]
            if WinChecker._check_sets(new_counts):
                return True

        # Try removing a triplet (3 same tiles)
        if count >= 3:
            new_counts = counts.copy()
            new_counts[(suit, rank)] -= 3
            if new_counts[(suit, rank)] == 0:
                del new_counts[(suit, rank)]
            if WinChecker._check_sets(new_counts):
                return True

        # Try removing a sequence (3 consecutive tiles)
        if (
            count >= 1
            and counts.get((suit, rank + 1), 0) >= 1
            and counts.get((suit, rank + 2), 0) >= 1
        ):
            new_counts = counts.copy()
            new_counts[(suit, rank)] -= 1
            new_counts[(suit, rank + 1)] -= 1
            new_counts[(suit, rank + 2)] -= 1

            if new_counts[(suit, rank)] == 0:
                del new_counts[(suit, rank)]
            if new_counts[(suit, rank + 1)] == 0:
                del new_counts[(suit, rank + 1)]
            if new_counts[(suit, rank + 2)] == 0:
                del new_counts[(suit, rank + 2)]

            if WinChecker._check_sets(new_counts):
                return True

        # No valid decomposition found
        return False
