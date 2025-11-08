/**
 * API request/response types
 *
 * Backend correspondence: app/schemas.py
 */

import type { Tile } from './tile';
import type { GameState, GamePhase } from './game';
import type { Player } from './player';

/**
 * Create game request
 *
 * Backend correspondence: CreateGameRequest(BaseModel)
 */
export interface CreateGameRequest {
  playerIds?: string[];  // Optional: custom player IDs (must be 4)
}

/**
 * Default player ID configuration
 */
export const DEFAULT_PLAYER_IDS = ['human', 'ai_1', 'ai_2', 'ai_3'];

/**
 * Create game response
 *
 * Backend correspondence: CreateGameResponse(BaseModel)
 */
export interface CreateGameResponse {
  gameId: string;
  state: GameState;  // Initial game state (filtered)
}

/**
 * Player action request
 *
 * Backend correspondence: PlayerActionRequest(BaseModel)
 *
 * Action type description:
 * - bury: Bury cards (requires 3 same-suit tiles)
 * - draw: Draw tile (debug interface, normally triggered by backend automatically)
 * - discard: Discard tile (requires 1 tile)
 * - peng/gang/hu: Respond to opponent's discarded tile (requires target tile)
 * - skip: Pass (no tiles needed)
 */
export interface PlayerActionRequest {
  playerId: string;
  action: 'bury' | 'draw' | 'discard' | 'peng' | 'gang' | 'hu' | 'skip';
  tiles?: Tile[];  // Optional or required depending on action type
}

/**
 * Game state response
 *
 * Backend correspondence: GameStateResponse(BaseModel)
 *
 * Note: Actual return format is consistent with GameState but wrapped in outer layer
 */
export interface GameStateResponse {
  gameId: string;
  gamePhase: GamePhase;
  currentPlayerIndex: number;
  players: Player[];
  publicDiscards: Tile[];
  wallRemainingCount: number;
  baseScore: number;
  winners?: WinDetail[];  // Winner info when game ends
}

/**
 * Winner detail (when game ends)
 */
export interface WinDetail {
  playerId: string;
  fanCount: number;      // Fan count
  scoreChange: number;   // Score change
}

/**
 * Standard error response
 *
 * Backend correspondence: ErrorResponse(BaseModel)
 * FastAPI's HTTPException automatically generates this format
 */
export interface ErrorResponse {
  detail: string;  // Error message (Chinese or English)
}
