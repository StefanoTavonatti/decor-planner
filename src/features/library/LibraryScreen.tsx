import { useState } from 'react';
import type { Piece } from '../../core/model';
import { useEditor, useLibrary } from '../../app/stores';
import { goBack } from '../../app/router';
import { Length } from '../common/LengthInput';
import { PieceEditor } from './PieceEditor';
import { PieceThumb } from './PieceThumb';
import { PlaceholderDialog } from './PlaceholderDialog';

export function LibraryScreen() {
  const pieces = useLibrary((s) => s.pieces);
  const openProject = useEditor((s) => s.project);
  const [editing, setEditing] = useState<Piece | 'new' | null>(null);
  const [placeholder, setPlaceholder] = useState(false);
  const list = Object.values(pieces).sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="screen">
      <div className="screen-header">
        {openProject && (
          <button className="btn btn-ghost" onClick={() => goBack({ name: 'project', id: openProject.id })}>
            ← {openProject.name}
          </button>
        )}
        <h1>Library</h1>
        <div className="actions">
          <button className="btn" onClick={() => setPlaceholder(true)}>
            + Placeholder
          </button>
          <button className="btn btn-primary" onClick={() => setEditing('new')}>
            + Piece
          </button>
        </div>
      </div>
      {list.length === 0 && (
        <div className="empty">
          <p>
            <strong>Your pictures, mirrors and frames live here.</strong>
          </p>
          <p>Add a piece with a photo and its outer size, or a placeholder with just a size. Pieces can be used in any project.</p>
        </div>
      )}
      <div className="card-grid card-grid-small">
        {list.map((p) => (
          <button key={p.id} className="card piece-card" onClick={() => setEditing(p)}>
            <PieceThumb piece={p} maxSize={132} />
            <div className="card-body">
              <div className="card-title">{p.name}</div>
              <div className="card-meta">
                <Length mm={p.widthMm} /> × <Length mm={p.heightMm} />
                {!p.imageId && ' · placeholder'}
              </div>
            </div>
          </button>
        ))}
      </div>
      {editing && <PieceEditor piece={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
      {placeholder && <PlaceholderDialog onClose={() => setPlaceholder(false)} />}
    </div>
  );
}
