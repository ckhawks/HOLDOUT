# HOLDOUT — Design

The canonical design doc. Combines the original brainstorm notes (concept, constraints, phase plan from 2026-05-05) with the load-bearing constraints, principles, and UI pins consolidated from the now-retired PLAN.md (2026-05-06 → 2026-05-09).

For active backlog and shipped changelog, see `BACKLOG.md`. For wide blue-sky ideas, see `BRAINSTORM.md`.

---

# Original concept notes (2026-05-05)

Active design notes for the meshed game concept that emerged from the 2026-05-05 brainstorm. Name locked 2026-05-05 (was "Run Sheet"). Captures decisions made + open questions so the design doesn't have to be re-derived from chat.

The name **HOLDOUT** carries three layers:
1. A "holdout" — a concealed/backup weapon (corp-military gun-flavor)
2. A holdout — the last defensive position you fall back to
3. *The* Holdout — the player's hideout itself, the place that survives no matter what

## Concept summary

A persistent-base game where you actively manage a hideout in the foreground while a single operative auto-resolves missions in the background, with live event interrupts and a recall option. Auto-battle is OK; the player is always doing meta-game work (crafting, organizing, kit prep, hideout upgrades) and reacting to mission events as they fire. Events are texture-rich, Tarkov-flavored ("Pried open a Triton-brand medical locker — 3x morphine and a photo of someone's kid"), not templated.

Decomposes into 1-3 week phases, each adding one module. Setting flexible; user leans near-future corporate-military (~2090) but not locked.

## Constraints honored
- No real-time skill PvP as core loop
- No permadeath wipe / progress erasure
- No full-time-job engagement requirement
- Not idle (active foreground always)
- Not Factorio-conveyor-cloning
- Not logic-gates / in-game coding
- Not tactical squad turn-based (no XCOM, no Door Kickers)
- Not run-based progression (Balatro-style); long playthroughs preferred
- 2D / web-UI medium; pixel art aspirational, optional
- Each phase shippable in 2-3 weeks
- **No mobile-game energy/waiting mechanics.** The game progresses only while the player is actively playing. Close the game → everything pauses. No real-world-clock timers gating engagement. No "come back in 4 hours" FOMO. No recovery timers, no construction timers, no energy refills.

## Core loop

1. **At hideout (active foreground)** — organize stash, craft at workbench, design kit/loadout for next mission, upgrade hideout modules, browse market (post-v1).
2. **Send operative on mission.** Mission has a length (number of events, narrative arc) but is NOT real-world-clock-gated.
3. **During mission (you're still active in hideout)** — live event log streams events at a comfortable read-and-react pace (one every 30-90 seconds of in-game time) while you're playing. Walk away → mission pauses with the rest of the game. Periodic interrupts fire ("Locked door — pick / blast / skip?") with short *in-session* timers. Recall and Skip-Ahead options always available.
4. **Mission completes** — loot returns, sort into stash, plan next. No cooldown — operative can immediately go again if equipped.

Multiple missions parallel later when more operatives unlock.

## Active foreground / auto background — what makes this NOT idle

The hideout is the gameplay surface. Missions are events on top of it. There is always something to fiddle with at the hideout (organize, craft, design, upgrade). Mission interrupts pull attention back periodically. Recall button means active risk-management decisions during a mission. **The game pauses when you walk away** — nothing real-world-clock-gates engagement.

### During-raid active engagement (v1)
For phase 1, active engagement during a raid comes from: responding to interrupt events (Pick / Blast / Skip with short in-session timers), deciding when to call Recall (with extract risk), and watching the event feed for changes that affect those decisions. Not idle, but lighter than tetris would be. The active surface is interrupts + recall, not real-time inventory management.

If v1 feels too passive in playtest, the next-best engagement levers are: increase interrupt frequency, add more interrupt-decision types, or pull tetris forward from the deferred list.

## Run-design principles (what makes runs interesting, not boring stat rolls)

1. **Live run-state visible** during the mission. Tracked variables (alertness, stamina, ammo, noise) tick with events. This connects events causally and makes outcomes feel earned. v1: 3 vars only (alertness, stamina, ammo).

2. **Specificity over templates.** Events reference procedural details (named brands, named NPCs, named locations, specific items). Mad-libs-style assembly from rich vocabulary tables. *"Looted a container"* is dead; *"Pried open a Triton-brand medical locker behind a vending machine in the East Atrium — 3x morphine, 1x field bandage, a photo of someone's kid"* is alive. Cheap to add once the engine exists; perfect content-phase work.

3. **Causal event chains, not isolated rolls.** Triggering an alarm scales reinforcements; quiet success unlocks deeper rooms; high noise raises Recall pressure. Player feels decisions and run-state mattering. (User flagged this as cool but unsure technically — implementation note: an event has preconditions + postconditions + effects on state vars; the next event is drawn from the pool whose preconditions are met. Common rules engine pattern.)

## Speed / risk tradeoff (user-confirmed 2026-05-05)
- Operative can move faster → more loot per minute, but riskier (higher alertness gain, higher event-trigger rate)
- **Different locations have different risk profiles, requiring different gear and strategies.** A warehouse run wants stealth + a quiet weapon; a corp HQ raid wants armor + heavy firepower; an outdoor cache wants speed + endurance. Pre-mission gear/strategy choice becomes meaningful because different missions reward different builds.

## Upgrade axes (what gets better over time)

User confirmed which to keep:

- ✅ **Operative skills** — sneak, marksmanship, hacking, scrounging, etc. Grow with use (Wurm-style: doing it = leveling it).
- ❌ **Operative traits** — meh for now (skip).
- ✅ **Equipped kit** — weapons, armor, consumables. Built at workbench from loot.
- ✅ **Pre-mission prep** — buy intel (reveals enemy types), scout drones (reveal map regions), bribe (reduces patrols), supply drops mid-mission. Spend resources before a run to bias outcomes.
- ✅ **Hideout modules** — workbench tier ↑ unlocks better gear; intel desk tier ↑ unlocks harder missions; stash size ↑.
- ⏸ **Cards / synergies** — *not in v1, maybe later.* User open to thinking about it but not committing. The "stuff you collect that helps on runs" role can be filled by gear/items in v1; cards become a possible expansion when the core loop is solid.

## Death model (decided 2026-05-05; revised same day)

**Model A — "Down, not dead."** When the operative is killed in a mission:
- Mission ends in failure
- Operative returns to hideout, loses everything carried (loadout + accumulated mission loot)
- Skills persist; hideout persists; stash is sacred
- Operative comes back **injured** with a performance penalty on the next mission(s) — reduced stats, slower events, fewer loot rolls, etc.
- Cure the penalty by spending **medical supplies** (crafted/looted in-game). Active resource decision, no real-world-clock waiting.

The **performance-penalty model** is the way (not a recovery timer). Player chooses: send them out hurt for income, or stash-fund the medical supplies and heal up first. Active decision, no mobile-game waiting.

Roster of multiple operatives (Model C) is a phase 5+ expansion; v1 is one operative.

## v1 phase scope (2-3 weeks)
- Hideout shell with **stash**, **1 workbench**, **1 mission desk** (no decoration, no NPCs yet)
- 1 operative, 3 starting skills: sneak, shoot, scrounge
- 1 mission type ("warehouse run") with ~6 event types, drawn from vocabulary tables
- Run state: alertness + stamina + ammo (3 vars only)
- 2 interrupt types with active Recall option
- 15 items in the loot table
- Death = Model A (return injured, lose loadout)
- No cards, no traits, no pre-mission prep, no hideout upgrades, no shop, no second operative

## Phase 2-N expansion lanes

Each is a ~1-3 week phase. Order is flexible.

- Skill growth system (skills level by use)
- 2 more mission types with distinct location flavor and gear demands (speed/risk variety)
- 6 more interrupt event types
- Pre-mission intel-buy mechanic
- Workbench crafting recipes (3-5 to start)
- Hideout module upgrades
- Vocabulary expansion (more named brands, locations, NPCs for richer event flavor)
- Causal event chains (preconditions/postconditions engine)
- Loot-sorting / stash organization UI polish
- Optional shop layer (sell duplicates to NPCs, Moonlighter-flavor)
- Second operative + roster mechanic (Model C)
- Cards / synergies (if the core loop wants more depth)
- Decoration / aesthetic hideout customization

## Goals, spending sinks, motivation arc (decided 2026-05-05)

Without spending sinks the loot is meaningless. Without visible upgrade targets the player loses direction. This section locks in *why* the player is doing raids.

### Macro shape
Endless, no endpoint, **escalating sequence of unlocks**. Power-fantasy maximalism (no retirement, no cap, per Twist 5 rejection). Stardew deep-mine / Cookie Clicker prestige tree / modded-MC tech tier shape. Not Factorio "launch and done." There must always be a visible next upgrade target.

### Roles items play (spending sinks)
Most items play 1-2 of these:
1. **Equip** — weapons, armor, mods, consumables. Direct power.
2. **Sell** — convert to cash. Default fallback for any item.
3. **Craft material** — combine at workbench into better gear (phase 3+).
4. **Upgrade currency** — rare components/schematics required for specific hideout/location unlocks.
5. **Display / hoard** — aesthetic stash flex, eventually shareable async-multi.

### Power dimensions (what gets better over time)
- Operative skills (sneak, shoot, scrounge) — grow per-use, no cost
- Loadout / equipped gear — crafted or looted, slot-equipped
- Backpack capacity — bigger bag, more loot per raid
- Stash size — hoard more
- Workbench tier — unlocks better recipes
- Intel desk tier — unlocks harder raid locations
- Medbay — cheaper/faster injury recovery
- Recipes / blueprints unlocked
- New raid locations unlocked
- Loot table depth at unlocked locations

### Micro arc (the loop the player feels)
1. Run raid → come back with stuff
2. Junk → sell for cash
3. Gear → equip, run better
4. Save cash → afford next upgrade target
5. Upgrade → next tier of content opens
6. Repeat with bigger bag, better gear, harder location

### v1 motivation hooks (concrete, in Phase 1 or Phase 2)
The minimum to avoid the "empty-state stall" pattern that killed prior repos:

- **Cash currency.** Earned by selling items at hideout (Phase 1: simple "Sell" button on each stash item, no shop UI yet).
- **Two visible spending targets** so the player has *choice* about saving:
    - Backpack +2 slots (price: ~500 cash) — direct loop improvement
    - Stash expansion (price: ~800 cash) — hoarding feel
- **One non-cash unlock target** so it's not pure money game:
    - Workbench access — unlocked by finding a "Workbench Schematic" in raids (drops from rare event). Phase 1 only "unlocks the lit-up icon"; actual crafting comes in Phase 3. The reward is *seeing the next feature appear.*
- **Visible "next thing coming" cue** in UI: greyed-out hideout modules with hover tooltips ("Workbench — unlock by finding schematic"). Even when locked, the player sees what's possible.

This gives Phase 1 a real motivation arc: loot → sell or save → upgrade backpack/stash → bigger raids → eventually find schematic → see new feature lit. Phase 2 builds on it; Phase 3 makes the workbench real.

### Anti-pattern to avoid
Per `IDEAS_ORIGINS.md` patterns, three prior projects (trackers, MemeCache, games-list) stalled at "v0 shipped, empty state, now what." The motivation arc above is the explicit antidote — phase 1 must end with the player able to see at least one upgrade they're working toward, AND a teaser of the next feature locked behind a non-cash gate.

## Recall friction (decided 2026-05-05)

Recall is NOT a free escape button. **Recall begins an extract sequence.** The operative now has to fight their way to safety:
- Distance from extract matters (deeper in mission = longer/riskier extract)
- Run state matters (high alertness → pursued during extract; quiet → clean)
- Skill matters (sneak helps extract chances)
- Sometimes you fail to extract in time → death (Model A)

This transforms Recall from "free out" to "I'm calling the extract — they have to make it home." Skip-Ahead = "burn through remaining events at higher risk for whatever's left." Real strategy emerges around *when* to extract.

## Visual / medium (decided 2026-05-05)

**Combine A + C: pure web UI with diegetic PDA / dispatch-terminal framing.** No sprites, no 3D, no top-down combat view. Game is presented as a fictional UI device — the player's dispatch terminal (or operative's tactical PDA, depending on POV decision below). Every system is an "app" or "panel" in this device:
- Stash = Inventory App
- Operative status = Vitals App
- Missions = Ops Console
- Event log = Live Comms Feed
- Crafting = Workbench Menu
- Shop (post-v1) = Black Market Terminal

shadcn / vercel aesthetic, lucide icons, monochrome accents. References: Lifeline, Replica, Beholder, A Dark Room, Hypnospace Outlaw, Universal Paperclips. Pixel-art ambient elements possible later (phase 5+) but never mandatory.

### Deferred visual: top-down map view
User noted (2026-05-05) an alternate idea: *a top-down 2D vector / procedural / abstract map of the operative's current mission, where the player plots paths between visible loot hotzones and extract points; encounters fire along the path.* User wants v1 to be **1D text-based** (event log only, no map), but flagged the map idea as worth keeping. Possible phase 6+ expansion: add a map view that complements the event log without replacing it.

## Twists adopted / rejected (decided 2026-05-05)

- ✅ **Twist 1 — Handler POV.** You're the person at base; you employ / dispatch the operative through your terminal. Combines naturally with the diegetic-PDA framing. **Level of control: middle ground.** Not full radio micro (every event = your call). Not full autopilot (just reading reports). Proposed model:
    - **Behavior modes** pre-set and switchable mid-mission: Stealth / Balanced / Aggressive / Greedy (loot-max) / Quick (rush-extract) / Hold (defensive).
    - **Standing orders** you configure: e.g., "ignore engagements unless cornered," "always loot containers," "never enter elevators."
    - **Interrupt events** for major decisions (locked door, ambush detected, rare loot offered, etc.) — short in-session timers.
    - **Recall / Skip-Ahead** always available.
    - Player agency lives at three levels: pre-mission stance, mid-mission behavior toggles, interrupt decisions. Operative handles routine.
- ❌ **Twist 2 — Named operative with personality.** Not interesting to user right now.
- ✅ **Twist 3 (modified) — Blueprints unlock recipes.** Crafting recipes are NOT all available from the start. Find blueprints in loot or unlock via skill thresholds; each blueprint adds a recipe to your workbench. Discovery feel without making the player guess combinations.
- ⏸ **Twist 4 — Shop-flip.** User leans toward "you're the person at base employing these people" framing (which is the Handler POV in Twist 1). Specifically the shop-as-entrypoint flip is NOT locked in. Proceed without it established; can be revisited.
- ❌ **Twist 5 — Operative ages / retires.** User prefers endless growth / super-powerful / no progression cap. Operatives don't age out.
- ❌ **Twist 6 — Factions.** Adds complexity prematurely. Defer indefinitely; revisit only if the core needs more meta-game.
- ❌ **Twist 7 — Barter / no-money.** Not yet.
- ⏸ **Twist 8 — Network of safehouses.** Interesting but scope-bloat for now. User noted "not the same type of territory to me" — flagged as out-of-bounds for the current direction.

### Locked principle (from Twist 5 rejection)
**Endless progression. No retirement, no cap, no soft-reset.** Player should be able to grow a single operative / hideout to absurd power over hundreds of hours. Power-fantasy maximalism. This affects skill curves (no diminishing returns hard cap), gear ceilings (always a tier above), and the long-term content plan.

## Mission concept (clarified 2026-05-05)
**No quest-shaped objectives.** Operative is not "trying to complete missions" with specific win conditions ("retrieve data drive from Triton HQ"). They go on **raids / sorties / runs / ops** — pick a location, go loot stuff, come back. The player chooses **where** and **how** (location + loadout + behavior mode), not **what objective**. Loot is the inherent reward; surviving with stuff is the win condition every time. Word choice doesn't matter ("raid" / "run" / "op" all fine).

This rules out: questlines, fetch quests, contract objectives with binary success/fail beyond "did the operative come home with stuff."

## Open questions
- **Setting** — near-future corp-2090 leans strongest but fantasy / post-apoc / paranormal all viable. The system is setting-agnostic; flavor pass at content level.
- **Multiplayer** — async-multi (visible hideouts / shared marketplace / friend trade) vs co-op friends-only vs purely solo. User said "could be any of b/c/d" earlier; not urgent for v1.
- **Run length** — short (5-min event arc) vs long (30+ event arc). May want both (quick scouts vs long deep runs).
- **Currencies** — single (cash) vs multiple (cash + intel + reputation). With Twist 6 deferred, faction-rep currency is also out for now.
- **POV ownership** — Handler POV locked, but is the dispatch terminal a literal handheld device, a console room, an in-fiction app on a phone, or just stylized UI? Affects flavor not systems.
- ~~Game name~~ — locked: **HOLDOUT** (2026-05-05).

## Scoping the work (drafted 2026-05-05)

### Tech stack recommendation
- **Next.js + TypeScript + Tailwind + shadcn/ui** — your home turf (puckstats, MemeCache, trackers all use this). Zero learning curve, ships fastest, aesthetic match is automatic.
- **State:** Zustand or React context for now. No Redux.
- **Persistence:** `localStorage` for save state in v1. No backend needed. (Cloud saves / async-multi can come later via Postgres + auth, but not v1.)
- **No game engine.** It's a UI app pretending to be a tactical terminal. No Phaser, no Pixi, no Unity. Just React + components + state.
- **Deploy:** Vercel. One-click. Zero ops.

### Phase plan
Each phase ends with something **playable end-to-end**, even if shallow. No phase produces "infrastructure that's not yet useful." This is the AuDHD-respecting shape.

**Phase 1 (2-3 weeks) — the working raid loop with a motivation arc.** Goal: a real but tiny game. Boot, raid, respond to interrupts, recall when hot, get loot, sell or stash, save up for the first upgrade. Player sees a path forward.
- Next.js scaffold + shadcn baseline + tactical-terminal layout (sidebar nav, panel content)
- "Stash" panel: grid of items, sort/filter, hover tooltips. **Each item has a "Sell" button → adds cash.**
- "Ops Console" panel: pick a location (1 location: "Decommissioned Warehouse"), single default behavior mode (Balanced — modes deferred to phase 2), Send button
- "Live Comms Feed" panel: event log streams ticks while raid runs; events drawn from vocabulary tables for specificity
- Operative backpack as a simple list with capacity cap (12 slots starting). If full, oldest-low-value auto-drops. Spatial tetris deferred.
- **Hideout panel:** at least 3 modules visible, with locked/unlocked state. v1 has Stash (active), Backpack (active), Workbench (locked — find Workbench Schematic to unlock), Medbay (locked, phase 4+).
- **Cash currency** displayed on terminal header.
- **Two purchasable upgrades visible in v1:** Backpack +2 slots (~500 cash), Stash +N slots (~800 cash). Player saves up.
- **One non-cash unlock teaser:** Workbench Schematic drops from rare event in raids; finding it unlocks the Workbench icon (greyed → lit). No crafting yet — just visible progression.
- Run state tracked: alertness, stamina, ammo
- 6 event types: Looted container, Spotted patrol, Found rare item (rare drop chance for Workbench Schematic), Took damage, Found locked door, Heard voices
- 1 interrupt type: locked door (Pick / Blast / Skip with in-session timer)
- Recall button → extract sequence (5-10 events of escape, risk modified by alertness)
- Death → Model A (operative back, bag contents lost, performance penalty until medkit used; medkits crafted later, in v1 they're a rare drop)
- 15 items in loot table, each with rarity tier and base sell value
- 5 vocab tables (location names, brand names, item adjectives, NPC names, condition descriptors)
- localStorage save/load with schema version field
- **Definition of done:** you can play 30 minutes, hit at least one upgrade, see the path to the next, and the loop reads as a real game with direction.

**Phase 2 (2 weeks) — variety + behavior depth.**
- 2 more raid locations with distinct risk/gear profiles (e.g., "Corp Server Farm" wants stealth + hacking; "Outdoor Cache" wants speed + endurance)
- 3 more behavior modes (Greedy, Quick, Hold)
- 6 more event types
- Standing orders panel (configure operative defaults)
- Skills grow per-use (3 skills: Sneak, Shoot, Scrounge)
- Skill UI displaying levels and recent gains

**Phase 3 (2 weeks) — workbench + blueprints.**
- "Workbench" panel for crafting
- 5 craft recipes (mostly gear: weapon mods, armor patches, medkits)
- Blueprint drops (Twist 3): some recipes only available after looting a blueprint item
- Item tier system (common / uncommon / rare / experimental)
- Loadout slot system: equip items pre-raid; only equipped items contribute stats

**Phase 4 (1-2 weeks) — pre-raid prep.**
- Intel buying: spend resources before a raid to reveal enemy types, hotzones, hazards at a location
- Medical supplies as crafted item; spend to clear injury penalty
- Resource economy tightening (what currencies + drop rates)

**Phase 5+ — content + expansion lanes.**
Each is a 1-2 week phase. Pick by mood/energy.
- New raid location (template: 1 location = 1 phase with new events, vocab, loot)
- New event types
- Causal event chain engine (precondition → postcondition → next event pool)
- Hideout module upgrades
- Vocabulary expansion / event-flavor pass
- Map view (deferred to here at earliest — phase 6+ realistic)
- Cards / synergies (if depth wants more)
- Second operative + roster
- Shop layer (sell to NPCs)
- Async-multi (visible friends' hideouts, marketplace)
- Pixel-art ambient hideout flavor

### Deferred mechanics (parking lot for later phases)

Ideas that are good but explicitly NOT in the v1 phase plan. Pull from this list when the core loop is stable and the next phase needs a depth-add.

- **Spatial inventory tetris.** Backpack as 4x4+ grid; items have shapes (1x1, 2x1, 2x2, etc.); drag-drop placement with rotation; pending-pickup slot with placement timer; drop-mid-raid. Adds visceral active engagement during raids and makes Recall extract risk emotionally weighty (heavy valuable bag = nervous extract). Tarkov / Backpack Hero / RE4-attaché flavor. **Phase 5+ at earliest.**
- **Item rarity + random rolled stats.** Items aren't fixed templates; each instance has a base type plus rolled modifiers (e.g., "Scavenged Optic" base + "+10% accuracy in low light" + "weight -1"). Some items roll into epic tiers with multiple modifiers. Inspect-on-hover panel shows full stat sheet. Diablo / PoE / Tarkov flavor. Adds depth without growing item-table count linearly.
- **Appraisal / unidentified items.** When loot returns from a raid, valuable items come back as "Uncategorized" or "Needs Appraisal." Player can't see full stats or sell value until appraised. Appraisal happens at the hideout via:
    - Skill check (operative scrounge skill auto-appraises common stuff)
    - Time at workbench (in-game ticks while you do other things — but no real-world clock)
    - Spending an Identification Kit (consumable, crafted or looted)
    - Risk option: sell unappraised at a discount (gambler's payoff)
    - Adds hidden-information tension between "what you brought home" and "what it's actually worth." Diablo ID-scrolls / Stardew Valley artifacts / pawn-shop appraisal flavor.
- **Causal event chains.** Rules-engine where events have preconditions and postconditions; the next event drawn is from the pool whose preconditions match current run state. Triggered alarm → reinforcement events become available. Quiet success → deeper-area loot pool unlocks. Replaces simple weighted-random event drawing.
- **Top-down map view.** 2D vector / abstract procedural map of the current raid; player plots paths between visible loot hotzones and extract points; encounters fire along the path. Complement to (not replacement for) the event log.
- **Cards / synergy system.** Persistent passive buffs you collect that modify run probabilities and effects. Balatro joker stack flavor.
- **Roster of operatives** (Death Model C). Multiple operatives, swap between, each has own skill profile.
- **Shop / sell layer.** Sell duplicates and surplus to NPCs (Moonlighter flavor).
- **Async-multi.** Visible friends' hideouts; shared marketplace; trade.
- **Pixel-art ambient hideout flavor.** When user wants to practice pixel art, this is where it slots in.

### Risk callouts
- **Vocabulary content is the long tail.** Phase 1 needs only 5 small tables; phases 5+ need to keep adding flavor or events feel repetitive. This is content work, not engineering — fine because it's the per-phase constellation pattern, but plan to spend creative time on flavor passes regularly.
- **Causal event chains are the engineering challenge.** Random event rolls are easy; rules-engine causality is harder. Punt to phase 5+. v1-4 use simple weighted random.
- **The "make raids feel different by location" promise is load-bearing.** Phase 2 is the test of whether the location-variety + gear-profile concept lands. If raids feel samey there, fix before phase 3.
- **Save format will change.** Plan for it: localStorage schema versioning from phase 1, write a tiny migration shim so future schema changes don't wipe playtest saves.

### What to do *this week* if you want to start
1. Decide: setting flavor (corp-2090 leans best, but lock it now so the vocabulary tables can be written in voice).
2. Decide: POV ownership (handler dispatch terminal vs operative's PDA — affects which "voice" the comms feed is in: terse field reports vs operative's first-person).
3. ~~Pick a working name~~ — done: HOLDOUT.
4. Scaffold the Next.js project, drop in shadcn, build the empty terminal layout.
5. Write the first vocabulary tables (location names, brand names) — this is also setting-design work.

### Honest friction warnings (per IDEAS_ORIGINS.md patterns)
- **Where similar projects stalled before:** game-shape projects with deep ambition (foothold, sandbox, industrial-synthesis) all stalled when the hard core mechanic surfaced. The likely "hard mechanic" here is the **event engine + run-state + extract logic** — front-load that in phase 1 so it can't ambush a later phase. If phase 1 doesn't deliver a playable raid, the project is in a stall state and needs a re-scope, not more phases.
- **Trackers / MemeCache / games-list pattern:** stalled at "v0 shipped, empty-state, now what." Avoid here by ensuring phase 2+ adds *content visible to the player* (new locations, new events) not just plumbing. The hideout shouldn't feel emptier in phase 3 than it did in phase 2.

## Reference games (positive signals)
- **Loop Hero** — auto-runs while player actively places tiles. Cleanest precedent for active-foreground/auto-background structure.
- **Path of Achra** — auto-battle character, you build them actively.
- **Cult of the Lamb** — hub-vs-crusade split.
- **Tarkov** — hideout + lossy runs + kit + texture-rich item flavor.
- **Moonlighter** — run-loot-then-sell loop (deferred to optional shop phase).
- **RimWorld** — Death Model A is RimWorld-flavor "downed colonist" handling.
- **Wurm Unlimited** — skill-grows-by-use progression.
- **Balatro** — collection-synergy feel (deferred to optional cards phase).

---

# Locked design decisions (consolidated from PLAN.md)

These are the constraints that shaped the design. Don't violate them without revisiting.

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

# Stack

- **Next.js 16** + **TypeScript** + **Tailwind 4** + **shadcn/ui** (initialized with neutral base)
- **Zustand 5** for state
- **localStorage** for save state (no backend in v1)
- **pnpm** as the package manager
- **Vercel** for deploy (later)

---

# Implementation principles

- **Pure engine, dirty UI.** Game logic in `lib/engine/` should be pure functions: `nextState = step(state, action)`. UI components subscribe to Zustand slices and dispatch actions.
- **Single source of truth.** All game state in Zustand. No duplicated state in component-level useState.
- **Schema versioning from day 1.** Save format already has it; data files (items, events) should use ID strings not array indices.
- **No real-world-clock gating.** All "delays" are in-game ticks that pause when the game pauses. Use a manual tick loop or `requestAnimationFrame` driven by store state, NOT chained `setTimeout`s.
- **Style discipline.** Monospace + neutral palette + one accent color. Don't theme-hop. shadcn defaults are fine.
- **Data as data, not code.** Items, events, vocab tables live in `lib/data/` as plain TS objects. No magic strings; use ID consts.

## Multiplayer port-readiness (deferred but plausible)

Multiplayer is not on the roadmap, but it's a likely future direction. Until/unless the call changes, **keep the engine port-ready** so we don't have to rewrite gear/kit/combat systems if it lands later:

- All game logic stays in `lib/engine/` as pure, side-effect-free, seedable functions. No DOM, no `window`, no `Date.now()` baked into RNG or game math.
- Time inputs come in as parameters (e.g. `prunePending(raid, now)`), never read from `Date.now()` inside the engine. The store is the only place allowed to call `Date.now()`.
- Zustand store stays a thin shell over engine helpers — store actions compute `next = engineFn(prev, ...)` and `set({ next })`. No game logic in components or in store closures.
- Save format stays schema-versioned (already done).

If we never go multiplayer, this discipline costs nothing. If we do, the engine ports to a Node server essentially as-is.

---

# Pinned UI/feel decisions

These were tuned with the user — they're not accidents. Don't undo without asking.

## Typography & feel

- **Mixed typography**: sans for prose (subtitles, descriptions, log message text, item names in lists, module status); mono for terminal chrome (header, panel titles, stat labels, kind tags, timestamps, ¤ values, location IDs).
- **Buttons**: sentence case (not all caps), sans (not mono), lucide icon on the *right* side of the label. Default `cursor-pointer` on Button base + sidebar buttons + select; `disabled:cursor-not-allowed` on disabled Buttons.
- **Background**: dot pattern in `.grid-paper` (radial-gradient, 18px), not line grid. Lighter so text is readable.
- **Sidebar width** is `w-20` (80px) — needed to fit "Hideout" / "Settings" labels at `text-[10px]`.

## Items & loot display

- **Items in feed log are highlighted via `⟦…⟧` markers** wrapped at template-substitution time. Renderer splits on the marker and applies tier color + `font-semibold`. **Not monospace** — user explicitly rejected mono for items. Templates **must not** pre-wrap `{item}` in `⟦…⟧` (regression test catches this).
- **Item tier colors live in `src/lib/itemDisplay.ts`** (`TIER_COLOR` map). Reuse it; don't redeclare locally.

## Comms feed

- **Log feed**: opacity fade based on row distance from end (-5%/row, floor 0.25). NOT time-based. `transition-opacity` smooths the step.
- **Log feed**: ghost "next event incoming" row at the bottom with pulsing dots + 10s linear progress bar that resets via `key={raid.log.length}`.
- **Combat resolution log entries** (`kind: combat_resolved`) render as a distinct boxed callout (Crosshair icon, amber left border, soft amber bg). Choice-result entries (`kind: choice_result`) render compact and indented with `CornerDownRight` icon.

## Stats

- **Health + Energy split** (not stamina). Damage events reduce Health; every tick drains Energy. User asked for this explicitly — don't merge them back.
- **Stats row**: 5-column grid of icon-prefixed stats (Health/Heart, Energy/Zap, Heat/Flame, Ammo/Crosshair, Distance/Footprints). Animated value flash (color + drift) on change; Heat marked `inverted` so high = bad.
- **Heat icon = Flame** everywhere it appears.

## Map

- **Pack** is a 240px right-side column inside Feed panel (not a bottom strip). Always rendered while raid is active so layout doesn't shift when the first item lands.
- **Map**: 12-wide × 5-tall horizontal strip, identity coords (`gridColumn = x+1`, `gridRow = y+1`). Operative = pulsing emerald dot. Next-tile preview = dim amber fill + edge-straddling lucide arrow. Threat tiles = red border + AlertTriangle. Blocked tiles = Slash icon.
- **Tooltip pattern**: cursor-following, +14px down-right offset, edge-clamped via `useLayoutEffect`. Used by both pack tooltips and map tooltip.

## Action card

- **Action card**: sidebar column. Active row gets a leading ChevronRight + subtle bg tint (no curved-edge accent, no amber flood). Chips are tiny icon + value with no border. Top-right `Nx` badge for actions with per-room counts.
