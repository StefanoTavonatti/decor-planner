/** Debounced autosave with flush on page hide. */

export interface Autosaver<T> {
  schedule(value: T): void;
  flush(): Promise<void>;
  dispose(): void;
}

export function createAutosaver<T>(save: (value: T) => Promise<void>, delayMs = 500): Autosaver<T> {
  let pending: { value: T } | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let inflight: Promise<void> = Promise.resolve();

  const run = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    if (!pending) return inflight;
    const { value } = pending;
    pending = null;
    inflight = inflight.then(() => save(value)).catch((e) => console.error('Autosave failed', e));
    return inflight;
  };

  return {
    schedule(value) {
      pending = { value };
      if (timer) clearTimeout(timer);
      timer = setTimeout(run, delayMs);
    },
    flush: () => run(),
    dispose() {
      if (timer) clearTimeout(timer);
      timer = null;
    },
  };
}

type Subscribable<S> = { subscribe(listener: (state: S, prev: S) => void): () => void };

/**
 * Subscribe an autosaver to a store: whenever `select(state)` changes (by reference),
 * schedule a save. Flushes when the page is hidden or closed.
 */
export function connectAutosave<S, T>(
  store: Subscribable<S>,
  select: (s: S) => T | null | undefined,
  save: (value: T) => Promise<void>,
  delayMs = 500,
): { flush(): Promise<void>; disconnect(): void } {
  const saver = createAutosaver(save, delayMs);
  const unsubscribe = store.subscribe((state, prev) => {
    const next = select(state);
    if (next && next !== select(prev)) saver.schedule(next);
  });
  const onHide = () => {
    if (typeof document === 'undefined' || document.visibilityState === 'hidden') void saver.flush();
  };
  const onPageHide = () => void saver.flush();
  if (typeof window !== 'undefined') {
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onPageHide);
  }
  return {
    flush: () => saver.flush(),
    disconnect() {
      unsubscribe();
      saver.dispose();
      if (typeof window !== 'undefined') {
        document.removeEventListener('visibilitychange', onHide);
        window.removeEventListener('pagehide', onPageHide);
      }
    },
  };
}
