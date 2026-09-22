# Decor Planner

Plan picture compositions on a photo of your wall, in true scale, and export a mounting plan with nail positions.

Local-first PWA (Vite + React + TypeScript). All data stays on the device; back up projects as `.decorplan` files.

```sh
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (core logic, storage, PDF)
npm run e2e        # end-to-end tests against the production build
npm run build      # production build in dist/ (installable, offline)
```

Planning docs live in `openspec/` (change `bootstrap-decor-planner-v1`).
