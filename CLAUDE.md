# Development Plan — Call of Cthulhu 7e Dice Roller

**Status:** Phases 1–2 complete. Phases 3–5 outstanding.

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

## Phase 3 — Characters

Local storage first, one JSON blob per investigator:

```json
{
  "id": "", "name": "", "occupation": "",
  "characteristics": { "STR": 0, "CON": 0, "SIZ": 0, "DEX": 0, "APP": 0, "INT": 0, "POW": 0, "EDU": 0 },
  "derived": { "hp": 0, "maxHp": 0, "mp": 0, "san": 0, "maxSan": 0, "luck": 0, "build": 0, "damageBonus": "", "mov": 0 },
  "skills": [{ "name": "", "base": 0, "value": 0, "checked": false }],
  "weapons": [{ "name": "", "skill": "", "damage": "", "ammo": 0, "malfunction": 0 }],
  "inventory": [], "notes": ""
}
```

Then: tap a skill → roll it. Tap a weapon → roll the attack, then damage with the correct
bonus die. Auto-track HP / MP / SAN / Luck as rolls resolve. Ship the 7e default skill list as
a template, plus import/export JSON so people can back up.

`derivedStats()` and `improvementCheck()` from Phase 1 already cover the computed fields and
end-of-scenario development.

---

## Phase 4 — Shared table (Track B only)

- Rooms with a short join code; no accounts at first, just a name plus room code.
- WebSockets (Socket.IO, or a managed service like Ably / Pusher to skip infrastructure).
- **Server-authoritative rolls** — the client requests, the server rolls and broadcasts.
  Otherwise nothing stops a player editing the result client-side. The engine is
  dependency-free and DOM-free precisely so the same module runs on both ends.
- Keeper features: request a roll from a specific player ("Spot Hidden, penalty die"), roll
  secretly, and see hidden Sanity results the player does not.
- Append-only roll ledger per session so disputes are settleable.

Stack that fits: Node + Fastify, Postgres (or SQLite if self-hosted).

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
| 3 — Characters | ~3 days | Next |
| 4 — Shared table | 2–3 weeks | Track B only |
| 5 — Polish | ~2 days | |
