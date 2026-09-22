import { PDFDocument } from 'pdf-lib';
import { describe, expect, test } from 'vitest';
import { createPiece, createProject, type Piece } from '../../core/model';
import { nailPositions } from '../../core/nails';
import { buildMountingPlanPdf } from './pdf';

function setup(count: number) {
  const pieces = new Map<string, Piece>();
  const project = createProject('Living room', { widthMm: 3200, heightMm: 2700 });
  for (let i = 0; i < count; i++) {
    const piece = createPiece({
      name: `Piece ${i + 1} — 日本`, // non-WinAnsi characters must not break the export
      widthMm: 300,
      heightMm: 400,
      hanging: i % 2 ? { type: 2, offsetTopMm: 50, spacingMm: 200 } : { type: 1, offsetTopMm: 60 },
    });
    pieces.set(piece.id, piece);
    project.placements.push({ id: `pl${i}`, pieceId: piece.id, xMm: 100 + (i % 8) * 350, yMm: 900 + Math.floor(i / 8) * 450, locked: false });
  }
  project.obstacles.push({ id: 'sofa', name: 'Sofa', xMm: 500, yMm: 0, widthMm: 2200, heightMm: 850 });
  return { project, pieces };
}

describe('buildMountingPlanPdf', () => {
  test('single page with one row per placement and nails matching core/nails', async () => {
    const { project, pieces } = setup(3);
    const r = await buildMountingPlanPdf({ project, pieces, unit: 'cm', paper: 'A4', includePhoto: false });
    const doc = await PDFDocument.load(r.bytes);
    expect(doc.getPageCount()).toBe(1);
    expect(r.rows).toHaveLength(3);
    // A standard scale at which the 3.2 m wall fits the landscape A4 drawing area (~270 mm wide).
    expect([20, 25]).toContain(r.scale);
    expect(3200 / r.scale).toBeLessThan(270);
    for (const row of r.rows) {
      const pl = project.placements.find((p) => p.id === row.placementId)!;
      expect(row.nails).toEqual(nailPositions(pl, pieces.get(pl.pieceId)!));
    }
    // Page is landscape A4.
    const { width, height } = doc.getPage(0).getSize();
    expect(width).toBeCloseTo(841.89, 1);
    expect(height).toBeCloseTo(595.28, 1);
  });

  test('long tables continue on further pages; Letter paper', async () => {
    const { project, pieces } = setup(40);
    const r = await buildMountingPlanPdf({ project, pieces, unit: 'imperial', paper: 'Letter', includePhoto: false });
    expect(r.pageCount).toBeGreaterThan(1);
    expect(r.rows).toHaveLength(40);
    const doc = await PDFDocument.load(r.bytes);
    expect(doc.getPage(0).getSize().width).toBe(792);
  });

  test('empty project still produces a plan', async () => {
    const { project, pieces } = setup(0);
    const r = await buildMountingPlanPdf({ project, pieces, unit: 'mm', paper: 'A4', includePhoto: false });
    expect(r.pageCount).toBe(1);
  });
});
