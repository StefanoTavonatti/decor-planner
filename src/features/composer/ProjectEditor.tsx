import { useEffect, useState } from 'react';
import { navigate } from '../../app/router';
import { flushAutosave, useEditor, useSettings } from '../../app/stores';
import { repo } from '../../storage/repo';
import { promptDialog } from '../common/ui';
import { ExportDialog } from '../export/ExportDialog';
import { updateThumbnail } from '../projects/io';
import { nudgeSelection, removeSelection } from './actions';
import { AddPanel, SelectionPanel, WallPanel } from './panels';
import { useViewCommands } from './viewCommands';
import { WallCanvas } from './WallCanvas';

type Tab = 'add' | 'selection' | 'wall';

export function ProjectEditor({ id }: { id: string }) {
  const project = useEditor((s) => s.project);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let alive = true;
    if (useEditor.getState().project?.id !== id) {
      void repo.getProject(id).then((p) => {
        if (!alive) return;
        if (p) useEditor.getState().open(p);
        else setMissing(true);
      });
    }
    return () => {
      alive = false;
      // Refresh the project list thumbnail when leaving the editor.
      void flushAutosave()
        .then(() => updateThumbnail(id))
        .then(() => window.dispatchEvent(new Event('projects-changed')));
    };
  }, [id]);

  if (missing) {
    return (
      <div className="screen">
        <div className="empty">
          <p>This project does not exist on this device.</p>
          <button className="btn btn-primary" onClick={() => navigate({ name: 'projects' })}>
            Back to projects
          </button>
        </div>
      </div>
    );
  }
  if (!project || project.id !== id) return <div className="screen">Loading…</div>;
  return <Editor />;
}

function Editor() {
  const project = useEditor((s) => s.project)!;
  const selection = useEditor((s) => s.selection);
  const revealSelection = useEditor((s) => s.revealSelection);
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const { undo, redo, patch } = useEditor.getState();
  const settings = useSettings((s) => s.settings);
  const updateSettings = useSettings((s) => s.update);
  const send = useViewCommands((s) => s.send);
  const [tab, setTab] = useState<Tab>(project.placements.length ? 'selection' : 'add');
  const [sheetOpen, setSheetOpen] = useState(project.placements.length === 0);
  const [exporting, setExporting] = useState(false);

  // Follow the selection with the panel (adjusted during render).
  const hasSelection = selection.length > 0;
  const [prevSelection, setPrevSelection] = useState(selection);
  if (selection !== prevSelection) {
    setPrevSelection(selection);
    if (hasSelection && revealSelection) setTab('selection');
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [contenteditable]') || document.querySelector('.modal-backdrop')) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const [dx, dy] =
          e.key === 'ArrowLeft' ? [-step, 0] : e.key === 'ArrowRight' ? [step, 0] : e.key === 'ArrowUp' ? [0, step] : [0, -step];
        nudgeSelection(dx, dy);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        removeSelection();
      } else if (e.key === 'Escape') {
        useEditor.getState().select([]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  const rename = async () => {
    const name = await promptDialog('Rename project', 'Name', project.name);
    if (name) patch({ name, updatedAt: Date.now() });
  };

  const openTab = (t: Tab) => {
    if (tab === t && sheetOpen) setSheetOpen(false);
    else {
      setTab(t);
      setSheetOpen(true);
    }
  };

  return (
    <div className="editor">
      <div className="toolbar" role="toolbar" aria-label="Editor">
        <button className="icon-btn" onClick={() => navigate({ name: 'projects' })} aria-label="Back to projects" title="Projects">
          ←
        </button>
        <button className="toolbar-title linklike" onClick={() => void rename()} title="Rename">
          {project.name}
        </button>
        <span className="spacer" />
        <button className="icon-btn" onClick={undo} disabled={!canUndo} aria-label="Undo" title="Undo (Ctrl/⌘+Z)">
          ↶
        </button>
        <button className="icon-btn" onClick={redo} disabled={!canRedo} aria-label="Redo" title="Redo (Shift+Ctrl/⌘+Z)">
          ↷
        </button>
        <span className="toolbar-sep" />
        <button className="icon-btn zoom-btn" onClick={() => send('out')} aria-label="Zoom out" title="Zoom out">
          −
        </button>
        <button className="icon-btn" onClick={() => send('fit')} aria-label="Fit wall" title="Fit wall">
          ⤢
        </button>
        <button className="icon-btn zoom-btn" onClick={() => send('in')} aria-label="Zoom in" title="Zoom in">
          +
        </button>
        <span className="toolbar-sep" />
        <button
          className={`icon-btn ${settings.snapping ? 'toggled' : ''}`}
          onClick={() => updateSettings({ snapping: !settings.snapping })}
          aria-pressed={settings.snapping}
          aria-label="Snapping"
          title="Snapping"
        >
          🧲
        </button>
        <button
          className={`icon-btn ${settings.showNails ? 'toggled' : ''}`}
          onClick={() => updateSettings({ showNails: !settings.showNails })}
          aria-pressed={settings.showNails}
          aria-label="Show hanging points"
          title="Show hanging points"
        >
          📌
        </button>
        <button className="btn btn-primary btn-small" onClick={() => setExporting(true)}>
          Export
        </button>
      </div>
      <div className="editor-body">
        <WallCanvas />
        <aside className={`side-panel ${sheetOpen ? 'open' : ''}`}>
          <div className="tabs" role="tablist">
            {(
              [
                ['add', 'Add'],
                ['selection', hasSelection ? `Selection (${selection.length})` : 'Selection'],
                ['wall', 'Wall'],
              ] as [Tab, string][]
            ).map(([t, label]) => (
              <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'active' : ''} onClick={() => openTab(t)}>
                {label}
              </button>
            ))}
          </div>
          <div className="tab-content">
            {tab === 'add' && <AddPanel />}
            {tab === 'selection' && <SelectionPanel />}
            {tab === 'wall' && <WallPanel />}
          </div>
        </aside>
      </div>
      {exporting && <ExportDialog onClose={() => setExporting(false)} />}
    </div>
  );
}
