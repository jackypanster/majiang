/**
 * Tile types and utility functions
 *
 * Backend correspondence: src/mahjong/models/tile.py::Tile
 */

/**
 * Mahjong tile suit enum
 *
 * Backend correspondence: Suit(Enum) with auto() values
 * Frontend uses string literal types aligned with backend API name field
 */
export enum Suit {
  WAN = 'WAN',    // 万 (Characters)
  TIAO = 'TIAO',  // 条 (Bamboos)
  TONG = 'TONG'   // 筒 (Dots)
}

/**
 * Mahjong tile
 *
 * Backend correspondence: @dataclass(frozen=True) Tile
 *
 * Note:
 * - Backend Tile is immutable (frozen=True)
 * - Frontend doesn't enforce immutability but should avoid direct modification
 * - id field is frontend-specific for React key (backend doesn't have this field)
 */
export interface Tile {
  suit: Suit;
  rank: number;  // 1-9
  id?: string;   // Optional: frontend-generated unique identifier for React key
}

/**
 * Utility function: Create Tile from backend data
 */
export function createTile(data: { suit: string; rank: number }): Tile {
  return {
    suit: parseSuit(data.suit),
    rank: data.rank
  };
}

/**
 * Utility function: Generate unique ID for Tile (for React key)
 */
export function getTileId(tile: Tile): string {
  return `${tile.suit}-${tile.rank}`;
}

/**
 * Utility function: Compare two Tiles for equality
 */
export function tilesEqual(a: Tile, b: Tile): boolean {
  return a.suit === b.suit && a.rank === b.rank;
}

/**
 * Utility function: Convert string to Suit enum
 */
export function parseSuit(suit: string): Suit {
  if (!Object.values(Suit).includes(suit as Suit)) {
    throw new Error(`Invalid suit: ${suit}`);
  }
  return suit as Suit;
}
