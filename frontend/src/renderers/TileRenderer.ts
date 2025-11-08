/**
 * Tile Renderer (skeleton class for Phase 6)
 *
 * This is the foundation for Canvas tile rendering.
 * Full implementation will be done in Phase 8 (User Story 6).
 */

import type { Tile } from '@/types';

export class TileRenderer {
  // Will be used in Phase 8
  // private tileCache: Map<string, HTMLCanvasElement> = new Map();

  /**
   * Pre-render all tile faces to offscreen canvas (cache)
   * To be implemented in Phase 8
   */
  preRenderTiles() {
    // TODO: Implement in Phase 8 (User Story 6)
    // Will render all 27 tile types (WAN/TIAO/TONG × 1-9) to cache
    console.log('[TileRenderer] preRenderTiles() - to be implemented in Phase 8');
  }

  /**
   * Draw cached tile to canvas
   * To be implemented in Phase 8
   */
  drawCachedTile(
    _ctx: CanvasRenderingContext2D,
    _x: number,
    _y: number,
    _tile: Tile
  ) {
    // TODO: Implement in Phase 8 (User Story 6)
    // Will draw tile from tileCache using drawImage()
    console.log('[TileRenderer] drawCachedTile() - to be implemented in Phase 8');
  }

  /**
   * Get tile cache key (will be used in Phase 8)
   */
  // private getTileCacheKey(tile: Tile): string {
  //   return `${tile.suit}-${tile.rank}`;
  // }
}

export default TileRenderer;
