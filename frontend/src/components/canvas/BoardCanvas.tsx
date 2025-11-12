/**
 * T097: BoardCanvas - Layered Canvas Rendering for Performance Optimization
 *
 * Implements a multi-layer canvas rendering system to optimize performance:
 * - Layer 0 (Background): Static table background (rarely changes)
 * - Layer 1 (Middle): Discard pile, AI players, melds (changes occasionally)
 * - Layer 2 (Foreground): Player hand (changes frequently)
 *
 * Each layer only redraws when its specific data changes, avoiding unnecessary
 * re-rendering of the entire game board.
 */

import { useEffect, useRef, useCallback } from 'react';
import type { Tile, GameState } from '@/types';
import { TileRenderer } from '@/renderers/TileRenderer';
import { TILE_WIDTH, TILE_HEIGHT } from '@/utils/constants';

interface BoardCanvasProps {
  /**
   * Game state containing all game data
   */
  gameState: GameState | null;

  /**
   * Player index (0 for human player, 1-3 for AI)
   */
  playerIndex: number;

  /**
   * Canvas dimensions
   */
  width: number;
  height: number;

  /**
   * Selected tiles (for highlighting during burial phase)
   */
  selectedTiles?: Tile[];

  /**
   * Click handler for tiles
   */
  onTileClick?: (tile: Tile, area: 'hand' | 'discard' | 'ai') => void;

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Layer render state to track what needs to be redrawn
 */
interface LayerState {
  backgroundDirty: boolean;
  middleDirty: boolean;
  foregroundDirty: boolean;
}

/**
 * Positions for different areas on the canvas
 */
interface CanvasLayout {
  // Player hand area (bottom center)
  playerHand: { x: number; y: number; width: number; height: number };

  // AI player areas (top, left, right)
  aiAreas: Array<{ x: number; y: number; width: number; height: number }>;

  // Center discard pile area
  discardPile: { x: number; y: number; width: number; height: number };

  // Info area (score, remaining tiles)
  infoArea: { x: number; y: number; width: number; height: number };
}

// Singleton renderer instance
let tileRendererInstance: TileRenderer | null = null;

function getTileRenderer(): TileRenderer {
  if (!tileRendererInstance) {
    tileRendererInstance = new TileRenderer();
    tileRendererInstance.preRenderTiles();
  }
  return tileRendererInstance;
}

/**
 * Calculate layout positions based on canvas dimensions
 */
function calculateLayout(width: number, height: number): CanvasLayout {
  const margin = 20;
  const handHeight = TILE_HEIGHT + 40;
  const aiAreaHeight = TILE_HEIGHT + 30;

  return {
    playerHand: {
      x: margin,
      y: height - handHeight - margin,
      width: width - 2 * margin,
      height: handHeight,
    },
    aiAreas: [
      // Top AI (index 2)
      {
        x: width / 2 - 200,
        y: margin,
        width: 400,
        height: aiAreaHeight,
      },
      // Left AI (index 1)
      {
        x: margin,
        y: height / 2 - 100,
        width: 300,
        height: aiAreaHeight,
      },
      // Right AI (index 3)
      {
        x: width - 300 - margin,
        y: height / 2 - 100,
        width: 300,
        height: aiAreaHeight,
      },
    ],
    discardPile: {
      x: width / 2 - 250,
      y: height / 2 - 100,
      width: 500,
      height: 200,
    },
    infoArea: {
      x: margin,
      y: margin,
      width: 200,
      height: 80,
    },
  };
}

export function BoardCanvas({
  gameState,
  playerIndex,
  width,
  height,
  selectedTiles = [],
  onTileClick,
  className = '',
}: BoardCanvasProps) {
  // Three canvas layers
  const backgroundCanvasRef = useRef<HTMLCanvasElement>(null);
  const middleCanvasRef = useRef<HTMLCanvasElement>(null);
  const foregroundCanvasRef = useRef<HTMLCanvasElement>(null);

  // Track what needs redrawing
  const layerStateRef = useRef<LayerState>({
    backgroundDirty: true,
    middleDirty: true,
    foregroundDirty: true,
  });

  // Store previous state for change detection
  const prevStateRef = useRef<{
    playerHandLength: number;
    discardPileLength: number;
    aiHandLengths: number[];
    selectedTilesCount: number;
  }>({
    playerHandLength: 0,
    discardPileLength: 0,
    aiHandLengths: [0, 0, 0],
    selectedTilesCount: 0,
  });

  /**
   * Initialize canvas contexts with proper scaling for high-DPI displays
   */
  const initializeCanvas = useCallback(
    (canvas: HTMLCanvasElement): CanvasRenderingContext2D | null => {
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return null;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);

      return ctx;
    },
    [width, height]
  );

  /**
   * Render Layer 0: Static background (table, borders, labels)
   */
  const renderBackground = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      // Clear canvas
      ctx.fillStyle = '#2d5016'; // Mahjong table green
      ctx.fillRect(0, 0, width, height);

      const layout = calculateLayout(width, height);

      // Draw table border
      ctx.strokeStyle = '#8B4513';
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, width - 20, height - 20);

      // Draw area labels (optional, for visual clarity during development)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';

      // Player hand area outline
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(
        layout.playerHand.x,
        layout.playerHand.y,
        layout.playerHand.width,
        layout.playerHand.height
      );

      // Discard pile area outline
      ctx.strokeRect(
        layout.discardPile.x,
        layout.discardPile.y,
        layout.discardPile.width,
        layout.discardPile.height
      );

      console.log('[BoardCanvas] Background layer rendered');
    },
    [width, height]
  );

  /**
   * Render Layer 1: Middle layer (discard pile, AI players, melds)
   */
  const renderMiddle = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      if (!gameState) return;

      // Clear canvas (transparent)
      ctx.clearRect(0, 0, width, height);

      const layout = calculateLayout(width, height);
      const renderer = getTileRenderer();

      // Render discard pile
      const discards = gameState.publicDiscards || [];
      const maxDiscardsToShow = 20;
      const visibleDiscards = discards.slice(-maxDiscardsToShow);

      visibleDiscards.forEach((tile, index) => {
        const row = Math.floor(index / 5);
        const col = index % 5;
        const x = layout.discardPile.x + col * (TILE_WIDTH + 4);
        const y = layout.discardPile.y + row * (TILE_HEIGHT + 4);

        renderer.drawCachedTile(ctx, x, y, tile);
      });

      // Render AI players (show tile count only, not actual tiles for now)
      gameState.players.forEach((player, index) => {
        if (index === playerIndex) return; // Skip human player

        const aiIndex = index > playerIndex ? index - 1 : index;
        const aiArea = layout.aiAreas[aiIndex];

        // Draw AI name and tile count
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(
          `AI ${index} (${player.hand.length} tiles)`,
          aiArea.x,
          aiArea.y + 20
        );

        // Draw tile backs for AI hands
        for (let i = 0; i < Math.min(player.hand.length, 14); i++) {
          const x = aiArea.x + i * (TILE_WIDTH * 0.6);
          const y = aiArea.y + 30;

          // Draw simple tile back (gray rectangle)
          ctx.fillStyle = '#666666';
          ctx.fillRect(x, y, TILE_WIDTH * 0.5, TILE_HEIGHT);
          ctx.strokeStyle = '#333333';
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, TILE_WIDTH * 0.5, TILE_HEIGHT);
        }

        // Draw AI melds
        player.melds.forEach((meld, meldIndex) => {
          const meldX = aiArea.x + meldIndex * (TILE_WIDTH * 3 + 10);
          const meldY = aiArea.y + aiArea.height - TILE_HEIGHT - 5;

          meld.tiles.forEach((tile, tileIndex) => {
            const x = meldX + tileIndex * (TILE_WIDTH + 2);
            renderer.drawCachedTile(ctx, x, meldY, tile);
          });
        });
      });

      console.log('[BoardCanvas] Middle layer rendered');
    },
    [gameState, width, height, playerIndex]
  );

  /**
   * Render Layer 2: Foreground (player hand, with selection highlights)
   */
  const renderForeground = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      if (!gameState) return;

      // Clear canvas (transparent)
      ctx.clearRect(0, 0, width, height);

      const layout = calculateLayout(width, height);
      const renderer = getTileRenderer();

      // Render player hand
      const player = gameState.players[playerIndex];
      if (!player) return;

      const hand = player.hand || [];
      const startX = layout.playerHand.x + (layout.playerHand.width - hand.length * (TILE_WIDTH + 4)) / 2;
      const startY = layout.playerHand.y + 20;

      hand.forEach((tile, index) => {
        const x = startX + index * (TILE_WIDTH + 4);
        const y = startY;

        // Draw tile
        renderer.drawCachedTile(ctx, x, y, tile);

        // Draw selection highlight if selected
        const isSelected = selectedTiles.some(
          (st) => st.suit === tile.suit && st.rank === tile.rank
        );

        if (isSelected) {
          ctx.strokeStyle = '#3b82f6'; // Blue highlight
          ctx.lineWidth = 3;
          ctx.strokeRect(x + 2, y + 2, TILE_WIDTH - 4, TILE_HEIGHT - 4);
        }
      });

      // Draw player melds below hand
      player.melds.forEach((meld, meldIndex) => {
        const meldX = layout.playerHand.x + meldIndex * (TILE_WIDTH * 4 + 10);
        const meldY = layout.playerHand.y + layout.playerHand.height - TILE_HEIGHT - 5;

        meld.tiles.forEach((tile, tileIndex) => {
          const x = meldX + tileIndex * (TILE_WIDTH + 2);
          renderer.drawCachedTile(ctx, x, meldY, tile);
        });
      });

      console.log('[BoardCanvas] Foreground layer rendered');
    },
    [gameState, width, height, playerIndex, selectedTiles]
  );

  /**
   * Render loop - only redraws dirty layers
   */
  useEffect(() => {
    const backgroundCanvas = backgroundCanvasRef.current;
    const middleCanvas = middleCanvasRef.current;
    const foregroundCanvas = foregroundCanvasRef.current;

    if (!backgroundCanvas || !middleCanvas || !foregroundCanvas) return;

    const backgroundCtx = initializeCanvas(backgroundCanvas);
    const middleCtx = initializeCanvas(middleCanvas);
    const foregroundCtx = initializeCanvas(foregroundCanvas);

    if (!backgroundCtx || !middleCtx || !foregroundCtx) {
      console.error('[BoardCanvas] Failed to initialize canvas contexts');
      return;
    }

    // Render dirty layers
    if (layerStateRef.current.backgroundDirty) {
      renderBackground(backgroundCtx);
      layerStateRef.current.backgroundDirty = false;
    }

    if (layerStateRef.current.middleDirty) {
      renderMiddle(middleCtx);
      layerStateRef.current.middleDirty = false;
    }

    if (layerStateRef.current.foregroundDirty) {
      renderForeground(foregroundCtx);
      layerStateRef.current.foregroundDirty = false;
    }
  }, [initializeCanvas, renderBackground, renderMiddle, renderForeground]);

  /**
   * Detect changes and mark layers as dirty
   */
  useEffect(() => {
    if (!gameState) return;

    const player = gameState.players[playerIndex];
    if (!player) return;

    const currentState = {
      playerHandLength: player.hand.length,
      discardPileLength: gameState.publicDiscards?.length || 0,
      aiHandLengths: gameState.players
        .filter((_, idx) => idx !== playerIndex)
        .map((p) => p.hand.length),
      selectedTilesCount: selectedTiles.length,
    };

    const prevState = prevStateRef.current;

    // Check if player hand changed (foreground)
    if (
      currentState.playerHandLength !== prevState.playerHandLength ||
      currentState.selectedTilesCount !== prevState.selectedTilesCount
    ) {
      layerStateRef.current.foregroundDirty = true;
    }

    // Check if discard pile or AI hands changed (middle)
    if (
      currentState.discardPileLength !== prevState.discardPileLength ||
      currentState.aiHandLengths.some((len, idx) => len !== prevState.aiHandLengths[idx])
    ) {
      layerStateRef.current.middleDirty = true;
    }

    // Update previous state
    prevStateRef.current = currentState;
  }, [gameState, playerIndex, selectedTiles]);

  /**
   * Handle canvas clicks (coordinate detection)
   */
  const handleCanvasClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!gameState || !onTileClick) return;

      const canvas = foregroundCanvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const layout = calculateLayout(width, height);
      const player = gameState.players[playerIndex];
      if (!player) return;

      const hand = player.hand || [];
      const startX = layout.playerHand.x + (layout.playerHand.width - hand.length * (TILE_WIDTH + 4)) / 2;
      const startY = layout.playerHand.y + 20;

      // Check if click is on any tile in player hand
      for (let i = 0; i < hand.length; i++) {
        const tileX = startX + i * (TILE_WIDTH + 4);
        const tileY = startY;

        if (
          x >= tileX &&
          x <= tileX + TILE_WIDTH &&
          y >= tileY &&
          y <= tileY + TILE_HEIGHT
        ) {
          onTileClick(hand[i], 'hand');
          return;
        }
      }
    },
    [gameState, playerIndex, width, height, onTileClick]
  );

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      {/* Layer 0: Background */}
      <canvas
        ref={backgroundCanvasRef}
        className="absolute top-0 left-0"
        style={{ width: `${width}px`, height: `${height}px`, zIndex: 0 }}
      />

      {/* Layer 1: Middle */}
      <canvas
        ref={middleCanvasRef}
        className="absolute top-0 left-0"
        style={{ width: `${width}px`, height: `${height}px`, zIndex: 1 }}
      />

      {/* Layer 2: Foreground (interactive) */}
      <canvas
        ref={foregroundCanvasRef}
        className="absolute top-0 left-0"
        style={{ width: `${width}px`, height: `${height}px`, zIndex: 2 }}
        onClick={handleCanvasClick}
      />
    </div>
  );
}

export default BoardCanvas;
