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
- [x] All folders created (`components/panels`, `components/terminal`, `lib/data`, `lib/engine`, `store`)
- [x] Zustand store at `src/store/game.ts` with all slices + reset action
- [x] First commit + push to GitHub (https://github.com/ckhawks/HOLDOUT)

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

## Status as of session 1 end (2026-05-06)

Phases 0, 1, 2, 3, 5, 6 are **functionally complete**. Phase 4 (player decisions / locked-door modal / extract sequence / death) is **not started** — that's the next big block.

**What works end-to-end right now:**
- Dispatch terminal shell (header, sidebar, 5 panels: Hideout / Stash / Ops / Feed / Settings).
- Static raid loop with 6 event types, weighted vocab template assembly, 5–15s tick.
- Health + Energy + Alertness + depth tracked per raid; energy drains 3/tick baseline (more on patrol/door/damage events). Damage hits Health, not Energy.
- Loot lands in Pack (right-column in Feed panel); overflow drops the lowest-value item.
- Recall transfers Pack → Stash. Workbench Schematic drop sets `unlocks.workbench`.
- Sell-per-item + "Sell junk" bulk button (commons only). Experimental items sellValue=0 = unsellable.
- Backpack & Stash upgrades with growing cost (`500 + 250·level`, `800 + 400·level`). Endless.
- Debounced localStorage save (400ms) with v1→v2 migration; hydrate on boot; `clearSave()` from Settings panel.

**What's still TODO from earlier phases (small):**
- Show ammo in the stats row (RunState already has the field, just not displayed).
- Run-summary modal after Recall (Phase 3 leftover) — currently silent.
- First-run intro modal (Phase 6 leftover).
- Tick-rate debug slider (Phase 6 leftover).

**Recommended next sessions (user has not committed yet):**
1. Phase 4 stakes (door modal, extract sequence, injury/death).
2. Item flavor pass (per-stash-item adjective so each loot has individual identity).
3. Run-summary modal.
4. Then content breadth from `IDEAS.md` (loot categories + threat levels per location is the user's pinned want).

## Pinned UI/feel decisions (don't undo without asking)

These were tuned with the user — they're not accidents.

- **Mixed typography**: sans for prose (subtitles, descriptions, log message text, item names in lists, module status); mono for terminal chrome (header, panel titles, stat labels, kind tags, timestamps, ¤ values, location IDs).
- **Items in feed log are highlighted via `⟦…⟧` markers** wrapped at template-substitution time. Renderer splits on the marker and applies tier color + `font-semibold`. **Not monospace** — user explicitly rejected mono for items.
- **Item tier colors live in `src/lib/itemDisplay.ts`** (`TIER_COLOR` map). Reuse it; don't redeclare locally.
- **Buttons**: sentence case (not all caps), sans (not mono), lucide icon on the *right* side of the label. Send button uses `ArrowRight`, Recall uses `LogOut`.
- **Log feed**: opacity fade based on row distance from end (-5%/row, floor 0.25). NOT time-based. `transition-opacity` smooths the step.
- **Log feed**: ghost "next event incoming" row at the bottom with pulsing dots + 10s linear progress bar that resets via `key={raid.log.length}`.
- **Background**: dot pattern in `.grid-paper` (radial-gradient, 18px), not line grid. Lighter so text is readable.
- **Pack** is a 240px right-side column inside Feed panel (not a bottom strip). Always rendered while raid is active so layout doesn't shift when the first item lands.
- **Sidebar width** is `w-20` (80px) — needed to fit "Hideout" / "Settings" labels at text-[10px].
- **Health + Energy split** (not stamina). Damage events reduce Health; every tick drains Energy. User asked for this explicitly — don't merge them back.
- **Cursor states**: `cursor-pointer` on Button base + sidebar buttons + select; `disabled:cursor-not-allowed` on disabled Buttons.

## Repo / git

- Remote: `https://github.com/ckhawks/HOLDOUT.git`
- `/.claude/settings.local.json` is gitignored.
- One commit so far ("first commit"). Future commits should follow standard "what + why" form per global CLAUDE.md.

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
