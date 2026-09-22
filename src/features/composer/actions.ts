/** Editing actions on the open project (all undoable through the editor store). */
import { obstacleRect, placementRect } from '../../core/composition';
import { centerHorizontallyOn, centerVerticallyAt, align, distribute, type AlignMode, type Item, type Positions } from '../../core/layout';
import { createObstacle, newId, type Id, type Piece, type Project } from '../../core/model';
import { piecesMap, useEditor, useLibrary } from '../../app/stores';

const editor = () => useEditor.getState();

export function addPlacement(piece: Piece) {
  const p = editor().project;
  if (!p) return;
  const id = newId();
  editor().commit((d) => {
    d.placements.push({
      id,
      pieceId: piece.id,
      xMm: Math.round(p.wall.widthMm / 2 - piece.widthMm / 2),
      yMm: Math.round(p.eyeLevelMm - piece.heightMm / 2),
      locked: false,
    });
  });
  // Keep the Add panel open so several pieces can be added in a row.
  editor().select([id], false);
}

export function addObstacle() {
  const p = editor().project;
  if (!p) return;
  const o = createObstacle({
    name: 'Obstacle',
    xMm: Math.round(Math.min(500, p.wall.widthMm / 4)),
    yMm: 0,
    widthMm: Math.round(Math.min(1000, p.wall.widthMm / 3)),
    heightMm: Math.round(Math.min(500, p.wall.heightMm / 4)),
  });
  editor().commit((d) => void d.obstacles.push(o));
  editor().select([o.id]);
}

/** Selected placements as layout items. */
export function selectedPlacementItems(project: Project, selection: Id[]): Item[] {
  const pieces = piecesMap(useLibrary.getState().pieces);
  return project.placements
    .filter((pl) => selection.includes(pl.id) && !pl.locked)
    .map((pl) => {
      const piece = pieces.get(pl.pieceId);
      return piece ? { id: pl.id, rect: placementRect(pl, piece) } : null;
    })
    .filter((x): x is Item => x !== null);
}

function applyPositions(pos: Positions) {
  if (pos.size === 0) return;
  editor().commit((d) => {
    for (const pl of d.placements) {
      const p = pos.get(pl.id);
      if (p) {
        pl.xMm = Math.round(p.x * 10) / 10;
        pl.yMm = Math.round(p.y * 10) / 10;
      }
    }
  });
}

export function alignSelection(mode: AlignMode) {
  const { project, selection } = editor();
  if (project) applyPositions(align(selectedPlacementItems(project, selection), mode));
}

export function distributeSelection(axis: 'x' | 'y') {
  const { project, selection } = editor();
  if (project) applyPositions(distribute(selectedPlacementItems(project, selection), axis));
}

export function centerSelectionOnWall() {
  const { project, selection } = editor();
  if (!project) return;
  applyPositions(
    centerHorizontallyOn(selectedPlacementItems(project, selection), {
      x: 0,
      y: 0,
      width: project.wall.widthMm,
      height: project.wall.heightMm,
    }),
  );
}

export function centerSelectionOnObstacle(obstacleId: Id) {
  const { project, selection } = editor();
  const o = project?.obstacles.find((x) => x.id === obstacleId);
  if (project && o) applyPositions(centerHorizontallyOn(selectedPlacementItems(project, selection), obstacleRect(o)));
}

export function centerSelectionOnEyeLevel() {
  const { project, selection } = editor();
  if (project) applyPositions(centerVerticallyAt(selectedPlacementItems(project, selection), project.eyeLevelMm));
}

export function nudgeSelection(dx: number, dy: number) {
  const { selection } = editor();
  if (selection.length === 0) return;
  editor().commit((d) => {
    for (const pl of d.placements) {
      if (selection.includes(pl.id) && !pl.locked) {
        pl.xMm += dx;
        pl.yMm += dy;
      }
    }
    for (const o of d.obstacles) {
      if (selection.includes(o.id)) {
        o.xMm += dx;
        o.yMm += dy;
      }
    }
  });
}

export function removeSelection() {
  const { selection } = editor();
  if (selection.length === 0) return;
  editor().commit((d) => {
    d.placements = d.placements.filter((pl) => !selection.includes(pl.id));
    d.obstacles = d.obstacles.filter((o) => !selection.includes(o.id));
  });
  editor().select([]);
}

/** Move a placement one step up (+1) or down (-1) in z-order. */
export function reorder(id: Id, dir: 1 | -1) {
  editor().commit((d) => {
    const i = d.placements.findIndex((p) => p.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= d.placements.length) return;
    [d.placements[i], d.placements[j]] = [d.placements[j], d.placements[i]];
  });
}

export function setLocked(ids: Id[], locked: boolean) {
  editor().commit((d) => {
    for (const pl of d.placements) if (ids.includes(pl.id)) pl.locked = locked;
  });
}
