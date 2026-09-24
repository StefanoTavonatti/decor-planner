import { useState } from 'react';
import { obstacleRect, placementRect } from '../../core/composition';
import type { Id, Piece, Project } from '../../core/model';
import { nailPositions } from '../../core/nails';
import { neighbourGaps } from '../../core/snapping';
import { piecesMap, useEditor, useLibrary } from '../../app/stores';
import { Length, LengthInput, useFormatLength } from '../common/LengthInput';
import { DropZone } from '../common/DropZone';
import { confirmDialog } from '../common/ui';
import { PieceEditor } from '../library/PieceEditor';
import { PieceThumb } from '../library/PieceThumb';
import { PlaceholderDialog } from '../library/PlaceholderDialog';
import { useWallPhotoFlow } from '../wall/WallSourcePicker';
import {
  addObstacle,
  addPlacement,
  alignSelection,
  centerSelectionOnEyeLevel,
  centerSelectionOnObstacle,
  centerSelectionOnWall,
  distributeSelection,
  removeSelection,
  reorder,
  setLocked,
} from './actions';

// ---------------------------------------------------------------- Add

export function AddPanel() {
  const pieces = useLibrary((s) => s.pieces);
  const [newPiece, setNewPiece] = useState(false);
  const [placeholder, setPlaceholder] = useState(false);
  const list = Object.values(pieces).sort((a, b) => b.updatedAt - a.updatedAt);
  return (
    <div className="panel-section">
      <div className="button-row">
        <button className="btn btn-small" onClick={() => setPlaceholder(true)}>
          + Placeholder
        </button>
        <button className="btn btn-small" onClick={() => setNewPiece(true)}>
          + New piece
        </button>
      </div>
      {list.length === 0 ? (
        <p className="hint">
          Your library is empty. Add a piece with a photo, or a placeholder with just a size.
        </p>
      ) : (
        <p className="hint">Tap a piece to place it on the wall.</p>
      )}
      <div className="add-list">
        {list.map((p) => (
          <button key={p.id} className="add-item" onClick={() => addPlacement(p)} title={`Add ${p.name}`}>
            <PieceThumb piece={p} maxSize={56} />
            <span className="add-item-text">
              <strong>{p.name}</strong>
              <span className="muted">
                <Length mm={p.widthMm} /> × <Length mm={p.heightMm} />
              </span>
            </span>
            <span className="add-plus">+</span>
          </button>
        ))}
      </div>
      {newPiece && <PieceEditor onClose={() => setNewPiece(false)} onSaved={(p) => addPlacement(p)} />}
      {placeholder && (
        <PlaceholderDialog onClose={() => setPlaceholder(false)} onCreated={(p) => addPlacement(p)} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Selection

export function SelectionPanel() {
  const project = useEditor((s) => s.project)!;
  const selection = useEditor((s) => s.selection);
  const pieces = piecesMap(useLibrary((s) => s.pieces));

  const placements = project.placements.filter((p) => selection.includes(p.id));
  const obstacles = project.obstacles.filter((o) => selection.includes(o.id));

  if (selection.length === 0) {
    return (
      <div className="panel-section">
        <p className="hint">
          Tap a piece to select it.{' '}
          {`Drag to move; it snaps to edges, centres, the eye-level line and equal gaps.`}
        </p>
        <p className="hint desktop-only">
          Shift-click or drag a box to select several. Arrow keys nudge by 1 mm (Shift: 10 mm). Hold Alt while
          dragging to disable snapping. Space + drag or scroll to pan, Ctrl/⌘ + scroll to zoom.
        </p>
      </div>
    );
  }
  if (placements.length === 1 && obstacles.length === 0) {
    const piece = pieces.get(placements[0].pieceId);
    return piece ? <PlacementDetails project={project} placementId={placements[0].id} piece={piece} /> : null;
  }
  if (obstacles.length === 1 && placements.length === 0)
    return <ObstacleDetails project={project} id={obstacles[0].id} />;
  return (
    <MultiSelection count={placements.length} obstacleId={obstacles.length === 1 ? obstacles[0].id : null} />
  );
}

function PlacementDetails({
  project,
  placementId,
  piece,
}: {
  project: Project;
  placementId: Id;
  piece: Piece;
}) {
  const commit = useEditor((s) => s.commit);
  const fmt = useFormatLength();
  const [editing, setEditing] = useState(false);
  const pl = project.placements.find((p) => p.id === placementId)!;
  const pieces = piecesMap(useLibrary.getState().pieces);
  const rect = placementRect(pl, piece);
  const others = [
    ...project.placements
      .filter((p) => p.id !== pl.id)
      .map((p) => (pieces.get(p.pieceId) ? placementRect(p, pieces.get(p.pieceId)!) : null))
      .filter((r) => r !== null),
    ...project.obstacles.map(obstacleRect),
  ];
  const gaps = neighbourGaps(rect, others, { width: project.wall.widthMm, height: project.wall.heightMm });
  const nails = nailPositions(pl, piece);
  const index = project.placements.findIndex((p) => p.id === pl.id);
  const set = (patch: Partial<typeof pl>) =>
    commit((d) => {
      const t = d.placements.find((p) => p.id === pl.id);
      if (t) Object.assign(t, patch);
    });

  return (
    <div className="panel-section">
      <div className="selection-header">
        <PieceThumb piece={piece} maxSize={48} />
        <div>
          <strong>{piece.name}</strong>
          <div className="muted">
            {fmt(piece.widthMm)} × {fmt(piece.heightMm)}
          </div>
        </div>
        <button className="btn btn-small" onClick={() => setEditing(true)}>
          Edit piece
        </button>
      </div>
      <div className="row-2">
        <LengthInput label="From left" value={pl.xMm} onChange={(xMm) => set({ xMm })} compact />
        <LengthInput label="From floor" value={pl.yMm} onChange={(yMm) => set({ yMm })} compact />
      </div>
      <dl className="facts">
        <dt>Top edge</dt>
        <dd>{fmt(pl.yMm + piece.heightMm)}</dd>
        <dt>Nail{nails.length > 1 ? 's' : ''}</dt>
        <dd>
          {nails.map((n, i) => (
            <div key={i}>
              ← {fmt(n.x)} · ↑ {fmt(n.y)}
            </div>
          ))}
        </dd>
        <dt>Gaps</dt>
        <dd className="gaps">
          <span>
            ← {fmt(gaps.left.distance)}
            {gaps.left.toWall ? ' (wall)' : ''}
          </span>
          <span>
            → {fmt(gaps.right.distance)}
            {gaps.right.toWall ? ' (wall)' : ''}
          </span>
          <span>
            ↓ {fmt(gaps.below.distance)}
            {gaps.below.toWall ? ' (floor)' : ''}
          </span>
          <span>
            ↑ {fmt(gaps.above.distance)}
            {gaps.above.toWall ? ' (ceiling)' : ''}
          </span>
        </dd>
      </dl>
      <div className="button-row wrap">
        <button className="btn btn-small" onClick={() => centerSelectionOnWall()} disabled={pl.locked}>
          Centre on wall
        </button>
        <button className="btn btn-small" onClick={() => centerSelectionOnEyeLevel()} disabled={pl.locked}>
          Centre on eye level
        </button>
        <button
          className="btn btn-small"
          onClick={() => reorder(pl.id, 1)}
          disabled={index === project.placements.length - 1}
        >
          Bring forward
        </button>
        <button className="btn btn-small" onClick={() => reorder(pl.id, -1)} disabled={index === 0}>
          Send backward
        </button>
        <button className="btn btn-small" onClick={() => setLocked([pl.id], !pl.locked)}>
          {pl.locked ? '🔓 Unlock' : '🔒 Lock'}
        </button>
        <button className="btn btn-small btn-danger-ghost" onClick={() => removeSelection()}>
          Remove from wall
        </button>
      </div>
      {editing && <PieceEditor piece={piece} onClose={() => setEditing(false)} />}
    </div>
  );
}

function ObstacleDetails({ project, id }: { project: Project; id: Id }) {
  const commit = useEditor((s) => s.commit);
  const o = project.obstacles.find((x) => x.id === id)!;
  const set = (patch: Partial<typeof o>) =>
    commit((d) => {
      const t = d.obstacles.find((x) => x.id === id);
      if (t) Object.assign(t, patch);
    });
  return (
    <div className="panel-section">
      <label className="field">
        <span className="field-label">Obstacle name</span>
        <span className="field-input">
          <input
            defaultValue={o.name}
            key={o.id + o.name}
            onBlur={(e) =>
              e.target.value.trim() && e.target.value !== o.name && set({ name: e.target.value.trim() })
            }
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
          />
        </span>
      </label>
      <div className="row-2">
        <LengthInput label="From left" value={o.xMm} onChange={(xMm) => set({ xMm })} compact />
        <LengthInput label="From floor" value={o.yMm} onChange={(yMm) => set({ yMm })} compact />
        <LengthInput
          label="Width"
          value={o.widthMm}
          onChange={(widthMm) => set({ widthMm })}
          constraint={{ positive: true }}
          compact
        />
        <LengthInput
          label="Height"
          value={o.heightMm}
          onChange={(heightMm) => set({ heightMm })}
          constraint={{ positive: true }}
          compact
        />
      </div>
      <p className="hint">
        Obstacles (sofa, switch, window…) are drawn on the plan and used for snapping, but get no nails.
      </p>
      <button className="btn btn-small btn-danger-ghost" onClick={() => removeSelection()}>
        Delete obstacle
      </button>
    </div>
  );
}

function MultiSelection({ count, obstacleId }: { count: number; obstacleId: Id | null }) {
  const selection = useEditor((s) => s.selection);
  return (
    <div className="panel-section">
      <p>
        <strong>{count} pieces selected</strong>
        {obstacleId && ' + 1 obstacle'}
      </p>
      <h4 className="mini-title">Align</h4>
      <div className="icon-grid">
        <button className="btn btn-small" onClick={() => alignSelection('left')}>
          ⇤ Left
        </button>
        <button className="btn btn-small" onClick={() => alignSelection('hcenter')}>
          ↔ Centre
        </button>
        <button className="btn btn-small" onClick={() => alignSelection('right')}>
          ⇥ Right
        </button>
        <button className="btn btn-small" onClick={() => alignSelection('top')}>
          ⤒ Top
        </button>
        <button className="btn btn-small" onClick={() => alignSelection('vcenter')}>
          ↕ Middle
        </button>
        <button className="btn btn-small" onClick={() => alignSelection('bottom')}>
          ⤓ Bottom
        </button>
      </div>
      <h4 className="mini-title">Distribute (equal gaps)</h4>
      <div className="button-row">
        <button className="btn btn-small" disabled={count < 3} onClick={() => distributeSelection('x')}>
          Horizontally
        </button>
        <button className="btn btn-small" disabled={count < 3} onClick={() => distributeSelection('y')}>
          Vertically
        </button>
      </div>
      <h4 className="mini-title">Centre group</h4>
      <div className="button-row wrap">
        <button className="btn btn-small" onClick={() => centerSelectionOnWall()}>
          On wall
        </button>
        <button className="btn btn-small" onClick={() => centerSelectionOnEyeLevel()}>
          On eye level
        </button>
        {obstacleId && (
          <button className="btn btn-small" onClick={() => centerSelectionOnObstacle(obstacleId)}>
            Over obstacle
          </button>
        )}
      </div>
      {!obstacleId && (
        <p className="hint">Tip: also select an obstacle (e.g. the sofa) to centre the group over it.</p>
      )}
      <div className="button-row wrap">
        <button className="btn btn-small" onClick={() => setLocked(selection, true)}>
          🔒 Lock all
        </button>
        <button className="btn btn-small" onClick={() => setLocked(selection, false)}>
          🔓 Unlock all
        </button>
        <button className="btn btn-small btn-danger-ghost" onClick={() => removeSelection()}>
          Remove
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Wall

export function WallPanel() {
  const project = useEditor((s) => s.project)!;
  const commit = useEditor((s) => s.commit);
  const select = useEditor((s) => s.select);
  const fmt = useFormatLength();
  const wall = project.wall;
  const photo = useWallPhotoFlow((w) => commit((d) => void (d.wall = w)), wall);

  return (
    <>
      <DropZone
        className="panel-section"
        message="Drop a photo of the wall"
        disabled={photo.editor !== null}
        onImage={(f) => void photo.startWithFile(f)}
      >
        <div className="row-2">
          <LengthInput
            label="Wall width"
            value={wall.widthMm}
            constraint={{ positive: true }}
            onChange={(widthMm) => commit((d) => void (d.wall.widthMm = widthMm))}
            compact
          />
          <LengthInput
            label="Wall height"
            value={wall.heightMm}
            constraint={{ positive: true }}
            onChange={(heightMm) => commit((d) => void (d.wall.heightMm = heightMm))}
            compact
          />
        </div>
        <LengthInput
          label="Eye level (centre line)"
          value={project.eyeLevelMm}
          constraint={{ nonNegative: true }}
          onChange={(eyeLevelMm) => commit((d) => void (d.eyeLevelMm = eyeLevelMm))}
          compact
        />
        <h4 className="mini-title">Wall photo</h4>
        <div className="button-row wrap">
          <button className="btn btn-small" onClick={() => void photo.pickPhoto(true)}>
            📷 Take photo
          </button>
          <button className="btn btn-small" onClick={() => void photo.pickPhoto(false)}>
            {wall.imageId ? 'Replace photo' : 'Choose photo'}
          </button>
          {wall.imageSource && (
            <button className="btn btn-small" onClick={photo.reStraighten}>
              Adjust corners
            </button>
          )}
          {wall.imageId && (
            <button
              className="btn btn-small btn-danger-ghost"
              onClick={() =>
                void confirmDialog({
                  title: 'Remove wall photo?',
                  message: 'The wall becomes a plain surface. Placements stay where they are.',
                  confirmLabel: 'Remove',
                }).then(
                  (ok) =>
                    ok &&
                    commit((d) => void ((d.wall.imageId = undefined), (d.wall.imageSource = undefined))),
                )
              }
            >
              Remove photo
            </button>
          )}
        </div>
        <p className="drag-hint">You can also drag a photo from your computer onto this panel.</p>
        <h4 className="mini-title">Obstacles</h4>
        <p className="hint">Mark things on or in front of the wall: sofa, switches, windows, TV…</p>
        <ul className="obstacle-list">
          {project.obstacles.map((o) => (
            <li key={o.id}>
              <button className="linklike" onClick={() => select([o.id])}>
                {o.name}
              </button>
              <span className="muted">
                {fmt(o.widthMm)} × {fmt(o.heightMm)}
              </span>
            </li>
          ))}
        </ul>
        <button className="btn btn-small" onClick={() => addObstacle()}>
          + Add obstacle
        </button>
      </DropZone>
      {photo.editor}
    </>
  );
}
