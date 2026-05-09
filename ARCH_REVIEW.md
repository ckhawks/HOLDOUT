# HOLDOUT — Architectural Review

_Reviewed 2026-05-09 against `PLAN.md` / `CLAUDE.md` / `AGENTS.md` rules._

## Critical issues

**1. Engine purity violations — `Date.now()` / `Math.random()` inside `lib/engine/`**
`src/lib/engine/raid.ts` calls `Date.now()` for log timestamps and item UIDs (`${Date.now()}-${Math.random()...}`), and `Math.random()` rather than the seeded RNG. This breaks the "pure, side-effect-free, seedable" rule in CLAUDE.md and the multiplayer-port readiness contract — raids are advertised as deterministic but aren't. **Fix:** thread `now` and `rand` as parameters; let the store stamp wall-clock time, keep the engine seedable.

**2. Tick loop is half engine / half React, with chained `setTimeout` in the store**
`store/game.ts` schedules `endRaid()` via `setTimeout(..., 800)` after `doTick` flips `active = false` — exactly the chained-setTimeout pattern PLAN.md forbids. `useRaidLoop.ts` re-arms a timeout each render based on `raid.actionStartedAt`. The "when does the next tick fire" logic is split across the engine, the store, and a hook with no single owner. Pause/HMR/unmount edge cases are fragile. **Fix:** put `nextTickAt` (or a `raidPhase: 'running' | 'ending'`) on state; let the hook observe, not compute.

**3. `store/game.ts` is a 1156-line god-file**
It mixes raid actions (beginRaid/doTick/recall/endRaid), kit/equipment slot algebra (placeIntoSlot, moveBetweenSlots, equipItem, removeFromKit), persistence subscription, and shop refresh. The "thin shell over engine" rule is being broken — significant game logic lives in store closures rather than engine fns. Split into `store/raidActions.ts`, `store/equipment.ts` (or push the slot algebra fully into `lib/engine/kit.ts`), `store/persist.ts`.

## Issues

**4. `lib/engine/raid.ts` (692 lines)** — `tickAction` is a ~315-line switch with nested branching, mixed with RNG setup, log flavor (`makeLog`, `entranceLog`, `lootVerb`), branch/choice factories, and bleed/recall helpers. Decompose into `branches.ts`, `flavor.ts`, per-action handlers.

**5. `PackTetris.tsx` (669 lines)** — drag state machine, grid math, validation, and rendering all in one component. Grid math overlaps with `engine/shapes.ts` but isn't reused consistently. Extract `usePackDrag` hook, lean on `shapes.ts` for placement validation.

**6. Stale "retired" comments without cleanup** — `raid.ts:21-23` references `pushPending/prunePending` retired in a pivot; lines 101-104 mention retired `tickRaid`/`resolveBranch`. These are FYI artifacts, not load-bearing. Delete or move into a CHANGELOG section in CLAUDE.md.

**7. Heat / alertness rename leaves cognitive debt** — `save.ts` migrates `alertness → heat` (v18→v19). Mechanical meaning of "heat" isn't documented in `types.ts`. Add a one-line comment defining what increments/decrements it.

**8. Difficulty knobs are scattered** — `map.ts` uses hardcoded `THREAT_TILE_RATIO`/`BLOCKED_TILE_RATIO`; `events.ts` uses `ROOM_EVENT_BIAS`; locations can't say "25% harder" with one number. Add a `difficulty` field to `Location` and scale both.

**9. Test coverage gaps** — store actions (the bulk of game logic now), equipment slot helpers (placeIntoSlot/moveBetweenSlots/buildOccupancy), and save round-trip with complex bag/pocket states are untested. UI components are untested (acceptable v1, but the slot algebra isn't UI — it's pure logic that should have tests).

## What's in good shape

- **Save migrations** (`engine/save.ts`, ~23 versions): defensive, schema-gated, well-tested. Model pattern.
- **Action system** (`engine/actions.ts`): declarative `ACTIONS` record with eligibility predicates and chips; `autoPickAction` and `primaryActionOrder` derive from it. Clean extension point.
- **Map** (`engine/map.ts`): BFS distance/path, consistent `y*width+x` indexing, careful `stepForward`/`stepLateral` with deadend handling, coordinate convention documented up top.
- **Data-as-data discipline**: items/events/locations keyed by string IDs, no array-index magic. Serialization is trivial, lines up with PLAN.md.
- **Type safety**: discriminated unions for log entries, no visible `any`, Equipment cleanly separates pockets (always present) from swappable bag.
- **Components don't reach into the engine** — they go through store actions. The boundary that exists is correctly enforced; the issue is that the store has absorbed too much logic that should be on the other side of it.
- **Seeded RNG plumbing exists** (`makeRng`) and is used in map gen / event rolls — the discipline is mostly there, undermined only by the `Date.now()`/`Math.random()` leaks called out in #1.

## Suggested order of attack

1. Fix engine purity (#1) — small, mechanical, restores a load-bearing invariant.
2. Untangle tick scheduling (#2) — removes the only setTimeout chain and makes raids testable end-to-end.
3. Carve store helpers into `engine/kit.ts` + `store/*` files (#3) — biggest readability win, sets up #9.
4. Add tests for the slot algebra once it lives in the engine (#9).
5. Decompose `tickAction` and `PackTetris` opportunistically (#4, #5) — only when you next touch them.

Overall: solid bones (types, data, actions, migrations, map), real structural debt in the store/engine boundary and tick loop. Nothing here is a rewrite — all of it is a few focused refactors.
