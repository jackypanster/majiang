/**
 * Mahjong tile utility functions
 */

import { Suit } from '@/types';
import type { Tile } from '@/types';

/**
 * Sort tiles by suit and rank
 */
export function sortTiles(tiles: Tile[]): Tile[] {
  return [...tiles].sort((a, b) => {
    // Sort by suit first
    const suitOrder = { [Suit.WAN]: 0, [Suit.TIAO]: 1, [Suit.TONG]: 2 };
    const suitDiff = suitOrder[a.suit] - suitOrder[b.suit];
    if (suitDiff !== 0) return suitDiff;

    // Then by rank
    return a.rank - b.rank;
  });
}

/**
 * Group tiles by suit
 */
export function groupTilesBySuit(tiles: Tile[]): Record<Suit, Tile[]> {
  const groups: Record<Suit, Tile[]> = {
    [Suit.WAN]: [],
    [Suit.TIAO]: [],
    [Suit.TONG]: []
  };

  tiles.forEach((tile) => {
    groups[tile.suit].push(tile);
  });

  return groups;
}

/**
 * Count tiles by suit
 */
export function countTilesBySuit(tiles: Tile[]): Record<Suit, number> {
  const counts: Record<Suit, number> = {
    [Suit.WAN]: 0,
    [Suit.TIAO]: 0,
    [Suit.TONG]: 0
  };

  tiles.forEach((tile) => {
    counts[tile.suit]++;
  });

  return counts;
}

/**
 * Check if all tiles are the same suit
 */
export function areSameSuit(tiles: Tile[]): boolean {
  if (tiles.length === 0) return true;
  const firstSuit = tiles[0].suit;
  return tiles.every((tile) => tile.suit === firstSuit);
}

/**
 * Get suit with most tiles
 */
export function getMostCommonSuit(tiles: Tile[]): Suit | null {
  const counts = countTilesBySuit(tiles);
  const entries = Object.entries(counts) as [Suit, number][];

  if (entries.length === 0) return null;

  const [suit] = entries.reduce((max, current) =>
    current[1] > max[1] ? current : max
  );

  return suit;
}

/**
 * Get suit display name in Chinese
 */
export function getSuitDisplay(suit: string): string {
  const suitMap: Record<string, string> = {
    WAN: '万',
    TIAO: '条',
    TONG: '筒',
  };
  return suitMap[suit] || suit;
}

/**
 * Get tile display text (e.g. "万1", "筒5")
 */
export function getTileDisplay(tile: Tile): string {
  return `${getSuitDisplay(tile.suit)}${tile.rank}`;
}
