/**
 * Game state management with Zustand
 *
 * Manages:
 * - Current game ID
 * - Player turn state
 *
 * Note: Game state data is managed by TanStack Query (useGameState hook)
 * to avoid state synchronization issues and cache conflicts.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface GameStore {
  gameId: string | null;
  isPlayerTurn: boolean;

  // Actions
  setGameId: (id: string) => void;
  setPlayerTurn: (isTurn: boolean) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>()(
  devtools(
    (set) => ({
      gameId: null,
      isPlayerTurn: false,

      setGameId: (id) => set({ gameId: id }),

      setPlayerTurn: (isTurn) => set({ isPlayerTurn: isTurn }),

      reset: () => set({ gameId: null, isPlayerTurn: false })
    }),
    { name: 'GameStore' }
  )
);

export default useGameStore;
