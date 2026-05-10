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

## Architecture map

Boundaries between layers are deliberate. Don't bypass them — they're what keeps the engine seedable and the save format migratable.

```
src/lib/data/         Static data: items, events, locations, vocab.
                      Pure values, keyed by string ID. No imports from engine
                      or store. Adding an item = a new entry here.

src/lib/engine/       Pure game logic. No DOM, no React, no store, no Date.now,
                      no Math.random. All time/randomness comes in as params.
                      Functions return new state — never mutate. The store is
                      the only allowed caller of these from runtime; tests
                      call them directly with seeded RNG and fixed `now`.

src/store/game.ts     Zustand store entry point. Composes slices, owns base
                      state (cash, stash, operative, hideout, etc.), and the
                      persistence subscription. Wraps engine fns, supplies
                      Date.now()/Math.random(). Components call store actions
                      via useGame((s) => s.action); they don't touch the
                      engine directly.

src/store/slices/     Zustand slice files: raid.ts (raid lifecycle + currentRaid /
                      raidOutcome state), kit.ts (kit/equipment slot routing),
                      economy.ts (sell/buy/stash upgrade). New actions go in
                      the slice that matches their concern; cross-slice access
                      via the typed `get()` returns the full GameState.

src/components/       UI. Subscribes to store slices via useGame((s) => ...).
                      No game logic — anything that smells like "compute next
                      state" belongs in the engine. Use store actions to
                      mutate state.

src/lib/utils.ts      Misc helpers (cn, etc).
src/lib/itemDisplay.ts  Tier color + ⟦item⟧ marker parsing for log rendering.
src/lib/itemIcon.ts     Category → lucide icon mapping + renderCategoryIcon helper.
src/lib/sfx.ts          SFX pool (audio playback).
src/lib/useNow.ts       useSyncExternalStore-backed wall-clock hook.
src/lib/useDragDrop.ts  Generic pointer-drag hook used by stash + kit grids.
```

### Engine module map

```
engine/raid.ts        startRaid, tickAction, applyBandage, entranceLog,
                      makeLog/makeLogger/makeUid. The big one — owns the
                      action-driven tick. Takes (raid, rand, now).

engine/actions.ts     ACTIONS record (declarative): eligibility predicate +
                      chips per ActionId. autoPickAction, primaryActionOrder,
                      contextActions all derive from it. Adding an action =
                      a new ACTIONS entry + a switch case in tickAction.

engine/map.ts         Map gen, BFS pathfinding, fog of war, tile mutators.
                      Documents the coordinate convention up top.

engine/equipment.ts   Pure slot algebra (placeIntoSlot, moveBetweenSlots,
                      equipItem, unequipItem, findFit). Store actions thin-wrap.

engine/shapes.ts      Item-shape geometry: occupancy grids, rotation, canPlace.
engine/events.ts      Event template substitution (vocab tables → flavored text).
engine/save.ts        Persistence + schema migrations. SCHEMA_VERSION lives here.
engine/shop.ts        Shop offer generation + refresh.
engine/upgrades.ts    Cost curves for stash / pockets levels.
engine/debug.ts       Debug-only helpers exposed via window.__h.
```

### Raid timer ownership

After tech debt #2: `useRaidLoop` (in `src/components/terminal/useRaidLoop.ts`) is the **only** owner of raid timers. It observes two pieces of raid state:

- `actionStartedAt` — fires `doTick()` after `ACTION_TIMER_MS` elapses
- `pendingEnd: { at, success } | null` — fires `endRaid(success)` at `at`

If you find yourself adding `setTimeout` to the store, stop and put a state field on `CurrentRaid` instead.

### Equipment / kit data flow

Equipment lives in two places depending on raid state:

- **In raid:** `currentRaid.equipment` (Pockets + Bag + EquipSlot reservations). Items picked up land here.
- **Idle (between raids):** `operative.equipment` — same shape, persists across raids.

The store's kit actions (pickupFromFloor, kitFromStash, equipFromStash, etc.) auto-route to the right one based on whether `currentRaid` exists. Components don't pick a target; they just call the action.

The pure slot algebra is in `engine/equipment.ts`. Adding a new equip-time validation or routing rule should land there, not in the store.

## Doc maintenance

Keep these docs current as you work — they're how the next session reorients fast.

- **`docs/BACKLOG.md`** is the working backlog. When you ship something:
  - Move the item from its open section (Human ideas / AI Sprint follow-ups / Tech debt) to the Changelog at the bottom.
  - Add a one-line "what + where" note (file path or pointer to the commit).
  - If the item came from the older IDEAS.md or POST_SAD wishlist, preserve attribution by putting it under the right Changelog subsection ("From the player wishlist", "From the older IDEAS.md", "Sprint phases", etc.).
- **`docs/DESIGN.md`** captures load-bearing decisions. Update when:
  - A locked design constraint changes or gets revisited.
  - A new pinned UI/feel decision lands (matches an existing pin's level of permanence).
  - Don't dump implementation notes here — those go in CLAUDE.md or as code comments. DESIGN.md is for "why this game is shaped the way it is."
- **`CLAUDE.md`** (this file) is for patterns, traps, and architecture that affect *how to write code* in this repo. Update when:
  - You discover a lint rule trap and fix it with a project pattern (like `useNow()` or `renderCategoryIcon`).
  - The architecture map drifts from reality (a new top-level module appears, a boundary moves).
  - A "how to test X" or "how to add a new Y" recipe becomes worth writing down.
- **`docs/BRAINSTORM.md`** is a frozen 2026-05-06 snapshot. Don't update it — pull *from* it when looking for future-direction ideas.
- **`docs/archive/`** is for snapshots that have aged out of currency. New archive entries get a `YYYY-MM-DD-` prefix and a top-of-file note explaining what was true when the snapshot was taken.
- **`README.md`** stays a short project intro + repo-layout map. Don't grow it into design or backlog territory — those have their own docs.

When a doc gets noticeably stale (a section claims work isn't done that has shipped, or references a deleted file), fix it in the same commit as the change that made it stale. Don't let stale docs accumulate — the project's prior incarnation had a "PLAN.md says Phase 4 not started" problem that lasted multiple sessions and made it hard to know what was actually true.
