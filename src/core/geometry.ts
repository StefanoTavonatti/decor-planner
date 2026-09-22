/** Geometry in wall space: millimetres, origin bottom-left, y up. */

export interface Point {
  x: number;
  y: number;
}

/** Axis-aligned rectangle; (x, y) is the bottom-left corner. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const right = (r: Rect) => r.x + r.width;
export const top = (r: Rect) => r.y + r.height;
export const centerX = (r: Rect) => r.x + r.width / 2;
export const centerY = (r: Rect) => r.y + r.height / 2;

/** Strict overlap: rectangles that only touch at an edge do not overlap. */
export function overlaps(a: Rect, b: Rect, epsilon = 0.01): boolean {
  return a.x < right(b) - epsilon && b.x < right(a) - epsilon && a.y < top(b) - epsilon && b.y < top(a) - epsilon;
}

/** Whether `inner` lies completely inside `outer`. */
export function contains(outer: Rect, inner: Rect, epsilon = 0.01): boolean {
  return (
    inner.x >= outer.x - epsilon &&
    inner.y >= outer.y - epsilon &&
    right(inner) <= right(outer) + epsilon &&
    top(inner) <= top(outer) + epsilon
  );
}

export function boundingBox(rects: Rect[]): Rect | null {
  if (rects.length === 0) return null;
  const minX = Math.min(...rects.map((r) => r.x));
  const minY = Math.min(...rects.map((r) => r.y));
  const maxX = Math.max(...rects.map(right));
  const maxY = Math.max(...rects.map(top));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Viewport mapping between wall space (mm, y up) and screen space (px, y down).
 * `scale` is px per mm; `offsetX/offsetY` is where the wall's top-left lands on screen.
 */
export interface Viewport {
  scale: number;
  offsetX: number;
  offsetY: number;
  wallHeightMm: number;
}

export function worldToView(v: Viewport, p: Point): Point {
  return { x: v.offsetX + p.x * v.scale, y: v.offsetY + (v.wallHeightMm - p.y) * v.scale };
}

export function viewToWorld(v: Viewport, p: Point): Point {
  return { x: (p.x - v.offsetX) / v.scale, y: v.wallHeightMm - (p.y - v.offsetY) / v.scale };
}

/** Screen-space rect (top-left origin) for a wall rect. */
export function rectToView(v: Viewport, r: Rect): { x: number; y: number; width: number; height: number } {
  const tl = worldToView(v, { x: r.x, y: top(r) });
  return { x: tl.x, y: tl.y, width: r.width * v.scale, height: r.height * v.scale };
}

/** Wall-space bottom-left for a screen-space top-left position of a rect of the given height. */
export function viewTopLeftToWorld(v: Viewport, p: Point, heightMm: number): Point {
  const w = viewToWorld(v, p);
  return { x: w.x, y: w.y - heightMm };
}

/** Viewport that fits a wall into a screen area with padding. */
export function fitViewport(
  wallWidthMm: number,
  wallHeightMm: number,
  screenWidth: number,
  screenHeight: number,
  padding = 24,
): Viewport {
  const availW = Math.max(1, screenWidth - padding * 2);
  const availH = Math.max(1, screenHeight - padding * 2);
  const scale = Math.min(availW / wallWidthMm, availH / wallHeightMm);
  return {
    scale,
    offsetX: (screenWidth - wallWidthMm * scale) / 2,
    offsetY: (screenHeight - wallHeightMm * scale) / 2,
    wallHeightMm,
  };
}
