import { strToU8, zipSync } from 'fflate';
import { describe, expect, test } from 'vitest';
import { DecorPlanError, readDecorPlan, referencedPieces, writeDecorPlan } from './format';
import { createPiece, createProject, type Piece, type Project } from './model';

function fixture(): { project: Project; pieces: Piece[]; images: { id: string; mime: string; bytes: Uint8Array }[] } {
  const piece = createPiece({ name: 'Harbour print', widthMm: 400, heightMm: 500, imageId: 'img-piece' });
  const placeholder = createPiece({ name: '50 × 70', widthMm: 500, heightMm: 700 });
  const unused = createPiece({ name: 'Unused', widthMm: 100, heightMm: 100 });
  const project = createProject('Living room', {
    widthMm: 3200,
    heightMm: 2700,
    imageId: 'img-wall',
    imageSource: {
      originalImageId: 'img-wall-orig',
      corners: [
        { x: 1, y: 2 },
        { x: 3, y: 4 },
        { x: 5, y: 6 },
        { x: 7, y: 8 },
      ],
    },
  });
  project.placements.push(
    { id: 'pl1', pieceId: piece.id, xMm: 650, yMm: 1180, locked: false },
    { id: 'pl2', pieceId: placeholder.id, xMm: 1200, yMm: 1100, locked: true },
  );
  project.obstacles.push({ id: 'o1', name: 'Sofa', xMm: 500, yMm: 0, widthMm: 2200, heightMm: 850 });
  const images = ['img-piece', 'img-wall', 'img-wall-orig'].map((id, i) => ({
    id,
    mime: 'image/jpeg',
    bytes: new Uint8Array([0xff, 0xd8, i, 1, 2, 3]),
  }));
  return { project, pieces: referencedPieces(project, [piece, placeholder, unused]), images };
}

describe('.decorplan', () => {
  test('referencedPieces keeps only pieces placed in the project', () => {
    const { pieces } = fixture();
    expect(pieces.map((p) => p.name)).toEqual(['Harbour print', '50 × 70']);
  });

  test('round-trip preserves project, pieces and images', () => {
    const { project, pieces, images } = fixture();
    const bytes = writeDecorPlan(project, pieces, images, '0.1.0', new Date('2026-09-22T10:00:00Z'));
    const plan = readDecorPlan(bytes);
    expect(plan.manifest).toEqual({
      format: 'decorplan',
      formatVersion: 1,
      appVersion: '0.1.0',
      exportedAt: '2026-09-22T10:00:00.000Z',
    });
    expect(plan.project).toEqual(project);
    expect(plan.pieces).toEqual(pieces);
    expect(plan.images.sort((a, b) => a.id.localeCompare(b.id))).toEqual(
      images.sort((a, b) => a.id.localeCompare(b.id)),
    );
  });

  test('not a zip -> invalid', () => {
    expect(() => readDecorPlan(strToU8('hello'))).toThrowError(DecorPlanError);
    try {
      readDecorPlan(strToU8('hello'));
    } catch (e) {
      expect((e as DecorPlanError).code).toBe('invalid');
    }
  });

  test('zip without manifest -> invalid', () => {
    const z = zipSync({ 'foo.txt': strToU8('x') });
    expect(() => readDecorPlan(z)).toThrow(/Missing manifest/);
  });

  test('newer format version is rejected', () => {
    const z = zipSync({
      'manifest.json': strToU8(JSON.stringify({ format: 'decorplan', formatVersion: 99, appVersion: '9', exportedAt: '' })),
    });
    try {
      readDecorPlan(z);
      expect.unreachable();
    } catch (e) {
      expect((e as DecorPlanError).code).toBe('newer-version');
      expect((e as Error).message).toMatch(/newer version/);
    }
  });

  test('damaged project.json -> corrupt', () => {
    const z = zipSync({
      'manifest.json': strToU8(JSON.stringify({ format: 'decorplan', formatVersion: 1, appVersion: '1', exportedAt: '' })),
      'project.json': strToU8('{not json'),
      'pieces.json': strToU8('[]'),
    });
    expect(() => readDecorPlan(z)).toThrow(DecorPlanError);
  });

  test('missing referenced image -> corrupt', () => {
    const { project, pieces, images } = fixture();
    const bytes = writeDecorPlan(project, pieces, images.slice(1), '0.1.0');
    try {
      readDecorPlan(bytes);
      expect.unreachable();
    } catch (e) {
      expect((e as DecorPlanError).code).toBe('corrupt');
    }
  });
});
