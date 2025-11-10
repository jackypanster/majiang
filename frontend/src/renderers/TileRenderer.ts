/**
 * T085: Tile Renderer - Complete Canvas drawing implementation
 *
 * Implements complete mahjong tile rendering with gradient backgrounds,
 * borders, and suit text. Supports offscreen canvas caching for performance.
 */

import type { Tile } from '@/types';
import { Suit } from '@/types';
import { TILE_WIDTH, TILE_HEIGHT, TILE_COLORS } from '@/utils/constants';
import { getSuitDisplay } from '@/utils/tileUtils';

export class TileRenderer {
  private tileCache: Map<string, HTMLCanvasElement> = new Map();

  /**
   * T085: Draw a single tile to canvas context
   * Draws rectangle, gradient background, border, and suit text
   *
   * @param ctx - Canvas 2D rendering context
   * @param suit - Tile suit (WAN/TIAO/TONG)
   * @param rank - Tile rank (1-9)
   * @param width - Tile width in pixels (default: TILE_WIDTH)
   * @param height - Tile height in pixels (default: TILE_HEIGHT)
   */
  drawTile(
    ctx: CanvasRenderingContext2D,
    suit: Suit,
    rank: number,
    width: number = TILE_WIDTH,
    height: number = TILE_HEIGHT
  ): void {
    // Use integer coordinates to avoid sub-pixel rendering blur
    const x = 0;
    const y = 0;
    const w = Math.floor(width);
    const h = Math.floor(height);

    // 1. Draw tile background with gradient
    const gradient = ctx.createLinearGradient(x, y, x, y + h);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.5, '#f5f5f5');
    gradient.addColorStop(1, '#e5e5e5');

    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, w, h);

    // 2. Draw tile border
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);

    // 3. Draw inner shadow for depth
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);

    // 4. Draw suit text (e.g., "万", "条", "筒")
    const suitText = getSuitDisplay(suit);
    const suitColor = TILE_COLORS[suit];

    ctx.fillStyle = suitColor;
    ctx.font = `bold ${Math.floor(h * 0.25)}px "PingFang SC", "Microsoft YaHei", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(suitText, x + w / 2, y + h * 0.3);

    // 5. Draw rank number
    ctx.font = `bold ${Math.floor(h * 0.4)}px "PingFang SC", "Microsoft YaHei", sans-serif`;
    ctx.fillText(rank.toString(), x + w / 2, y + h * 0.65);
  }

  /**
   * Pre-render all tile faces to offscreen canvas (cache)
   * Renders all 27 tile types (WAN/TIAO/TONG × 1-9) to cache
   * Should be called once during game initialization
   */
  preRenderTiles(): void {
    const suits: Suit[] = [Suit.WAN, Suit.TIAO, Suit.TONG];
    const ranks = [1, 2, 3, 4, 5, 6, 7, 8, 9];

    suits.forEach((suit) => {
      ranks.forEach((rank) => {
        const key = this.getTileCacheKey({ suit, rank });

        // Create offscreen canvas for this tile
        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = TILE_WIDTH;
        offscreenCanvas.height = TILE_HEIGHT;

        const ctx = offscreenCanvas.getContext('2d');
        if (!ctx) {
          console.error(`[TileRenderer] Failed to get 2D context for tile ${key}`);
          return;
        }

        // Draw tile to offscreen canvas
        this.drawTile(ctx, suit, rank);

        // Store in cache
        this.tileCache.set(key, offscreenCanvas);
      });
    });

    console.log(`[TileRenderer] Pre-rendered ${this.tileCache.size} tiles to cache`);
  }

  /**
   * Draw cached tile to canvas
   * Uses drawImage() to copy from cached offscreen canvas (fast)
   *
   * @param ctx - Target canvas 2D rendering context
   * @param x - X coordinate in target canvas
   * @param y - Y coordinate in target canvas
   * @param tile - Tile to draw
   */
  drawCachedTile(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    tile: Tile
  ): void {
    const key = this.getTileCacheKey(tile);
    const cachedCanvas = this.tileCache.get(key);

    if (!cachedCanvas) {
      console.warn(`[TileRenderer] Tile not in cache: ${key}, drawing directly`);
      // Fallback: draw directly if not cached
      ctx.save();
      ctx.translate(x, y);
      this.drawTile(ctx, tile.suit, tile.rank);
      ctx.restore();
      return;
    }

    // Use integer coordinates to avoid sub-pixel rendering blur
    const drawX = Math.floor(x);
    const drawY = Math.floor(y);

    // Fast draw from cache using drawImage()
    ctx.drawImage(cachedCanvas, drawX, drawY);
  }

  /**
   * Get tile cache key
   * @param tile - Tile object
   * @returns Cache key string (e.g., "WAN-5")
   */
  private getTileCacheKey(tile: Tile): string {
    return `${tile.suit}-${tile.rank}`;
  }

  /**
   * Clear tile cache (useful for cleanup)
   */
  clearCache(): void {
    this.tileCache.clear();
    console.log('[TileRenderer] Cache cleared');
  }

  /**
   * Get cache size (for debugging)
   */
  getCacheSize(): number {
    return this.tileCache.size;
  }
}

export default TileRenderer;
