/**
 * Game state management with Zustand
 *
 * Manages:
 * - Current game ID
 * - Current game state (local cache, actual state from server)
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { GameState } from '@/types';

interface GameStore {
  gameId: string | null;
  gameState: GameState | null;
  isPlayerTurn: boolean;

  // Actions
  setGameId: (id: string) => void;
  setGameState: (state: GameState) => void;
  setPlayerTurn: (isTurn: boolean) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>()(
  devtools(
    (set) => ({
      gameId: null,
      gameState: null,
      isPlayerTurn: false,

      setGameId: (id) => set({ gameId: id }),

      setGameState: (state) => set({ gameState: state }),

      setPlayerTurn: (isTurn) => set({ isPlayerTurn: isTurn }),

      reset: () => set({ gameId: null, gameState: null, isPlayerTurn: false })
    }),
    { name: 'GameStore' }
  )
);

export default useGameStore;
