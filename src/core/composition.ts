/** Derived data about a composition: rects, warnings, mounting plan rows, backup state. */
import { contains, overlaps, top, type Rect } from './geometry';
import type { Obstacle, Piece, Placement, Project } from './model';
import { nailPositions } from './nails';
import type { Point } from './geometry';

export function placementRect(pl: Placement, piece: Pick<Piece, 'widthMm' | 'heightMm'>): Rect {
  return { x: pl.xMm, y: pl.yMm, width: piece.widthMm, height: piece.heightMm };
}

export function obstacleRect(o: Obstacle): Rect {
  return { x: o.xMm, y: o.yMm, width: o.widthMm, height: o.heightMm };
}

export interface PlacementWarning {
  placementId: string;
  outOfBounds: boolean;
  overlapsWith: string[];
}

/** Placements that extend beyond the wall or overlap other placements/obstacles. */
export function compositionWarnings(project: Project, pieces: Map<string, Piece>): PlacementWarning[] {
  const wall: Rect = { x: 0, y: 0, width: project.wall.widthMm, height: project.wall.heightMm };
  const rects = project.placements
    .map((pl) => {
      const piece = pieces.get(pl.pieceId);
      return piece ? { id: pl.id, rect: placementRect(pl, piece) } : null;
    })
    .filter((x): x is { id: string; rect: Rect } => x !== null);
  const obstacles = project.obstacles.map((o) => ({ id: o.id, rect: obstacleRect(o) }));
  const result: PlacementWarning[] = [];
  for (const r of rects) {
    const outOfBounds = !contains(wall, r.rect);
    const overlapsWith = [...rects, ...obstacles].filter((o) => o.id !== r.id && overlaps(r.rect, o.rect)).map((o) => o.id);
    if (outOfBounds || overlapsWith.length) result.push({ placementId: r.id, outOfBounds, overlapsWith });
  }
  return result;
}

export interface PlanRow {
  number: number;
  placementId: string;
  name: string;
  widthMm: number;
  heightMm: number;
  rect: Rect;
  nails: Point[];
  topEdgeMm: number;
  isPlaceholder: boolean;
}

/** Rows for the mounting plan, numbered left-to-right then top-to-bottom. */
export function planRows(project: Project, pieces: Map<string, Piece>): PlanRow[] {
  const rows = project.placements
    .map((pl) => {
      const piece = pieces.get(pl.pieceId);
      if (!piece) return null;
      const rect = placementRect(pl, piece);
      return {
        number: 0,
        placementId: pl.id,
        name: piece.name,
        widthMm: piece.widthMm,
        heightMm: piece.heightMm,
        rect,
        nails: nailPositions(pl, piece),
        topEdgeMm: top(rect),
        isPlaceholder: !piece.imageId,
      };
    })
    .filter((r): r is PlanRow => r !== null);
  rows.sort((a, b) => a.rect.x - b.rect.x || b.topEdgeMm - a.topEdgeMm);
  rows.forEach((r, i) => (r.number = i + 1));
  return rows;
}

/** Standard drawing scales (1:N). */
export const STANDARD_SCALES = [1, 2, 5, 10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200, 250, 500];

/** Largest standard scale (smallest N) at which a wall fits an area (all in mm). */
export function chooseScale(wallW: number, wallH: number, areaW: number, areaH: number): number {
  for (const n of STANDARD_SCALES) if (wallW / n <= areaW && wallH / n <= areaH) return n;
  return STANDARD_SCALES[STANDARD_SCALES.length - 1];
}

export const BACKUP_REMINDER_DAYS = 14;

/** Whether to nudge the user to export: modified and not exported for > 14 days. */
export function needsBackupReminder(p: Pick<Project, 'createdAt' | 'updatedAt' | 'lastExportedAt'>, now = Date.now()): boolean {
  const since = p.lastExportedAt ?? p.createdAt;
  const modifiedSinceExport = p.lastExportedAt === undefined || p.updatedAt > p.lastExportedAt;
  return modifiedSinceExport && now - since > BACKUP_REMINDER_DAYS * 24 * 3600 * 1000;
}
