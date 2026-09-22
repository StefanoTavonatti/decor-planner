import Dexie, { type Table } from 'dexie';
import type { Id, Piece, Project, Settings } from '../core/model';

/** Binary image data. Stored as ArrayBuffer (more robust across browsers than Blob in IndexedDB). */
export interface StoredImage {
  id: Id;
  mime: string;
  width: number;
  height: number;
  bytes: ArrayBuffer;
}

export interface SettingsRow {
  key: 'settings';
  value: Settings;
}

export class DecorDB extends Dexie {
  projects!: Table<Project, Id>;
  pieces!: Table<Piece, Id>;
  images!: Table<StoredImage, Id>;
  settings!: Table<SettingsRow, string>;

  constructor(name = 'decor-planner') {
    super(name);
    this.version(1).stores({
      projects: 'id, updatedAt',
      pieces: 'id, updatedAt',
      images: 'id',
      settings: 'key',
    });
  }
}

export const db = new DecorDB();
