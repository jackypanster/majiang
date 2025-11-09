/**
 * Game state types
 *
 * Backend correspondence: src/mahjong/models/game_state.py::GameState
 */

import { createTile } from './tile';
import { createPlayer } from './player';
import { createDiscardedTile } from './discarded_tile';
import type { Tile } from './tile';
import type { Player } from './player';
import type { DiscardedTile } from './discarded_tile';

/**
 * Game phase enum
 *
 * Backend correspondence: GamePhase(Enum)
 */
export enum GamePhase {
  PREPARING = 'PREPARING',  // Preparation phase (not used in frontend)
  BURYING = 'BURYING',      // Burying phase
  PLAYING = 'PLAYING',      // Game in progress
  ENDED = 'ENDED'           // Game ended
}

/**
 * Game state
 *
 * Backend correspondence: @dataclass GameState
 *
 * Note:
 * - currentPlayerIndex: Backend is current_player_index (needs conversion)
 * - publicDiscards: Backend is public_discards (needs conversion)
 * - wallRemainingCount: Backend is wall_remaining_count (needs conversion)
 * - baseScore: Backend is base_score (needs conversion)
 */
export interface GameState {
  gameId: string;
  gamePhase: GamePhase;
  currentPlayerIndex: number;      // Current turn player index (0-3)
  players: Player[];               // 4 players (index 0 is usually human player)
  publicDiscards: DiscardedTile[]; // Discard pile with player info (visible to all)
  wallRemainingCount: number;      // Remaining wall count
  baseScore: number;               // Base score (for kong score calculation)
}

/**
 * Utility function: Create GameState from backend data
 */
export function createGameState(data: any): GameState {
  return {
    gameId: data.game_id,
    gamePhase: data.game_phase as GamePhase,
    currentPlayerIndex: data.current_player_index,
    players: (data.players || []).map(createPlayer),
    publicDiscards: (data.public_discards || []).map(createDiscardedTile),
    wallRemainingCount: data.wall_remaining_count,
    baseScore: data.base_score
  };
}
