# coc7-dice-roller

Call of Cthulhu 7th edition dice roller. npm workspaces monorepo:

- [`packages/engine`](packages/engine) — pure TypeScript rules engine (dice, success levels,
  Sanity, opposed rolls). Zero runtime dependencies, no DOM. See its README for the API.
- `packages/web` — React + Vite + Tailwind interface, consumes `coc7-engine`.

See [CLAUDE.md](CLAUDE.md) for the full development plan and phase status.

```bash
npm install       # installs both workspaces
npm test          # runs the engine test suite
npm run dev        # runs the web app dev server
npm run typecheck  # typechecks all workspaces
```
