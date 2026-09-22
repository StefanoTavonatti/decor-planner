import { useState } from 'react';
import { createPiece, PLACEHOLDER_PRESETS, type Piece } from '../../core/model';
import { useLibrary } from '../../app/stores';
import { LengthInput, useFormatLength } from '../common/LengthInput';
import { Modal } from '../common/ui';

/** Quick placeholder creation: a preset size or a custom size. */
export function PlaceholderDialog({ onClose, onCreated }: { onClose(): void; onCreated?(p: Piece): void }) {
  const save = useLibrary((s) => s.save);
  const fmt = useFormatLength();
  const [widthMm, setWidthMm] = useState<number | undefined>();
  const [heightMm, setHeightMm] = useState<number | undefined>();
  const [portrait, setPortrait] = useState(true);

  const create = async (w: number, h: number, label?: string) => {
    const [wm, hm] = portrait ? [Math.min(w, h), Math.max(w, h)] : [Math.max(w, h), Math.min(w, h)];
    const piece = createPiece({ name: label ?? `${fmt(wm)} × ${fmt(hm)}`, widthMm: wm, heightMm: hm });
    await save(piece);
    onCreated?.(piece);
    onClose();
  };

  return (
    <Modal title="Add placeholder" onClose={onClose}>
      <div className="segmented" role="radiogroup" aria-label="Orientation">
        <button className={portrait ? 'active' : ''} onClick={() => setPortrait(true)}>
          Portrait
        </button>
        <button className={!portrait ? 'active' : ''} onClick={() => setPortrait(false)}>
          Landscape
        </button>
      </div>
      <div className="preset-grid">
        {PLACEHOLDER_PRESETS.map((p) => (
          <button key={p.label} className="preset" onClick={() => void create(p.widthMm, p.heightMm, `Placeholder ${p.label}`)}>
            <span
              className="preset-shape"
              style={
                portrait
                  ? { width: (p.widthMm / p.heightMm) * 40, height: 40 }
                  : { width: 40, height: (p.widthMm / p.heightMm) * 40 }
              }
            />
            <span>{p.label}</span>
            <span className="muted">
              {fmt(p.widthMm)} × {fmt(p.heightMm)}
            </span>
          </button>
        ))}
      </div>
      <h3 className="section-title">Custom size</h3>
      <div className="row-2">
        <LengthInput label="Width" value={widthMm} onChange={setWidthMm} constraint={{ positive: true }} />
        <LengthInput label="Height" value={heightMm} onChange={setHeightMm} constraint={{ positive: true }} />
      </div>
      <button
        className="btn btn-primary"
        disabled={!widthMm || !heightMm}
        onClick={() => {
          if (!widthMm || !heightMm) return;
          const piece = createPiece({ name: `Placeholder ${fmt(widthMm)} × ${fmt(heightMm)}`, widthMm, heightMm });
          void save(piece).then(() => {
            onCreated?.(piece);
            onClose();
          });
        }}
      >
        Add custom placeholder
      </button>
    </Modal>
  );
}
