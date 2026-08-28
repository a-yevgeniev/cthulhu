# coc7-server

Shared-table server for Phase 4 (Track B): rooms with a join code, server-authoritative rolls
via `coc7-engine`, and an append-only ledger persisted to SQLite (`node:sqlite` — no native
build step). Talks to `packages/web` over Socket.IO using the shared types in
`coc7-protocol`.

**Deployed at [coc7-server.fly.dev](https://coc7-server.fly.dev)** (Fly.io, `iad` region, a
1GB volume mounted at `/data` for the SQLite ledger, `auto_stop_machines` so it doesn't run —
or cost — while idle between sessions; expect a few seconds' cold-start delay on the first
connection after a quiet spell). Config lives in [`/fly.toml`](../../fly.toml) at the repo
root (the build context has to be the repo root, not this folder, so npm workspaces can see
`packages/engine` and `packages/protocol`). Redeploy with:

```bash
flyctl deploy --remote-only   # --remote-only: no local Docker daemon needed
```

```bash
npm run dev    # tsx watch src/index.ts, restarts on save
npm start      # tsx src/index.ts
```

Listens on `PORT` (default `4000`). The ledger persists to `COC7_DB_PATH` (default
`./coc7-table.sqlite` locally, gitignored; `/data/coc7-table.sqlite` on the mounted volume in
production). `COC7_CORS_ORIGIN` restricts which origin may connect — set in `fly.toml` to
`https://a-yevgeniev.github.io`, the deployed web app's origin; defaults to `*` locally.

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
- Client-side Quick Roll / Character Sheet screens don't route through a connected room — the
  Table tab is a separate, standalone screen with its own roll composer for now.

## Deployment notes

- `packages/web`'s production build points at `coc7-server.fly.dev` via `VITE_COC7_SERVER_URL`
  set in [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml) — that workflow
  only runs on `master`, so it hasn't actually built against this yet since Phase 4 is still on
  its own branch.
- Verified against the live deployment (not just locally): room create/join, a public roll
  broadcasting over the real WebSocket connection, and — deliberately, to confirm the mounted
  volume rather than just in-memory state — a *second* process restart (a `flyctl deploy`
  redeploy) followed by a third player joining the *same* room code. That correctly failed
  with "Room not found" (rooms are in-memory, as documented above), which is expected; a fresh
  room's ledger entries were separately confirmed to reach a newly-joined player within the
  same running instance, proving the SQLite-on-volume path works for what it's actually for.
