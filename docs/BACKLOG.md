# HOLDOUT — Backlog

The single source of truth for **what's open** and **what's shipped**. Restructured 2026-05-09 to merge POST_SAD_TASKS, IDEAS, and ARCH_REVIEW into one doc, with completed work archived as a changelog at the bottom.

Layout:

- **Current state** — what the game is right now
- **Human ideas** — open work originating from the player/designer
- **AI ideas / proposals** — open work originating from AI suggestions
- **Risks** — current concerns that should shape prioritization
- **Explicitly deferred** — known "not now" decisions
- **Changelog** — shipped, organized by source (player wishlist vs sprint phase)

Companion docs: `DESIGN.md` (canonical design + locked constraints + UI pins), `BRAINSTORM.md` (blue-sky idea pool), `archive/RISKS.md` (older risk snapshot).

---

## Current state of the game

The raid is action-driven: each tick the operative resolves a **queued action** the player can override before a 6-second timer. Some interactions stay real-time / anytime (bandage, pack management, pause). Patrols and locked containers fire **forced-choice modals** that pause the queue while the player decides.

**Vocabulary** (so map talk and code talk match):

- forward = right = `x + 1`
- backward = left = `x − 1` (toward entry / extract)
- up / down = lane shift (`y − 1` / `y + 1`)
- "rooms away" = manhattan path-length from operative to entry on the map

**Active actions (v2):**

Primary, always shown in the action menu (one set at a time):

- `move_forward` — push deeper. Auto-picker default while raiding.
- `loot` — search the current room. Pops one container off the queue, ~70% chance of an item drop into the room.
- `stay` — hold position. -8 heat, -2 energy. Cools off the world.
- `extract_step` — auto-locked while extracting. BFS step toward entry.
- `fight` — auto-locked while `combat_engaged`. Resolves a round of combat (~55% target_down + loot, ~30% firefight, ~15% target_fled).
- `flee` — break-contact attempt while combat_engaged. 60% success, 40% takes a parting shot.

Context, only shown when eligible (under a divider in the action card):

- `breach_locked` — when the current tile has a locked container. Direct action: -2 ammo, +14 heat, blasts one locked container, rolls 30% empty / 50% common / 20% rare.

**Forced-choice modals** still fire for these (BranchModal):

- **Patrol encounter** — Engage / Hide / Reposition. Triggered by either a pre-gen `threat: true` tile in the operative's path, or a **heat-driven ambush** (chance per move tick = `heat / 400`).

**Stat row** (always visible during a raid): Health (Heart), Energy (Zap), Heat (Flame), Ammo (Crosshair), Distance (Footprints). Icons match the chip vocabulary. Each value flashes green/red on change with a floating `+N` / `-N` indicator (heat is direction-inverted).

**Heat is real now** — drives ambush patrols. Higher heat = more enemies showing up unannounced. Stay is the cool-down lever (−8/tick).

---

# Human ideas

Open wishlist from the player. DONE items have been moved to the Changelog at the bottom.

- food consumed during raid to keep energy up
- need item that can restore HP (over time?) — see also AI medical-ladder proposal below
- need to be able to eat things (thinking a drag drop zone like the discard, instant/doesn't take a turn)
- remove randomly got shot when entered room, replace with just pure environmental things (later todo: make it so like an agility skill could reduce % of this happening)
- debug button to reset shop stock
- increase the rate of rare items in locked crates
- later: make blasting to get rare loot take some sort of explosives item. maybe we shouldnt say guarantee rare loot
- stash sized by # of cells (tetris cells), bigger items = more space, no grid management
- ability to pin/lock items in stash
- sometimes make the extract point not the starting point (midway in level somewhere)
- small shop: buy backpack, decent low/mid weapon, ammo
- make it so bags can have split inventory sections, like tarkov rigs/bags (i.e. a 2x3 area and a 3x3 area)
- backpack packing like Tarkov for dropped bags (hard)
- item value should fluctuate
- stash should show how long you've had an item for
- hideout: foundry — melt metals down, forge items. Construct foundry first.
- realistic ammo: magazines, swap mags, reload from pack ammo
- opponent quality preview ("the big scary guy" vs "the little shrimp" vs "cant tell")
- add locked doors (edges on map); action in action list to try to keypad/lockpick etc
- add more items in inventory = more heat gain per turn (very slight, just to counter end-game-y stuff) (because you're louder moving around); maybe this could be based on weight (items get weight separate from cells size?)
- repair bench, uses wurm-style rotating repair materials/items to increase condition
- hacking minigame? keypads?
- multiple operatives...

### From the older IDEAS.md (carried over)

- **Random threat / danger levels per location** — within a range, so locations roll a danger value each session (or per-raid). Player strategizes which to hit when. Pairs with health/energy loop and operative state (injured? avoid hot zones).

---

# AI ideas / proposals

## Sprint follow-ups (next sprint, from Sprint J)

- **Bags in loot pool / shop** — shipped partially: bags now appear in the loot pool. Shop module selling `canvas_satchel`/`tactical_pack` + bandages + food still TODO.
- **Loadout presets** — save 2-3 named kit configurations (e.g. "scrounge run", "combat run") so it's not re-clicking every raid.
- **Run-summary on extract** — silent extracts feel weird now that the player has to manually unload. A small banner ("extracted N items · ¤K kit value") confirms the haul.

## Next sprints

### Sprint I — Operator preferences

Make "scrounge / push / lay low" real instead of theatre.

- [ ] Operator panel with three preference sliders (or pick-one). Lives in Hideout + a quick-toggle in Feed.
- [ ] `autoPickAction` reads preferences:
  - **Scrounge**: heavily favors `loot` when current tile has loot.
  - **Push**: skips loot more often, gets to deep tiles faster.
  - **Lay low**: more frequent `stay` (cools heat), cautious about `move_forward` when heat is high.
- [ ] Save preference per-operative (hooks into Sprint J kit/loadout).

### Sprint L — Reload + ammo realism

- [ ] Magazines as discrete pack items (size 1–2 cells).
- [ ] During lulls (no event firing), drag rounds from a "loose ammo" pile into mags.
- [ ] Combat outcomes consume rounds from loaded mag; empty mag during combat = forced auto-reload that costs an action tick.
- [ ] Weapon `reloadComplexity` controls rounds-per-drag-tick.

### Sprint M — Lockpicks + key items

- [ ] Lockpicks as a consumable pack item — slow/quiet alternative to Blast. Each pick has a chance to break.
- [ ] Key/keycard/ID-badge items: matching `keyType` on a `LockedContainer` lets you open it cleanly (no ammo cost, no heat).
- [ ] Key items spawn in regular containers; ID badges drop from defeated patrols.

## Smaller follow-ups (any order)

- [ ] **After-raid report — pass 2: map replay.** Pass 1 (2026-05-10) shipped the report modal with loot diff / vitals / combat / choices / consumables. Pass 2 adds the map-replay section: render the same 12×5 strip with visited tiles dimmed and the operative's path drawn in order. Needs new state on `CurrentRaid` (`pathVisited: Array<{x,y,tick}>` updated each move in `doTick`) since fog only tells us *which* tiles, not *when*. Optional polish: scrubber, or static end-state with arrows.
- [ ] First-run intro modal.
- [ ] Tick-rate / action-timer debug slider in Settings.
- [ ] Gate the Data panel behind an admin/debug flag (currently visible to everyone — fine for now, but eventually it leaks the loot tables and threat math to players).
- [ ] More item variety pass — target ≥40 items, currently 32.
- [ ] More room-type narrative variety: room-type-specific event templates (instead of just bias multipliers).
- [ ] More context-eligible actions for the action card's bottom section (lockpick-on-locked, use-key-on-locked, examine-corpse, etc.).
- [ ] Item flavor: per-stash-item adjective so each loot has individual identity (carried over from older IDEAS.md — partially shipped via room/container vocab, but not per-item adjectives yet).
- [ ] Hideout depth: Workbench schematic currently flips a flag and does nothing. Wire actual crafting (consume X, Y → produce Z gear). Medbay healing flow.

## Tech debt / refactor (from arch review 2026-05-09)

Items #1, #2, #6, #7, #9 (partial) shipped 2026-05-09 — see Changelog. Remaining:

4. **`lib/engine/raid.ts` (~675 lines)** — `tickAction` is a ~315-line switch with nested branching, mixed with RNG setup, log flavor (`makeLog`, `entranceLog`, `lootVerb`), branch/choice factories, and bleed/recall helpers. Decompose into `branches.ts`, `flavor.ts`, per-action handlers.
5. **`PackTetris.tsx` (~488 lines)** — drag state machine, grid math, validation, and rendering all in one component. Grid math overlaps with `engine/shapes.ts` but isn't reused consistently. Extract `usePackDrag` hook, lean on `shapes.ts` for placement validation. (Partially addressed by the `KitGrid` extraction in commit `86ce488`.)
6. **Remaining test coverage gaps**: UI components untested (acceptable v1). Engine + store now covered by 149 tests across 9 files; the deepest gap left is `tickAction`'s combat sub-mode + locked-container branches, which would benefit from targeted scenario tests if #4 lands.

---

# Risks (current as of 2026-05-09)

- **Auto-picker is too predictable.** With seven actions but only three ever in the primary slot, players will stop reading the next-action card after a few raids. Sprint I (preferences) helps, but the real fix is more _kinds_ of actions — sub-mode variety, environmental interactions, opportunistic tile features.
- **Ammo is consumed but never gates.** Sprint L (mag/reload realism) is the fix. Energy now punishes at 0 (Sprint K shipped 2026-05-09 — see Changelog).
- **Combat outcome distribution is fixed.** `fight` always rolls the same 55/30/15 — opponent quality (the user's wishlist item) would make this dynamic.
- **No long-term meta progression beyond cash.** Once stash and pack are upgraded a few times, there's nothing to chase. Sprint J + workbench crafting need to land before mid-game has shape.

For the older showstopper-tier risks (was the loop fun to watch? motivation cliff at hour 2? etc.), see `archive/RISKS.md` — most have been substantially addressed by the action-driven raid pivot.

---

# Explicitly deferred

Known "not now" decisions. Pull from this list when the active work needs depth.

- Top-down map view in the actual sense (zoomed multi-floor world map) — sprint 6+.
- Skill XP per use — separate sprint.
- Crafting at the Workbench — sprint after Sprint J. Schematic drop unlocks the icon, real crafting comes later.
- Pre-mission intel-buy mechanic — depends on a currency/economy model not yet decided.
- Sound mapping pass beyond the 4 kinds — sprint when more event types exist.
- Multiplayer — discussed and explicitly deferred. Engine is kept pure / clock-free as insurance (see DESIGN.md "Multiplayer port-readiness" section).

---

# Changelog

Shipped work, newest sprints last. Acts as a record of what landed when.

## From the older IDEAS.md

- ✅ **Loot categories per location** — each location biases toward certain item categories. Shipped via `location.categoryWeights` in `src/lib/data/locations.ts` (Warehouse → mechanical 5 / consumables 3 / electronics 2; Datacenter → electronics 6 / intel 5; Biolab → medical 5 / experimental 4; etc.) and routed through `pickItemForLocation()` in `src/lib/data/items.ts` — picks a category by weight, then a tier by depth+rarity, then an item from the intersection (with a generic fallback when no weights are set).

## Sprints

### Persistent operative vitals + out-of-raid consumable use (2026-05-10)

- `Operative` (`src/lib/types.ts`) gains persistent `health` / `energy` / `ammo` fields. Defaults 100 / 100 / 30.
- `startRaid` (`src/lib/engine/raid.ts`) now takes a `vitals` argument and seeds `runState` from it instead of hardcoding 100/100/30. Wired by `beginRaid` in `src/store/slices/raid.ts` to read from `operative`.
- `endRaid` writes the final raid `runState.health/energy/ammo` back to the operative on extract; on **death** it sets vitals to **50 / 50 / 0** (operative is wounded but not stuck — design decision, not a stuck state).
- New engine helper `applyConsumableToOperative(operative, stash, uid)` mirrors `applyConsumable` but operates on persisted vitals; finds the uid in pockets / bag / stash, applies HP/energy effects, removes the item. Includes the same would-help guard so dragging a syrette at full HP no-ops instead of wasting it. Bandages out of raid are no-ops (no bleed flags exist outside a raid).
- New store action `useConsumableOnOperative(uid)` in `src/store/slices/kit.ts` wraps the engine helper.
- `StashPanel` (`src/components/panels/StashPanel.tsx`) gains a `VitalsStrip` above the items grid showing HP / Energy bars, Ammo readout, and a "drag consumable to use" drop zone. Drag wiring detects when a drag enters the strip; if the dragged item is a consumable, drop fires `useConsumableOnOperative`. Visual feedback: green hover for valid consumable drops, red hover for non-consumables.
- Save migration v26 backfills 100/100/30 on existing operatives.
- **Known gap:** ammo replenishment outside of raids is still TODO (no consumable adds ammo, no shop ammo offers). Death now leaves you at 0 ammo with no recovery path until you scrounge in-raid. Sprint L (mag/reload realism) or a shop ammo box would close it.

### Stash value in header (2026-05-10)

- `Header` (`src/components/terminal/Header.tsx`) gains a "¤ N" stash-value chip next to the cash counter, with a Package icon and a tooltip showing the item count. Sums `sellValue` across `stash` via `useMemo`. Always visible — gives players a passive readout of how much hoarded value they're sitting on without opening the panel.

### Stash sort + group by category (2026-05-10)

- `StashItem` gains optional `acquiredAt: number` (in `src/lib/types.ts`); stamped at all stash-push sites: `stashFromKit`, `unequipToStash`, `emptyKitToStash` (in `src/store/slices/kit.ts`), and shop `buyOffer` (in `src/store/slices/economy.ts`). Pre-existing items missing the field sort as oldest.
- `StashPanel` (`src/components/panels/StashPanel.tsx`) gains a toolbar above the items grid: Sort (Date / Value, default Date desc) and Group by category toggle. When grouped, items render in category bands using `CATEGORY_ORDER` (military / bag / mechanical / electronics / medical / consumables / experimental / intel / valuables) with a small icon + count header per section.
- State is local-only — resets on reload. No save migration needed (the new field is optional).

### After-raid report (pass 1) (2026-05-10)

- `CurrentRaid` gains `startingEquipment` (snapshot at raid start) + `tally` (running counters: damage taken, energy spent, heat peak, combat outcomes, choices made, consumables used). Initialized in `startRaid()` in `src/lib/engine/raid.ts`.
- `tickAction` returns a new `combatOutcome?` field (`target_down` / `target_fled` / `broke_contact` / `trade_shots`) so the slice can count fights without log-text scraping.
- Raid slice (`src/store/slices/raid.ts`): `doTick` accumulates damage/energy/heat-peak + combat counters from each tick. `resolvePendingChoice` pushes onto `tally.choicesMade` and counts the choice's deltas. `useBandage` / `useConsumable` push onto `tally.consumablesUsed`.
- `RaidOutcome` reshaped from death-flavor stub into a full report: loot diff (kept / lost / looted with sell values), starting + ending value, final HP/energy, damage taken, energy spent, heat peak, combat counters, choices, consumables, exploration ratio. Built by `buildRaidReport()` in the same slice; emitted on both extract and death.
- `RaidOutcomeModal` (`src/components/panels/RaidOutcomeModal.tsx`) rewritten as a sectioned report with extract/death styling variants. VFX: backdrop fade-in, card scale-up, one-shot sweep highlight (keyframes in `src/app/globals.css` — `.raid-report-backdrop`, `.raid-report-card`, `.raid-report-sweep`).
- Save schema bumped to v25 with backfill for in-progress raids missing the new fields.
- Map-replay (path tracking + visualization) deliberately deferred to pass 2.

### Sprint K — Energy as hunger/thirst + medical ladder (2026-05-09)

- Engine: `tickAction` drains -2 HP/tick when energy is at 0 (`EXHAUSTION_DRAIN`). Logs `damage` line "Running on empty — body's eating itself."
- Engine: `applyConsumable(raid, uid, now, rand)` parallel to `applyBandage`. Uses a `CONSUMABLE_EFFECTS` table:
  - antiseptic_vial: +10 HP
  - med_syrette: +30 HP
  - nano_clot: +60 HP, clears all bleeds (the panic-pop)
  - ration_pack: +30 energy
  - water_bulb: +15 energy
  - coffee_can: +25 energy
  - fuel_cell: +40 energy
  - combat_stim: +30 energy
- Bandage stays bleed-only — `applyConsumable` no-ops on bandage_pack so the existing flow isn't redirected.
- Store: `useConsumable(uid)` action wraps `applyConsumable` with Date.now/Math.random.
- UI: FeedPanel grows two new banners + a row:
  - Exhaustion banner (amber, when energy ≤ 0)
  - Consumables row (always visible when any consumable is in kit) — grouped by itemId with ×N count, click-to-use, tooltip shows the effect
- Data panel: new "Consumables" section listing the effect table.
- Tests: 9 new tests for exhaustion drain + applyConsumable (HP variants, bleed-clear on nano_clot, energy items, bag fallback, no-op on unknown uid / non-consumable). Total tests: 159.

## Tech debt / refactor (from arch review 2026-05-09)

- ✅ **#3 Store god-file split** — extracted into 3 Zustand slices in `src/store/slices/`: `raid.ts` (raid lifecycle + currentRaid/raidOutcome state, ~546 lines), `kit.ts` (12 kit/equipment actions, ~246 lines), `economy.ts` (sell + buy + stash upgrade, ~86 lines). `store/game.ts` is now 193 lines (was 1003): state init, slice composition, hydrate/persist. GameState extends each slice interface so the store API is unchanged for consumers.
- ✅ **#1 Engine purity** — `Date.now()` and `Math.random()` no longer read inside `lib/engine/`. New `makeUid(now, rand)` and `makeLogger(now, rand)` helpers in `raid.ts`; `tickAction`, `startRaid`, `applyBandage`, `entranceLog`, and pending-choice factories all take `now` as a trailing param. Store wraps with `Date.now()` / `Math.random()` at call sites only. Restores the seedable invariant DESIGN.md promises.
- ✅ **#2 Tick loop ownership** — death/extract `setTimeout` chain in the store moved onto raid state as `pendingEnd: { at, success } | null`. `useRaidLoop` now owns all raid timers (action timer + pending end). Save schema bumped to v24.
- ✅ **#6 Stale comments** — dead `lockedCratePendingChoice`, `clamp`, `applyFlags`, retired-tickRaid comment, unused PENDING_EXPIRY_MS / BRANCH_TIMER_MS / RunState / rollEvent imports all removed from `raid.ts`. Dropped unused imports (`buildOccupancy`, `canPlace`, `shapeFor`) from `store/game.ts` since `engine/equipment.ts` is the single consumer now.
- ✅ **#7 Heat semantics** — doc-comment on `RunState.heat` in `types.ts` documents what increments/decrements it and the heat→ambush relationship.
- ✅ **#8 Difficulty knob** — `Location.difficulty` (low/mid/high) was UI-only; now actually scales gameplay. New `DIFFICULTY_MULTIPLIER` in `engine/map.ts` (low: 0.7, mid: 1.0, high: 1.4) scales `THREAT_TILE_RATIO`. Blocker density stays per-location (`blockedTileRatio`) since it's a layout-feel choice, not a difficulty choice — a Datacenter feels denser than a Warehouse regardless of danger level.
- ✅ **#9 (mostly): test coverage** — 22 tests for `engine/equipment.ts` slot algebra. 12 tests for `engine/shop.ts`. 22 store integration tests for `store/game.ts` (raid lifecycle: beginRaid → doTick → recall → endRaid via pendingEnd; kit pickup/equip; sell; togglePause shift). Total: 149 tests across 9 files. UI components still untested (acceptable v1).

## From the player wishlist

- ✅ button to skip action timer (force proceed)
- ✅ ctrl-click to move items to inventory quickly
- ✅ add item archetype icons to stash and tooltip
- ✅ pulsing notification bubble on feed sidebar button when raid is active
- ✅ animation when purchased something from the shop so you know you bought it
- ✅ concept of multiple bags/inventories to put items into
- ✅ starting pockets, find a bag in raid to upgrade
- ✅ kit / loadout module: choose what from your stash to bring in
- ✅ if you die you lose your kit

## Sprint phases (engine + content)

### Phase A — Engine spine

- `RunState` extended with `flags: string[]` and `distanceFromExtract: number`.
- Data-driven event defs: `preconditions`, `postconditions` (string[] or function), `removeFlags`, `exclusive`, `passiveEffects`, `rollLoot`, `branches`. The legacy random-event `tickRaid` is retired.
- `pickEvent` filters by precondition with fallback; exclusive events shadow the regular pool.
- Loot tier biased by depth (`rollTier` lift capped at 0.35).
- Vitest 3 (pinned because v4's rolldown native binding fails under pnpm/Windows). 6 test files covering engine spine, shapes, upgrades, save round-trip, pending pruning, and rollEvent template substitution.
- Save schema versioning + migrations from day 1, with a defensive shape check that catches HMR + auto-save races.

### Phase B — Branching events (now restored as forced-choice modals)

- Reusable `BranchModal` with `BranchOption[]`, 10s default-to-safe timer.
- Bleed system: minor (-1/tick) + major (-4/tick), stacking, randomized on `took_damage` (~40% no bleed / 42% minor / 18% major). Bandage clears both.
- HP at 0 ends the raid as death — pack contents lost, operative returns with `injuryDebuff`.
- Death modal with red border, Skull icon, Acknowledge button. Successful extracts flow straight to stash without an extra click.

### Phase C — Locations + room flavor

- 5 locations: Warehouse, Subway, Drone Graveyard, Datacenter, Biolab. Difficulty pills, lock callouts, consumable-keycard and permanent-coords unlocks.
- Per-tile **fixed room names** chosen at map gen — log and map tooltip narrate the same room ("shift office", "boiler room", "rusted stairwell"...).
- Per-tile **container vocabulary**: regular containers (locker, footlocker, drawer, junction box, ...) are picked at map gen. Loot logs use container-specific verb pools ("Cracked open a locker", "Tipped open a tool chest", "Rummaged through a duffel").
- Room types layered on top of locations: storage, office, mechanical, gantry, corridor, locked, entry. Room-event bias multiplies base weights.

### Phase D — Spatial map

- 12-wide × 5-tall horizontal strip per raid. Entry at leftmost column at a random lane; deepest at rightmost.
- `MapTile`: `type, name, blocked, visited, lootRemaining, lootMax, containers, lockedContainers, contents, seen, threat`.
- Fog of war: `seen` set on entry + 4 orthogonal neighbors per move. Unseen tiles render as dashed dim cells with `???` tooltip.
- Pathfinding: `stepForward` (right-biased; ~25% lane drift), `stepBackward` (returns `path[1]` from BFS), `stepLateral` (lane shift away from entry), `pathToEntry` (BFS with parents, used for extract path overlay), `distanceToEntry`. `distanceFromExtract` is _derived_ from path length each tick.
- Pre-rolled `nextStep` cached on `CurrentRaid` so the preview indicator matches the actual move.
- Map render: identity coords. Operative as pulsing emerald dot. Cursor-following hover tooltip (room name + status). Hovered tile gets a `ring-2` highlight.
- Next-tile preview: dim amber fill + edge-straddling lucide arrow (Right/Left/Up/Down) computed from `previewPos − operativePos`.
- **Threat tiles**: ~10% of non-entry, non-blocked tiles past column 2 spawn with a hostile pre-gen. Red AlertTriangle marker on `seen` threat tiles.
- **Extract path overlay**: dashed emerald `polyline` SVG drawn through tile centers from operative to entry while extracting. Single source of truth — `stepBackward` returns `path[1]` so the cached `nextStep` and the rendered path always agree.
- **Blocked tiles** render with a `Slash` icon (no entry / impassable) instead of a Lock (which previously implied "openable").
- **Room contents** persist on tiles. Loot drops land on the floor of the operative's current room. Items in non-current rooms stay there. Dropping from pack drops to the floor (no longer trashed).

### Phase E — Action-driven raid loop

- Each tick resolves a `queuedAction`. `tickAction(raid, rand): ActionTickResult` is the single entry point.
- `autoPickAction` chooses a default per state: combat → fight; extracting → extract_step; current room has loot → loot; otherwise move_forward; fallback stay.
- `overrideAction(id)` lets the player swap mid-timer.
- `useRaidLoop` reschedules off `actionStartedAt + ACTION_TIMER_MS - now`, surviving pause and component remount.
- ~22% interrupt chance per tick (took_damage with possible bleed; heard_voices flavor). Suppressed during combat and extract.

### Phase F — Combat sub-mode

- `combat_engaged` flag. `fight` / `flee` actions become eligible when set; primary action menu replaces with the pair.
- `fight` outcome rolls per round: ~55% target_down (drops loot into current tile, clears flag, +4 heat), ~30% firefight (-7 HP, -2 ammo, +5 heat, ~25% bleed, flag stays), ~15% target_fled (clears flag, +8 heat).
- `flee`: 60% break-contact (clears flag, +6 heat), 40% takes a parting shot (-5 HP, -1 ammo, ~20% bleed).
- Engage commits the move into the threat tile and clears the threat there.

### Phase G — Locked containers

- Locked containers are a separate pool from regular containers (`MapTile.lockedContainers: { name, keyType }[]`), placed on ~18% of non-blocked tiles.
- Distinct names: wall safe, padlocked footlocker, executive lockbox, ID-locked drawer, secured junction box, armored panel.
- `breach_locked` is a direct action (no modal): -2 ammo, +14 heat, pops one locked container, rolls 30% empty / 50% common / 20% rare. Loot tier independent of method.
- `keyType` field set per container ("key" / "keycard" / "id_badge") — wired but unused; future key-item system reads it.

### Phase H — Heat economy

- `RunState.alertness` renamed to `heat` (+ migration). Stat icon: Flame.
- **Real consumer**: every `move_forward` and `extract_step` rolls a `heat / 400` chance to fire a patrol modal IN ADDITION to the pre-gen threat check. heat 100 → 25% per move tick.
- Different log lines distinguish pre-gen vs heat-ambush ("Hostiles in the next room. Holding." vs "Footsteps closing in — they heard me.").
- Stay's heat reduction is -8 (was -3 before consumers existed). One Stay cancels a Fight tick + change.

### Sprint J follow-ups

- ✅ **Drag-based loadout in Stash panel** — shipped via shared `KitGrid` component (`src/components/panels/KitGrid.tsx`) and the `useDragDrop` hook (`src/lib/useDragDrop.ts`). `StashPanel.tsx` uses both, with a `DragSource` discriminated union covering stash → kit / kit → stash / kit ↔ kit moves.

### Sprint J — Kit / equipment (partial — slots reserved)

- `Operative.equipment` shape: `pockets` (built-in 4×4 grid, grows by row with `pocketsLevel`), `bag` (nullable, grid from the equipped item's `bagGrid`), and reserved `weapon`/`armor`/`helmet` slots (no stat effects yet).
- Item additions: `slot?: EquipSlot` and `bagGrid?: {w,h}` on `Item`. Three bag items (`canvas_satchel` 4×4, `tactical_pack` 5×5, `raider_rucksack` 6×6). Bags now appear in the loot pool as of 2026-05-09.
- Save schema v19: drops in-progress raids, renames `Upgrades.backpackLevel` → `pocketsLevel`, backfills `operative.equipment` with bare 4×4 pockets, renames `hideout.modules.backpack` → `pockets`, adds `loadout` module.
- Store: 10 kit/equipment actions auto-route between `currentRaid.equipment` (raid) and `operative.equipment` (idle). `pickupFromFloor`, `dropToFloor`, `trashFromFloor`, `trashFromKit`, `moveKitItem`, `kitFromStash`, `stashFromKit`, `equipBag`, `unequipBag`, `emptyKitToStash`.
- `endRaid` no longer auto-stashes on extract — equipment stays on the operative until the player unloads. Death wipes pockets contents and strips bag/weapon/armor/helmet (pockets grid persists since it's an upgrade level).
- `PackTetris` is now a two-grid layout: pockets above, bag below, with cross-slot drag. `dropToFloor` and `trashFromKit` work from either grid.
- `StashPanel` grows a left rail (when idle) showing pockets + bag with click-to-stash / click-to-trash, an "Empty kit" button, and `equip`/`unequip` controls. Stash items get a `→ kit` button using a first-fit auto-placer.
- Hideout module tile renamed: "Backpack +N slots" → "Pockets +1 row · ¤cost". New "Loadout" module card deep-links to the Stash panel (where the kit lives).
- Ops console gets a kit summary chip next to the Send button: `pockets X/Y · bag X/Y · ¤kitvalue`.

## Action card UI

- Sidebar column between comms log and pack tetris. Width `w-56`.
- Vertical action list: primary set at top, horizontal divider, context actions (currently `breach_locked`) when eligible.
- Active row: subtle emerald-tinted bg + leading ChevronRight. No more amber flood.
- Each row carries effect chips (icon + value, no border) and an optional `Nx` count badge in the top-right (loot remaining, locked count).
- Chip kinds with icons: hp/Heart, energy/Zap, heat/Flame, ammo/Crosshair, loot/Package, distance/Footprints, depth/Footprints, misc/ChevronRight.
- Pause: small icon-only button next to the countdown timer.
- Recall control: link-style "Recall to extract" while raiding; full boxed "Moving to extract" with spinning Loader2 while extracting; on hover, group-hover swap to "Cancel extract" with red bg.
- Action timer bar: foreground/80 (white) while running; pulses amber (`animate-pulse` + `bg-amber-300/80`) while paused. The pulse replaces the old "Paused — comms hold" banner.

## Stats row

- 5 columns: Health, Energy, Heat, Ammo, Distance. All with matching lucide icons.
- Each value flashes (300ms color transition) on change — emerald for "good direction", red for "bad direction." Heat is direction-inverted.
- Floating `+N` / `-N` delta indicator pops out the top-right of each stat and drifts upward over 800ms (CSS keyframe `stat-delta-float`).

## Quality-of-life

- Pause: button + spacebar (capture-phase document listener that beats focused buttons). Resume shifts wall-clock timestamps so pending items don't expire and the action timer keeps its remaining budget.
- Right-click context menu suppressed.
- Text selection disabled at root, opted back in on the comms log so players can copy log lines.
- Death modal with Acknowledge button.
- Hot-reload preserves Feed panel when a saved raid is in progress.
- Comms feed subtitle always shows the location name.
- Save schema at v19, with migrations through every intermediate step. Defensive shape-check at the bottom of `migrateSave` resets `operative.state` to `idle` if any drop path nulled `currentRaid`, so the UI doesn't get stuck "deployed" with no raid.
