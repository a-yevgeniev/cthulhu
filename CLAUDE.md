# Development Plan — Call of Cthulhu 7e Dice Roller

**Status:** Phases 1–2 complete. Phase 3 mostly complete (see notes). Phase 4 first vertical
slice on branch `phase-4-shared-table` (see notes — not merged, not deployed). Phase 5
outstanding.

---

## Phase 0 — Scope decision

The whole architecture forks on one question: **solo tool or shared table?**

- **Track A — Local roller (no backend).** Static SPA, everything in `localStorage`.
  Buildable in a weekend, deployable free on Netlify / Vercel / GitHub Pages.
- **Track B — Shared table.** Adds accounts, rooms, and real-time sync so the Keeper sees
  player rolls. Roughly 4–5× the work.

**Recommendation:** build Track A so the rules engine is complete and correct, then bolt on
Track B. The engine does not change between them.

---

## Phase 1 — Rules engine ✅ COMPLETE

Standalone TypeScript module, zero runtime dependencies, no DOM. Written and tested before
any UI work. Delivered as `coc-engine/` — 7 source modules, 6 test files, 100 passing tests,
clean under `tsc --strict`.

### Success levels for a d100 roll against skill `S`

| Result | Condition |
|---|---|
| Critical | roll = 01 |
| Extreme | roll ≤ ⌊S/5⌋ |
| Hard | roll ≤ ⌊S/2⌋ |
| Regular | roll ≤ S |
| Failure | roll > S |
| Fumble | roll = 100, or 96–100 when S < 50 |

### Implemented

| Area | Functions |
|---|---|
| Success levels | `classify`, `thresholdsFor`, `meets` |
| d100 with bonus/penalty | `rollD100`, `skillRoll` |
| Pushing | `pushRoll` |
| Luck | `luckCost`, `cheapestLuckSpend`, `spendLuck` |
| Sanity | `parseSanityLoss`, `sanityCheck`, `maxSanity`, insanity durations |
| Opposed | `opposedRoll`, `resolveOpposed` |
| Notation | `rollNotation`, `isValidNotation` |
| Investigator | `derivedStats`, `buildAndDamageBonus`, `rollDamageBonus`, `moveRate`, `majorWoundThreshold`, `improvementCheck` |
| Randomness | `cryptoRng`, `seededRng`, `sequenceRng`, `rollDie` |

### Findings worth carrying forward

**Bonus/penalty dice must compare completed totals, never tens digits.** A tens die showing
`0` beside a units die showing `0` reads as 100 — the worst result, not the best. The naive
"pick the lowest tens digit" *inverts* here: it picks 0 and returns a fumble where the correct
answer is 90. This is the single most common bug in homebrew CoC rollers. Locked in by a named
test.

**One units die, many tens dice.** The units die is shared across all candidates. Rolling a
separate units die per candidate changes the distribution.

**The 96–99 fumble band has an ordering subtlety.** It applies only to rolls that already
failed, so a skill of 96+ can never fumble in that range. Wrong check order makes high-skill
investigators fumble on rolls they should pass.

**Randomness:** `crypto.getRandomValues` with rejection sampling to eliminate modulo bias.
Not `Math.random()` — fine mathematically for a game, but players notice streaks and you want
to be able to say the source is a CSPRNG. Every function takes an injectable `Rng` so tests
are deterministic.

### Rule interpretations chosen (change in `skill.ts` / `sanity.ts` if your table differs)

- `01` crits at any skill value, including 0. `100` always fumbles.
- The 96–99 fumble band applies only below skill 50.
- Indefinite insanity keys off one fifth of *starting* Sanity lost within one session;
  temporary insanity at 5+ from a single check.
- Characteristic rolls expect the already-multiplied value — the engine does not assume ×5,
  since tables differ.
- Bonus/penalty dice stack to a maximum of 3 either way (`MAX_MODIFIER_DICE`).

### Deferred from the engine (additive, no rework needed)

Chases, combat manoeuvres and grapples, firearms malfunction and range bands, spell casting
costs, character generation and occupation skill points.

---

## Phase 2 — Interface ✅ COMPLETE

Delivered as `packages/web` (React + Vite + Tailwind, npm workspace depending on
`packages/engine`). Bottom tab bar switches between the three screens, dark theme by default.

1. **Quick roll** ✅ — large skill-value input, ±dice stepper, difficulty picker, roll button.
   Result shows the number large, the success level as a coloured band, and the thresholds
   (`Hard 30 / Extreme 12`).
2. **Dice tray** ✅ — d3 / d4 / d6 / d8 / d10 / d20 / d100 buttons plus a free-text notation
   field, live-validated via `isValidNotation`. Result shows the total and a per-die breakdown,
   dropped dice struck through for `kh`/`kl` specs.
3. **Roll log** ✅ — persistent (`localStorage`, capped at 200 entries), scrollable,
   timestamped, newest-first. Push and Spend Luck buttons attached to each failed skill entry
   that hasn't already been acted on; each action appends a new linked entry rather than
   mutating the original, per the engine's "nothing mutates" design — so the log holds every
   intermediate state of a roll instead of overwriting it.

Design notes specific to this game: it is played in dim rooms, often one-handed on a phone.
Dark theme by default, thumb-reachable roll button, and a distinct fumble treatment (something
worse than just red). Keep animation under ~600 ms with skip-on-tap, or it becomes unbearable
by session three.

The `SkillRollResult` object already carries everything a result panel needs: the roll, the
level, the thresholds to display, and every candidate die for a "show the dice" view.

### Deferred from Phase 2

Sanity checks, opposed rolls, and investigator/derived-stat screens are not yet wired into the
UI — the engine functions exist (`sanityCheck`, `opposedRoll`, `derivedStats`, etc.) but have no
screen. Natural to pick up alongside Phase 3 once there's a character to check Sanity *for*.

---

## Phase 3 — Characters ✅ MOSTLY COMPLETE

Delivered as `packages/web/src/character.ts` + `CharacterContext`/`CharacterList`/
`CharacterSheet`, a fourth tab. One localStorage-persisted JSON record per investigator
(`Investigator` type — same shape as the plan's original sketch, plus `startingSan` /
`sanLostThisSession` for the indefinite-insanity threshold).

Shipped:
- Characteristics editable; HP/MP/Build/Damage Bonus/MOV recomputed live via `derivedStats()`.
- HP/MP/SAN/Luck trackers with +/- steppers, clamped to their maxima (SAN's max is
  `maxSanity(cthulhuMythosSkill)`).
- **Sanity Check is the one truly auto-tracked resource**: enter a loss expression (e.g.
  `1/1d6`), tap Check, and `sanityCheck()`'s result is applied straight to current SAN and the
  session-loss counter — verified moving SAN 49→48 and the counter 1→2 in one isolated click.
- Skills: tap-to-roll with an inline result badge, add/remove, checkbox for the
  used-this-session flag `improvementCheck()` will read later.
- Weapons: Attack rolls the linked skill; Damage rolls the weapon's dice composed with the
  investigator's damage bonus (`damageNotation()`, reusing `rollNotation`'s own grammar rather
  than a separate calculator).
- 7e default skill list shipped as the template for every new investigator.
- Import/export as a downloadable/uploadable JSON file.
- Every roll from the sheet (skill, attack, damage, the Sanity check itself) logs into the
  shared Roll Log from Phase 2, so Push/Spend Luck work on them too.

**Deliberately not auto-tracked**: HP, MP, and Luck are manual +/- steppers, not wired to
rolls. Unlike SAN (which has one clear owning action — the Sanity Check button on the same
sheet), damage taken, MP spent, and Luck spent all originate from actions elsewhere (an
opponent's attack roll, a spell, a Roll Log Luck spend) that have no "which character does
this apply to" concept yet. Wiring that up needs an active-character/target concept this pass
deliberately didn't build — flag it if you want that next, rather than assuming it's covered.

Not yet done: `improvementCheck()` has no UI (no "run improvement rolls for every checked
skill" button at end of scenario).

`derivedStats()` and `improvementCheck()` from Phase 1 already cover the computed fields and
end-of-scenario development.

---

## Phase 4 — Shared table (Track B only) 🚧 FIRST VERTICAL SLICE, on branch `phase-4-shared-table`

Built and verified locally (three simultaneous browser tabs: Keeper + two players), **not
merged to master**. The server is live at
[coc7-server.fly.dev](https://coc7-server.fly.dev) (Fly.io, `iad`, a mounted volume for the
SQLite ledger) — but the web app doesn't point at it yet in production, since
`VITE_COC7_SERVER_URL` is wired into the GitHub Pages deploy workflow (which only runs on
`master`) and this is still on its own branch. See
[`packages/server/README.md`](packages/server/README.md) for deployment details and the full
list of what's stubbed vs. real.

Delivered as `packages/server` (Fastify + Socket.IO + `node:sqlite` — chosen over
`better-sqlite3` specifically because it needs no native build step, which this dev machine
couldn't satisfy: no Python/build tools for node-gyp) and `packages/protocol` (shared
Socket.IO event/payload types, zero runtime deps, mirrors the engine's own dependency-free
ethos). Client lives at `packages/web/src/table/` as a fifth "Table" tab, standalone from the
other four rather than deeply integrated into Quick Roll / Character Sheet.

- ✅ Rooms with a short, read-aloud-friendly join code (excludes 0/O/1/I); no accounts, name +
  code only, matching the plan.
- ✅ **Server-authoritative rolls**: client sends `{ skill, difficulty, modifierDice }` (or
  notation, or a Sanity spec), the server calls `coc7-engine` directly and that result is the
  one everyone sees — verified nothing round-trips a client-computed number.
- ✅ Secret rolls and Sanity checks (secret by default) broadcast only to the roller and the
  Keeper — verified live with three players: a secret roll appeared for the roller and Keeper,
  never for the third player.
- ✅ Keeper "request a roll" sends a named prompt to one connected player — verified it reaches
  only the targeted player, not the room.
- ✅ Append-only ledger in SQLite, replayed (filtered to what the joining player may see) when
  someone joins mid-session.
- 🐛 **Found and fixed a server-crashing bug during this pass**: every socket handler called
  its ack callback unconditionally, but Socket.IO omits that callback entirely when the client
  doesn't request one — `ack is not a function` is an uncaught exception in an event handler,
  which took the whole Node process down for every room, not just the offending connection.
  Fixed with a `safeAck()` wrapper on every handler plus `uncaughtException`/
  `unhandledRejection` process-level handlers as defense in depth. Reproduced with the actual
  client (Keeper's "request a roll" panel didn't pass an ack) and confirmed the fix holds under
  the same sequence.

**Deferred**, tracked in the server README: rooms don't survive a server restart (in-memory
only; only the ledger persists), no reconnect-with-identity on tab reload, Keeper role isn't
transferable.

Stack used: Node + Fastify, SQLite via `node:sqlite` (no native deps), deployed on Fly.io.

### Deployment

Server deployed 2026-08-28: Fly.io app `coc7-server`, `iad` region, 1GB volume mounted at
`/data`, `auto_stop_machines` on (stops when idle, so it isn't running — or billing — between
sessions; expect a few seconds' cold start on the first connection after a quiet spell). Config
is [`/fly.toml`](fly.toml) at the repo root (build context has to be the repo root so npm
workspaces can see `packages/engine`/`packages/protocol`, not `packages/server` alone).
`COC7_CORS_ORIGIN` is locked to `https://a-yevgeniev.github.io`, the deployed web app's origin
— verified this actually blocks other origins (tried connecting from the local dev server and
got a real CORS rejection, not a silent pass). Verified against the live instance: room
create/join, a public roll broadcasting over an actual WebSocket connection, and that the
ledger persists across a redeploy (a fresh player joining the same running room correctly saw
prior rolls) while the in-memory room registry does not (joining after a full redeploy
correctly fails with "Room not found," matching the documented limitation above — not a bug).

---

## Phase 5 — Polish

Keyboard shortcuts, PWA manifest for offline use, sound toggle, session export to Markdown for
the Keeper's notes, accessibility pass (results announced to screen readers, never conveyed by
colour alone).

---

## Stack

React + TypeScript + Vite + Tailwind. TypeScript earns its keep here — success levels, dice
specs, and roll results are exactly the kind of thing discriminated unions catch bugs in.

---

## Legal note

Chaosium's Miskatonic Repository / community content licences permit publishing CoC-derived
tools, but the trademarks and specific rules text are not yours to reproduce wholesale.
Safest posture: implement the mechanics, do not ship rulebook wording, do not use Chaosium
logos, and check their current community content terms before attaching a name and a domain.

---

## Timeline

| Phase | Estimate | Status |
|---|---|---|
| 1 — Rules engine | ~2 days | Done |
| 2 — Interface | ~3 days | Done |
| 3 — Characters | ~3 days | Mostly done |
| 4 — Shared table | 2–3 weeks | First slice on branch, not deployed |
| 5 — Polish | ~2 days | |
