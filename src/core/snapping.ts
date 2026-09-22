/** Snapping and neighbour-gap computation in wall space (mm). */
import { centerX, centerY, right, top, type Rect } from './geometry';

export type Axis = 'x' | 'y';

/** A guide to draw: a full line at `pos` (edge/centre/eye) or a gap segment. */
export type Guide =
  | { kind: 'line'; axis: Axis; pos: number }
  | { kind: 'gap'; axis: Axis; from: number; to: number; at: number };

export interface SnapInput {
  /** Proposed rect of the moving item (or group bounding box). */
  moving: Rect;
  /** Other pieces and obstacles (not being moved). */
  others: Rect[];
  wall: { width: number; height: number };
  eyeLevelMm?: number;
  /** Snap distance in mm (typically a few screen pixels converted to mm). */
  threshold: number;
}

export interface SnapResult {
  x: number;
  y: number;
  guides: Guide[];
}

interface Candidate {
  /** New x (or y) for the moving rect's origin. */
  value: number;
  distance: number;
  guides: Guide[];
}

function overlapsOn(a: Rect, b: Rect, axis: Axis): boolean {
  return axis === 'x' ? a.y < top(b) && b.y < top(a) : a.x < right(b) && b.x < right(a);
}

const start = (r: Rect, axis: Axis) => (axis === 'x' ? r.x : r.y);
const end = (r: Rect, axis: Axis) => (axis === 'x' ? right(r) : top(r));
const size = (r: Rect, axis: Axis) => (axis === 'x' ? r.width : r.height);
const cross = (r: Rect, axis: Axis) => (axis === 'x' ? centerY(r) : centerX(r));

/** Consecutive gaps between non-overlapping neighbours of the `others` set along an axis. */
function existingGaps(others: Rect[], axis: Axis): number[] {
  const gaps: number[] = [];
  for (const a of others) {
    let best: number | null = null;
    for (const b of others) {
      if (a === b || !overlapsOn(a, b, axis)) continue;
      const g = start(b, axis) - end(a, axis);
      if (g > 0.5 && (best === null || g < best)) best = g;
    }
    if (best !== null) gaps.push(best);
  }
  return gaps;
}

function lineCandidates(input: SnapInput, axis: Axis): Candidate[] {
  const { moving, others, wall, eyeLevelMm } = input;
  const targets: number[] = [];
  const wallSize = axis === 'x' ? wall.width : wall.height;
  targets.push(0, wallSize, wallSize / 2);
  for (const o of others) targets.push(start(o, axis), end(o, axis), start(o, axis) + size(o, axis) / 2);

  const s = size(moving, axis);
  const anchors = [0, s / 2, s]; // offsets of left/centre/right (or bottom/centre/top)
  const cands: Candidate[] = [];
  for (const t of targets) {
    for (const a of anchors) {
      const value = t - a;
      cands.push({ value, distance: Math.abs(value - start(moving, axis)), guides: [{ kind: 'line', axis, pos: t }] });
    }
  }
  if (axis === 'y' && eyeLevelMm !== undefined) {
    const value = eyeLevelMm - s / 2;
    cands.push({ value, distance: Math.abs(value - moving.y), guides: [{ kind: 'line', axis, pos: eyeLevelMm }] });
  }
  return cands;
}

function gapCandidates(input: SnapInput, axis: Axis): Candidate[] {
  const { moving, others } = input;
  const inRow = others.filter((o) => overlapsOn(moving, o, axis));
  const mid = start(moving, axis) + size(moving, axis) / 2;
  const before = inRow.filter((o) => start(o, axis) + size(o, axis) / 2 < mid).sort((a, b) => end(b, axis) - end(a, axis))[0];
  const after = inRow.filter((o) => start(o, axis) + size(o, axis) / 2 >= mid).sort((a, b) => start(a, axis) - start(b, axis))[0];
  const s = size(moving, axis);
  const cands: Candidate[] = [];
  const at = cross(moving, axis);
  const gapGuide = (from: number, to: number): Guide => ({ kind: 'gap', axis, from, to, at });

  for (const g of existingGaps(others, axis)) {
    if (before) {
      const value = end(before, axis) + g;
      cands.push({ value, distance: Math.abs(value - start(moving, axis)), guides: [gapGuide(end(before, axis), value)] });
    }
    if (after) {
      const value = start(after, axis) - g - s;
      cands.push({
        value,
        distance: Math.abs(value - start(moving, axis)),
        guides: [gapGuide(value + s, start(after, axis))],
      });
    }
  }
  // Equal gaps on both sides.
  if (before && after) {
    const free = start(after, axis) - end(before, axis) - s;
    if (free > 0) {
      const value = end(before, axis) + free / 2;
      cands.push({
        value,
        distance: Math.abs(value - start(moving, axis)),
        guides: [gapGuide(end(before, axis), value), gapGuide(value + s, start(after, axis))],
      });
    }
  }
  return cands;
}

function best(cands: Candidate[], threshold: number): Candidate | null {
  let found: Candidate | null = null;
  for (const c of cands) if (c.distance <= threshold && (!found || c.distance < found.distance - 1e-9)) found = c;
  return found;
}

/** Snap a moving rect independently on both axes. */
export function snap(input: SnapInput): SnapResult {
  const guides: Guide[] = [];
  let { x, y } = input.moving;

  const bx = best([...lineCandidates(input, 'x'), ...gapCandidates(input, 'x')], input.threshold);
  if (bx) {
    x = bx.value;
    guides.push(...bx.guides);
  }
  const movedX = { ...input.moving, x };
  const by = best(
    [...lineCandidates({ ...input, moving: movedX }, 'y'), ...gapCandidates({ ...input, moving: movedX }, 'y')],
    input.threshold,
  );
  if (by) {
    y = by.value;
    guides.push(...by.guides);
  }
  // Re-evaluate x guides after the y snap (gap guides are drawn at the rect's cross position).
  return { x, y, guides: guides.map((g) => (g.kind === 'gap' && g.axis === 'x' ? { ...g, at: y + input.moving.height / 2 } : g)) };
}

export interface NeighbourGap {
  distance: number;
  /** Segment to draw, in wall mm. */
  from: number;
  to: number;
  at: number;
  /** Whether the neighbour is the wall edge/floor/ceiling. */
  toWall: boolean;
}

export interface NeighbourGaps {
  left: NeighbourGap;
  right: NeighbourGap;
  below: NeighbourGap;
  above: NeighbourGap;
}

/** Distances from `r` to the nearest neighbour (or wall boundary) in each direction. */
export function neighbourGaps(r: Rect, others: Rect[], wall: { width: number; height: number }): NeighbourGaps {
  const rowX = others.filter((o) => overlapsOn(r, o, 'x'));
  const colY = others.filter((o) => overlapsOn(r, o, 'y'));
  const cy = centerY(r);
  const cx = centerX(r);

  const leftN = rowX.filter((o) => right(o) <= r.x + 0.01).sort((a, b) => right(b) - right(a))[0];
  const rightN = rowX.filter((o) => o.x >= right(r) - 0.01).sort((a, b) => a.x - b.x)[0];
  const belowN = colY.filter((o) => top(o) <= r.y + 0.01).sort((a, b) => top(b) - top(a))[0];
  const aboveN = colY.filter((o) => o.y >= top(r) - 0.01).sort((a, b) => a.y - b.y)[0];

  const lFrom = leftN ? right(leftN) : 0;
  const rTo = rightN ? rightN.x : wall.width;
  const bFrom = belowN ? top(belowN) : 0;
  const aTo = aboveN ? aboveN.y : wall.height;
  return {
    left: { distance: r.x - lFrom, from: lFrom, to: r.x, at: cy, toWall: !leftN },
    right: { distance: rTo - right(r), from: right(r), to: rTo, at: cy, toWall: !rightN },
    below: { distance: r.y - bFrom, from: bFrom, to: r.y, at: cx, toWall: !belowN },
    above: { distance: aTo - top(r), from: top(r), to: aTo, at: cx, toWall: !aboveN },
  };
}
