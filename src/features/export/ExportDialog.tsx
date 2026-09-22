import { useState } from 'react';
import { compositionWarnings } from '../../core/composition';
import type { PaperSize } from '../../core/model';
import { repo } from '../../storage/repo';
import { piecesMap, useEditor, useLibrary, useSettings } from '../../app/stores';
import { downloadBlob, safeFilename } from '../common/images';
import { confirmDialog, Modal, toast, withErrorAlert } from '../common/ui';
import { exportProjectFile } from '../projects/io';
import { buildMountingPlanPdf } from './pdf';
import { renderCompositionPng } from './render';

export function ExportDialog({ onClose }: { onClose(): void }) {
  const project = useEditor((s) => s.project)!;
  const pieces = piecesMap(useLibrary((s) => s.pieces));
  const settings = useSettings((s) => s.settings);
  const updateSettings = useSettings((s) => s.update);
  const [includePhoto, setIncludePhoto] = useState(false);
  const [busy, setBusy] = useState(false);

  const warnings = compositionWarnings(project, pieces);
  const nameOf = (placementId: string) => {
    const pl = project.placements.find((p) => p.id === placementId);
    return (pl && pieces.get(pl.pieceId)?.name) ?? 'piece';
  };

  /** Warn about out-of-bounds / overlapping pieces; resolves true to continue. */
  const checkWarnings = async () => {
    if (warnings.length === 0) return true;
    return confirmDialog({
      title: 'Check your layout',
      message: (
        <ul className="warning-list">
          {warnings.map((w) => (
            <li key={w.placementId}>
              <strong>{nameOf(w.placementId)}</strong>
              {w.outOfBounds && ' extends beyond the wall'}
              {w.outOfBounds && w.overlapsWith.length > 0 && ' and'}
              {w.overlapsWith.length > 0 && ` overlaps ${w.overlapsWith.length === 1 ? 'another item' : `${w.overlapsWith.length} items`}`}
            </li>
          ))}
        </ul>
      ),
      confirmLabel: 'Export anyway',
    });
  };

  const run = (fn: () => Promise<void>) =>
    withErrorAlert('Export failed', async () => {
      if (!(await checkWarnings())) return;
      setBusy(true);
      try {
        await fn();
      } finally {
        setBusy(false);
      }
    });

  const pdf = () =>
    run(async () => {
      const wallImg = includePhoto && project.wall.imageId ? await repo.getImage(project.wall.imageId) : undefined;
      const { bytes } = await buildMountingPlanPdf({
        project,
        pieces,
        unit: settings.unit,
        paper: settings.paper,
        includePhoto,
        wallImage: wallImg ? { bytes: new Uint8Array(wallImg.bytes), mime: wallImg.mime } : undefined,
      });
      downloadBlob(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' }), `${safeFilename(project.name)} - mounting plan.pdf`);
      toast('Mounting plan downloaded');
    });

  const png = () =>
    run(async () => {
      const { blob } = await renderCompositionPng(project, pieces, 3000);
      downloadBlob(blob, `${safeFilename(project.name)} - preview.png`);
      toast('Preview image downloaded');
    });

  return (
    <Modal title="Export" onClose={onClose}>
      {warnings.length > 0 && (
        <p className="warn-banner">
          ⚠ {warnings.length} piece{warnings.length === 1 ? '' : 's'} {warnings.length === 1 ? 'is' : 'are'} off the wall or
          overlapping.
        </p>
      )}
      <section className="export-option">
        <h3>Mounting plan (PDF)</h3>
        <p className="hint">To-scale drawing with nail positions from the floor and the left corner, plus a table of all nails.</p>
        <div className="field">
          <span className="field-label">Paper</span>
          <div className="segmented">
            {(['A4', 'Letter'] as PaperSize[]).map((p) => (
              <button key={p} className={settings.paper === p ? 'active' : ''} onClick={() => updateSettings({ paper: p })}>
                {p}
              </button>
            ))}
          </div>
        </div>
        <label className="switch">
          <input
            type="checkbox"
            checked={includePhoto}
            disabled={!project.wall.imageId}
            onChange={(e) => setIncludePhoto(e.target.checked)}
          />
          <span>Include wall photo as faded background</span>
        </label>
        <button className="btn btn-primary" disabled={busy} onClick={() => void pdf()}>
          Download PDF
        </button>
      </section>
      <section className="export-option">
        <h3>Preview image (PNG)</h3>
        <p className="hint">The composition as it looks on the wall, to share.</p>
        <button className="btn" disabled={busy} onClick={() => void png()}>
          Download PNG
        </button>
      </section>
      <section className="export-option">
        <h3>Project file (.decorplan)</h3>
        <p className="hint">Back up the project or open it on another device.</p>
        <button
          className="btn"
          disabled={busy}
          onClick={() =>
            void withErrorAlert('Export failed', async () => {
              await exportProjectFile(project.id);
              toast('Project file downloaded');
            })
          }
        >
          Download .decorplan
        </button>
      </section>
    </Modal>
  );
}
