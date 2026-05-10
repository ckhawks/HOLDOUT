@AGENTS.md
@docs/DESIGN.md

This is the HOLDOUT game project. Read `docs/DESIGN.md` first — it contains the concept, locked design decisions, the stack, implementation principles, and pinned UI/feel decisions. Open work and shipped changelog live in `docs/BACKLOG.md`. The wide blue-sky idea pool lives in `docs/BRAINSTORM.md`.

When in doubt, prefer the constraints in `docs/DESIGN.md` over assumptions from training data.

## Tests

- Vitest 3 (pinned — v4 has a rolldown native-binding bug under pnpm on Windows). Config is `vitest.config.mts` (must be `.mts` because the project is CJS).
- Run: `pnpm test` (one-shot) or `pnpm test:watch`. Tests live next to source as `*.test.ts` under `src/`.
- Engine tests (`src/lib/engine/engine.test.ts`) cover the Phase A spine: RNG determinism, `pickEvent` precondition filter, `tickRaid` postcondition flag emission, depth-biased loot tier (statistical), save migration v4→v5.
- When extending the engine — new event preconditions/postconditions, save migrations, RNG-driven logic — add a test before merging. Engine code is pure and seedable; there's no excuse not to.
- As of 2026-05-08: `shapes.ts`, `upgrades.ts`, save round-trip, `pushPending`/`prunePending`, and `rollEvent` template substitution are now tested. Still untested: store actions beyond `pruneExpiredPending` (mostly thin glue) and UI components. The arch review (see `docs/BACKLOG.md` tech debt section) flags slot-algebra tests as the highest-leverage gap.
