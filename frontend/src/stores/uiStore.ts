/**
 * UI state management with Zustand
 *
 * Manages:
 * - Toast notifications
 * - Modal dialogs
 * - Selected tiles (for burial phase)
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { ToastConfig, ToastMessage, ModalConfig } from '@/types';

interface UIStore {
  // Toast state
  toast: ToastMessage | null;
  showToast: (config: ToastConfig) => void;
  hideToast: () => void;

  // Modal state
  modal: ModalConfig | null;
  showModal: (config: ModalConfig) => void;
  hideModal: () => void;

  // Selected tiles state (for burial phase)
  selectedTiles: string[];  // Array of tile IDs
  selectTile: (tileId: string) => void;
  deselectTile: (tileId: string) => void;
  clearSelection: () => void;

  // Player turn state
  isPlayerTurn: boolean;
  setPlayerTurn: (isTurn: boolean) => void;
}

export const useUIStore = create<UIStore>()(
  devtools(
    (set) => ({
      // Toast management
      toast: null,

      showToast: (config) => {
        const id = `toast-${Date.now()}`;
        const toast: ToastMessage = { ...config, id };

        set({ toast });

        // Auto-hide after duration
        const duration = config.duration || 3000;
        setTimeout(() => {
          set((state) => (state.toast?.id === id ? { toast: null } : state));
        }, duration);
      },

      hideToast: () => set({ toast: null }),

      // Modal management
      modal: null,

      showModal: (config) => set({ modal: config }),

      hideModal: () => set({ modal: null }),

      // Selected tiles management
      selectedTiles: [],

      selectTile: (tileId) =>
        set((state) => {
          // Max 3 tiles can be selected (for burial)
          if (state.selectedTiles.length >= 3 && !state.selectedTiles.includes(tileId)) {
            return state;
          }

          // Toggle selection
          return {
            selectedTiles: state.selectedTiles.includes(tileId)
              ? state.selectedTiles.filter((id) => id !== tileId)
              : [...state.selectedTiles, tileId]
          };
        }),

      deselectTile: (tileId) =>
        set((state) => ({
          selectedTiles: state.selectedTiles.filter((id) => id !== tileId)
        })),

      clearSelection: () => set({ selectedTiles: [] }),

      // Player turn state
      isPlayerTurn: false,

      setPlayerTurn: (isTurn) => set({ isPlayerTurn: isTurn })
    }),
    { name: 'UIStore' }
  )
);

export default useUIStore;
