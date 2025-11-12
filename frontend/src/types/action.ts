/**
 * Player action types
 *
 * Backend correspondence: src/mahjong/constants/enums.py::ActionType
 */

import type { Tile } from './tile';

/**
 * Player action type enum
 *
 * Backend correspondence: ActionType(Enum)
 */
export enum ActionType {
  PONG = 'PONG',                   // 碰
  KONG = 'KONG',                   // 通用杠
  KONG_EXPOSED = 'KONG_EXPOSED',   // 明杠
  KONG_CONCEALED = 'KONG_CONCEALED', // 暗杠
  KONG_UPGRADE = 'KONG_UPGRADE',   // 补杠
  HU = 'HU',                       // 胡
  PASS = 'PASS'                    // 过
}

/**
 * Player response to discarded tile
 *
 * Backend correspondence: @dataclass PlayerResponse
 *
 * Note:
 * - targetTile: Backend is target_tile (needs conversion)
 * - actionType: Backend is action_type (needs conversion)
 */
export interface PlayerResponse {
  playerId: string;
  actionType: ActionType;
  targetTile: Tile;
  priority: number;  // Priority: HU=3, KONG=2, PONG=1, PASS=0
}

/**
 * Get action priority (consistent with backend logic)
 */
export function getActionPriority(actionType: ActionType): number {
  switch (actionType) {
    case ActionType.HU:
      return 3;
    case ActionType.KONG:
    case ActionType.KONG_EXPOSED:
      return 2;
    case ActionType.PONG:
      return 1;
    default:
      return 0;
  }
}
