/**
 * Player state types
 *
 * Backend correspondence: src/mahjong/models/player.py::Player
 */

import { createTile, parseSuit } from './tile';
import { createMeld } from './meld';
import type { Tile, Suit } from './tile';
import type { Meld } from './meld';

/**
 * Player state
 *
 * Backend correspondence: @dataclass Player
 *
 * Note:
 * - hand field: Only visible for current player with complete hand, other players only show handCount
 * - missingSuit: Backend is missing_suit (needs conversion)
 * - isHu: Backend is is_hu (needs conversion)
 */
export interface Player {
  playerId: string;
  hand?: Tile[];              // Hand tiles (only visible for current player)
  handCount?: number;         // Hand tile count (visible for other players)
  melds: Meld[];              // Exposed tiles (visible to all)
  buriedCards: Tile[];        // Buried cards (visible to all)
  missingSuit: Suit | null;   // Missing suit
  score: number;              // Current score
  isHu: boolean;              // Whether already won (hu)
  lastDrawnTile?: Tile | null; // Last drawn tile (only visible for current player, used for self-drawn hu detection)
}

/**
 * Utility function: Create Player from backend data
 *
 * Backend returns two formats:
 * 1. Current player: includes hand (complete hand tiles)
 * 2. Other players: includes hand_count (hand tile count)
 */
export function createPlayer(data: any): Player {
  return {
    playerId: data.player_id,
    hand: data.hand ? data.hand.map(createTile) : undefined,
    handCount: data.hand_count,
    melds: (data.melds || []).map(createMeld),
    buriedCards: (data.buried_cards || []).map(createTile),
    missingSuit: data.missing_suit ? parseSuit(data.missing_suit) : null,
    score: data.score,
    isHu: data.is_hu,
    lastDrawnTile: data.last_drawn_tile ? createTile(data.last_drawn_tile) : null
  };
}
