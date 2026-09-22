/** Perspective warp of RGBA pixel data (inverse mapping + bilinear sampling). */
import type { Point } from './geometry';
import { computeHomography, type Mat3 } from './homography';

export interface Pixels {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

/**
 * Produce an `outW × outH` image of the region inside `quad` (source pixel
 * coordinates, order TL, TR, BR, BL), corrected for perspective.
 */
export function warpQuadToRect(src: Pixels, quad: [Point, Point, Point, Point], outW: number, outH: number): Pixels {
  const rect = [
    { x: 0, y: 0 },
    { x: outW, y: 0 },
    { x: outW, y: outH },
    { x: 0, y: outH },
  ];
  const H = computeHomography(rect, quad);
  if (!H) throw new Error('Degenerate corner configuration');
  return warpWithHomography(src, H, outW, outH);
}

/** `H` maps output pixel coordinates to source pixel coordinates. */
export function warpWithHomography(src: Pixels, H: Mat3, outW: number, outH: number): Pixels {
  const out = new Uint8ClampedArray(outW * outH * 4);
  const { width: sw, height: sh, data: sd } = src;
  const [a, b, c, d, e, f, g, h, i] = H;
  for (let v = 0; v < outH; v++) {
    const vy = v + 0.5;
    for (let u = 0; u < outW; u++) {
      const ux = u + 0.5;
      const w = g * ux + h * vy + i;
      // Source coordinates, shifted so integer values hit pixel centres.
      const x = (a * ux + b * vy + c) / w - 0.5;
      const y = (d * ux + e * vy + f) / w - 0.5;
      const o = (v * outW + u) * 4;
      if (x < -0.5 || y < -0.5 || x > sw - 0.5 || y > sh - 0.5) {
        out[o + 3] = 0;
        continue;
      }
      const x0 = Math.max(0, Math.min(sw - 1, Math.floor(x)));
      const y0 = Math.max(0, Math.min(sh - 1, Math.floor(y)));
      const x1 = Math.min(sw - 1, x0 + 1);
      const y1 = Math.min(sh - 1, y0 + 1);
      const fx = Math.max(0, Math.min(1, x - x0));
      const fy = Math.max(0, Math.min(1, y - y0));
      const i00 = (y0 * sw + x0) * 4;
      const i10 = (y0 * sw + x1) * 4;
      const i01 = (y1 * sw + x0) * 4;
      const i11 = (y1 * sw + x1) * 4;
      for (let k = 0; k < 4; k++) {
        const top = sd[i00 + k] + (sd[i10 + k] - sd[i00 + k]) * fx;
        const bot = sd[i01 + k] + (sd[i11 + k] - sd[i01 + k]) * fx;
        out[o + k] = top + (bot - top) * fy;
      }
    }
  }
  return { width: outW, height: outH, data: out };
}

