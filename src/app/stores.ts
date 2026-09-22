/** Global app stores (Zustand): settings, piece library, and the open project editor. */
import { produce, type Draft } from 'immer';
import { create } from 'zustand';
import { defaultSettings, type Id, type Piece, type Project, type Settings } from '../core/model';
import { repo } from '../storage/repo';

// ---------------------------------------------------------------- settings

interface SettingsState {
  settings: Settings;
  loaded: boolean;
  load(): Promise<void>;
  update(patch: Partial<Settings>): void;
}

export const useSettings = create<SettingsState>((set, get) => ({
  settings: defaultSettings(),
  loaded: false,
  async load() {
    set({ settings: await repo.getSettings(), loaded: true });
  },
  update(patch) {
    const settings = { ...get().settings, ...patch };
    set({ settings });
    void repo.saveSettings(settings);
  },
}));

export const useUnit = () => useSettings((s) => s.settings.unit);

// ---------------------------------------------------------------- library

interface LibraryState {
  pieces: Record<Id, Piece>;
  loaded: boolean;
  load(): Promise<void>;
  save(piece: Piece): Promise<void>;
  remove(id: Id): Promise<void>;
}

export const useLibrary = create<LibraryState>((set, get) => ({
  pieces: {},
  loaded: false,
  async load() {
    const list = await repo.listPieces();
    set({ pieces: Object.fromEntries(list.map((p) => [p.id, p])), loaded: true });
  },
  async save(piece) {
    const p = { ...piece, updatedAt: Date.now() };
    set({ pieces: { ...get().pieces, [p.id]: p } });
    await repo.savePiece(p);
  },
  async remove(id) {
    // Remove placements from the open project first so autosave does not resurrect them.
    const editor = useEditor.getState();
    if (editor.project?.placements.some((pl) => pl.pieceId === id)) {
      editor.mutate((d) => {
        d.placements = d.placements.filter((pl) => pl.pieceId !== id);
      });
      await flushAutosave();
    }
    const { [id]: _removed, ...rest } = get().pieces;
    set({ pieces: rest });
    await repo.deletePiece(id);
  },
}));

export function piecesMap(pieces: Record<Id, Piece>): Map<Id, Piece> {
  return new Map(Object.entries(pieces));
}

// ---------------------------------------------------------------- editor

const HISTORY_LIMIT = 100;

interface EditorState {
  project: Project | null;
  past: Project[];
  future: Project[];
  /** Project state at the start of a continuous gesture (drag). */
  gestureBase: Project | null;
  /** Selected placement and obstacle ids. */
  selection: Id[];
  /** Whether the last selection change should reveal the selection panel. */
  revealSelection: boolean;
  open(p: Project): void;
  close(): void;
  /** Apply an undoable edit. */
  commit(recipe: (draft: Draft<Project>) => void): void;
  /** Apply an edit without recording history (e.g. cascading library deletes). */
  mutate(recipe: (draft: Draft<Project>) => void): void;
  /** Set metadata fields (thumbnail, export time) without counting as a modification. */
  patch(fields: Partial<Project>): void;
  beginGesture(): void;
  updateGesture(recipe: (draft: Draft<Project>) => void): void;
  endGesture(): void;
  undo(): void;
  redo(): void;
  select(ids: Id[], reveal?: boolean): void;
  toggleSelect(id: Id): void;
}

function touch(p: Project): Project {
  return { ...p, updatedAt: Date.now() };
}

/** Restore a history snapshot, keeping current metadata that is not part of undo history. */
function restore(snapshot: Project, current: Project): Project {
  return touch({ ...snapshot, name: current.name, thumbnailId: current.thumbnailId, lastExportedAt: current.lastExportedAt });
}

export const useEditor = create<EditorState>((set, get) => ({
  project: null,
  past: [],
  future: [],
  gestureBase: null,
  selection: [],
  revealSelection: true,
  open(p) {
    set({ project: p, past: [], future: [], gestureBase: null, selection: [] });
  },
  close() {
    set({ project: null, past: [], future: [], gestureBase: null, selection: [] });
  },
  commit(recipe) {
    const { project, past } = get();
    if (!project) return;
    const next = produce(project, recipe);
    if (next === project) return;
    set({ project: touch(next), past: [...past, project].slice(-HISTORY_LIMIT), future: [] });
  },
  mutate(recipe) {
    const { project } = get();
    if (!project) return;
    const next = produce(project, recipe);
    if (next !== project) set({ project: touch(next) });
  },
  patch(fields) {
    const { project } = get();
    if (project) set({ project: { ...project, ...fields } });
  },
  beginGesture() {
    set({ gestureBase: get().project });
  },
  updateGesture(recipe) {
    const { project } = get();
    if (!project) return;
    const next = produce(project, recipe);
    if (next !== project) set({ project: touch(next) });
  },
  endGesture() {
    const { gestureBase, project, past } = get();
    if (!gestureBase || !project) return set({ gestureBase: null });
    if (gestureBase === project) return set({ gestureBase: null });
    set({ gestureBase: null, past: [...past, gestureBase].slice(-HISTORY_LIMIT), future: [] });
  },
  undo() {
    const { past, project, future } = get();
    if (!project || past.length === 0) return;
    const prev = past[past.length - 1];
    set({ project: restore(prev, project), past: past.slice(0, -1), future: [project, ...future], selection: keepExisting(get().selection, prev) });
  },
  redo() {
    const { past, project, future } = get();
    if (!project || future.length === 0) return;
    const next = future[0];
    set({ project: restore(next, project), past: [...past, project], future: future.slice(1), selection: keepExisting(get().selection, next) });
  },
  select(ids, reveal = true) {
    set({ selection: ids, revealSelection: reveal });
  },
  toggleSelect(id) {
    const s = get().selection;
    set({ selection: s.includes(id) ? s.filter((x) => x !== id) : [...s, id], revealSelection: true });
  },
}));

function keepExisting(selection: Id[], p: Project): Id[] {
  const ids = new Set([...p.placements.map((x) => x.id), ...p.obstacles.map((x) => x.id)]);
  return selection.filter((id) => ids.has(id));
}

// ---------------------------------------------------------------- autosave registry

const flushers = new Set<() => Promise<void>>();

export function registerFlusher(f: () => Promise<void>): () => void {
  flushers.add(f);
  return () => flushers.delete(f);
}

/** Flush all pending autosaves (before reload/update, or cascading deletes). */
export async function flushAutosave(): Promise<void> {
  await Promise.all([...flushers].map((f) => f()));
}
