import { create } from 'zustand';

/** Commands from the toolbar to the canvas viewport (fit / zoom). */
export const useViewCommands = create<{ cmd: { type: 'fit' | 'in' | 'out'; n: number }; send(type: 'fit' | 'in' | 'out'): void }>(
  (set, get) => ({
    cmd: { type: 'fit', n: 0 },
    send: (type) => set({ cmd: { type, n: get().cmd.n + 1 } }),
  }),
);
