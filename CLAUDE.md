@AGENTS.md
@PLAN.md

This is the HOLDOUT game project. Read `PLAN.md` first — it contains the concept, locked design decisions, the Sprint 1 phase plan, the folder structure target, and implementation principles. The full design rationale lives at `C:\Projects\ideas\HOLDOUT.md` and the detailed task checklist at `C:\Projects\ideas\SPRINT1_TASKS.md`.

When in doubt, prefer the constraints in `PLAN.md` over assumptions from training data.

## Tests

- Vitest 3 (pinned — v4 has a rolldown native-binding bug under pnpm on Windows). Config is `vitest.config.mts` (must be `.mts` because the project is CJS).
- Run: `pnpm test` (one-shot) or `pnpm test:watch`. Tests live next to source as `*.test.ts` under `src/`.
- Engine tests (`src/lib/engine/engine.test.ts`) cover the Phase A spine: RNG determinism, `pickEvent` precondition filter, `tickRaid` postcondition flag emission, depth-biased loot tier (statistical), save migration v4→v5.
- When extending the engine — new event preconditions/postconditions, save migrations, RNG-driven logic — add a test before merging. Engine code is pure and seedable; there's no excuse not to.
- Untested as of 2026-05-08: `shapes.ts` (tetris geometry — highest bug surface), `upgrades.ts` (capacity/cost formulas), save round-trip, `pushPending`/`pruneExpiredPending`, `rollEvent` template substitution.
