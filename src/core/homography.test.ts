import { describe, expect, test } from 'vitest';
import { applyHomography, computeHomography, invertMat3, isValidQuad, rectifiedSize } from './homography';

const close = (a: { x: number; y: number }, b: { x: number; y: number }) => {
  expect(a.x).toBeCloseTo(b.x, 6);
  expect(a.y).toBeCloseTo(b.y, 6);
};

describe('homography', () => {
  test('identity', () => {
    const sq = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
    const H = computeHomography(sq, sq)!;
    close(applyHomography(H, { x: 0.3, y: 0.7 }), { x: 0.3, y: 0.7 });
  });
  test('scale + translation', () => {
    const src = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
    const dst = [{ x: 10, y: 20 }, { x: 30, y: 20 }, { x: 30, y: 60 }, { x: 10, y: 60 }];
    const H = computeHomography(src, dst)!;
    close(applyHomography(H, { x: 0.5, y: 0.5 }), { x: 20, y: 40 });
  });
  test('perspective quad maps corners exactly and inverse maps back', () => {
    const quad = [{ x: 120, y: 80 }, { x: 900, y: 140 }, { x: 860, y: 700 }, { x: 150, y: 760 }];
    const rect = [{ x: 0, y: 0 }, { x: 3200, y: 0 }, { x: 3200, y: 2700 }, { x: 0, y: 2700 }];
    const H = computeHomography(rect, quad)!;
    rect.forEach((p, i) => close(applyHomography(H, p), quad[i]));
    const Hi = invertMat3(H)!;
    quad.forEach((p, i) => close(applyHomography(Hi, p), rect[i]));
    // Straight lines stay straight: midpoint of an edge in rect space lies on the quad's edge line.
    const m = applyHomography(H, { x: 1600, y: 0 });
    const cross = (quad[1].x - quad[0].x) * (m.y - quad[0].y) - (quad[1].y - quad[0].y) * (m.x - quad[0].x);
    expect(Math.abs(cross)).toBeLessThan(1e-6);
  });
  test('degenerate input returns null', () => {
    const line = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }];
    const sq = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
    expect(computeHomography(sq, line)).toBeNull();
  });
});

describe('isValidQuad', () => {
  test('convex quad is valid', () => {
    expect(isValidQuad([{ x: 0, y: 0 }, { x: 100, y: 10 }, { x: 90, y: 100 }, { x: 5, y: 90 }])).toBe(true);
  });
  test('crossed corners (bow-tie) are invalid', () => {
    expect(isValidQuad([{ x: 100, y: 0 }, { x: 0, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }])).toBe(false);
  });
  test('concave quad is invalid', () => {
    expect(isValidQuad([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 30, y: 30 }, { x: 0, y: 100 }])).toBe(false);
  });
});

test('rectifiedSize respects real aspect ratio and cap', () => {
  const quad = [{ x: 0, y: 0 }, { x: 4000, y: 0 }, { x: 4000, y: 3000 }, { x: 0, y: 3000 }];
  const s = rectifiedSize(quad, 3200, 2700);
  expect(s.width).toBe(3000);
  expect(s.width / s.height).toBeCloseTo(3200 / 2700, 2);
});
