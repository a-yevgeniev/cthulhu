# coc7-dice-roller

Call of Cthulhu 7th edition dice roller. Live at
[a-yevgeniev.github.io/cthulhu](https://a-yevgeniev.github.io/cthulhu/), deployed via GitHub
Pages on every push to `master` ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)).

npm workspaces monorepo:

- [`packages/engine`](packages/engine) — pure TypeScript rules engine (dice, success levels,
  Sanity, opposed rolls). Zero runtime dependencies, no DOM. See its README for the API.
- `packages/web` — React + Vite + Tailwind interface, consumes `coc7-engine`.
- [`packages/server`](packages/server) — shared-table server (Phase 4 / Track B): rooms,
  server-authoritative rolls, an append-only ledger. A separate long-running process — see its
  README for how to run it and what's deployed vs. not.
- `packages/protocol` — Socket.IO event/payload types shared between `server` and `web`.

See [CLAUDE.md](CLAUDE.md) for the full development plan and phase status.

```bash
npm install         # installs all workspaces
npm test            # runs the engine test suite
npm run dev          # runs the web app dev server
npm run dev:server   # runs the shared-table server (separate process, see packages/server)
npm run typecheck    # typechecks all workspaces
```
