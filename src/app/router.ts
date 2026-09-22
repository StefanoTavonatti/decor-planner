/** Minimal hash router. */
import { useSyncExternalStore } from 'react';

export type Route =
  | { name: 'projects' }
  | { name: 'library' }
  | { name: 'settings' }
  | { name: 'project'; id: string };

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#\/?/, '');
  const [first, second] = path.split('/');
  if (first === 'library') return { name: 'library' };
  if (first === 'settings') return { name: 'settings' };
  if (first === 'project' && second) return { name: 'project', id: decodeURIComponent(second) };
  return { name: 'projects' };
}

export function routeHref(r: Route): string {
  switch (r.name) {
    case 'projects':
      return '#/';
    case 'library':
      return '#/library';
    case 'settings':
      return '#/settings';
    case 'project':
      return `#/project/${encodeURIComponent(r.id)}`;
  }
}

/** Route the user came from, to return to it (e.g. library -> back to project). */
let previous: Route | null = null;
let current: Route = parseRoute(typeof location !== 'undefined' ? location.hash : '');

function subscribe(cb: () => void) {
  const handler = () => {
    previous = current;
    current = parseRoute(location.hash);
    cb();
  };
  window.addEventListener('hashchange', handler);
  return () => window.removeEventListener('hashchange', handler);
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, () => current);
}

export function navigate(r: Route) {
  location.hash = routeHref(r);
}

/** Go back to the previous screen, or to the given fallback. */
export function goBack(fallback: Route = { name: 'projects' }) {
  const target = previous && previous.name !== current.name ? previous : fallback;
  navigate(target);
}
