/**
 * Constants and configuration
 */

// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
export const POLLING_INTERVAL = Number(import.meta.env.VITE_POLLING_INTERVAL) || 500;
export const DEBUG_MODE = import.meta.env.VITE_DEBUG_MODE === 'true';

// Mahjong tile dimensions (CSS pixels)
export const TILE_WIDTH = 60;
export const TILE_HEIGHT = 80;
export const TILE_GAP = 8;

// Animation durations (ms)
export const DURATION_FAST = 150;
export const DURATION_NORMAL = 300;
export const DURATION_SLOW = 500;

// Game configuration
export const MAX_BURIED_TILES = 3;
export const INITIAL_SCORE = 100;
export const PLAYER_COUNT = 4;

// Tile colors (matching Tailwind config)
export const TILE_COLORS = {
  WAN: '#1e3a8a',   // Blue
  TIAO: '#166534',  // Green
  TONG: '#991b1b'   // Red
};

export default {
  API_BASE_URL,
  POLLING_INTERVAL,
  DEBUG_MODE,
  TILE_WIDTH,
  TILE_HEIGHT,
  TILE_GAP,
  DURATION_FAST,
  DURATION_NORMAL,
  DURATION_SLOW,
  MAX_BURIED_TILES,
  INITIAL_SCORE,
  PLAYER_COUNT,
  TILE_COLORS
};
