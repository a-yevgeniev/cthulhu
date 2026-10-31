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
- Players join as an investigator (`characterKey`: a ready-made one's key, or the id of one they
  made) — there is no joining as a guest. Only one *connected* player may hold a given
  investigator; a second join is refused. A holder who drops off frees it (their stale entry makes
  way for whoever takes it next), and `room:taken` lists the held ones so a join form can grey
  them out. The Keeper plays no investigator.
- `room:resume` — after a reload or a dropped connection the client sends the room code, its
  player id and the `resumeToken` it was given on create/join, and gets the same payload as a
  join, as the same player (same role, same ledger view). Both must match: ids are public to the
  room, tokens are not. A disconnect only marks a player away; the room keeps them, so this works
  as long as the server process stays up. After a restart the room is gone and resuming fails.
- `roll:skill` / `roll:notation` / `roll:sanity` — the client sends parameters, the server
  calls the engine and is the single source of truth for the result. A `secret: true` roll (or
  a Sanity check, which defaults to secret) broadcasts only to the roller and the Keeper.
- `roll:request` — the Keeper asks a specific connected player for a named roll; the target
  gets a `roll:prompt` they can act on from their own sheet.
- `music:set` — the Keeper alone sets the room's background music (a YouTube video id, title,
  playing/stopped, volume 0-100). The server validates and clamps every field, keeps it on the
  in-memory room, and broadcasts `music:state` to everyone; it also rides along in the create/
  join responses so late joiners start in step. No audio ever touches the server — each client
  plays the video through YouTube's embedded player. Not persisted: like the room itself it
  doesn't survive a restart.
- `handout:set` — the Keeper alone chooses which images the whole table sees, up to six at once.
  One step per message: `show` an image, `hide` one by id, or `clear` them all. An image is either
  one of the web app's bundled handouts, by slug id, or one the Keeper uploaded: a
  `data:image/(jpeg|png|webp);base64,…` URL of at most 700,000 characters (SVG is refused — it can
  carry script), shrunk by the Keeper's client. Uploaded images are never stored ahead of time:
  they sit on the Keeper's device and are sent only when shown, held in the room's memory while on
  display, and dropped the moment the Keeper hides them. The validated step is relayed to the room
  as `handout:change`, and the full list is replayed in the create/join responses for late
  joiners. The Socket.IO message limit is set explicitly (1,000,000 bytes); a bigger message drops
  that one connection and nothing else.
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
