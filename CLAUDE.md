@AGENTS.md
@PLAN.md

This is the HOLDOUT game project. Read `PLAN.md` first — it contains the concept, locked design decisions, the Sprint 1 phase plan, the folder structure target, and implementation principles. The full design rationale lives at `C:\Projects\ideas\HOLDOUT.md` and the detailed task checklist at `C:\Projects\ideas\SPRINT1_TASKS.md`.

When in doubt, prefer the constraints in `PLAN.md` over assumptions from training data.

## Tests

- Vitest 3 (pinned — v4 has a rolldown native-binding bug under pnpm on Windows). Config is `vitest.config.mts` (must be `.mts` because the project is CJS).
- Run: `pnpm test` (one-shot) or `pnpm test:watch`. Tests live next to source as `*.test.ts` under `src/`.
- Engine tests (`src/lib/engine/engine.test.ts`) cover the Phase A spine: RNG determinism, `pickEvent` precondition filter, `tickRaid` postcondition flag emission, depth-biased loot tier (statistical), save migration v4→v5.
- When extending the engine — new event preconditions/postconditions, save migrations, RNG-driven logic — add a test before merging. Engine code is pure and seedable; there's no excuse not to.
- As of 2026-05-08: `shapes.ts`, `upgrades.ts`, save round-trip, `pushPending`/`prunePending`, and `rollEvent` template substitution are now tested. Still untested: store actions beyond `pruneExpiredPending` (mostly thin glue) and UI components.

## Multiplayer (deferred, but plausible)

Multiplayer is not on the roadmap, but it's a likely future direction. Until/unless the call changes, **keep the engine port-ready** so we don't have to rewrite gear/kit/combat systems if it lands later:

- All game logic stays in `lib/engine/` as pure, side-effect-free, seedable functions. No DOM, no `window`, no `Date.now()` baked into RNG or game math.
- Time inputs come in as parameters (e.g. `prunePending(raid, now)`), never read from `Date.now()` inside the engine. The store is the only place allowed to call `Date.now()`.
- Zustand store stays a thin shell over engine helpers — store actions compute `next = engineFn(prev, ...)` and `set({ next })`. No game logic in components or in store closures.
- Save format stays schema-versioned (already done).

If we never go multiplayer, this discipline costs nothing. If we do, the engine ports to a Node server essentially as-is and the porting work is auth + per-user DB + WS/SSE tick streaming + the offline-tick design call (which collides with PLAN.md's "no real-world-clock gating" lock and is a design decision, not just engineering).
