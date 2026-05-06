# HOLDOUT — execution plan

This file is the **handoff from the design session to the build session.** Everything you need to start coding Sprint 1 is in here. Source-of-truth design docs live at `C:\Projects\ideas\HOLDOUT.md` and `C:\Projects\ideas\SPRINT1_TASKS.md` — read them if you want full design rationale.

---

## Concept (one-screen summary)

**HOLDOUT** is a web-based deep-crafting raid game. You play a handler dispatching one operative on auto-resolved raids in a near-future corporate-military setting (~2090). Watch a texture-rich live comms feed of the raid, respond to interrupt events, manage extract risk via Recall, and grow your hideout from a junk pile into a high-tech base over hundreds of hours of endless progression.

The whole game is presented as a fictional **dispatch terminal** — every system is an "app" or panel. shadcn/vercel aesthetic, lucide icons, monochrome accents. No 3D world, no top-down combat. The art direction is the UI itself.

The name HOLDOUT carries three layers: a concealed weapon, a last defensive position, and *the* Holdout (the hideout itself).

---

## Locked design decisions

These are the constraints that shaped the design. Don't violate them without revisiting the design doc.

- **No real-time skill PvP** as core loop
- **No permadeath wipe** / progress erasure (Rust-style is out)
- **No mobile-game energy timers / construction waits.** The game pauses when the player closes the tab. Zero real-world-clock gating anywhere.
- **No tactical squad turn-based** (no XCOM, no Door Kickers)
- **No quest-shaped objectives** (open-ended raids only — pick a location, go loot, come back; no "fetch X from Y")
- **No Factorio-conveyor-cloning.** Crafting matters but factory automation as core does not.
- **No logic gates / in-game coding** (not a redstoner sim)
- **Not run-based progression** (Balatro-style is out — long single playthroughs preferred)
- **No achievement-completionist hooks**
- **No 3D, no game engine, no pixel-art-required v1**
- **Endless progression.** No retirement, no cap, no soft-reset. Power-fantasy maximalism.

---

## Stack (already scaffolded)

- **Next.js 16** + **TypeScript** + **Tailwind 4** + **shadcn/ui** (initialized with neutral base)
- **Zustand 5** for state (already installed)
- **localStorage** for save state (no backend in v1)
- **pnpm** as the package manager
- **Vercel** for deploy (later)

Project lives at `C:\Projects\holdout`. Already initialized; `git init` done by create-next-app.

### Already created during scaffold
- Standard Next.js `src/app/` layout
- `src/components/ui/button.tsx` (shadcn default)
- `src/lib/utils.ts` (shadcn default)
- `src/lib/types.ts` — initial type definitions for Item, RunState, LogEntry, Operative, Hideout. Review and extend as needed.
- `src/lib/engine/save.ts` — localStorage save/load with schema versioning. SCHEMA_VERSION = 1.

### Read these on session boot
- `AGENTS.md` — the local agent rules (Next.js 16 has breaking changes from training data; read `node_modules/next/dist/docs/` before writing Next-specific code)

---

## Folder structure target

```
src/
  app/                 - Next.js routes (single-page is fine)
    layout.tsx
    page.tsx           - root: dispatch terminal
    globals.css
  components/
    ui/                - shadcn primitives (button etc; auto-managed)
    panels/            - terminal panels (Stash, Ops, Feed, Hideout)
    terminal/          - layout chrome (header, sidebar nav)
  lib/
    types.ts           - already created
    utils.ts           - shadcn default
    data/              - static data (items, events, vocab, locations)
      items.ts
      events.ts
      vocab.ts
      locations.ts
    engine/            - pure game logic, no React
      save.ts          - already created
      raid.ts          - raid simulation (start, tick, recall, extract)
      events.ts        - event drawing + flavor assembly
  store/
    game.ts            - Zustand store, single source of truth for game state
```

`src/components/panels/` and `src/lib/data/`, `src/lib/engine/` (besides save.ts), and `src/store/` are not yet created.

---

## Sprint 1 phases (ordered, each ends with a demo)

Detailed tasks live at `C:\Projects\ideas\SPRINT1_TASKS.md`. Summary:

**Phase 0 — Foundation** (mostly done)
- [x] create-next-app + Tailwind + ESLint + src-dir
- [x] shadcn init (neutral base, css variables, default preset)
- [x] Zustand installed
- [x] `src/lib/types.ts` created
- [x] `src/lib/engine/save.ts` created with schema versioning
- [ ] Create remaining folders (`components/panels`, `components/terminal`, `lib/data`, `lib/engine`, `store`)
- [ ] Create Zustand store skeleton at `src/store/game.ts` (state slices: cash, stash, backpack, hideout, operative, currentRaid, unlocks; reset action)
- [ ] First commit + push to GitHub

**Phase 1 — Skeleton UI** (1-2 days)
- Tactical-terminal layout: header (cash, op status), sidebar nav (Hideout/Stash/Ops/Feed icons), main panel area
- Lucide icons for nav
- Empty state for each panel
- Style pass: monospace, monochrome, grid-paper feel
- Demo: click between panels, terminal feel established

**Phase 2 — Static raid loop** (2-3 days)
- Type defs in `lib/types.ts` (extend as needed)
- `data/items.ts`: 15 items, mixed tiers/sell values
- `data/events.ts`: 6 event types (looted_container, spotted_patrol, found_rare, took_damage, locked_door, heard_voices)
- `data/vocab.ts`: 5 tables (locations, brands, item_adjectives, npc_names, conditions)
- `data/locations.ts`: 1 location ("Decommissioned Warehouse")
- `engine/events.ts`: text assembly from event type + vocab + RNG
- `engine/raid.ts`: startRaid, tick loop (5-15s per event), stop conditions
- Comms Feed panel renders LogEntries live
- Ops Console: location dropdown + Send button
- Demo: hit Send, watch flavor events scroll for ~2 minutes

**Phase 3 — Loot + state** (2 days)
- RunState UI (alertness/stamina/ammo) visible during raid
- Loot events push items to backpack (12 slots, oldest-low-value drops if full)
- Backpack panel visible during raid
- Raid completion: backpack → stash transfer
- Stash panel renders items with name/tier/sell value/tooltip
- Demo: raid runs, items appear in stash

**Phase 4 — Player decisions** (2 days)
- Locked-door interrupt: modal with Pick/Blast/Skip + 8s timer
- Each option has consequences (alertness gain, loot reveal)
- Recall button always visible during raid
- Recall flow: extract sequence (5-10 escape events, alertness modifies risk)
- Death (Model A): lose loadout, return injured (debuff until medkit consumed)
- Demo: real raid with meaningful Recall decisions; death and recovery work

**Phase 5 — Motivation arc** (2 days)
- Cash store + header display
- Sell button on each stash item
- Hideout panel with module cards (Stash/Backpack active; Workbench/Medbay locked)
- Two purchasable upgrades: Backpack +2 slots (~500 cash), Stash +10 slots (~800 cash)
- Workbench Schematic: rare item from `found_rare` event; finding it sets unlocks.workbench=true and lights up the Workbench module icon
- Demo: 30 min play, accumulate cash, hit one upgrade, see locked modules, maybe see schematic drop

**Phase 6 — Polish + save** (1-2 days)
- localStorage save on state change (debounced)
- Load on boot
- Schema version + migrateSave() shim (already scaffolded in save.ts)
- First-run flow: brief intro modal
- Settings: Reset button (with confirmation), tick-rate slider for debug
- Bug pass + 30-min playtest
- **Definition of done:** 30 min play, hit one upgrade, see motivation arc working, no crashes

---

## Implementation principles

- **Pure engine, dirty UI.** Game logic in `lib/engine/` should be pure functions: `nextState = step(state, action)`. UI components subscribe to Zustand slices and dispatch actions.
- **Single source of truth.** All game state in Zustand. No duplicated state in component-level useState.
- **Schema versioning from day 1.** Save format already has it; data files (items, events) should use ID strings not array indices.
- **No real-world-clock gating.** All "delays" are in-game ticks that pause when the game pauses. Use a manual tick loop or `requestAnimationFrame` driven by store state, NOT chained `setTimeout`s.
- **Style discipline.** Monospace + neutral palette + one accent color. Don't theme-hop. shadcn defaults are fine.
- **Data as data, not code.** Items, events, vocab tables live in `lib/data/` as plain TS objects. No magic strings; use ID consts.

---

## v1 motivation arc (must work end-to-end)

Without this the player has no direction. Sprint 1 isn't done until this loop closes:

1. Send operative on a raid
2. Loot returns to stash
3. Sell junk for cash
4. Save up to buy Backpack +2 OR Stash +10
5. See locked modules (Workbench, Medbay) with hover tooltips teasing future features
6. Eventually find a Workbench Schematic (rare drop) → Workbench module icon lights up

If the player closes the game after 30 minutes of play and hasn't bought at least one upgrade, the arc is broken — re-balance drop rates / sell values.

---

## Open implementation decisions (decide as you build)

- **Tick rate** — 5-15 sec per event sounds right; expose a debug slider for playtest
- **Interrupt modal** — blocking modal vs side-panel + auto-default. Recommend blocking modal.
- **Recall placement** — big visible button vs menu. Recommend big visible button.
- **Death distinction** — V1: just "operative back, gear gone, debuffed." Don't differentiate true-death from extracted-empty.
- **Audio** — defer entirely. Sprint 5+ at earliest.

---

## Risk callouts

- **Front-load the event engine** (`engine/raid.ts` + `engine/events.ts`). It's the hard core mechanic that killed prior game projects (foothold, sandbox, industrial-synthesis). If Phase 2 doesn't ship a playable text-event raid, the project is in a stall and needs a re-scope.
- **Phase 5 motivation arc is non-negotiable.** Per the user's repo history, three prior projects (trackers, MemeCache, games-list) stalled at "v0 shipped, empty state, now what." Sprint 1 must end with a visible upgrade goal in the player's face.
- **Vocabulary content is the long tail.** Sprint 1 needs 5 small tables; sprint 5+ needs ongoing flavor passes or events feel repetitive.
- **Save format will change.** Schema versioning is already scaffolded. Use it.

---

## When Sprint 1 is done

- Commit + push
- Brief post-mortem appended to `C:\Projects\ideas\HOLDOUT.md` (what surprised you, what's missing, what to revisit)
- Decide Sprint 2: behavior modes + 2 more locations + skill XP. Revisit if Sprint 1 revealed something.

---

## Reference DNA (for tone/feel)

Tarkov hideout + lossy raids + texture-rich item flavor · Loop Hero (active foreground while auto background runs) · Cult of the Lamb (hub-vs-crusade split) · Wurm (skill grow per use) · RimWorld (downed-not-dead) · Universal Paperclips (game-as-UI-device) · Moonlighter (run-and-sell loop, deferred to optional shop sprint).
