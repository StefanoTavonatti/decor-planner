import { useState } from 'react';
import { createProject, type Project, type Wall } from '../../core/model';
import { repo } from '../../storage/repo';
import { LengthInput } from '../common/LengthInput';
import { Modal } from '../common/ui';
import { useWallPhotoFlow } from '../wall/WallSourcePicker';

/** New project: name + wall setup (from a photo or a blank wall). */
export function NewProjectDialog({ onCreated, onCancel }: { onCreated(p: Project): void; onCancel(): void }) {
  const [name, setName] = useState('My wall');
  const [mode, setMode] = useState<'choose' | 'blank'>('choose');
  const [widthMm, setWidthMm] = useState<number | undefined>(undefined);
  const [heightMm, setHeightMm] = useState<number | undefined>(undefined);

  const create = async (wall: Wall) => {
    const p = createProject(name.trim() || 'My wall', wall);
    await repo.saveProject(p);
    onCreated(p);
  };
  const photo = useWallPhotoFlow((w) => void create(w));

  return (
    <>
      <Modal
        title="New project"
        onClose={onCancel}
        footer={
          mode === 'blank' ? (
            <>
              <button className="btn" onClick={() => setMode('choose')}>
                Back
              </button>
              <button
                className="btn btn-primary"
                disabled={!widthMm || !heightMm}
                onClick={() => widthMm && heightMm && void create({ widthMm, heightMm })}
              >
                Create
              </button>
            </>
          ) : undefined
        }
      >
        <label className="field">
          <span className="field-label">Project name</span>
          <span className="field-input">
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </span>
        </label>
        {mode === 'choose' ? (
          <>
            <h3 className="section-title">Set up the wall</h3>
            <div className="choice-grid">
              <button className="choice" onClick={() => void photo.pickPhoto(true)}>
                <span className="choice-icon">📷</span>
                <strong>Take a photo</strong>
                <span>Photograph the wall, then mark its corners</span>
              </button>
              <button className="choice" onClick={() => void photo.pickPhoto(false)}>
                <span className="choice-icon">🖼️</span>
                <strong>Choose a photo</strong>
                <span>Use an existing photo of the wall</span>
              </button>
              <button className="choice" onClick={() => setMode('blank')}>
                <span className="choice-icon">▭</span>
                <strong>Blank wall</strong>
                <span>Just enter width and height</span>
              </button>
            </div>
          </>
        ) : (
          <div className="row-2">
            <LengthInput label="Wall width" value={widthMm} onChange={setWidthMm} constraint={{ positive: true }} required autoFocus />
            <LengthInput label="Wall height" value={heightMm} onChange={setHeightMm} constraint={{ positive: true }} required />
          </div>
        )}
      </Modal>
      {photo.editor}
    </>
  );
}
