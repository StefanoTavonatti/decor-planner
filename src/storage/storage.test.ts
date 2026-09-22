import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createStore } from 'zustand/vanilla';
import { createPiece, createProject, type Project } from '../core/model';
import { connectAutosave, createAutosaver } from './autosave';
import { DecorDB } from './db';
import { createRepo, type Repo } from './repo';

let db: DecorDB;
let repo: Repo;

beforeEach(() => {
  db = new DecorDB(`test-${crypto.randomUUID()}`);
  repo = createRepo(db);
});
afterEach(async () => {
  await db.delete();
});

const bytes = () => new Uint8Array([1, 2, 3]).buffer;

describe('repositories', () => {
  test('projects: create, rename, list, duplicate, delete', async () => {
    const p = createProject('Living room', { widthMm: 3200, heightMm: 2700 });
    p.placements.push({ id: 'pl', pieceId: 'x', xMm: 1, yMm: 2, locked: false });
    await repo.saveProject(p);
    await repo.renameProject(p.id, 'Lounge');
    expect((await repo.getProject(p.id))?.name).toBe('Lounge');

    const copy = await repo.duplicateProject(p.id);
    expect(copy?.name).toBe('Lounge (copy)');
    expect(copy?.id).not.toBe(p.id);
    expect(copy?.placements[0]).toMatchObject({ pieceId: 'x', xMm: 1, yMm: 2 });
    expect(copy?.placements[0].id).not.toBe('pl');
    expect(await repo.listProjects()).toHaveLength(2);

    await repo.deleteProject(p.id);
    expect((await repo.listProjects()).map((x) => x.id)).toEqual([copy!.id]);
  });

  test('pieces: usage count across projects', async () => {
    const piece = createPiece({ name: 'Print', widthMm: 400, heightMm: 500 });
    await repo.savePiece(piece);
    for (const name of ['A', 'B']) {
      const p = createProject(name, { widthMm: 3000, heightMm: 2500 });
      p.placements.push({ id: name, pieceId: piece.id, xMm: 0, yMm: 0, locked: false });
      await repo.saveProject(p);
    }
    await repo.saveProject(createProject('C', { widthMm: 3000, heightMm: 2500 }));
    expect(await repo.pieceUsage(piece.id)).toBe(2);
  });

  test('deleting a placed piece removes its placements and orphan images', async () => {
    const imageId = await repo.putImage({ mime: 'image/jpeg', width: 1, height: 1, bytes: bytes() });
    const piece = createPiece({ name: 'Print', widthMm: 400, heightMm: 500, imageId });
    const other = createPiece({ name: 'Other', widthMm: 400, heightMm: 500 });
    await repo.savePiece(piece);
    await repo.savePiece(other);
    const p: Project = createProject('A', { widthMm: 3000, heightMm: 2500 });
    p.placements.push(
      { id: '1', pieceId: piece.id, xMm: 0, yMm: 0, locked: false },
      { id: '2', pieceId: other.id, xMm: 0, yMm: 0, locked: false },
    );
    await repo.saveProject(p);

    await repo.deletePiece(piece.id);
    expect(await repo.getPiece(piece.id)).toBeUndefined();
    expect((await repo.getProject(p.id))!.placements.map((x) => x.id)).toEqual(['2']);
    expect(await repo.getImage(imageId)).toBeUndefined();
  });

  test('orphan cleanup keeps referenced images', async () => {
    const wallImg = await repo.putImage({ mime: 'image/jpeg', width: 1, height: 1, bytes: bytes() });
    const orig = await repo.putImage({ mime: 'image/jpeg', width: 1, height: 1, bytes: bytes() });
    const orphan = await repo.putImage({ mime: 'image/jpeg', width: 1, height: 1, bytes: bytes() });
    const p = createProject('A', {
      widthMm: 3000,
      heightMm: 2500,
      imageId: wallImg,
      imageSource: { originalImageId: orig, corners: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }] },
    });
    await repo.saveProject(p);
    expect(await repo.cleanupOrphanImages()).toBe(1);
    expect(await repo.getImage(wallImg)).toBeDefined();
    expect(await repo.getImage(orig)).toBeDefined();
    expect(await repo.getImage(orphan)).toBeUndefined();
  });

  test('settings default and persist', async () => {
    const s = await repo.getSettings();
    expect(s.unit).toBe('cm');
    await repo.saveSettings({ ...s, unit: 'imperial' });
    expect((await repo.getSettings()).unit).toBe('imperial');
  });
});

describe('autosave', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  test('debounces and saves the latest value', async () => {
    const saved: number[] = [];
    const a = createAutosaver(async (v: number) => void saved.push(v), 500);
    a.schedule(1);
    a.schedule(2);
    a.schedule(3);
    await vi.advanceTimersByTimeAsync(499);
    expect(saved).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(saved).toEqual([3]);
  });

  test('flush saves immediately', async () => {
    const saved: number[] = [];
    const a = createAutosaver(async (v: number) => void saved.push(v), 500);
    a.schedule(7);
    await a.flush();
    expect(saved).toEqual([7]);
  });

});

describe('autosave with IndexedDB', () => {
  test('spec: moved piece survives a reload', async () => {
    const p = createProject('A', { widthMm: 3000, heightMm: 2500 });
    p.placements.push({ id: 'pl', pieceId: 'x', xMm: 100, yMm: 100, locked: false });
    await repo.saveProject(p);
    const store = createStore<{ project: Project | null }>(() => ({ project: p }));
    const conn = connectAutosave(store, (s) => s.project, (v) => repo.saveProject(v), 20);

    store.setState({ project: { ...p, placements: [{ ...p.placements[0], xMm: 850 }] } });
    await new Promise((r) => setTimeout(r, 60));
    await conn.flush();
    conn.disconnect();

    // "Reload": new repo instance on the same database.
    const reloaded = createRepo(new DecorDB(db.name));
    expect((await reloaded.getProject(p.id))!.placements[0].xMm).toBe(850);
    reloaded.db.close();
  });
});
