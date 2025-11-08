/**
 * Meld (exposed tile combination) types
 *
 * Backend correspondence: src/mahjong/models/meld.py::Meld
 */

import { createTile } from './tile';
import type { Tile } from './tile';

/**
 * Meld type enum
 *
 * Backend correspondence: ActionType enum subset
 * Note: Backend uses ActionType for all action types, frontend extracts meld-related types
 */
export enum MeldType {
  PONG = 'PONG',                   // 碰 (3 tiles)
  KONG = 'KONG',                   // 通用杠 (backward compatible)
  KONG_EXPOSED = 'KONG_EXPOSED',   // 明杠/直杠 (3 hand + 1 discarded, 2x score)
  KONG_CONCEALED = 'KONG_CONCEALED', // 暗杠 (4 hand, 1x score)
  KONG_UPGRADE = 'KONG_UPGRADE'    // 补杠/巴杠 (pong upgraded to kong, 1x score)
}

/**
 * Meld (exposed tile combination: pong/kong)
 *
 * Backend correspondence: @dataclass(frozen=True) Meld
 */
export interface Meld {
  meldType: MeldType;
  tiles: Tile[];        // Backend: Tuple[Tile, ...], frontend uses array
  isConcealed: boolean; // Whether it's concealed kong (used for men qing judgment)
}

/**
 * Utility function: Create Meld from backend data
 */
export function createMeld(data: {
  meld_type: string;
  tiles: Array<{ suit: string; rank: number }>;
  is_concealed?: boolean;
}): Meld {
  return {
    meldType: data.meld_type as MeldType,
    tiles: data.tiles.map(createTile),
    isConcealed: data.is_concealed || false
  };
}
