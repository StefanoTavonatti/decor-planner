/**
 * `.decorplan` archive format: a zip with a versioned manifest, the project,
 * the pieces it references and all images it needs.
 */
import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate';
import type { Id, Piece, Project } from './model';

export const FORMAT_ID = 'decorplan';
export const FORMAT_VERSION = 1;

export interface Manifest {
  format: typeof FORMAT_ID;
  formatVersion: number;
  appVersion: string;
  exportedAt: string;
}

export interface ArchiveImage {
  id: Id;
  mime: string;
  bytes: Uint8Array;
}

export interface DecorPlan {
  manifest: Manifest;
  project: Project;
  pieces: Piece[];
  images: ArchiveImage[];
}

export class DecorPlanError extends Error {
  constructor(
    public readonly code: 'invalid' | 'corrupt' | 'newer-version',
    message: string,
  ) {
    super(message);
    this.name = 'DecorPlanError';
  }
}

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MIME: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

/** Every image id referenced by a project and its pieces. */
export function referencedImageIds(project: Project, pieces: Piece[]): Id[] {
  const ids = new Set<Id>();
  const w = project.wall;
  if (w.imageId) ids.add(w.imageId);
  if (w.imageSource) ids.add(w.imageSource.originalImageId);
  for (const p of pieces) {
    if (p.imageId) ids.add(p.imageId);
    if (p.imageSource) ids.add(p.imageSource.originalImageId);
  }
  return [...ids];
}

/** Pieces referenced by the project's placements. */
export function referencedPieces(project: Project, library: Piece[]): Piece[] {
  const ids = new Set(project.placements.map((p) => p.pieceId));
  return library.filter((p) => ids.has(p.id));
}

export function writeDecorPlan(
  project: Project,
  pieces: Piece[],
  images: ArchiveImage[],
  appVersion: string,
  now = new Date(),
): Uint8Array {
  const manifest: Manifest = {
    format: FORMAT_ID,
    formatVersion: FORMAT_VERSION,
    appVersion,
    exportedAt: now.toISOString(),
  };
  // The thumbnail is local-only; it is regenerated after import.
  const { thumbnailId: _thumb, ...exportedProject } = project;
  const files: Zippable = {
    'manifest.json': strToU8(JSON.stringify(manifest, null, 2)),
    'project.json': strToU8(JSON.stringify(exportedProject, null, 2)),
    'pieces.json': strToU8(JSON.stringify(pieces, null, 2)),
  };
  for (const img of images) {
    // Images are already compressed; store without deflate.
    files[`images/${img.id}.${EXT[img.mime] ?? 'bin'}`] = [img.bytes, { level: 0 }];
  }
  return zipSync(files);
}

type Migration = (plan: { project: unknown; pieces: unknown }) => { project: unknown; pieces: unknown };

/** migrations[n] upgrades format version n to n + 1. */
const MIGRATIONS: Record<number, Migration> = {};

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

const isNum = (v: unknown) => typeof v === 'number' && Number.isFinite(v);

function validateProject(p: unknown): p is Project {
  if (!isObject(p) || typeof p.id !== 'string' || typeof p.name !== 'string') return false;
  const w = p.wall;
  if (!isObject(w) || !isNum(w.widthMm) || !isNum(w.heightMm)) return false;
  if (!Array.isArray(p.placements) || !Array.isArray(p.obstacles) || !isNum(p.eyeLevelMm)) return false;
  return (
    p.placements.every((pl) => isObject(pl) && typeof pl.pieceId === 'string' && isNum(pl.xMm) && isNum(pl.yMm)) &&
    p.obstacles.every((o) => isObject(o) && isNum(o.xMm) && isNum(o.yMm) && isNum(o.widthMm) && isNum(o.heightMm))
  );
}

function validatePieces(ps: unknown): ps is Piece[] {
  return (
    Array.isArray(ps) &&
    ps.every(
      (p) =>
        isObject(p) &&
        typeof p.id === 'string' &&
        isNum(p.widthMm) &&
        isNum(p.heightMm) &&
        isObject(p.hanging) &&
        (p.hanging.type === 1 || p.hanging.type === 2),
    )
  );
}

function parseJson(files: Record<string, Uint8Array>, name: string): unknown {
  const f = files[name];
  if (!f) throw new DecorPlanError('invalid', `Missing ${name}`);
  try {
    return JSON.parse(strFromU8(f));
  } catch {
    throw new DecorPlanError('corrupt', `${name} is not valid JSON`);
  }
}

export function readDecorPlan(data: Uint8Array): DecorPlan {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(data);
  } catch {
    throw new DecorPlanError('invalid', 'This file is not a Decor Planner project.');
  }
  const manifest = parseJson(files, 'manifest.json');
  if (!isObject(manifest) || manifest.format !== FORMAT_ID || !isNum(manifest.formatVersion)) {
    throw new DecorPlanError('invalid', 'This file is not a Decor Planner project.');
  }
  const version = manifest.formatVersion as number;
  if (version > FORMAT_VERSION) {
    throw new DecorPlanError('newer-version', 'This file was made with a newer version of Decor Planner. Update the app to open it.');
  }

  let plan = { project: parseJson(files, 'project.json'), pieces: parseJson(files, 'pieces.json') };
  for (let v = version; v < FORMAT_VERSION; v++) {
    const m = MIGRATIONS[v];
    if (!m) throw new DecorPlanError('invalid', `Unsupported format version ${version}`);
    plan = m(plan);
  }
  if (!validateProject(plan.project) || !validatePieces(plan.pieces)) {
    throw new DecorPlanError('corrupt', 'The project file is damaged.');
  }

  const images: ArchiveImage[] = [];
  for (const [path, bytes] of Object.entries(files)) {
    const m = /^images\/([^/]+)\.(\w+)$/.exec(path);
    if (m) images.push({ id: m[1], mime: MIME[m[2].toLowerCase()] ?? 'application/octet-stream', bytes });
  }
  const available = new Set(images.map((i) => i.id));
  for (const id of referencedImageIds(plan.project, plan.pieces)) {
    if (!available.has(id)) throw new DecorPlanError('corrupt', 'The project file is missing images.');
  }

  return { manifest: { ...(manifest as unknown as Manifest), formatVersion: FORMAT_VERSION }, ...plan, images } as DecorPlan;
}
