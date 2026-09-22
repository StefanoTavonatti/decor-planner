import { useCallback, useEffect, useState } from 'react';
import { needsBackupReminder } from '../../core/composition';
import type { Project } from '../../core/model';
import { DecorPlanError } from '../../core/format';
import { repo } from '../../storage/repo';
import { navigate } from '../../app/router';
import { useEditor } from '../../app/stores';
import { Length } from '../common/LengthInput';
import { decorplanAccept, pickFile, useImageUrl } from '../common/images';
import { alertDialog, confirmDialog, promptDialog, toast, withErrorAlert } from '../common/ui';
import { exportProjectFile, importProjectFile } from './io';
import { NewProjectDialog } from './NewProjectDialog';

function relativeDate(ts: number): string {
  const d = new Date(ts);
  const days = Math.floor((Date.now() - ts) / 86_400_000);
  if (days === 0) return `today ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  return d.toLocaleDateString();
}

export function ProjectListScreen() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [creating, setCreating] = useState(false);
  const refresh = useCallback(async () => setProjects(await repo.listProjects()), []);

  useEffect(() => {
    void repo.listProjects().then(setProjects);
    const onChange = () => void refresh();
    window.addEventListener('projects-changed', onChange);
    return () => window.removeEventListener('projects-changed', onChange);
  }, [refresh]);

  const doImport = async () => {
    const file = await pickFile(decorplanAccept());
    if (!file) return;
    try {
      const p = await importProjectFile(file);
      toast(`Imported “${p.name}”`);
      await refresh();
    } catch (e) {
      await alertDialog('Import failed', e instanceof DecorPlanError ? e.message : 'This file could not be imported.');
    }
  };

  return (
    <div className="screen">
      <div className="screen-header">
        <h1>Projects</h1>
        <div className="actions">
          <button className="btn" onClick={() => void doImport()}>
            Import
          </button>
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            + New project
          </button>
        </div>
      </div>
      {projects && projects.length === 0 && (
        <div className="empty">
          <p>
            <strong>Plan your wall before you drill.</strong>
          </p>
          <p>Create a project from a photo of your wall, add your pictures and try compositions in true scale.</p>
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            Create your first project
          </button>
        </div>
      )}
      <div className="card-grid">
        {projects?.map((p) => <ProjectCard key={p.id} project={p} onChanged={refresh} />)}
      </div>
      {creating && (
        <NewProjectDialog
          onCancel={() => setCreating(false)}
          onCreated={(p) => {
            setCreating(false);
            navigate({ name: 'project', id: p.id });
          }}
        />
      )}
    </div>
  );
}

function ProjectCard({ project: p, onChanged }: { project: Project; onChanged(): void }) {
  const thumb = useImageUrl(p.thumbnailId);
  const remind = needsBackupReminder(p);
  const [menu, setMenu] = useState(false);

  const act = async (fn: () => Promise<unknown>) => {
    setMenu(false);
    await fn();
    onChanged();
  };

  return (
    <div className="card project-card">
      <button className="card-thumb" onClick={() => navigate({ name: 'project', id: p.id })} aria-label={`Open ${p.name}`}>
        {thumb ? <img src={thumb} alt="" /> : <span className="thumb-placeholder" />}
      </button>
      <div className="card-body">
        <div className="card-title-row">
          <button className="card-title linklike" onClick={() => navigate({ name: 'project', id: p.id })}>
            {p.name}
          </button>
          <div className="menu-wrap">
            <button className="icon-btn" aria-label="Project actions" onClick={() => setMenu((m) => !m)}>
              ⋯
            </button>
            {menu && (
              <div className="menu" role="menu" onMouseLeave={() => setMenu(false)}>
                <button role="menuitem" onClick={() => navigate({ name: 'project', id: p.id })}>
                  Open
                </button>
                <button
                  role="menuitem"
                  onClick={() =>
                    act(async () => {
                      const name = await promptDialog('Rename project', 'Name', p.name);
                      if (!name) return;
                      await repo.renameProject(p.id, name);
                      const editor = useEditor.getState();
                      if (editor.project?.id === p.id) editor.patch({ name });
                    })
                  }
                >
                  Rename
                </button>
                <button role="menuitem" onClick={() => act(() => repo.duplicateProject(p.id))}>
                  Duplicate
                </button>
                <button role="menuitem" onClick={() => act(() => withErrorAlert('Export failed', () => exportProjectFile(p.id)))}>
                  Export .decorplan
                </button>
                <button
                  role="menuitem"
                  className="danger"
                  onClick={() =>
                    act(async () => {
                      const ok = await confirmDialog({
                        title: 'Delete project?',
                        message: `“${p.name}” will be deleted from this device. Pieces stay in your library.`,
                        confirmLabel: 'Delete',
                        danger: true,
                      });
                      if (!ok) return;
                      if (useEditor.getState().project?.id === p.id) useEditor.getState().close();
                      await repo.deleteProject(p.id);
                    })
                  }
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="card-meta">
          <Length mm={p.wall.widthMm} /> × <Length mm={p.wall.heightMm} /> · {p.placements.length} pieces
        </div>
        <div className="card-meta">Modified {relativeDate(p.updatedAt)}</div>
        <div className={`card-meta ${remind ? 'warn' : ''}`}>
          {p.lastExportedAt ? `Last exported ${relativeDate(p.lastExportedAt)}` : 'Never exported'}
        </div>
        {remind && (
          <button className="btn btn-small reminder" onClick={() => act(() => withErrorAlert('Export failed', () => exportProjectFile(p.id)))}>
            ⚠ Back up: export .decorplan
          </button>
        )}
      </div>
    </div>
  );
}
