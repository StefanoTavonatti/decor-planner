import { describe, expect, test } from 'vitest';
import { neighbourGaps, snap } from './snapping';

const wall = { width: 3000, height: 2700 };

describe('snap', () => {
  test('top edges align with another piece', () => {
    const other = { x: 500, y: 1200, width: 400, height: 500 }; // top 1700
    const moving = { x: 1100, y: 1296, width: 300, height: 400 }; // top 1696
    const r = snap({ moving, others: [other], wall, threshold: 10 });
    expect(r.y + moving.height).toBe(1700);
    expect(r.guides).toContainEqual({ kind: 'line', axis: 'y', pos: 1700 });
  });
  test('outside threshold nothing snaps', () => {
    const moving = { x: 1113, y: 1313, width: 301, height: 401 };
    const r = snap({ moving, others: [], wall, threshold: 5 });
    expect(r).toEqual({ x: 1113, y: 1313, guides: [] });
  });
  test('centre snaps to eye level', () => {
    const moving = { x: 1113, y: 1245, width: 301, height: 400 }; // centre 1445
    const r = snap({ moving, others: [], wall, eyeLevelMm: 1450, threshold: 10 });
    expect(r.y + 200).toBe(1450);
  });
  test('spec: equal spacing snaps to existing 12 cm gap', () => {
    const a = { x: 100, y: 1000, width: 400, height: 500 };
    const b = { x: 620, y: 1000, width: 400, height: 500 }; // gap 120
    const moving = { x: 1147, y: 1013, width: 333, height: 477 };
    const r = snap({ moving, others: [a, b], wall, threshold: 10 });
    expect(r.x).toBe(1140);
    expect(r.guides.some((g) => g.kind === 'gap' && g.axis === 'x' && g.to - g.from === 120)).toBe(true);
  });
  test('snaps to wall centre', () => {
    const moving = { x: 1297, y: 1013, width: 400, height: 477 }; // centre 1497
    const r = snap({ moving, others: [], wall, threshold: 10 });
    expect(r.x).toBe(1300);
  });
});

describe('neighbourGaps', () => {
  test('spec: 12 cm gap to neighbour, wall distances otherwise', () => {
    const left = { x: 100, y: 1000, width: 400, height: 500 };
    const r = { x: 620, y: 1100, width: 300, height: 300 };
    const g = neighbourGaps(r, [left], wall);
    expect(g.left).toMatchObject({ distance: 120, toWall: false });
    expect(g.right).toMatchObject({ distance: 3000 - 920, toWall: true });
    expect(g.below).toMatchObject({ distance: 1100, toWall: true });
    expect(g.above).toMatchObject({ distance: 2700 - 1400, toWall: true });
  });
  test('ignores items that are not in the same row', () => {
    const far = { x: 100, y: 0, width: 400, height: 200 };
    const r = { x: 620, y: 1100, width: 300, height: 300 };
    expect(neighbourGaps(r, [far], wall).left.toWall).toBe(true);
    expect(neighbourGaps(r, [far], wall).below.toWall).toBe(true);
  });
});
