# HOLDOUT — Brainstorm dump

Wide, unranked, unfiltered idea pool from a brainstorm session. **Not scope, not commitments, not prioritized.** Reorder, prune, steal from freely.

Companion docs:
- `PLAN.md` — locked execution plan for Sprint 1
- `IDEAS.md` — curated near-term candidates (Sprint 2-ish)
- this file — blue-sky dump, including stuff that might never ship

All ideas here must respect the locked design decisions in `PLAN.md` (no real-time PvP, no permadeath wipe, no real-world-clock gating, no quests, no factory automation, no run-based progression, endless progression). If something here violates those, it's a flag to revisit, not a green-light.

---

## High-leverage core bets

- **Terminal-as-character** — the dispatch UI itself is a personality. Boot logs, corrupted packets, ad spam from corp sponsors, a snarky AI co-pilot. Universal Paperclips trick: the chrome becomes content. Cheap, defining.
- **Lore through item flavor** — Moonlighter-style. Never exposit; "Mk-IV Synthex Coolant Loop, leaks slow, smells like burnt almonds" does the worldbuilding.
- **Intel prep** — pre-raid mini-loop where you spend time/cash to reduce unknowns or unlock event subtables. Adds depth without becoming a quest.
- **Operative skills that grow per use** — Wurm angle. Lockpicking improves by picking. No XP screen, just stat drift in tooltips.
- **Behavior modes** — already on the Sprint 2 radar. Pair with per-event-type rules ("on patrol spotted: hide / engage / flee").
- **Item condition + mods** — Tarkov tension: keep this scuffed rifle or sell? Mod slots become a long-tail crafting hook.
- **Vendor moods** — today's buyer is interested in X. Flavor-driven price spikes. Keeps the stash dynamic and gives daily texture.
- **Item tooltips that enrich with use** — the more you find a thing, the more its tooltip reveals about it. Discovery system that has no checklist.
- **The dispatch AI as a character** — sneakily huge. Costs almost nothing and turns the whole UI into a relationship.

---

## Comms feed magic

- Garbled / dropped signal moments — operative goes dark for a few ticks, you sweat
- Wrong-number events: random civilian breaks the channel (pure flavor, no mechanic)
- Static degrades the closer they get to a server room / vault — you *hear* the loot
- Event chains: `heard voices` → `spotted patrol` → `took fire` linked into a beat
- Multi-tick events: looting a safe spills across 4 ticks, slow-mo tension
- Branch micro-choices mid-event ("whisper or duck") — sub-modal-lite
- Operative ad-libs based on stress / personality
- Background ambient lines (fluorescent flicker, distant horn) just for mood
- Found audio logs from previous fictional raiders → mini-stories in the feed
- Echo events — repeat loot in same location triggers "we've been here before" line
- Music station bleed-through during raid (lore tone)
- Internal monologue when alertness high

---

## Operative as character

- Auto-named, but earn a callsign at 50 raids
- Personality traits (claustrophobic, kleptomaniac, twitchy) bend event tables
- Vitals strip in raid HUD: HR, breathing, body temp
- Sleep between raids in **in-game ticks** (not realtime!) creates natural pacing
- Body-cam "feed" as ASCII art that changes per location
- Specializations later: Scrapper, Ghost, Medic, Hacker, Sniper
- Operatives can train each other (skill XP transfer at hideout)
- Memorial wall — dead operatives' dog tags hung up; texture, no completionism
- Bonds: returning operative comments on items they once carried home
- Trauma / morale (RimWorld downed-not-dead angle with personality)

---

## Location variety

- Tier ladder: Warehouse → Drowned District → Vertical Slum → Corporate Server Farm → Decommissioned Aerostat → Orbital Salvage → Ghost Mall → Unmapped
- Each has *a personality*: grindy/safe, loot-rich/event-light, chaotic, lore-heavy
- Time-of-day variants — same map at 0300 vs 1400 reads differently
- Weather modifiers (fog mutes spot events, rain dampens audio events)
- Location *decay* — over-raid a place, loot dries up, recovers over in-game weeks
- Hot zones: temporary loot-multiplier flagged from intel
- Layered locations — surface raids unlock a sub-floor variant
- Loot categories per location (already in `IDEAS.md`)
- Random per-raid threat level (already in `IDEAS.md`)

---

## Hideout depth

Module candidates beyond the planned Workbench/Medbay:
- **Comms Array** — better intel, longer recall windows
- **Vault** — insurance against deaths
- **Hydroponics** — consumables (food, stims)
- **Radio Room** — intercept ambient events that hint at loot windows
- **Garage** — operative mobility / faster extracts
- **Training Room** — skill XP between raids

Other hideout texture:
- Power grid: modules compete for limited tick-power
- Module placement on a floor plan (slots, not factorio)
- Hideout level/quality stat that gates upgrades
- NPC residents (Fence, Doctor, Fixer) — each their own panel personality
- Hideout has *its own* feed: generator hiccup, water filter clog, mouse in stash
- Day/night palette shift in the UI itself
- Rare hideout-defense events — flip the script, you defend
- Decorations purely for vibe (posters, salvaged neon, plants that die if you neglect food)
- Mail terminal: junk mail, threats, fan mail, blackmail
- Power outages disable random modules for in-game ticks

---

## Crafting / items

- Schematic fragments — collect 3 pages to unlock a recipe (drip discovery)
- Modular weapons: receiver + barrel + stock + sight, each shifts raid math
- Item condition / decay → keeps stash dynamic, no infinite hoard
- Tinker bench: gamble low-tier into mid-tier with skill-flavored RNG
- Synergies: pair two specific items in pack to passive-buff a stat
- Consumables w/ teeth: stim burns alertness, ration restores stamina, comm-jam blocks one event
- Disposal/deconstruction — break items into raw mats

---

## Economy

- Multiple fences w/ different appetites (Junker / Curator / Black Doctor)
- Vendor moods (see High-leverage core bets)
- Rep tiers unlock secret stock (rare schematics, intel)
- Sealed auctions for rare items — three blind bids
- Bank deposits as death insurance

---

## Risk knobs

- Pre-raid insurance — partial loadout back on death
- Heat system: hammer one district, corp response level rises → harder events
- Bleed-out timer: downed op needs Recall in X events or dies
- Cargo drop: pick one bonus item to pre-stage on the map
- Witness cleanup with downstream consequences
- Conditional events: rain unlocks certain flavor lines, season changes some locations

---

## Faction / world

- Rival corp factions you can favor or anger; rep gates locations & vendors
- No morality, just leverage
- Faction events trickle into the feed regardless of raid choice

---

## Meta / narrative texture

- The "war" outside is *offhand-mentioned* in events, never explained — slow drip
- In-game date matters — corp scandal, blackout night, curfew week shift event tables
- Bulletin board with rumors that hint at hot zones
- Radio you can tune to in downtime, pure flavor station
- Encrypted files take in-game days to crack → lore + sometimes intel
- Newsfeed reacts to *your* aggregate behavior ("warehouse district emptied — corp investigates")

---

## Terminal flourishes

- First-boot-of-the-day sequence (skippable)
- Hidden CLI panel: `whois`, `status`, `decrypt`, `traceroute` easter eggs
- Static glitches tied to specific events
- Service Record (passive log, *not* a checklist — careful with the no-completionism rule)
- Tabs within Stash: Weapons / Meds / Junk / Intel
- Subtle terminal beep on critical event (mutable)
- Cursor blink, drag-drop with item-slot sound feel
- Stash organization upgrades — search, auto-sort, tabs

---

## Endgame / long tail

- Hire sub-handlers — each their own quirks, AI you delegate to
- "Deep raid": multi-leg expedition over many in-game days, layered Recall windows
- Inner sanctum room that grows w/ milestones, purely vibe
- The hideout becomes the game — raids fade, you're running a network

---

## Wild swings

- Async ghost-coop: send operative on a job *with another player's* operative (Death Stranding-style, not realtime PvP)
- "Dream" raids — when an op sleeps, weird symbolic raid plays out, junk loot but lore drops
- Anomalous events: rare reality-glitch raids that don't fit the corp-noir vibe at all
- A second operative type that never raids — works the hideout (Wurm skill grow on crafting)
- The dispatch AI starts sending you messages it shouldn't be able to

---

## Stat + RNG combat & loadout system

The integrating subsystem that makes everything else click. Currently events are timed text; this turns each one into a stat check that loadout puzzles into.

### Item functional categories

Every item belongs to at least one. Same item can flex (a Cracked Battery is junk now, material at Workbench T2):

- **Junk** — pure cash conversion. Some items meant to be this. Zero shame.
- **Materials** — Workbench fuel. Saw-or-sell tension.
- **Gear** — equipped pre-raid. Stat blocks, slot costs, condition.
- **Consumables** — burned mid-raid (stim, medkit, EMP, bait, bandage).
- **Intel** — spent pre-raid for run modifiers.
- **Tools** — situational unlocks (lockpicks, hacking deck, breaching charge, gas mask).
- **Trophies** — one-of-a-kind, hideout decoration, occasional passive bonus.

### Stat-check event resolution

- Operative stats: Stealth, Combat, Tech, Endurance, Perception, Nerve
- Each event has a check (`Tech vs door difficulty` for `locked_door`)
- Outcome resolves to *degrees*: crit success / success / fail / crit fail
- Player mid-event choice routes to a different stat check (Pick=Tech, Blast=Combat, Skip=Stealth)
- Loadout shifts which routes are viable

### Loadout slots (pre-raid)

- Primary weapon
- Sidearm
- Head / Chest / Legs armor
- 3–4 gear slots (tools, consumables, intel docs)
- Slot scarcity = the puzzle

### Operative skills (Wurm-style)

- Skills tick up per use, no XP screen — just stat drift in tooltips
- Stealth grows from avoidance, Combat from engagement, Tech from picks/hacks
- At hideout: spend in-game ticks training a chosen skill
- Ops organically specialize → roster becomes a deck of specialists

### Location ↔ gear interaction

- **Hard gates** — gas mask for Drowned District, IR for night raids, mag-clamps for Aerostat
- **Soft biases** — Server Farm rewards Tech, Slum rewards Stealth
- **Loot biases** + **threat curve** (already in `IDEAS.md`)

Picking a location becomes a four-way thought: which op? which loadout? which intel? which time-of-day?

### Consumables with teeth

Each a single-use slot decision:
- Medkit — heal mid-raid
- Stim — burn stamina for temp combat boost
- EMP — skip one tech-heavy patrol
- Bait / decoy — auto-resolve `spotted_patrol`
- Bandage — stop bleed timer
- Comm-jam — block one bad-event roll
- Cigarette — Nerve+ for next event (flavor + tiny mechanic)

### Intel as a 4th item type

Looted as data drives, badges, blueprints. Spent pre-raid:
- "Patrol schedule" → -1 patrol event
- "Vault location" → guarantees one rare-loot event
- "Maintenance hatch" → extends Recall window
- "Frequency hop" → comms degrade slower

Stash gets a 4th valid use: read-and-burn intel for run modifiers.

### Crafting necessity

- Best-in-slot is **crafted only** — never looted, never bought
- Workbench T1: repair, basic mods
- Workbench T2: combine items into mid-tier gear
- Workbench T3: legendary modded weapons via schematic + rare mats
- Crafted gear gets *named* flavor based on inputs

### Decision flow per raid (target shape)

1. Pick location (gates + biases + threat roll)
2. Pick operative (skill profile)
3. Pick gear (slot-limited loadout puzzle)
4. Spend intel (optional pre-raid mods)
5. Watch run (events resolve via stat + gear + RNG)
6. Mid-run choices leverage loadout
7. Recall window (stake management)
8. Return — gear wear, loot, skill XP, run summary

Every step touches the stash. Nothing is dead weight.

---

## Weapons + modding deep-dive

Player wants to lean here. Variety + mods = loadout identity.

### Weapon archetypes (different playstyles)

- **Suppressed pistol** — stealth, low ammo concern, weak vs armor
- **DMR** — long range, ammo precious, slow rate
- **SMG** — close-quarters, ammo hungry, mediocre at range
- **Breaching shotgun** — close + door utility, loud
- **Bolt-action rifle** — single-shot, max damage, slow
- **Energy weapon** — silent, expensive ammo, armor-piercing but low damage
- **Melee** — silent, no ammo, high risk, builds Nerve

Each shines in a *type* of raid; none dominates all.

### Mod slots

- **Sight** — iron / red dot / scope / IR / thermal (Perception shifts)
- **Barrel** — short / standard / long / suppressed (accuracy vs noise vs handling)
- **Stock** — folding / standard / heavy (recoil / stealth / handling tradeoffs)
- **Magazine** — small (fast reload, less ammo) / standard / extended (slow reload)
- **Underbarrel** — laser / grip / flashlight / breaching attachment
- **Ammo type** — soft mod, swappable per raid (standard / AP / hollow / sub)

Mods have **condition** and **brand**.

### Mod-weapon compatibility

- Not every mod fits every weapon (caliber families, attachment rails)
- Mods are loot in their own right — finding a specific scope is a real find
- Brand-set bonuses for matching mod families

### Crafted vs scavenged mods

- T1 workbench: nothing — pure scavenge era
- T2 workbench: craft mid-tier mods from materials
- T3 workbench: rare crafted mods via schematic + rare mats
- Creates a clear gear-rotation arc through play

---

## Gear slot expansion

Roll out *only as each slot earns its keep*. Don't add slots that always carry the same item.

### Tiered slot rollout

**Start with**:
- Head (helmet)
- Chest (armor)
- Boots

**Add when justified**:
- Eyewear (IR goggles, ballistic, prescription Tech glasses) — only if it gates raids the helmet doesn't already gate
- Face / mask (gas mask, balaclava) — only if Drowned District / contamination ships
- Gloves (Tech+ for picks, Combat+ for grip) — only if a stat needs another knob
- Outer clothing layer (jacket, hazmat overshell) — environmental + flavor
- Pants / legs — defer unless a leg-injury system needs it
- Belt (extra small consumable slots) — late-game capacity reward

**Probably skip**:
- Inner clothing — flavor-only is fine, mechanical slot is bloat
- Watch / accessory — gimmicky unless a real mechanic justifies

Rule of thumb: **a slot only earns its place if leaving it empty is a real cost AND filling it is a real choice.**

---

## Anti-meta — encouraging playstyle variety

User's explicit flag: prevent "always bring the objectively best loadout." Tools to enforce variety:

- **No strict upgrades** — every gear piece has a downside. Heavier armor = slower extract. Better optic = louder shot. Suppressor = damage drop. Rare ≠ always better.
- **Situational hard gates** — gas mask for Drowned District, IR optics for night, mag-clamps for Aerostat. Specific gear is *required* for specific raids → forces rotation.
- **Stat archetype conflicts** — Stealth and Combat want opposite gear. Maxing both is impossible.
- **Slot scarcity** — limited gear slots = "what do I leave behind?"
- **Operative skill drift** — ops naturally specialize via use. Switching playstyles mid-op is painful → roster becomes diverse.
- **Condition / wear** — favorite rifle eventually breaks down → forces backup rotation.
- **Rotating world modifiers** — heat system makes one district risky, vendor moods shift item economics, "today's hot zone" shifts location biases. Yesterday's best loadout is today's mid.
- **Diminishing returns** — past a threshold, more Stealth gives less per point. Spread > stack.
- **Anti-synergy / mutual exclusion** — equipping a suppressor disables a high-damage mod. Specific exclusions create real choice.
- **Risk/reward tiering** — light/fast = more loot capacity, less defense. Heavy = survivability, smaller haul.
- **Crit-fail scaling** — overspecialized loadouts crit-fail hard when the opposite check is forced. Pure-stealth op in a forced combat moment? Disaster.
- **Operative personality** — claustrophobic op refuses gas mask without Nerve hit. Loadout choice bends around the *person*.
- **Mid-raid event forks that punish the meta** — "Spotted by drone" punishes heavy armor (can't sprint). "Wet floor" hurts mag-clamps. "Quiet kill required" punishes loud weapons. Anti-meta events on a rotating draw.
- **Rare gear has *weird* tradeoffs** — the "Brickeye" helmet is great BUT blocks peripheral vision (Perception -1). Even high-tier gear is a choice, not a default.

---

## Emergent playstyle archetypes

Don't hardcode classes. These should *emerge* from gear + skill choices. Naming them just for shorthand:

- **Ghost** — stealth, suppressed pistol, ghillie, lockpicks. Avoid every event. Lower loot per run, consistent returns.
- **Hammer** — plate carrier, shotgun, breaching charges. Engage everything. High alertness, high reward, high risk.
- **Tinkerer** — hacking deck, lockpicks, EMP, light armor. Vault-runner. Slow, jackpot-focused.
- **Scavenger** — high-capacity loadout, light gear, fast extract. Many small pulls, low stakes.
- **Specialist** — location-keyed loadouts; rotates ops to match destination. Master-of-many.
- **Berserker / Wildcard** — high-variance gear that crits hard both ways. Lottery raids.

The system *names* the playstyle in the player's head, not in the UI.

---

## Loot Tetris & spatial inventory

User-flagged: enjoys Tarkov's spatial loot puzzle. Lean here.

- **Grid containers everywhere.** Backpack (raid-time), stash (home), secure container (death-proof mini), individual cases. Items have W×H. Rotation. Drag-place.
- **Mid-raid Tetris under pressure.** When loot drops, you have to fit it. Drop the canteen for the GPU? Tarkov tension AND active player input *during* the raid.
- **Cases within containers.** Tool case is a 3×3 item that opens its own sub-grid. Money case (collapses cash to a tile). Ammo case. Mod case. THICC case as endgame flex.
- **Container biases.** Weapon rack: only weapons but doubles density. Locker: only worn gear. Junk pile: anything but disorganized → search penalty when finding specific items. Cold storage: perishables don't decay. Vault: items can't be accidentally sold.
- **Ergonomic fit bonuses.** A loadout where everything packs cleanly grants a small "ready" bonus (faster recall, +1 mid-raid option, etc). Tetris feeds back into the run.
- **Extraction weight + sound.** Heavy hauls slow recall and trigger more `spotted` events. Greed has a cost.
- **Body slots vs backpack.** Pockets (1×1 only), rig (small grid), backpack (main grid), secure container (tiny but death-proof). Tarkov DNA — gives weight to "what do I really need *on me*."

---

## Loot accumulation & hoarding

User-flagged: enjoys hoarding / accumulation in Tarkov-likes. Lean here too. **This is probably the strongest candidate for the long-tail motivation engine** — independent of which depth pivot lands, the loot-identity pillar gives the game a 100+ hour reason to play.

### Item identity (instances, not types)

- Every item is a **unique instance** with name, brand, condition, history.
- Two Mk-IV rifles are different individuals: "Mk-IV 'Brickeye', stock chipped, two raids" vs "Mk-IV 'Plumline', factory fresh, never fired." This is what makes Tarkov players name their guns.
- Item history log: where found, raids carried, kills witnessed. Hover for memoir.
- After 50 raids you can't bear to sell that rifle. That's the design goal.

### Discovery / examination

- Items return partially-identified ("Unknown Optic, Mk-IV").
- Examining at hideout (in-game time) reveals stats, brand, flavor.
- Slows dopamine. Creates "what is this?" ritual.

### Collections / sets

- Set bonuses for matching brand/family items.
- Catalog progress (soft, *not* achievement-flavored): "Brands identified: 47" / "Brand catalogs: 3/12 complete."
- Some items appreciate over in-game weeks (vintage, collectible).

### Stash as place, not menu

- Stash is *rooms*: armory wall, pantry, workshop, trophy hall, vault.
- Visual upgrades (lighting, racks, pegboards, neon) — cosmetic, but the hideout looks more *yours* over time.
- Pin 3–4 favorite items to home screen. Your "main characters."
- NPC visits comment on the hoard ("nice rifle wall").
- Stash worth ticker prominently displayed. Hoarders love a number going up.
- Snapshot system to look back at empty day-1 stash later.

### Sell vs keep tension (the real game)

- Some items appreciate over time
- Some items have late-revealed uses (schematics, NPC asks)
- Vendor demand rotates ("Curator wants medical today, prices doubled")
- One-of items: once sold, that exact instance is gone forever
- Insurance has cost; can't insure everything
- Stash space is finite even at top tier; you have to curate
- "I knew I'd need this" payoff: a few times per session, hoarded items pay off → builds *trust-the-hoard* psychology

### Decay / churn

- Perishables decay: batteries lose charge, food spoils, meds expire. Forces churn on consumables.
- Weapons / gear / trophies are hoardable; consumables are not.

### Synthesis with depth pivots

If a deck/card depth pivot lands, items can grant cards (more of an item type → deeper deck; pinned/displayed items grant unique cards). If a verb-table pivot lands, items become workable cards on the table. If a multi-phase pivot lands, hoarded items shape recon and exfil options. **Hoarding feeds the active loop regardless of which pivot wins.**

### First-wave picks

1. **Item instances with name + history** — biggest emotional payoff per line of code; even before grids, naming each item makes them feel real
2. **Spatial backpack grid (raid-time)** — Tarkov's most beloved mechanic; makes mid-raid loot a real decision
3. **Stash as rooms with display pins** — turns the stash from a list into a place
4. **Examine ritual** — slows dopamine, creates "what is this?" moments

---

## Social / multiplayer hooks

Constraints: no realtime PvP (locked), pause-on-tab-close (locked), no clock gating (locked). The dispatch-terminal frame is *already* a network metaphor — handlers in fiction are connected. Lean into async.

### Tier 1 — Ambient presence (zero direct interaction, world feels populated)

- **Comms intercepts** — anonymized other-player raid logs occasionally bleed into your feed as garbled radio chatter
- **Global heat & faction tides** — aggregate player behavior moves the world; weekly bulletins reflect collective choices
- **Whisper network** — pre-raid, type a one-line message; gets anonymized + broadcast as flavor in another handler's feed
- **Network status as UI** — terminal shows other handlers logged in (callsigns scrolling), uptime, peer counts
- **Aggregated discovery feed** — "rare schematic recovered from Aerostat" / "handler somewhere lost an op," all anonymized

### Tier 2 — Async exchange (you affect each other, no scheduling)

- **Item provenance** — items carry history *across players*; the Mk-IV "Ironclaw" was once @vex's, then @ghost's, now yours. Items as shared cultural artifacts.
- **Operative graveyard** — dead ops' tags drop into a global pool; recovering and returning a tag earns rep + restores some of the original handler's gear
- **Bulletin board / classifieds** — async trade postings with item-for-item barter
- **Intel marketplace** — submit location reports after a raid; others buy them as pre-raid modifiers; you earn passive cash from quality intel
- **Dead drops** — hide an item in a location addressed to a specific handler; they raid it, find it, extract
- **Black market notes** — items sold to fences can carry coded messages for whoever buys them later

### Tier 3 — Async cooperation (real shared outcomes)

- **Co-signed raids** — 2–3 handlers pool ops + intel + gear into one operation; resolves async on a player-defined timer; loot splits proportionally
- **Operative loan** — lend your op as backup in another handler's raid; share loot; gain XP from raids you didn't watch
- **Crews (4–12 handlers)** — opt-in shared stash, base upgrades, async chat board, slow-burn shared "operations"
- **Mentor / mentee** — veterans tag newbies; mentor's intel/rep boost mentee runs; mentor earns passive cash from mentee success

### Tier 4 — Soft meta / fame (no high-score competition)

- **Hoarder leaderboards** — "most unique brands in trophy hall" / "longest-surviving operative" / "most-historic single item." Aligns with hoarding pillar.
- **Operative legends** — top operatives globally have public stat sheets; some unlock cameo events in your world
- **Hideout tours** — public read-only stash showcase
- **Item gallery** — most-storied items globally with full provenance chain

### Wild swings

- **The Holdout is one place in fiction** — all hideouts overlap diegetically; "the Holdout" is the same site in lore, you're in different rooms. Crossover events possible.
- **Operative inheritance** — your dead op's callsign passes to another player's roster; their new op "remembers" yours via flavor lines / sometimes a memento
- **Anomalous co-signs** — rare global "Anomaly" raids; any handler can co-sign from anywhere; signatures contribute to a slow shared event

### First-wave picks

1. **Comms intercepts + whisper network** — cheapest "world feels alive" win; tiny shared-message pool, no real backend
2. **Item provenance** — synergizes hard with the hoarding pillar; items become shared cultural artifacts
3. **Intel marketplace** — async, paid, useful, no ego/scoreboards
4. **Co-signed raids** — the one true "play together" mechanic that doesn't require simultaneity

These four together give the game a populated feel + real shared stakes + a friendship-tier mechanic, all within the locked constraints.

---

## Recommended starting points

If picking what to chase next, biggest leverage per effort:

1. **Item instances + history** (loot-identity pillar) — biggest long-tail payoff per line of code; underpins the whole hoarding direction
2. **Stat checks on existing events** — convert door/patrol resolution from "timer fires" to "stat roll vs difficulty." Foundational for any depth pivot.
3. **Tooling unlocks event branches** — a lockpick makes Pick the strong option. Cheapest way to make items *purposeful* immediately.
4. **Intel as a 4th item category** — reuses the existing loot pipeline, adds a whole pre-raid layer with minimal new UI.
5. **Spatial backpack grid (raid-time)** — Tarkov DNA; turns mid-raid loot into a real decision.
6. **Event chains** — small engine extension, big tonal payoff.
7. **Vendor moods** — adds daily texture for almost no code.
8. **Item tooltips that enrich with use** — discovery without checklists.
9. **Comms intercepts + whisper network** — cheap "world feels alive" win.
10. **The dispatch AI as a character** — defines the game's voice; cheap.

Items 6, 7, 9, 10 reinforce the "game is the UI" pillar that makes HOLDOUT distinct from "Tarkov but text."
