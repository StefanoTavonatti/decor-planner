import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { repo } from '../storage/repo';
import { connectAutosave } from '../storage/autosave';
import { requestPersistentStorage } from '../storage/persist';
import { ProjectEditor } from '../features/composer/ProjectEditor';
import { LibraryScreen } from '../features/library/LibraryScreen';
import { ProjectListScreen } from '../features/projects/ProjectListScreen';
import { SettingsScreen } from '../features/settings/SettingsScreen';
import { DialogHost, ToastHost } from '../features/common/ui';
import { routeHref, useRoute, type Route } from './router';
import { flushAutosave, registerFlusher, useEditor, useLibrary, useSettings } from './stores';

let started = false;

/** One-time startup: load data, request persistent storage, start autosave. */
async function startup() {
  if (started) return;
  started = true;
  await Promise.all([useSettings.getState().load(), useLibrary.getState().load()]);
  void requestPersistentStorage();
  const conn = connectAutosave(
    useEditor,
    (s) => s.project,
    (p) => repo.saveProject(p),
  );
  registerFlusher(conn.flush);
  void repo.cleanupOrphanImages();
}

export function App() {
  const [ready, setReady] = useState(started && useSettings.getState().loaded);
  const route = useRoute();

  useEffect(() => {
    void startup().then(() => setReady(true));
  }, []);

  if (!ready) return <div className="splash">Decor Planner</div>;

  return (
    <div className="app">
      {route.name !== 'project' && <AppBar route={route} />}
      <main className="app-main">
        {route.name === 'projects' && <ProjectListScreen />}
        {route.name === 'library' && <LibraryScreen />}
        {route.name === 'settings' && <SettingsScreen />}
        {route.name === 'project' && <ProjectEditor key={route.id} id={route.id} />}
      </main>
      <UpdatePrompt />
      <DialogHost />
      <ToastHost />
    </div>
  );
}

function AppBar({ route }: { route: Route }) {
  const items: [Route, string][] = [
    [{ name: 'projects' }, 'Projects'],
    [{ name: 'library' }, 'Library'],
    [{ name: 'settings' }, 'Settings'],
  ];
  return (
    <header className="app-bar">
      <a className="brand" href="#/">
        <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" width={28} height={28} />
        <span>Decor Planner</span>
      </a>
      <nav className="app-nav">
        {items.map(([r, label]) => (
          <a key={r.name} href={routeHref(r)} className={route.name === r.name ? 'active' : ''}>
            {label}
          </a>
        ))}
      </nav>
    </header>
  );
}

function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  if (!needRefresh) return null;
  return (
    <div className="update-banner" role="status">
      <span>A new version of Decor Planner is available.</span>
      <button
        className="btn btn-small btn-primary"
        onClick={async () => {
          await flushAutosave();
          await updateServiceWorker(true);
        }}
      >
        Reload
      </button>
      <button className="btn btn-small btn-ghost" onClick={() => setNeedRefresh(false)}>
        Later
      </button>
    </div>
  );
}
