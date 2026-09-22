/**
 * Planar homography from 4 point correspondences (DLT with h33 = 1).
 * H maps (x, y) -> (x', y') via [x' y' w]^T = H [x y 1]^T.
 */
import type { Point } from './geometry';

/** Row-major 3x3 matrix. */
export type Mat3 = [number, number, number, number, number, number, number, number, number];

/** Solve A x = b with Gaussian elimination and partial pivoting. Returns null if singular. */
function solve(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    if (Math.abs(M[pivot][col]) < 1e-12) return null;
    [M[col], M[pivot]] = [M[pivot], M[col]];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col] / M[col][col];
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}

/** Homography mapping each `src[i]` to `dst[i]`. Returns null for degenerate input. */
export function computeHomography(src: Point[], dst: Point[]): Mat3 | null {
  if (src.length !== 4 || dst.length !== 4) throw new Error('Exactly 4 point pairs required');
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i];
    const { x: u, y: v } = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }
  const h = solve(A, b);
  if (!h) return null;
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}

export function applyHomography(H: Mat3, p: Point): Point {
  const w = H[6] * p.x + H[7] * p.y + H[8];
  return { x: (H[0] * p.x + H[1] * p.y + H[2]) / w, y: (H[3] * p.x + H[4] * p.y + H[5]) / w };
}

export function invertMat3(m: Mat3): Mat3 | null {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-15) return null;
  const inv: Mat3 = [
    A,
    -(b * i - c * h),
    b * f - c * e,
    B,
    a * i - c * g,
    -(a * f - c * d),
    C,
    -(a * h - b * g),
    a * e - b * d,
  ];
  return inv.map((v) => v / det) as Mat3;
}

function cross(o: Point, a: Point, b: Point): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

/**
 * A quad (in order) is valid for rectification when it is strictly convex,
 * which also excludes self-intersecting ("bow-tie") configurations.
 */
export function isValidQuad(q: Point[], minArea = 1): boolean {
  if (q.length !== 4) return false;
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const c = cross(q[i], q[(i + 1) % 4], q[(i + 2) % 4]);
    if (Math.abs(c) < 1e-9) return false;
    const s = Math.sign(c);
    if (sign === 0) sign = s;
    else if (s !== sign) return false;
  }
  // Shoelace area.
  let area = 0;
  for (let i = 0; i < 4; i++) area += q[i].x * q[(i + 1) % 4].y - q[(i + 1) % 4].x * q[i].y;
  return Math.abs(area) / 2 >= minArea;
}

/**
 * Output pixel size for a rectified image with real aspect W:H, keeping roughly
 * the resolution of the source quad and capping the long edge.
 */
export function rectifiedSize(
  quad: Point[],
  widthMm: number,
  heightMm: number,
  maxLongEdge = 3000,
): { width: number; height: number } {
  const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
  const srcW = Math.max(dist(quad[0], quad[1]), dist(quad[3], quad[2]));
  const srcH = Math.max(dist(quad[0], quad[3]), dist(quad[1], quad[2]));
  const aspect = widthMm / heightMm;
  // Long edge from the source resolution, respecting the real aspect.
  let long = Math.min(maxLongEdge, Math.max(srcW, srcH));
  long = Math.max(16, Math.round(long));
  return aspect >= 1
    ? { width: long, height: Math.max(1, Math.round(long / aspect)) }
    : { width: Math.max(1, Math.round(long * aspect)), height: long };
}
