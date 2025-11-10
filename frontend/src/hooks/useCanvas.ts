/**
 * T089: useCanvas Hook
 *
 * Custom React hook for managing Canvas refs with requestAnimationFrame-driven rendering.
 * Handles canvas lifecycle, automatic cleanup, and optimized redrawing.
 */

import { useEffect, useRef, useCallback } from 'react';

/**
 * Draw function signature
 * @param ctx - Canvas 2D rendering context
 * @param frameCount - Number of frames rendered (useful for animations)
 */
export type DrawFunction = (ctx: CanvasRenderingContext2D, frameCount: number) => void;

/**
 * useCanvas hook options
 */
export interface UseCanvasOptions {
  /**
   * Draw function called on each animation frame
   */
  draw: DrawFunction;

  /**
   * Whether to continuously animate (default: false)
   * If false, draws only once
   * If true, uses requestAnimationFrame loop
   */
  animate?: boolean;

  /**
   * Canvas width (optional)
   * If provided, sets canvas.width accounting for devicePixelRatio
   */
  width?: number;

  /**
   * Canvas height (optional)
   * If provided, sets canvas.height accounting for devicePixelRatio
   */
  height?: number;

  /**
   * Dependencies that trigger redraw (like useEffect deps)
   * When any dependency changes, canvas is redrawn
   */
  deps?: React.DependencyList;
}

/**
 * useCanvas Hook
 *
 * Manages Canvas element lifecycle and requestAnimationFrame rendering.
 *
 * Features:
 * - Automatic canvas ref management
 * - requestAnimationFrame-driven rendering (60fps)
 * - Device pixel ratio scaling for high-DPI displays
 * - Automatic cleanup on unmount
 * - Optional continuous animation or single-frame draw
 * - Dependency-based redrawing
 *
 * @param options - Hook configuration
 * @returns Canvas ref to attach to canvas element
 *
 * @example
 * ```tsx
 * const canvasRef = useCanvas({
 *   draw: (ctx, frameCount) => {
 *     ctx.fillStyle = 'blue';
 *     ctx.fillRect(0, 0, 100, 100);
 *   },
 *   animate: true,
 *   width: 800,
 *   height: 600,
 * });
 *
 * return <canvas ref={canvasRef} />;
 * ```
 */
export function useCanvas(options: UseCanvasOptions) {
  const { draw, animate = false, width, height, deps = [] } = options;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafIdRef = useRef<number | null>(null);
  const frameCountRef = useRef<number>(0);

  // Memoize draw function to avoid unnecessary effect re-runs
  const drawCallback = useCallback(draw, deps);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('[useCanvas] Failed to get 2D context');
      return;
    }

    // Set canvas dimensions with device pixel ratio scaling
    if (width !== undefined && height !== undefined) {
      const dpr = window.devicePixelRatio || 1;

      // Set actual canvas dimensions (physical pixels)
      canvas.width = width * dpr;
      canvas.height = height * dpr;

      // Set display dimensions (CSS pixels)
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      // Scale context to account for device pixel ratio
      ctx.scale(dpr, dpr);
    }

    // Reset frame count
    frameCountRef.current = 0;

    // Animation loop function
    const animationLoop = () => {
      drawCallback(ctx, frameCountRef.current);
      frameCountRef.current++;

      if (animate) {
        rafIdRef.current = requestAnimationFrame(animationLoop);
      }
    };

    // Start animation or single draw
    if (animate) {
      rafIdRef.current = requestAnimationFrame(animationLoop);
    } else {
      // Single draw (no animation loop)
      drawCallback(ctx, frameCountRef.current);
    }

    // Cleanup: cancel animation frame on unmount or dependency change
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [drawCallback, animate, width, height]);

  return canvasRef;
}

/**
 * useCanvasRedraw Hook
 *
 * Simplified version of useCanvas for static (non-animated) canvases
 * that only need to redraw when dependencies change.
 *
 * @param draw - Draw function
 * @param deps - Dependencies that trigger redraw
 * @returns Canvas ref
 *
 * @example
 * ```tsx
 * const canvasRef = useCanvasRedraw((ctx) => {
 *   ctx.fillStyle = selectedColor;
 *   ctx.fillRect(0, 0, 100, 100);
 * }, [selectedColor]);
 * ```
 */
export function useCanvasRedraw(
  draw: (ctx: CanvasRenderingContext2D) => void,
  deps: React.DependencyList = []
) {
  return useCanvas({
    draw: (ctx) => draw(ctx),
    animate: false,
    deps,
  });
}

export default useCanvas;
