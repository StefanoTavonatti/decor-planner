/**
 * Domain model. All lengths are millimetres. Wall coordinates have their origin
 * at the bottom-left of the wall (floor + left corner) with y growing upward.
 */
import type { DisplayUnit } from './units';
import type { Point } from './geometry';

export type Id = string;

export function newId(): Id {
  return crypto.randomUUID();
}

export type HangingType = 1 | 2;

export interface Hanging {
  type: HangingType;
  /** Distance from the top edge of the frame down to the hanging point(s). */
  offsetTopMm: number;
  /** Horizontal distance between the two points (type 2 only), centred. */
  spacingMm?: number;
}

export interface Piece {
  id: Id;
  name: string;
  widthMm: number;
  heightMm: number;
  /** Blob id of the (flat) image; absent for placeholders. */
  imageId?: Id;
  /** Rectification source for re-editing the image. */
  imageSource?: RectifySource;
  /** Colour used for placeholders. */
  color: string;
  hanging: Hanging;
  createdAt: number;
  updatedAt: number;
}

/** Original image + the 4 corner points (in source-image pixels) used to rectify it. */
export interface RectifySource {
  originalImageId: Id;
  /** Order: top-left, top-right, bottom-right, bottom-left. */
  corners: [Point, Point, Point, Point];
}

export interface Wall {
  widthMm: number;
  heightMm: number;
  /** Rectified background image; absent for a blank wall. */
  imageId?: Id;
  imageSource?: RectifySource;
}

export interface Placement {
  id: Id;
  pieceId: Id;
  /** Bottom-left corner of the outer frame. */
  xMm: number;
  yMm: number;
  locked: boolean;
}

export interface Obstacle {
  id: Id;
  name: string;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
}

export interface Project {
  id: Id;
  name: string;
  wall: Wall;
  /** Array order is z-order: later items are drawn on top. */
  placements: Placement[];
  obstacles: Obstacle[];
  eyeLevelMm: number;
  /** Small PNG preview blob id for the project list. */
  thumbnailId?: Id;
  createdAt: number;
  updatedAt: number;
  lastExportedAt?: number;
}

export type PaperSize = 'A4' | 'Letter';

export interface Settings {
  unit: DisplayUnit;
  paper: PaperSize;
  snapping: boolean;
  showNails: boolean;
}

export const DEFAULT_EYE_LEVEL_MM = 1450;

export const DEFAULT_HANGING: Hanging = { type: 1, offsetTopMm: 0 };

export const PLACEHOLDER_COLORS = ['#c8b6a6', '#a4b8c4', '#b5c99a', '#e3b5a4', '#c3aed6', '#f0d18a'];

export function createPiece(init: Partial<Piece> & Pick<Piece, 'name' | 'widthMm' | 'heightMm'>): Piece {
  const now = Date.now();
  return {
    id: newId(),
    color: PLACEHOLDER_COLORS[Math.floor(Math.random() * PLACEHOLDER_COLORS.length)],
    hanging: { ...DEFAULT_HANGING },
    createdAt: now,
    updatedAt: now,
    ...init,
  };
}

export function createProject(name: string, wall: Wall): Project {
  const now = Date.now();
  return {
    id: newId(),
    name,
    wall,
    placements: [],
    obstacles: [],
    eyeLevelMm: DEFAULT_EYE_LEVEL_MM,
    createdAt: now,
    updatedAt: now,
  };
}

export function createObstacle(init: Omit<Obstacle, 'id'>): Obstacle {
  return { id: newId(), ...init };
}

/** Size presets for placeholders, in mm. */
export const PLACEHOLDER_PRESETS: { label: string; widthMm: number; heightMm: number }[] = [
  { label: 'A4', widthMm: 210, heightMm: 297 },
  { label: '30 × 40', widthMm: 300, heightMm: 400 },
  { label: '40 × 50', widthMm: 400, heightMm: 500 },
  { label: '50 × 70', widthMm: 500, heightMm: 700 },
  { label: '70 × 100', widthMm: 700, heightMm: 1000 },
];

export function defaultPaperForLocale(locale: string): PaperSize {
  const region = locale.split(/[-_]/)[1]?.toUpperCase();
  return region === 'US' || region === 'CA' ? 'Letter' : 'A4';
}

export function defaultSettings(locale = typeof navigator !== 'undefined' ? navigator.language : 'en-GB'): Settings {
  return { unit: 'cm', paper: defaultPaperForLocale(locale), snapping: true, showNails: false };
}
