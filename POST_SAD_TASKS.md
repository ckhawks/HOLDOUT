# POST_SAD task breakdown — HOLDOUT next sprints

The "raid has weight" sprint became three sprints stacked: the original event-engine + content sprint, a spatial-map layer, and an action-system pivot. Most of what was originally scoped here has shipped; the doc now tracks **what just happened** and **what's next** under the new model.

Source brainstorms: 2026-05-08 design chat (original) + 2026-05-09 spatial pivot + 2026-05-10 action-system pivot.

---

## Where we are now (action-driven model)

The raid is no longer driven by random event rolls. Each tick the operative resolves a **queued action** — the player sees what's about to happen and can override it before the action timer fires. Some things stay real-time / anytime (bandage, pack management, pause).

**Vocabulary** (so map talk and code talk match):
- forward = right = `x + 1`
- backward = left = `x − 1` (toward entry / extract)
- up / down = lane shift (`y − 1` / `y + 1`)
- "rooms away" = manhattan distance from operative to entry on the map

**Active actions (v1):**
- `move_forward` — push deeper. Auto-picker default.
- `loot` — search the current room. Marks tile looted; suppresses repeat finds.
- `stay` — hold position. Reduces alertness, less energy drain.
- `extract_step` — auto-locked while extracting. BFS step toward entry.

**Interrupts (random):** ~22% chance per tick of `took_damage` (with possible bleed) or a `heard_voices` flavor line. Suppressed during extract.

**Disabled / dormant for now:**
- Branching event modals (Hide/Engage/Reposition, Pick/Blast/Skip) — collapsed into the action menu in v1; full branch UI returns in **Sprint G** as forced-choice interrupts.
- Combat resolution events (`target_down` / `firefight_continues` / `target_fled`) still defined but never fire because nothing sets `combat_engaged` in v1. Returns in **Sprint H**.
- Extract event variety (`extract_skirmish` / `extract_corner_loot`) replaced by flat `extract_step` movement. Variety re-introduced via action outcomes when needed.

---

# HUMAN WRITE THIS

Open ideas / wishlist (still relevant):

- concept of multiple bags/inventories to put items into
- starting pockets, find a bag in raid to upgrade
- kit / loadout module: choose what from your stash to bring in
- if you die you lose your kit
- backpack packing like Tarkov for dropped bags (hard)
- small shop: buy backpack, decent low/mid weapon, ammo
- food consumed during raid to keep energy up
- stash sized by # of cells (tetris cells), bigger items = more space, no grid management
- show inventory value
- item value should fluctuate
- stash should show how long you've had an item for
- hacking minigame? keypads?
- warning when pack has more items than stash space
- hideout: foundry — melt metals down, forge items. Construct foundry first.
- realistic ammo: magazines, swap mags, reload from pack ammo
- opponent quality preview ("the big scary guy" vs "the little shrimp")
- lockpicks as a consumable pack item — slow/quiet alternative to Blast for
  cracking locked containers. Each pick has a chance to break, success
  depends on container quality.
- key items: actual keys / keycards / ID badges that unlock specific locked
  containers (the keyType field on LockedContainer is already wired). Keys
  could spawn in regular containers; ID badges could come from defeated
  patrols.

---

# AI WRITE THIS

## Shipped — the long list

### Phase A — Engine spine ✅
- `RunState` extended with `flags: string[]` and `distanceFromExtract: number`.
- `RaidEventDef` gains `preconditions`, `postconditions` (string[] or function), `removeFlags`, `exclusive`, `passiveEffects`, `rollLoot`. Per-event-id switch in `tickRaid` was retired in favor of data-driven event defs.
- `pickEvent` filters by precondition with fallback to full pool; exclusive events shadow the regular pool when any are eligible.
- Loot tier biased by depth (`rollTier` + `pickCommonItemId`, lift capped at 0.35).
- Vitest installed (pinned to v3 because v4's rolldown native binding fails under pnpm/Windows). 128 tests across 10 files at last count.
- Save schema versioning + migrations from day 1.

### Phase B — Branching events ✅ (then retired in the action pivot)
- Reusable branch modal with `BranchOption[]`, 10s default-to-safe timer (was 8s).
- Converted `spotted_patrol` → Hide / Engage / Reposition; `locked_door` → Pick / Blast / Skip; `heard_voices` reverted to flavor for frequency reasons.
- Bleed system: minor (-1/tick) + major (-4/tick), stacking, randomized on `took_damage` (~40% no bleed / 42% minor / 18% major). Bandage clears both.
- Combat sub-mode events: `target_down`, `firefight_continues`, `target_fled` — exclusive while `combat_engaged`. Engagement → multi-tick combat → eliminated/fled with a clear log line.
- Extract sub-mode: Recall sets `extracting` flag; `extract_clear`/`extract_skirmish`/`extract_corner_loot` exclusive while set; `extract_corner_loot` gated to `distance > 3` so the last 3 events of extract are guaranteed clear/skirmish.
- HP at 0 ends the raid as death; pack contents lost; operative returns with `injuryDebuff`.
- Death modal (red border, Skull icon, Acknowledge button) — successful extracts still flow straight to stash.

### Phase C — Locations + room flavor ✅
- 5 locations: Warehouse, Subway, Drone Graveyard, Datacenter, Biolab. Difficulty pills, lock callouts, consumable-keycard and permanent-coords unlocks.
- Per-tile fixed room names chosen at map gen — log and map tooltip narrate the same room.
- Room types layered on top of locations: storage, office, mechanical, gantry, corridor, locked, entry. Room-event bias multiplies base weights (storage 1.8× loot, gantry 1.8× patrol, mechanical 1.6× damage, office 1.6× locked-door).

### Spatial layer ✅ (the big add since the original POST_SAD)
- 12-wide × 5-tall grid strip per raid. Entry at leftmost column at a random lane; deepest at rightmost.
- `MapTile` carries `type`, `name`, `blocked`, `visited`, `looted`, `seen`. Visited and looted are now distinct — visited = operative was here, looted = Loot action performed.
- Fog of war: `seen` set on entry + 4 orthogonal neighbors per move. Unseen tiles render as dashed dim cells with `???` tooltip; seen-but-blocked render with a Lock icon.
- Pathfinding helpers: `stepForward` (right; ~25% lane-drift), `stepBackward` (BFS greedy), `stepLateral` (lane shift away from entry's lane), `distanceToEntry` (BFS), `revealFrom`, `markTileVisited`, `markTileLooted`.
- Pre-rolled `nextStep` cached on `CurrentRaid` so the preview indicator matches the actual move (drift included).
- Map render: identity coords (no transposition). Operative as pulsing emerald dot. Hover tooltip follows the cursor (room name + status: unsearched / trodden but unsearched / well-searched / sealed / out of sight / extract point / operative here). Hovered tile gets a ring-2 highlight.
- Next-tile preview: dim amber fill on the next tile + a directional arrow (lucide ArrowRight/Left/Up/Down) straddling the edge between operative and next tile.

### Phase E — Tetris ✅, bandage ✅, reload ⏳
- Loot tetris: pending tray with FIFO + 15s expiry, drag/drop with snap, R / right-click rotate, drop-on-pending to unplace, trash zone, irregular polyomino hitbox, cursor-following tooltip.
- Bandage: visible bleed badge in stat row + Bandage button when a bleed flag is set; consumes one `bandage_pack` from the pack.
- Reload: not shipped. Depends on Phase D gear / mag system.

### Phase F — Tick + content tuning ⏳
- Event tick down to 3–8s ✅ (replaced with 6s action timer in the pivot).
- 32 items across 8 categories ✅.
- Per-location vocab now real because room names are fixed per tile ✅ (replaced the random `{location}` vocab pool).
- Balance pass + playtest: not yet.

### Quality-of-life shipped
- Pause: button + spacebar (capture-phase document listener that beats focused buttons). Resume shifts wall-clock timestamps so pending items don't expire and the action timer keeps its remaining budget.
- Right-click context menu suppressed (custom menu coming later).
- Text selection disabled at root, opted back in on the comms log.
- Pre-roll RNG in startRaid (each raid's map seeded uniquely).
- Death modal + Acknowledge button.
- Schema bumps v6 → v13 with migrations through every step.

---

## What's next (action-driven sprints)

### Sprint G — Forced-choice interrupts
Restore the branch-modal pressure for events the operative *can't* just queue around.

- [ ] Patrol encounters become spatial: when a patrol event fires (random interrupt OR triggered by entering a `gantry` / high-alertness tile), the queued action is overridden by a forced choice modal. Options: **Engage** (sets `combat_engaged`, switches to combat sub-mode), **Hide** (queues `stay`, lowers alertness sharply), **Reposition** (one-shot lateral move via `stepLateral`).
- [ ] Locked rooms become **tile features**, not events. Locked tiles adjacent to the operative offer a `lockpick` action (slow, quiet, common loot) and `demolish` action (loud, ammo cost, rare loot). When neither is queued, the operative just routes around.
- [ ] BranchModal already lives in the codebase; rewire it for forced-choice interrupts. 10s timer with default-to-safe.

### Sprint H — Combat sub-mode actions
The combat resolution events still exist; bring them back behind a sub-mode action menu.

- [ ] When `combat_engaged` is set, the action menu swaps: only `fight`, `flee`, and `bandage` (anytime) are eligible.
- [ ] `fight` resolves via the existing combat event pool — `target_down` (loot + clear flag), `firefight_continues` (HP/ammo cost, possible minor bleed, flag stays), `target_fled` (no loot + clear flag).
- [ ] `flee` attempts break-contact: success clears `combat_engaged` and adds alertness; failure layers another `firefight_continues`.
- [ ] Operative HUD reflects sub-mode (red border on stat row?).

### Sprint I — Operator preferences
Make "scrounge / push / lay low" real instead of theatre.

- [ ] Operator panel with three preference sliders (or pick-one). Lives in Hideout + a quick-toggle in Feed.
- [ ] `autoPickAction` reads preferences:
  - **Scrounge**: heavily favors `loot` when current tile is unlooted, even if that means re-searching tiles that *might* still have something.
  - **Push**: heavily favors `move_forward`; only loots when a fresh tile is found en route.
  - **Lay low**: more frequent `stay` (recovers alertness); cautious about `move_forward` when alertness is high.
- [ ] Save preference per-operative when the kit/loadout system lands.

### Sprint J — Gear / kit (was Phase D)
- [ ] Gear slots on operative: `weapon`, `armor`, `pack`, `medPouch`. Each is an item with stats.
- [ ] Pack stats (`gridWidth`, `gridHeight`) replace the flat-slot upgrade.
- [ ] MedPouch with `bandageSlots` / `stimSlots` — fast-access consumables outside the pack grid.
- [ ] Hideout panel: **Loadout** module. Drag gear from stash into operative slots pre-raid only.
- [ ] Death loses kit. Kit = stash items moved into operative slots before raid; not auto-restored.
- [ ] Starting kit intentionally bad so first upgrades feel impactful.

### Sprint K — Energy as hunger/thirst
- [ ] At 0 energy, HP starts draining (-2/tick).
- [ ] `useConsumable(uid)` action: ration / water / coffee / fuel cell restores energy from pack inventory.
- [ ] UI: when energy is low, glowing warning + suggestion to consume.
- [ ] Consumables already exist in `items.ts` under category `consumables` — just need wiring.

### Sprint L — Reload + ammo realism
- [ ] Magazines as discrete pack items (size 1–2 cells).
- [ ] During lulls (no event firing), drag rounds from a "loose ammo" pile into mags.
- [ ] Combat outcomes consume rounds from loaded mag; empty mag during combat = forced auto-reload that costs an action tick.
- [ ] Weapon `reloadComplexity` controls rounds-per-drag-tick.

### Smaller follow-ups (any order)
- [ ] First-run intro modal (Phase 6 leftover).
- [ ] Tick-rate / action-timer debug slider in Settings.
- [ ] Run-summary on successful extract: "extracted N items / cash earned" — quick non-modal banner.
- [ ] More item variety pass — target ≥40 items, currently 32.
- [ ] More room-type narrative variety: room-type-specific event templates (instead of just bias multipliers).

---

## Risk callouts (current)

- **Action layer feels thin without interrupts.** Phase 1 of the pivot strips out branching events, so the only sources of pressure are bleed, low energy, and the random `took_damage` interrupt. Sprint G needs to land relatively soon — patrol forced-choice modals + tile-feature lockpick/demolish — or raids will feel mechanical.
- **Auto-picker is too predictable.** With three actions and simple rules, players will stop reading the next-action card after a few raids. Sprint I (preferences) helps, but the real fix is more *kinds* of actions so the auto-pick has more meaningful tradeoffs.
- **Combat sub-mode is dormant code.** All the resolution events (`target_down` etc.) still exist but never fire because `combat_engaged` is unreachable in v1. If we delay Sprint H too long, that code drifts out of sync with the rest.
- **Dead vocabulary debt.** `vocab.ts` had a fallback location pool that's mostly unused now. Worth deleting or compacting once we're confident nothing falls back to it.

---

## Pinned UI/feel decisions (still hold)

- Mixed typography: sans for prose; mono for terminal chrome (header, panel titles, stat labels, kind tags, timestamps, ¤ values, location IDs).
- Items in the feed log: `⟦…⟧` markers replaced at render with tier color + `font-semibold`. Templates **must not** pre-wrap `{item}` in `⟦…⟧` (a guard test catches this).
- Tier colors live in `src/lib/itemDisplay.ts` (`TIER_COLOR` map). Reuse, don't redeclare.
- Buttons: sentence case, sans, lucide icon on the right of the label.
- Log feed: opacity fade -5%/row from end, floor 0.25, smoothed via `transition-opacity`.
- Background: dot pattern (`grid-paper`).
- Pack grid: incoming column on left (`w-40`, `min-h-96`), trash zone pinned under it, pack grid on right.
- Sidebar width: `w-20` for "Hideout" / "Settings" labels at `text-[10px]`.
- Health + Energy split (no merging back to "stamina").
- `cursor-pointer` on Button base + sidebar buttons + select; `disabled:cursor-not-allowed` on disabled Buttons.
- Tooltip pattern: cursor-following, +14px down-right offset, edge-clamped via `useLayoutEffect`. Used by both pack tooltips and map tooltip.
- Map: 12-wide × 5-tall horizontal strip, identity coords (`gridColumn = x+1`, `gridRow = y+1`). Operative = pulsing emerald dot. Next-tile preview = dim amber fill + edge-straddling lucide arrow.
- Combat resolution log entries (kind: `combat_resolved`) render as a distinct boxed callout (Crosshair icon, amber left border, soft amber bg) so engagement closure is unmissable. Choice-result entries (kind: `choice_result`) render compact and indented with `CornerDownRight` icon.

---

## Explicitly deferred (still NOT this sprint set)

- Top-down map view in the actual sense (zoomed multi-floor world map) — sprint 6+.
- Skill XP per use — separate sprint.
- Crafting at the Workbench — sprint after Sprint J. Schematic drop unlocks the icon, real crafting comes later.
- Pre-mission intel-buy mechanic — depends on a currency/economy model not yet decided.
- Sound mapping pass beyond the 4 kinds — sprint when more event types exist.
- Multiplayer — discussed and explicitly deferred. Engine is kept pure / clock-free as insurance (see CLAUDE.md "Multiplayer (deferred, but plausible)" section).
