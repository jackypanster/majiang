/**
 * T088: TileCanvas Component
 *
 * Wrapper component for rendering a single mahjong tile using Canvas.
 * Encapsulates the Canvas element and calls TileRenderer for drawing.
 */

import { useEffect, useRef } from 'react';
import type { Tile } from '@/types';
import { TileRenderer } from '@/renderers/TileRenderer';
import { TILE_WIDTH, TILE_HEIGHT } from '@/utils/constants';

interface TileCanvasProps {
  /**
   * The tile to render
   */
  tile: Tile;

  /**
   * X position in parent container (optional, defaults to 0)
   */
  x?: number;

  /**
   * Y position in parent container (optional, defaults to 0)
   */
  y?: number;

  /**
   * Width of the tile (optional, defaults to TILE_WIDTH)
   */
  width?: number;

  /**
   * Height of the tile (optional, defaults to TILE_HEIGHT)
   */
  height?: number;

  /**
   * Additional CSS classes for styling
   */
  className?: string;

  /**
   * Click handler for tile interaction
   */
  onClick?: () => void;

  /**
   * Whether the tile is currently selected (for highlighting)
   */
  isSelected?: boolean;

  /**
   * Whether the tile is disabled (for interaction)
   */
  isDisabled?: boolean;
}

// Singleton TileRenderer instance (shared across all TileCanvas components)
let tileRendererInstance: TileRenderer | null = null;

function getTileRenderer(): TileRenderer {
  if (!tileRendererInstance) {
    tileRendererInstance = new TileRenderer();
    // Pre-render all tiles on first use
    tileRendererInstance.preRenderTiles();
  }
  return tileRendererInstance;
}

export function TileCanvas({
  tile,
  x = 0,
  y = 0,
  width = TILE_WIDTH,
  height = TILE_HEIGHT,
  className = '',
  onClick,
  isSelected = false,
  isDisabled = false,
}: TileCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Draw tile when component mounts or tile changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('[TileCanvas] Failed to get 2D context');
      return;
    }

    // Set canvas dimensions (accounting for device pixel ratio for high-DPI displays)
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    // Scale context to match device pixel ratio
    ctx.scale(dpr, dpr);

    // Clear canvas before drawing
    ctx.clearRect(0, 0, width, height);

    // Get renderer and draw cached tile
    const renderer = getTileRenderer();
    renderer.drawCachedTile(ctx, x, y, tile);

    // Draw selection highlight if selected
    if (isSelected) {
      ctx.strokeStyle = '#3b82f6'; // Blue highlight
      ctx.lineWidth = 3;
      ctx.strokeRect(2, 2, width - 4, height - 4);
    }

    // Draw disabled overlay if disabled
    if (isDisabled) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(0, 0, width, height);
    }
  }, [tile, x, y, width, height, isSelected, isDisabled]);

  /**
   * T094: Canvas click detection with coordinate conversion
   *
   * Handles click events on the canvas element and converts
   * browser coordinates to canvas coordinates, accounting for:
   * - Canvas CSS size vs actual canvas dimensions
   * - Device pixel ratio for high-DPI displays
   * - Canvas position within the viewport
   */
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    // Skip if disabled or no onClick handler
    if (isDisabled || !onClick) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Get canvas bounding box in viewport coordinates
    const rect = canvas.getBoundingClientRect();

    // Convert browser coordinates to canvas coordinates
    // clientX/Y are relative to viewport
    const canvasX = event.clientX - rect.left;
    const canvasY = event.clientY - rect.top;

    // Scale coordinates to match CSS size
    // (Canvas internal size may differ from CSS size due to DPR)
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;

    const actualX = canvasX * scaleX;
    const actualY = canvasY * scaleY;

    // Check if click is within tile bounds
    // For single-tile canvas, this is always true if we got here
    // But we validate for robustness
    const isWithinBounds =
      actualX >= 0 &&
      actualX <= width &&
      actualY >= 0 &&
      actualY <= height;

    if (isWithinBounds) {
      // Log click for debugging (dev mode only)
      if (import.meta.env.DEV) {
        console.log(
          `[TileCanvas] Click detected at canvas(${Math.round(actualX)}, ${Math.round(actualY)}) ` +
          `for tile ${tile.suit}-${tile.rank}`
        );
      }

      // Trigger the onClick callback
      onClick();
    }
  };

  return (
    <canvas
      ref={canvasRef}
      className={`${className} ${onClick && !isDisabled ? 'cursor-pointer' : ''} ${
        isDisabled ? 'cursor-not-allowed' : ''
      } ${isSelected ? 'tile-selected' : ''} transition-transform duration-200`}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        transform: isSelected ? 'translateY(-8px)' : 'translateY(0)',
      }}
      onClick={handleCanvasClick}
      aria-label={`Tile ${tile.suit}-${tile.rank}`}
    />
  );
}

export default TileCanvas;
