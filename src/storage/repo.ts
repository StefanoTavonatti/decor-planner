/** Repositories over IndexedDB. */
import { referencedImageIds } from '../core/format';
import { defaultSettings, newId, type Id, type Piece, type Project, type Settings } from '../core/model';
import { db as defaultDb, type DecorDB, type StoredImage } from './db';

export function createRepo(db: DecorDB = defaultDb) {
  async function allReferencedImageIds(): Promise<Set<Id>> {
    const [projects, pieces] = await Promise.all([db.projects.toArray(), db.pieces.toArray()]);
    const ids = new Set<Id>();
    for (const p of projects) {
      for (const id of referencedImageIds(p, [])) ids.add(id);
      if (p.thumbnailId) ids.add(p.thumbnailId);
    }
    for (const piece of pieces) {
      if (piece.imageId) ids.add(piece.imageId);
      if (piece.imageSource) ids.add(piece.imageSource.originalImageId);
    }
    return ids;
  }

  const repo = {
    db,

    // Projects
    listProjects: () => db.projects.orderBy('updatedAt').reverse().toArray(),
    getProject: (id: Id) => db.projects.get(id),
    async saveProject(p: Project) {
      await db.projects.put(p);
    },
    async renameProject(id: Id, name: string) {
      await db.projects.update(id, { name, updatedAt: Date.now() });
    },
    async duplicateProject(id: Id): Promise<Project | undefined> {
      const p = await db.projects.get(id);
      if (!p) return undefined;
      const now = Date.now();
      const copy: Project = {
        ...structuredClone(p),
        id: newId(),
        name: `${p.name} (copy)`,
        placements: p.placements.map((pl) => ({ ...pl, id: newId() })),
        obstacles: p.obstacles.map((o) => ({ ...o, id: newId() })),
        createdAt: now,
        updatedAt: now,
        lastExportedAt: undefined,
      };
      await db.projects.put(copy);
      return copy;
    },
    async deleteProject(id: Id) {
      await db.projects.delete(id);
      await repo.cleanupOrphanImages();
    },

    // Pieces
    listPieces: () => db.pieces.orderBy('updatedAt').reverse().toArray(),
    getPiece: (id: Id) => db.pieces.get(id),
    async savePiece(p: Piece) {
      await db.pieces.put(p);
    },
    /** Number of projects that place this piece at least once. */
    async pieceUsage(pieceId: Id): Promise<number> {
      const projects = await db.projects.toArray();
      return projects.filter((p) => p.placements.some((pl) => pl.pieceId === pieceId)).length;
    },
    /** Delete a piece and remove all its placements from every project. */
    async deletePiece(pieceId: Id) {
      await db.transaction('rw', db.projects, db.pieces, async () => {
        await db.pieces.delete(pieceId);
        const projects = await db.projects.toArray();
        for (const p of projects) {
          if (p.placements.some((pl) => pl.pieceId === pieceId)) {
            await db.projects.put({
              ...p,
              placements: p.placements.filter((pl) => pl.pieceId !== pieceId),
              updatedAt: Date.now(),
            });
          }
        }
      });
      await repo.cleanupOrphanImages();
    },

    // Images
    async putImage(img: Omit<StoredImage, 'id'> & { id?: Id }): Promise<Id> {
      const id = img.id ?? newId();
      await db.images.put({ ...img, id });
      return id;
    },
    getImage: (id: Id) => db.images.get(id),
    async deleteImage(id: Id) {
      await db.images.delete(id);
    },
    /** Delete images no longer referenced by any project or piece. */
    async cleanupOrphanImages(): Promise<number> {
      const used = await allReferencedImageIds();
      const all = await db.images.toCollection().primaryKeys();
      const orphans = all.filter((id) => !used.has(id));
      await db.images.bulkDelete(orphans);
      return orphans.length;
    },

    // Settings
    async getSettings(): Promise<Settings> {
      const row = await db.settings.get('settings');
      return { ...defaultSettings(), ...row?.value };
    },
    async saveSettings(value: Settings) {
      await db.settings.put({ key: 'settings', value });
    },
  };
  return repo;
}

export type Repo = ReturnType<typeof createRepo>;

export const repo = createRepo();
