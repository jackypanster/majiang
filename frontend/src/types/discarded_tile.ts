/**
 * Discarded Tile type
 *
 * Backend correspondence: src/mahjong/models/discarded_tile.py::DiscardedTile
 *
 * 记录打出的牌及其打牌者信息（用于UI动画和显示）
 */

import type { Tile } from './tile';
import { createTile } from './tile';

/**
 * Discarded tile with player information
 */
export interface DiscardedTile {
  tile: Tile;         // 打出的麻将牌
  playerId: string;   // 打牌者ID（"human", "ai_1", "ai_2", "ai_3"）
  turnIndex: number;  // 第几张打出的牌（从0开始，用于排序和动画）
}

/**
 * Utility function: Create DiscardedTile from backend data
 */
export function createDiscardedTile(data: any): DiscardedTile {
  return {
    tile: createTile(data.tile),
    playerId: data.playerId,
    turnIndex: data.turnIndex
  };
}
