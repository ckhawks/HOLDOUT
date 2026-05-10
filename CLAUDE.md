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

## Patterns to follow (and the lint rules behind them)

The React Compiler ESLint plugin enforces a few rules that bite predictable patterns. Use the project conventions below from the start instead of writing the natural pattern and learning the lint complains later.

### Engine purity — no `Date.now()` / `Math.random()` in `lib/engine/`

Engine code in `src/lib/engine/` must stay seedable. Thread time and randomness as parameters:

- Functions that need wall-clock time take `now: number` (usually as the trailing param).
- Functions that need RNG take `rand: () => number` (a seeded rand from `makeRng`).
- The store (`src/store/game.ts`) is the only place allowed to call `Date.now()` and `Math.random()` directly. It passes them through into engine calls.
- Inside the engine, use the `makeUid(now, rand)` and `makeLogger(now, rand)` helpers from `raid.ts` for log entry IDs, item UIDs, and log creation. Don't reinvent the `${Date.now()}-${Math.random().toString(36)}` pattern — it'll trip the seedability invariant and re-introduce the leak.
- Save / shop modules: `saveGame` is a persistence I/O entry point and the wall-clock leak there is contained; new engine code should still avoid the pattern.

### Wall-clock subscriptions — use `useNow()`, not `setState` in an effect

When a component needs to re-render off the wall clock (timer bars, countdowns, fade-outs), use `useNow()` from `src/lib/useNow.ts`. It's a `useSyncExternalStore`-backed hook with one shared 100ms interval across the app.

```ts
const now = useNow();
const elapsed = now - someStartedAt;
```

Avoid: `const [now, setNow] = useState(() => Date.now()); useEffect(() => { const t = setInterval(() => setNow(Date.now()), 100); ... })` — the React Compiler flags any synchronous `setState(Date.now())` inside an effect ("Calling setState synchronously within an effect can trigger cascading renders"), and reading `Date.now()` directly during render trips "Cannot call impure function during render." `useSyncExternalStore` is the sanctioned escape hatch for external mutable state, so `Date.now()` inside its `getSnapshot` is fine.

For pause-aware timers, freeze on the paused timestamp: `const effectiveNow = paused ?? wallNow;`.

### Rendering icons-from-functions — use `renderCategoryIcon()`, not `<Icon />`

`const Icon = categoryIconFor(itemId); return <Icon className="..." />` will sometimes trip "Cannot create components during render" — the lint plugin can't always prove the function returns a stable component reference. Use the `renderCategoryIcon(itemId, className)` helper from `src/lib/itemIcon.ts` instead, which calls `React.createElement` directly. Same render output, lint-clean.

If you hit the same shape with a non-icon component lookup, wrap it with a similar `createElement`-based helper rather than disabling the rule.
