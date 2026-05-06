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

## Recommended starting points

If picking what to chase next, biggest leverage per effort:

1. **Event chains** — small engine extension, big tonal payoff
2. **Vendor moods** — adds daily texture for almost no code
3. **Item tooltips that enrich with use** — discovery without checklists
4. **The dispatch AI as a character** — defines the game's voice; cheap

Note: items 1, 2, 4 all reinforce the "game is the UI" pillar that makes HOLDOUT distinct from "Tarkov but text."
