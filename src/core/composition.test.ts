import { describe, expect, test } from 'vitest';
import { chooseScale, compositionWarnings, needsBackupReminder, planRows } from './composition';
import { createPiece, createProject } from './model';
import { warpQuadToRect } from './warp';

function setup() {
  const a = createPiece({ name: 'A', widthMm: 400, heightMm: 500, imageId: 'img', hanging: { type: 1, offsetTopMm: 60 } });
  const b = createPiece({ name: 'B', widthMm: 1000, heightMm: 700, hanging: { type: 2, offsetTopMm: 100, spacingMm: 600 } });
  const project = createProject('P', { widthMm: 3200, heightMm: 2700 });
  project.placements.push(
    { id: 'pb', pieceId: b.id, xMm: 1500, yMm: 950, locked: false },
    { id: 'pa', pieceId: a.id, xMm: 650, yMm: 1180, locked: false },
  );
  project.obstacles.push({ id: 'sofa', name: 'Sofa', xMm: 500, yMm: 0, widthMm: 2200, heightMm: 850 });
  return { project, pieces: new Map([a, b].map((p) => [p.id, p])) };
}

describe('planRows', () => {
  test('numbers left to right with nail coordinates', () => {
    const { project, pieces } = setup();
    const rows = planRows(project, pieces);
    expect(rows.map((r) => [r.number, r.name])).toEqual([
      [1, 'A'],
      [2, 'B'],
    ]);
    expect(rows[0].nails).toEqual([{ x: 850, y: 1620 }]);
    expect(rows[0].topEdgeMm).toBe(1680);
    expect(rows[1].nails).toEqual([
      { x: 1700, y: 1550 },
      { x: 2300, y: 1550 },
    ]);
    expect(rows[1].isPlaceholder).toBe(true);
  });
});

describe('compositionWarnings', () => {
  test('no warnings for a clean layout', () => {
    const { project, pieces } = setup();
    expect(compositionWarnings(project, pieces)).toEqual([]);
  });
  test('out of bounds and overlap', () => {
    const { project, pieces } = setup();
    project.placements[0].xMm = 2500; // B: 2500..3500 > 3200
    project.placements[1].yMm = 600; // A overlaps the sofa (top 850)
    const w = compositionWarnings(project, pieces);
    expect(w).toContainEqual({ placementId: 'pb', outOfBounds: true, overlapsWith: [] });
    expect(w).toContainEqual({ placementId: 'pa', outOfBounds: false, overlapsWith: ['sofa'] });
  });
});

describe('chooseScale', () => {
  test('picks the largest standard scale that fits', () => {
    // A4 landscape drawing area ~ 260 × 150 mm; wall 3200 × 2700 needs 1:20 (160 × 135).
    expect(chooseScale(3200, 2700, 260, 150)).toBe(20);
    expect(chooseScale(3200, 2700, 150, 150)).toBe(25);
  });
});

describe('needsBackupReminder', () => {
  const day = 24 * 3600 * 1000;
  const now = 100 * day;
  test('spec: modified today, exported 20 days ago', () => {
    expect(needsBackupReminder({ createdAt: 0, updatedAt: now, lastExportedAt: now - 20 * day }, now)).toBe(true);
  });
  test('recently exported', () => {
    expect(needsBackupReminder({ createdAt: 0, updatedAt: now, lastExportedAt: now - 3 * day }, now)).toBe(false);
  });
  test('not modified since the export', () => {
    expect(needsBackupReminder({ createdAt: 0, updatedAt: now - 30 * day, lastExportedAt: now - 20 * day }, now)).toBe(false);
  });
  test('never exported, old project', () => {
    expect(needsBackupReminder({ createdAt: now - 15 * day, updatedAt: now }, now)).toBe(true);
    expect(needsBackupReminder({ createdAt: now - 2 * day, updatedAt: now }, now)).toBe(false);
  });
});

describe('warpQuadToRect', () => {
  test('rectifies a skewed quad back to a checker pattern', () => {
    // Source: 100×100 image, left half red, right half blue.
    const w = 100;
    const h = 100;
    const data = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const o = (y * w + x) * 4;
        data.set(x < 50 ? [255, 0, 0, 255] : [0, 0, 255, 255], o);
      }
    // Full-image quad -> 40×20 output: left half red, right half blue.
    const out = warpQuadToRect({ width: w, height: h, data }, [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }], 40, 20);
    const px = (x: number, y: number) => Array.from(out.data.slice((y * 40 + x) * 4, (y * 40 + x) * 4 + 4));
    expect(px(5, 10)).toEqual([255, 0, 0, 255]);
    expect(px(35, 10)).toEqual([0, 0, 255, 255]);
    // Right-half quad -> all blue.
    const right = warpQuadToRect({ width: w, height: h, data }, [{ x: 60, y: 10 }, { x: 95, y: 0 }, { x: 99, y: 99 }, { x: 55, y: 90 }], 10, 10);
    for (let i = 0; i < 100; i++) expect(right.data[i * 4 + 2]).toBe(255);
  });
});
