import { describe, expect, test } from 'vitest';
import { boundingBox, contains, fitViewport, overlaps, rectToView, viewToWorld, worldToView } from './geometry';

describe('geometry', () => {
  test('overlap is strict; touching edges do not overlap', () => {
    const a = { x: 0, y: 0, width: 100, height: 100 };
    expect(overlaps(a, { x: 50, y: 50, width: 100, height: 100 })).toBe(true);
    expect(overlaps(a, { x: 100, y: 0, width: 100, height: 100 })).toBe(false);
  });
  test('containment', () => {
    const wall = { x: 0, y: 0, width: 3000, height: 2700 };
    expect(contains(wall, { x: 2800, y: 100, width: 200, height: 100 })).toBe(true);
    expect(contains(wall, { x: 2900, y: 100, width: 200, height: 100 })).toBe(false);
  });
  test('bounding box', () => {
    expect(boundingBox([{ x: 0, y: 10, width: 10, height: 10 }, { x: 30, y: 0, width: 5, height: 5 }])).toEqual({
      x: 0, y: 0, width: 35, height: 20,
    });
  });
  test('world/view round-trip with y flip', () => {
    const v = { scale: 0.5, offsetX: 10, offsetY: 20, wallHeightMm: 2000 };
    expect(worldToView(v, { x: 0, y: 2000 })).toEqual({ x: 10, y: 20 }); // top-left of wall
    expect(worldToView(v, { x: 0, y: 0 })).toEqual({ x: 10, y: 1020 }); // floor
    const p = { x: 123, y: 456 };
    const back = viewToWorld(v, worldToView(v, p));
    expect(back.x).toBeCloseTo(123);
    expect(back.y).toBeCloseTo(456);
    expect(rectToView(v, { x: 0, y: 1000, width: 200, height: 1000 })).toEqual({ x: 10, y: 20, width: 100, height: 500 });
  });
  test('fitViewport keeps aspect and centres', () => {
    const v = fitViewport(3000, 1500, 648, 648, 24);
    expect(v.scale).toBeCloseTo(0.2);
    expect(v.offsetX).toBeCloseTo(24);
    expect(v.offsetY).toBeCloseTo((648 - 300) / 2);
  });
});
