/**
 * Game API client
 *
 * Handles all game-related API calls with snake_case → camelCase conversion
 */

import apiClient from '../apiClient';
import {
  createGameState
} from '@/types';
import type {
  CreateGameRequest,
  CreateGameResponse,
  PlayerActionRequest,
  GameStateResponse
} from '@/types';

/**
 * Game API namespace
 */
export const gameApi = {
  /**
   * Create new game
   *
   * POST /games
   */
  async createGame(request?: CreateGameRequest): Promise<CreateGameResponse> {
    const { data } = await apiClient.post('/games', request);

    return {
      gameId: data.game_id,
      state: createGameState(data.state)
    };
  },

  /**
   * Get game state for specific player
   *
   * GET /games/{gameId}?player_id={playerId}
   */
  async getGameState(gameId: string, playerId: string = 'human'): Promise<GameStateResponse> {
    const { data } = await apiClient.get(`/games/${gameId}`, {
      params: { player_id: playerId }
    });

    return createGameState(data);
  },

  /**
   * Submit player action
   *
   * POST /games/{gameId}/action
   *
   * Converts frontend action format to backend format
   */
  async submitAction(gameId: string, request: PlayerActionRequest): Promise<GameStateResponse> {
    const { data } = await apiClient.post(`/games/${gameId}/action`, {
      player_id: request.playerId,
      action: request.action,
      tiles: request.tiles?.map(t => ({ suit: t.suit, rank: t.rank }))
    });

    return createGameState(data);
  }
};

export default gameApi;
