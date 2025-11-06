from typing import Optional, Set
from collections import Counter

from mahjong.models.player import Player
from mahjong.models.tile import Tile
from mahjong.constants.enums import Suit


class Scorer:
    @staticmethod
    def calculate_score(
        player: Player,
        extra_tile: Optional[Tile] = None,
        is_self_drawn: bool = False,
        is_kong_flower: bool = False,
        is_last_tile: bool = False,
        is_tian_hu: bool = False,
        is_di_hu: bool = False,
    ) -> int:
        """
        Calculate the score for a winning hand.

        Args:
            player: The winning player
            extra_tile: Optional tile from someone else's discard
            is_self_drawn: True if won by self-draw (自摸)
            is_kong_flower: True if won after kong (杠上花/炮)
            is_last_tile: True if won on last tile (扫底胡/海底捞月)
            is_tian_hu: True if dealer wins immediately (天胡)
            is_di_hu: True if non-dealer wins on first draw (地胡)

        Returns:
            Score that ONE player should pay (caller handles 3x for self-draw)
            Formula: score = total_fan (直接等于番数，最简单！)
        """
        total_fan = Scorer._calculate_fan(
            player, extra_tile, is_self_drawn, is_kong_flower, is_last_tile, is_tian_hu, is_di_hu
        )
        return total_fan

    @staticmethod
    def _calculate_fan(
        player: Player,
        extra_tile: Optional[Tile],
        is_self_drawn: bool,
        is_kong_flower: bool,
        is_last_tile: bool,
        is_tian_hu: bool,
        is_di_hu: bool,
    ) -> int:
        """Calculate total fan (番数) for the winning hand."""
        total_fan = 1  # 基本胡 = 1番（最低分）

        # Collect all tiles
        all_tiles = list(player.hand)
        if extra_tile:
            all_tiles.append(extra_tile)
        for meld in player.melds:
            all_tiles.extend(meld.tiles)

        # Count tiles by (suit, rank)
        tile_counts = Counter((tile.suit, tile.rank) for tile in all_tiles)
        suits_used: Set[Suit] = set(tile.suit for tile in all_tiles)

        # Special high-value patterns (mutually exclusive)
        if is_tian_hu or is_di_hu:
            total_fan += 5  # 天胡/地胡

        # 对对胡 (All Triplets): Check if all sets are triplets/quads
        is_all_triplets = Scorer._check_all_triplets(tile_counts)
        is_pure_suit = len(suits_used) == 1

        # Complex pattern detection (mutually exclusive combinations)
        if is_all_triplets:
            # 金钩钓 (Single Tile): Only one tile in hand (all others are melds)
            if len(player.hand) == 1 or (len(player.hand) == 0 and extra_tile):
                if is_pure_suit:
                    total_fan += 4  # 清金钩钓 (replaces 清一色+对对胡)
                else:
                    total_fan += 1  # 金钩钓
            # 清对 (Pure All Triplets)
            elif is_pure_suit:
                total_fan += 3  # 清对 (replaces 清一色+对对胡)
            else:
                total_fan += 1  # 对对胡
        # 清一色 (Pure One Suit) without 对对胡
        elif is_pure_suit:
            total_fan += 2  # 清一色

        # 带根 (Gen/Root): +1 fan per quad or triplet of 4 identical tiles
        gen_count = sum(1 for count in tile_counts.values() if count == 4)
        total_fan += gen_count

        # 门清 (All Concealed): +1 fan if no open melds
        # Check if there are any open melds (pong/exposed kong/upgrade kong)
        # Concealed kong (暗杠) does not break menqing
        has_open_melds = any(not meld.is_concealed for meld in player.melds)
        if not has_open_melds:
            total_fan += 1  # 门清

        # Additive bonuses
        if is_self_drawn:
            total_fan += 1  # 自摸
        if is_kong_flower:
            total_fan += 1  # 杠上花/炮
        if is_last_tile:
            total_fan += 1  # 扫底胡/海底捞月

        return total_fan

    @staticmethod
    def _check_all_triplets(tile_counts: Counter) -> bool:
        """
        Check if the hand is 对对胡 (all triplets/quads, no sequences).

        A hand is all-triplets if we can't form any sequences.
        This is a simplified check: if all counts are >= 2 and we have exactly 5 groups,
        it's likely all triplets.

        More accurately: try to decompose without using sequences.
        """
        # Get all unique tiles
        tiles = list(tile_counts.keys())

        # Check if we can form a valid winning hand using only triplets/quads
        # Try each possible pair
        for suit, rank in tiles:
            if tile_counts[(suit, rank)] >= 2:
                temp_counts = tile_counts.copy()
                temp_counts[(suit, rank)] -= 2
                if temp_counts[(suit, rank)] == 0:
                    del temp_counts[(suit, rank)]

                # Check if remaining can be all triplets/quads
                if Scorer._check_only_triplets(temp_counts):
                    return True

        return False

    @staticmethod
    def _check_only_triplets(counts: Counter) -> bool:
        """Check if all remaining tiles can form triplets/quads (no sequences)."""
        if not counts:
            return True

        # Get first tile
        (suit, rank), count = next(iter(counts.items()))

        # Must have at least 3 of the same tile (or 4 for quad)
        if count >= 4:
            new_counts = counts.copy()
            new_counts[(suit, rank)] -= 4
            if new_counts[(suit, rank)] == 0:
                del new_counts[(suit, rank)]
            if Scorer._check_only_triplets(new_counts):
                return True

        if count >= 3:
            new_counts = counts.copy()
            new_counts[(suit, rank)] -= 3
            if new_counts[(suit, rank)] == 0:
                del new_counts[(suit, rank)]
            if Scorer._check_only_triplets(new_counts):
                return True

        # If we can't form a triplet/quad, it's not all-triplets
        return False
