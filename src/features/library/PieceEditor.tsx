import { useEffect, useState } from 'react';
import { createPiece, PLACEHOLDER_COLORS, type Piece } from '../../core/model';
import { validateHanging } from '../../core/nails';
import { repo } from '../../storage/repo';
import { useLibrary } from '../../app/stores';
import { LengthInput } from '../common/LengthInput';
import { importImageFile, pickFile } from '../common/images';
import { DropZone } from '../common/DropZone';
import { confirmDialog, Modal, withErrorAlert } from '../common/ui';
import { RectifyEditor } from '../rectify/RectifyEditor';
import { HangingEditor } from './HangingEditor';
import { PieceThumb } from './PieceThumb';

type Draft = Omit<Piece, 'widthMm' | 'heightMm'> & { widthMm?: number; heightMm?: number };

/** Create or edit a piece: name, outer size, image, hanging points. */
export function PieceEditor({
  piece,
  onClose,
  onSaved,
}: {
  piece?: Piece;
  onClose(): void;
  onSaved?(p: Piece): void;
}) {
  const [draft, setDraft] = useState<Draft>(
    () =>
      piece ?? {
        ...createPiece({ name: '', widthMm: 0, heightMm: 0 }),
        widthMm: undefined,
        heightMm: undefined,
      },
  );
  const [usage, setUsage] = useState(0);
  const [rectify, setRectify] = useState<{ imageId: string; mode: 'inset' | 'full'; reedit: boolean } | null>(
    null,
  );
  const save = useLibrary((s) => s.save);
  const remove = useLibrary((s) => s.remove);

  useEffect(() => {
    if (piece) void repo.pieceUsage(piece.id).then(setUsage);
  }, [piece]);

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const hasSize = draft.widthMm !== undefined && draft.heightMm !== undefined;
  const hangingError = hasSize ? validateHanging(draft.hanging, draft.widthMm!, draft.heightMm!) : null;
  const canSave = hasSize && draft.name.trim() !== '' && !hangingError;

  /** Import a picked or dropped image and open the corner editor. */
  const startWithFile = async (file: File, mode: 'inset' | 'full') => {
    const img = await withErrorAlert('Could not open the image', () => importImageFile(file));
    if (img) setRectify({ imageId: img.id, mode, reedit: false });
  };

  const choose = async (camera: boolean, mode: 'inset' | 'full') => {
    const file = await pickFile('image/*', camera);
    if (file) await startWithFile(file, mode);
  };

  const doSave = async () => {
    if (!canSave) return;
    const p = { ...draft, name: draft.name.trim() } as Piece;
    await save(p);
    onSaved?.(p);
    onClose();
  };

  const doDelete = async () => {
    if (!piece) return;
    const ok = await confirmDialog({
      title: 'Delete piece?',
      message:
        usage > 0
          ? `“${piece.name}” is placed in ${usage} project${usage === 1 ? '' : 's'}. Deleting it removes it from ${usage === 1 ? 'that project' : 'those projects'} too.`
          : `“${piece.name}” will be removed from your library.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    await remove(piece.id);
    onClose();
  };

  return (
    <>
      <Modal
        title={piece ? 'Edit piece' : 'New piece'}
        onClose={onClose}
        wide
        footer={
          <>
            {piece && (
              <button className="btn btn-danger-ghost" onClick={() => void doDelete()}>
                Delete
              </button>
            )}
            <span className="spacer" />
            <button className="btn" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-primary" disabled={!canSave} onClick={() => void doSave()}>
              Save
            </button>
          </>
        }
      >
        {piece && usage > 0 && (
          <p className="info-banner">
            Used in {usage} project{usage === 1 ? '' : 's'} — changes apply everywhere.
          </p>
        )}
        <DropZone
          className="piece-editor"
          message="Drop an image of the piece"
          disabled={rectify !== null}
          onImage={(f) => void startWithFile(f, 'full')}
        >
          <div className="piece-editor-image">
            {hasSize ? (
              <PieceThumb piece={draft as Piece} maxSize={160} />
            ) : (
              <div className="piece-thumb empty-thumb" style={{ width: 160, height: 160 }}>
                Enter a size
              </div>
            )}
            <div className="button-stack">
              <button className="btn btn-small" onClick={() => void choose(true, 'inset')}>
                📷 Take photo
              </button>
              <button className="btn btn-small" onClick={() => void choose(false, 'inset')}>
                Photo at an angle…
              </button>
              <button className="btn btn-small" onClick={() => void choose(false, 'full')}>
                Flat image / scan…
              </button>
              {draft.imageSource && (
                <button
                  className="btn btn-small"
                  onClick={() =>
                    setRectify({ imageId: draft.imageSource!.originalImageId, mode: 'full', reedit: true })
                  }
                >
                  Adjust corners
                </button>
              )}
              {draft.imageId && (
                <button
                  className="btn btn-small"
                  onClick={() => set({ imageId: undefined, imageSource: undefined })}
                >
                  Remove image
                </button>
              )}
              <span className="drag-hint">or drag an image here</span>
            </div>
          </div>
          <div className="piece-editor-fields">
            <label className="field">
              <span className="field-label">Name *</span>
              <span className="field-input">
                <input
                  value={draft.name}
                  onChange={(e) => set({ name: e.target.value })}
                  placeholder="e.g. Harbour print"
                />
              </span>
            </label>
            <div className="row-2">
              <LengthInput
                label="Outer width"
                value={draft.widthMm}
                onChange={(widthMm) => set({ widthMm })}
                constraint={{ positive: true }}
                required
              />
              <LengthInput
                label="Outer height"
                value={draft.heightMm}
                onChange={(heightMm) => set({ heightMm })}
                constraint={{ positive: true }}
                required
              />
            </div>
            {!draft.imageId && (
              <div className="field">
                <span className="field-label">Placeholder colour</span>
                <div className="swatches">
                  {PLACEHOLDER_COLORS.map((c) => (
                    <button
                      key={c}
                      className={`swatch ${draft.color === c ? 'active' : ''}`}
                      style={{ background: c }}
                      aria-label={`Colour ${c}`}
                      onClick={() => set({ color: c })}
                    />
                  ))}
                </div>
              </div>
            )}
            <h3 className="section-title">Hanging</h3>
            {hasSize ? (
              <HangingEditor
                hanging={draft.hanging}
                widthMm={draft.widthMm!}
                heightMm={draft.heightMm!}
                onChange={(hanging) => set({ hanging })}
              />
            ) : (
              <p className="hint">Enter the size first.</p>
            )}
          </div>
        </DropZone>
      </Modal>
      {rectify && (
        <RectifyEditor
          title="Straighten piece photo"
          imageId={rectify.imageId}
          initialMode={rectify.mode}
          initialCorners={rectify.reedit ? draft.imageSource?.corners : undefined}
          initialWidthMm={draft.widthMm}
          initialHeightMm={draft.heightMm}
          widthLabel={undefined}
          onCancel={() => setRectify(null)}
          onConfirm={(r) => {
            setRectify(null);
            set({
              widthMm: r.widthMm,
              heightMm: r.heightMm,
              imageId: r.rectifiedImageId,
              imageSource: { originalImageId: r.originalImageId, corners: r.corners },
            });
          }}
        />
      )}
    </>
  );
}
