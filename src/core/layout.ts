/** Group operations on sets of rects: align, distribute, centre. Return new origins by id. */
import { boundingBox, centerX, centerY, right, top, type Rect } from './geometry';

export interface Item {
  id: string;
  rect: Rect;
}

export type Positions = Map<string, { x: number; y: number }>;

export type AlignMode = 'left' | 'right' | 'top' | 'bottom' | 'hcenter' | 'vcenter';

export function align(items: Item[], mode: AlignMode): Positions {
  const out: Positions = new Map();
  const bb = boundingBox(items.map((i) => i.rect));
  if (!bb) return out;
  for (const { id, rect } of items) {
    let { x, y } = rect;
    switch (mode) {
      case 'left':
        x = bb.x;
        break;
      case 'right':
        x = right(bb) - rect.width;
        break;
      case 'bottom':
        y = bb.y;
        break;
      case 'top':
        y = top(bb) - rect.height;
        break;
      case 'hcenter':
        x = centerX(bb) - rect.width / 2;
        break;
      case 'vcenter':
        y = centerY(bb) - rect.height / 2;
        break;
    }
    out.set(id, { x, y });
  }
  return out;
}

/** Equal gaps between consecutive items; the outermost items stay in place. */
export function distribute(items: Item[], axis: 'x' | 'y'): Positions {
  const out: Positions = new Map();
  if (items.length < 3) {
    for (const i of items) out.set(i.id, { x: i.rect.x, y: i.rect.y });
    return out;
  }
  const s = (r: Rect) => (axis === 'x' ? r.x : r.y);
  const sz = (r: Rect) => (axis === 'x' ? r.width : r.height);
  const sorted = [...items].sort((a, b) => s(a.rect) + sz(a.rect) / 2 - (s(b.rect) + sz(b.rect) / 2));
  const first = sorted[0].rect;
  const last = sorted[sorted.length - 1].rect;
  const span = s(last) + sz(last) - s(first);
  const total = sorted.reduce((acc, i) => acc + sz(i.rect), 0);
  const gap = (span - total) / (sorted.length - 1);
  let cursor = s(first);
  for (const { id, rect } of sorted) {
    out.set(id, axis === 'x' ? { x: cursor, y: rect.y } : { x: rect.x, y: cursor });
    cursor += sz(rect) + gap;
  }
  return out;
}

/** Translate all items by the same delta. */
export function translate(items: Item[], dx: number, dy: number): Positions {
  return new Map(items.map(({ id, rect }) => [id, { x: rect.x + dx, y: rect.y + dy }]));
}

/** Centre the group horizontally on a target (e.g. the wall or an obstacle). */
export function centerHorizontallyOn(items: Item[], target: Rect): Positions {
  const bb = boundingBox(items.map((i) => i.rect));
  if (!bb) return new Map();
  return translate(items, centerX(target) - centerX(bb), 0);
}

/** Centre the group's bounding box vertically on a given height (eye level). */
export function centerVerticallyAt(items: Item[], yMm: number): Positions {
  const bb = boundingBox(items.map((i) => i.rect));
  if (!bb) return new Map();
  return translate(items, 0, yMm - centerY(bb));
}
