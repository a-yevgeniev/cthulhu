# coc7-server

Shared-table server for Phase 4 (Track B): rooms with a join code, server-authoritative rolls
via `coc7-engine`, and an append-only ledger persisted to SQLite (`node:sqlite` — no native
build step). Talks to `packages/web` over Socket.IO using the shared types in
`coc7-protocol`.

```bash
npm run dev    # tsx watch src/index.ts, restarts on save
npm start      # tsx src/index.ts
```

Listens on `PORT` (default `4000`). The ledger persists to `COC7_DB_PATH` (default
`./coc7-table.sqlite`, gitignored). Set `COC7_CORS_ORIGIN` to restrict which origin can
connect once this is deployed somewhere real (defaults to `*` for local development).

## What's here

- Room creation with a short, read-aloud-friendly join code (`makeRoomCode` excludes 0/O/1/I).
- The room creator is the Keeper; everyone else who joins is a Player.
- `roll:skill` / `roll:notation` / `roll:sanity` — the client sends parameters, the server
  calls the engine and is the single source of truth for the result. A `secret: true` roll (or
  a Sanity check, which defaults to secret) broadcasts only to the roller and the Keeper.
- `roll:request` — the Keeper asks a specific connected player for a named roll; the target
  gets a `roll:prompt` they can act on from their own sheet.
- The ledger replays to a player on join, filtered to what they're allowed to see.

## Known limitations (this is a first vertical slice of Phase 4, not the full plan)

- **Rooms don't survive a server restart.** Room/player state lives in memory
  (`src/rooms.ts`) for live socket routing; only the ledger is durable in SQLite. Restarting
  the server means everyone has to rejoin, and the Keeper's room won't be resumable via the
  same code (a new room would need to be created). Fine for a single session; not fine for
  anything long-running.
- **No reconnect-with-identity.** Reloading the browser tab loses your player ID — you rejoin
  as a new player. There's no session token or localStorage-based resume.
- **The Keeper role isn't transferable**, and there's no way to promote a second Keeper.
- **Not deployed anywhere.** This needs a real always-on host (Fly.io, Render, a VPS — GitHub
  Pages can't run it, it's static-only) plus `VITE_COC7_SERVER_URL` set at web build time to
  point at it. That's a hosting/cost decision left to whoever picks this phase up next.
- Client-side Quick Roll / Character Sheet screens don't route through a connected room — the
  Table tab is a separate, standalone screen with its own roll composer for now.
