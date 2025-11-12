/**
 * Canvas utility functions
 */

/**
 * Setup canvas for high-DPI displays (Retina screens)
 */
export function setupHighDPICanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const dpr = window.devicePixelRatio || 1;

  // Get CSS size
  const rect = canvas.getBoundingClientRect();

  // Set canvas pixel size (accounting for device pixel ratio)
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;

  // Scale context to match device pixel ratio
  ctx.scale(dpr, dpr);

  // Set canvas CSS size
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;

  return ctx;
}

/**
 * Convert coordinates to integer (avoid sub-pixel rendering blur)
 */
export function toInt(value: number): number {
  return Math.floor(value);
}

/**
 * Clear canvas
 */
export function clearCanvas(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.clearRect(0, 0, width, height);
}

/**
 * Draw rounded rectangle
 */
export function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
