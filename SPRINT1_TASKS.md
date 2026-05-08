# Sprint 1 task breakdown — HOLDOUT v1

Concrete checklist for shipping Sprint 1 (the working raid loop with motivation arc). Phases ordered so each one ends with something demonstrable, never just plumbing. Total estimated effort: ~10-15 dev-days, ~2-3 calendar weeks at evening/weekend pace.

## Phase 0 — Foundation (1-2 days)
- [ ] `npx create-next-app@latest holdout --ts --tailwind --app --eslint`
- [ ] Install shadcn/ui: `npx shadcn-ui@latest init` — pick monospace + dark theme defaults
- [ ] Install Zustand: `pnpm add zustand`
- [ ] Folder structure:
    - `src/app/` — Next.js routes (single-page app, one route is fine)
    - `src/components/` — UI components
    - `src/components/panels/` — terminal panels (Stash, Ops, Feed, Hideout)
    - `src/lib/` — game logic (no React)
    - `src/lib/types.ts` — TS types for Item, Event, RunState, etc.
    - `src/lib/data/` — static data (items, events, vocab tables)
    - `src/lib/engine/` — raid simulation, event drawing, save/load
    - `src/store/` — Zustand stores
- [ ] Zustand store skeleton: `useGameStore` with empty slices for `stash`, `cash`, `operative`, `hideout`, `currentRaid`
- [ ] `lib/engine/save.ts`: `saveGame()`, `loadGame()`, `migrateSave()`. Schema version field from day 1. localStorage key: `runsheet:save:v1`.
- [ ] Initialize git, first commit, push to GitHub repo

## Phase 1 — Skeleton UI (1-2 days)
- [ ] Tactical-terminal layout: header (cash, operative status, time), left sidebar nav (icons for Hideout / Stash / Ops / Feed), main panel area
- [ ] Lucide icons for nav
- [ ] Routing between panels (via store state, not Next.js routes — keep it single-page)
- [ ] Empty state for each panel ("STASH — 0 items" / "OPS CONSOLE — no active raid" / etc.)
- [ ] Header shows cash (starts at 0)
- [ ] Footer or sidebar: operative status (name + idle/raiding/injured + skills, all empty for now)
- [ ] Style pass: monospace, monochrome accents (one accent color), grid-paper feel
- [ ] **Demo at end of phase:** click between panels, see the terminal feel, no game logic yet

## Phase 2 — Static raid loop (2-3 days)
- [ ] Type definitions in `lib/types.ts`:
    - `Item { id, name, tier, sellValue, weight, ...}`
    - `EventType { id, weight, requiresState?, produces?, vocabTokens[] }`
    - `RaidLocation { id, name, eventPool[], lootTable[] }`
    - `RunState { alertness, stamina, ammo, depth }`
    - `LogEntry { timestamp, text, kind }`
- [ ] `data/items.ts` — 15 items defined (mix of tiers, varied sell values)
- [ ] `data/events.ts` — 6 event types: looted_container, spotted_patrol, found_rare, took_damage, locked_door, heard_voices
- [ ] `data/vocab.ts` — 5 tables: locations, brands, item_adjectives, npc_names, conditions
- [ ] `data/locations.ts` — 1 location: "Decommissioned Warehouse" with event pool + loot table
- [ ] Event text assembly: function that takes EventType + vocab tables + RNG and returns a flavor string ("Pried open a {brand} {container} in the {location_part} — found {item_adj} {item}")
- [ ] `engine/raid.ts`:
    - `startRaid(locationId)` initializes RunState, schedules first event tick
    - Tick loop: every 5-15s (configurable), draw a random event from pool weighted, apply effects to RunState, push LogEntry to feed
    - Stop conditions: extract complete OR death OR player recall
- [ ] Comms Feed panel renders LogEntries live (auto-scroll to bottom)
- [ ] Ops Console: pick location dropdown (only 1 option v1), Send button → calls `startRaid`
- [ ] **Demo at end of phase:** click Send, watch text events scroll in for ~2 minutes, raid auto-ends. No loot, no state, no decisions yet.

## Phase 3 — Loot + state (2 days)
- [ ] RunState UI: visible bars or numbers in feed panel header for alertness/stamina/ammo
- [ ] Events that drop loot push items into operative's backpack (12-slot list)
- [ ] If backpack full, oldest-low-value item auto-drops with a log line ("Dropped Worn Watch to make room")
- [ ] Backpack panel/section visible during raid (shows current contents)
- [ ] Raid completion: backpack contents transfer to stash, raid state cleared
- [ ] Stash panel renders items from store: name, tier, sell value, hover tooltip
- [ ] **Demo at end of phase:** raid runs to completion, items appear in stash. You can see what your operative looted.

## Phase 4 — Player decisions (2 days)
- [ ] Interrupt event: `locked_door`. When drawn, raid pauses, modal opens with Pick/Blast/Skip + 8-second timer, default to Skip if timeout
- [ ] Each option has consequences: Pick = small alertness gain + reveals a rare item; Blast = larger alertness gain + reveals more loot; Skip = nothing happens
- [ ] Recall button always visible during raid
- [ ] Recall flow: triggers extract sequence — 5-10 escape events fire faster than normal, alertness modifies extract event pool (high alert = more risk events, e.g., "Pursued! Lost {item}")
- [ ] Successful extract: backpack contents transfer normally
- [ ] Failed extract or stamina = 0 or ammo + alert overload: death triggered
- [ ] Death (Model A): operative returns to hideout, loadout/backpack lost, status set to injured (debuff active until medkit consumed)
- [ ] **Demo at end of phase:** you can play a real raid with meaningful Recall decisions. You can die and recover.

## Phase 5 — Motivation arc (2 days)
- [ ] Cash store value, displayed in header
- [ ] Each stash item has a Sell button → adds sellValue to cash, removes from stash
- [ ] Hideout panel UI: module cards, each with name + status (active/locked) + hover tooltip
- [ ] Modules in v1: Stash (active), Backpack (active, shows current capacity), Workbench (locked: "Find Workbench Schematic"), Medbay (locked: "Coming soon")
- [ ] Two purchasable upgrades attached to active modules:
    - Backpack: "+2 slots — 500 cash" button (max 1 purchase v1, can re-add tier later)
    - Stash: "+10 slots — 800 cash" button
- [ ] Workbench Schematic: special item, drops only from `found_rare` event with low probability, shows distinct icon, can't be sold (special handling), finding it sets `unlocks.workbench = true` and visually lights up the Workbench module icon
- [ ] **Demo at end of phase:** play 30 min, accumulate cash, hit one upgrade, see the path forward, maybe see the schematic drop.

## Phase 6 — Polish + save (1-2 days)
- [ ] localStorage save on every meaningful state change (debounced)
- [ ] Load on app boot
- [ ] Save schema version field; write `migrateSave()` shim (no migrations needed yet, but the function exists)
- [ ] First-run flow: brief intro modal explaining "you're a handler, send your operative on raids"
- [ ] Settings: at minimum a Reset button (deletes save with confirmation), maybe a tick-rate slider (debug)
- [ ] Bug pass: full playthrough start-to-30min, fix anything broken
- [ ] Definition-of-done playtest: 30 min play, hit one upgrade, see motivation arc working, no crashes

## Cross-cutting reminders
- **Schema version everything.** Items, save format, event types — give them version fields where reasonable. Future you will thank past you.
- **No real-world-clock gating.** All "delays" are in-game ticks that pause when the tab loses focus or the game pauses. Use `requestAnimationFrame` or a manual tick loop, not `setTimeout` chains for game time.
- **Single source of truth.** All game state in Zustand, not duplicated in component state. Components subscribe to slices.
- **Pure engine, dirty UI.** Game logic in `lib/engine/` should be pure functions (`nextState = step(state, action)`). Easy to test, easy to refactor.
- **Style discipline.** Don't theme-hop. Pick the monospace + accent + spacing system in Phase 1 and stick to it. shadcn defaults are fine.

## Open implementation questions (decide as you build)
- Tick rate: 5-15 sec per event sounds right; allow speed-up debug toggle?
- Interrupt modal: blocking modal vs side-panel choice + auto-default? Probably blocking modal.
- How does Recall feel UI-wise? Big red button always visible vs hidden under a menu? Big red button.
- Death vs incap distinction: do you ever truly die in v1, or is "death" really just "extracted with nothing"? V1 just go with "operative back, gear gone, debuffed" — keep it simple.
- Audio? Defer entirely. Even ambient terminal beeps are sprint 5+.

## When you finish Sprint 1
- Commit + push
- Brief post-mortem in `HOLDOUT.md` (what surprised you, what's missing)
- Decide Sprint 2 next: behavior modes + 2 more locations + skill XP, OR pivot if Sprint 1 revealed something
