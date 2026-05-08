# POST_SAD task breakdown — HOLDOUT next sprint

The "raid has weight" sprint. Sprint 1 shipped the loop; this one makes individual raids feel different from each other and gives the player real things to do mid-raid besides watching and Recalling.

Source brainstorm: 2026-05-08 design chat. Builds on `HOLDOUT.md:53` (causal event chains) and `HOLDOUT.md:185` (deferred map view stays deferred).

## Design intent

Two problems this sprint solves:

1. **During-raid is thin.** Player watches the feed and decides Recall timing. That's it. Need active hands-on tasks and meaningful in-event decisions.
2. **Past first hideout upgrades there's no goal.** Cash → pack/stash size caps fast. Need gear and location variety as the long-term "what am I working toward."

Spine of the sprint: depth/distance counters + causal event engine. Everything else (branching events, tetris, reload, bandage, gear, locations) hangs off that spine.

Locked design calls from chat:

- Loot quality curve has rising mean with depth, but a small chance of high-tier lucky finds at every depth — early Recall is never _strictly_ dominated.
- Location sets the floor and ceiling of the loot curve and biases the event pool / vocab.
- Branching events replace the standalone "avoid/engage" idea. Decisions live inside events, not on a separate UI surface.
- Gear customization defines the slots that tetris/reload/bandage operate on. Build gear _before_ those mechanics.
- Behavior modes (Stealth/Aggressive/etc.) are deferred — they overlap with branching events; revisit after the engine lands.

---

# HUMAN WRITE THIS:

- DONE: try to add sound effects from the sfx folder, add a temporary dropdown on the page to select which one is used to make it easy to test them all. they're all just UI click/tick sounds, can be used for the interactions and events happening and stuff
- DONE: event tick progress bar needs to be 100% = maximum amount of time before next event

- concept of multiple bags/inventories to put items into
- want to have starting pockets but you can find a bag to upgrade to in raid or something
- want to have kit where you can choose what from your stash to bring in (loadout/kit module)
- if you die you lose your kit
- want to have backpack packing like tarkov... but i guess that is difficult because what do you do when they drop a bag with items in it
- maybe needs a small shop to buy some items (backpack, decent lower/mid tier weapon, ammo)
- needs to have concept of bringing in food to consume to keep energy up in raid
- stash needs to change to be based on # of cells (tetris cells), so bigger items = bigger stash space, but dont need to manage the grid
- maybe show inventory value?
- item value should fluctuate maybe
- stash should show how long you've had an item for maybe
- hacking minigame? keypads?

- hideout: foundry - melt metals down and forge stuff out of them. have to construct the foundry first

---

# AI WRITE THIS:

## Status as of 2026-05-08 (end of session)

We deviated from the planned A → F build order this session. Phases E (loot tetris), C (locations + content), and F (tick tuning + item variety) shipped first because tetris was the user's clearest design pull and the scaffolding for it didn't actually require Phase A's causal engine — pending tray + drag/drop are a parallel system, not a downstream consumer of preconditions/postconditions.

**Shipped this session:**

- ✅ Event tick down to 3–8s (Phase F bullet 1).
- ✅ Loot tetris in full: `PackPlacement`/`PendingItem` types, `lib/engine/shapes.ts` with rotation + occupancy + first-fit, snap-to-grid drag/drop, R / right-click rotation (clockwise), pending FIFO with 15s expiry timer + countdown bar, drop-on-pending unplacement, trash zone, hitbox respecting non-rectangular shapes, custom hover tooltip following the cursor with viewport edge clamp, hover highlight, layout split into Incoming column + Pack grid (room for future bags).
- ✅ 32 items across 8 categories: mechanical, electronics, chems, consumables, valuables, intel, military, experimental. Each with a shape, tier, sell value.
- ✅ 5 locations with sparse integer category weights and difficulty pills (LOW / MID / HIGH; HIGH carries a Skull icon): Warehouse, Subway, Drone Graveyard, Datacenter, Biolab. Card grid replaces the dropdown.
- ✅ Location unlocks — both flavors: consumable (Datacenter Keycard, drops in Drone Graveyard, consumed on entry) and permanent (Biolab Coordinates, drops in Subway, sets `unlocks.biolab`). UI surfaces lock state in the card with a bolded item name in the requirement callout. Send button shows `Lock` icon when locked.
- ✅ Save migration v3→v4 (`unlocks.biolab` default).
- ✅ Loot flavor rewrite — operative-POV reports, no auto-pocket/bag language.
- ✅ SFX — 7 pooled WAVs in `/public/sfx/`, kind-mapped (`tick`→click_minimal, `inventory`→hover_g, `error`→decline, `click`→picker), with a header dropdown picker that defaults to "press". Wired to event ticks (with damage event override), pack drag drops, all native button clicks via global delegation.
- ✅ Tick progress bar keyed off `runState.depth` (not `log.length`) and animation duration matches `TICK_MAX_MS` (8s) — bar now reads as "100% = max delay before next event".

**Not shipped (still ahead):** Phase A spine (depth/distance counters, causal event chains, flag system), Phase B branching events, Phase D gear/kit, Phase E reload + bandage. Order recommendation revised below.

## Phase A — Spine (engine only, no UI yet)

The hardest, most load-bearing work. Ship this with tests before touching UI.

- [ ] `RunState` extended with `distanceFromExtract: number` (events to escape). `depth` already exists. They diverge if the operative sweeps a floor instead of pushing deeper.
- [ ] Recall cost = current `distanceFromExtract`, not depth. Extract sequence length scales sub-linearly with depth (e.g. `Math.ceil(Math.log2(depth + 1) * 3)`), so deep raids are risky but not unrecoverable.
- [ ] Event definitions extended with `preconditions`, `effects`, `postconditions`:
  ```ts
  type EventDef = {
    id: string;
    weight: number;
    preconditions: (state: RunState) => boolean; // depth >= 5, alertness > 60, hasFlag('alarm_triggered')
    effects: (state: RunState) => RunState; // mutate alertness/depth/flags
    postconditions: string[]; // tags set on RunState.flags
  };
  ```
- [ ] `RunState.flags: Set<string>` — small set of tags from postconditions (`alarm_triggered`, `door_breached`, `bleeding`, `pursued`, etc.) that future events read in their preconditions.
- [ ] `nextEvent = weightedDraw(pool.filter(e => e.preconditions(state)))` replaces the current flat weighted roll in `pickEvent`.
- [ ] Alertness compounds with depth: same event spec spawns more pips / harsher branches at deeper depth. Implementation: events read `state.depth` in their `effects`.
- [ ] Loot quality curve: rising mean tier with depth, ceiling tier gated by depth, BUT every depth keeps a small (~2-3%) chance of a tier-N+2 lucky find. (Currently `rollTier` in `items.ts` is depth-blind — needs to take `state.depth` and bias upward.)
- [ ] Tests for the event engine: precondition filtering, postcondition propagation, deterministic seedable RNG, depth/distance counter math.
- [ ] **Demo at end of phase:** dev console / debug panel shows event chain with state transitions; no UI changes for player.

## Phase B — Branching events (in-raid decisions)

This is what makes the spine _feel_ like something during play. Decisions live inside events.

- [ ] Generalize the existing `locked_door` interrupt modal into a reusable branching-event renderer: event def can declare 2–3 player choices, each with its own effects + postconditions.
- [ ] Convert `spotted_patrol` from an info event into a branching event: **Hide** (alertness↓, advance slow) / **Engage** (loot reveal, ammo cost, alertness↑↑, sets `combat_engaged`) / **Reposition** (no loot, alertness flat, distanceFromExtract +1).
- [ ] Convert `heard_voices` into a branching event: **Listen** (sets intel flag, biases next 3 events toward loot reveal) / **Move on** (nothing) / **Investigate** (chance of `spotted_patrol` next).
- [ ] Add `bleeding` flag triggered by `took_damage`. While set, HP drains per tick. Cleared by consuming bandage from pack.
- [ ] Add `combat_engaged` and `pursued` flags wired into the patrol/extract pools.
- [ ] Branch UI: same modal shape as locked_door, with the 8s default-to-safe timer.
- [ ] **Demo at end of phase:** real raid where Hide vs Engage at a patrol changes the next 5 events visibly. State flags shown in a debug strip.

## Phase C — Locations + content variety ✅ shipped

- [x] Location data shape extended: `id, name, description, tier, difficulty, categoryWeights?, eventWeights?, unlock?`.
- [x] 4 new locations beyond the renamed Warehouse:
  - **Subway** (mid) — chems + consumables + intel. Rare drop chance for **Biolab Coordinates**.
  - **Drone Graveyard** (mid) — mechanical + electronics + military. Rare drop chance for **Datacenter Keycard**.
  - **Datacenter** (high, locked behind keycard) — electronics + intel.
  - **Biolab** (high, permanent unlock) — chems + experimental.
- [x] Ops Console: card grid (2/3/4/5 columns responsive) with difficulty pills (LOW/MID/HIGH, HIGH gets Skull icon), inline lock callout with bolded item name, Send button swaps `ArrowRight` → `Lock` when target is locked.
- [ ] Each location ships with ~10 location-flavored vocab strings (containers, NPCs, room types). _Vocab is still shared across locations; not yet location-biased._
- [ ] Underequipped soft warning (depends on Phase D gear).

## Phase D — Gear / kit customization (between-raid progression)

Defines the stats the next phase's mechanics operate on. Don't build tetris before gear exists.

- [ ] Gear slot model on operative: `{ weapon, armor, pack, medPouch }`. Each is an item with stats.
- [ ] Weapon stats: `magSize`, `noise`, `damageClass`, `reloadComplexity`. Used by combat-branch outcomes and reload mechanic.
- [ ] Armor stats: `hpBonus`, `weight` (weight reduces tetris pack effective grid? or just speed? — decide during build).
- [ ] Pack stats: `gridWidth`, `gridHeight` (replaces flat slot count). Bigger pack = more tetris room.
- [ ] MedPouch stats: `bandageSlots`, `stimSlots` — fast-access consumables that don't take pack grid space.
- [ ] Hideout panel: **Loadout** module. Drag gear from stash into operative's slots. Pre-raid only.
- [ ] Starting gear is intentionally bad (small mag, small pack, no med pouch) so early upgrades feel impactful.
- [ ] At least 3 tiers of each gear type as lootable / craftable items.
- [ ] **Demo at end of phase:** swap pack and weapon between raids, see in-raid effects (different grid size, different mag size).

## Phase E — Active in-raid mechanics

Hands-on tasks for the player while events tick. Reload + bandage use gear stats from Phase D.

- [x] **Loot tetris.** Shipped. Pack grid (gear-grid-derived once Phase D lands), pending tray with FIFO + 15s expiry timer, snap drag-drop, R / right-click rotation, drop-on-pending to unplace, trash zone, hitbox respects shape, cursor-following tooltip with edge clamping, sound on place/move/unplace/trash. Layout: Incoming column + Pack grid (room for additional bags later).
- [ ] **Reload management.** Magazines as discrete pack items. UI shows current loaded mag + reserve mags. During lulls (no event firing), player can drag rounds from a "loose ammo" pile into mags. Combat-branch outcomes consume rounds from the loaded mag; empty mag during combat = forced auto-reload that costs an event tick (or worse outcome). Weapon `reloadComplexity` stat affects how many rounds per drag-tick.
- [ ] **Bandage / injury.** `bleeding` flag (set by Phase B `took_damage`) drains HP per tick. Player consumes bandage from medPouch (one click) to clear it. Untreated bleeds compound — second bleed before clearing the first doubles drain rate. Bandages can be looted or pre-stocked.
- [ ] All three mechanics run _in parallel_ with the event feed. The point is split attention: event modal pops while you're mid-tetris-drag. That tension is the design.
- [ ] **Demo at end of phase:** real raid where the player is genuinely busy — fitting loot, reloading between events, bandaging when hit, AND making branch decisions when modals fire.

## Phase F — Tuning + content pass

- [x] Event tick pulled to 3–8s.
- [x] Item variety pass: 32 items across 8 categories, location-biased via integer category weights. _Target was ≥40 — could push another 8 if balance pass reveals gaps._
- [ ] Vocabulary expansion: more named brands, NPCs, room types **per location** (locations currently share one vocab pool).
- [ ] Balance pass: time-to-first-gear-upgrade target ~45 min of play; time-to-Workbench-Schematic target ~3-5 raids in Biolab.
- [ ] Bug pass + 60-min playtest with all 5 locations.
- [ ] **Definition of done:** 60 min play, hit at least one gear upgrade and one location switch, branching events visibly affect the run, tetris/reload/bandage all engaged at least once. No crashes.

---

## Revised build order

We've already done E (tetris part), C, and most of F. Remaining order:

**A** (spine) → **B** (branching events) → **D** (gear) → **E rest** (reload + bandage) → **F rest** (vocab per location, balance pass, playtest).

Phase A is now the long pole. Don't try to retrofit branching events onto the flat-roll system; precond/postcond is a clean cut over it. Then B unlocks the bleed-bandage loop and combat round consumption, which is what reload + bandage need to mean anything. Gear before reload/bandage stays correct — they need slot stats.

## Pinned UI/feel decisions added this session

- Sparse integer category weights, not normalized percentages. Locations list only what they care about.
- HIGH difficulty badge has a Skull icon. LOW = emerald, MID = amber, HIGH = red.
- Location card title is sans-serif semibold; difficulty pill stays mono terminal-style.
- Lock callout in cards is sans-serif; the required item name (e.g. **Datacenter Keycard**) is bolded.
- Pack grid: incoming column on left (`w-40`, `min-h-96`, `flex-1` to fill), discard zone pinned under it, pack grid on right with hint line below. Aside auto-sized so future second-bag slots in beside the existing grid.
- Tooltip follows cursor with +14px down-right offset, edge-clamped via `useLayoutEffect` measurement, hovered tile gets a `ring-2 ring-foreground/60` highlight.
- Pending tile cells render at `CELL - 2` (≈ 30px) so they read as the same scale as the pack grid. Centered horizontally in the column. Countdown bar (h-1) under each tile turns red in the last 5s.
- Loot flavor is operative-POV plain-found language: "Found a {item}", "Pried a crate. {item} inside" — no relay/handoff/decision/pocket language.

## Explicitly deferred (NOT this sprint)

- Behavior modes (Stealth / Aggressive / Greedy / Quick / Hold) — overlaps too much with branching events. Revisit after Phase B reveals what the decision space actually feels like.
- Top-down map view — `HOLDOUT.md:185` keeps it at sprint 6+.
- Skill XP per use — separate sprint.
- Crafting at the Workbench — sprint after this one. Schematic drop unlocks the icon, real crafting comes later.
- Pre-mission intel-buy mechanic — depends on a currency model not yet decided.
- Standing orders — same family as behavior modes; defer with them.
- Sound mapping pass beyond the 4 kinds (`tick`, `inventory`, `error`, `click`) — sprint when more event types exist.

## Risk callouts

- **Phase A is hard and unsexy.** Engine + tests with no visible UI change. The temptation to skip to Phase B is bigger now that tetris and locations are visible eye-candy. Resist; precond/postcond will be miserable to retrofit later.
- **Tetris scope creep avoided** — irregular polyominoes shipped on first cut, including J/T/S/L tetrominoes. If balance reveals weird interactions (rotated J doesn't fit anywhere on a 4-wide grid, etc.) reduce shape variety, not grid size.
- **Gear has a balance trap.** If starting gear is too good, upgrades feel pointless. If too bad, raids feel unfair. Lean toward "too bad" — starvation makes the first upgrade meaningful.
- **Branching event content is a long tail.** Phase B converts 2-3 existing events; Phase F should add more. Without ongoing content, branches feel repetitive within a few raids.
- **Vocab is shared across locations.** Subway and Datacenter currently share `{location}` / `{brand}` / `{npc}` pools. This will start to feel wrong fast — the vocab-per-location task in Phase F is more urgent than its position in the doc suggests.
