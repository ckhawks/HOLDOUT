# Combat Revamp Plan — 2026-05-11

A working spec for the combat overhaul. Captures the design conversation up to this point. To be tweaked after a code-state investigation pass.

## Why

Current combat is one-shot — once you can afford meds + food + a basic backpack you're effectively unkillable. Survival should be **probabilistic, not guaranteed**. Even a fully-kitted operative should have a real (~1-5%) chance of going down against trash mobs from a lucky roll or a misplay. Balatro-flavor: you stack modifiers, you see the odds, you take the bet.

The fairness contract is **visible odds before commit**. A 22% line that flips against you should feel like "rolled unlucky," not "the game cheated." This is the single most load-bearing UI rule in the whole system.

## Decisions locked 2026-05-17

Resolved during plan review. Read these before the rest of the doc — they override anything below that contradicts.

- **Enemy intent is telegraphed, not hidden.** Each enemy's stance for the upcoming round is shown on its row before the player commits. Derived from archetype + previous round state (Brawler closing + Pressing, Sniper opening + Pressing at range, etc.). This makes the shown odds *truthful*, not estimates — the fairness contract holds. Player-facing read: "I knew the Brawler was charging and I Pressed anyway" is a story; "the game rolled hidden and got me" is not.
- **Mid-raid save migration: clear the flag, keep the loot.** When a save with `combat_engaged` set loads under the new schema, drop the flag, log a one-line "contact broken" entry, leave the operative on their current tile with everything they were carrying. No forced raid-failure, no synthesized `CombatState`. The threat tile they engaged is treated as having fled.
- **Item stats live on the catalog (`ITEMS[id]`), not on `StashItem` instances.** `weaponStats` / `armorStats` / `helmetStats` / `procs` are read from the data record at use-time. Stashed items don't carry a copy. This means schema bumps that grow the stats shape don't require per-instance backfill migrations — a player's hoarded Worn Carbine picks up new fields automatically when the catalog gains them.
- **Fairness contract is honest because of telegraphing.** With enemy intent visible, the chip's "78% you hit / 22% they hit you" is exact for this round, not an average over a hidden distribution.

## Player view — slice by slice

What you'll actually *feel* changing as each slice lands. The engineering work is below; this is the same plan from the player's chair.

- **Slice 0 — new gear slots come alive.** Weapons, armor pieces, and a helmet appear in loot and can be equipped into the slots that were dead before. No combat change yet. You can plan a loadout that *means* something next slice.
- **Slice 1 — combat takes more than one click.** Engagements become multi-round. You see the enemy on the combat panel and you Press until they're down or you are. Stakes go up — combat isn't a 0.5s die-roll anymore.
- **Slice 2 — stances + visible odds.** You pick Press / Suppress / Reposition / Disengage each round, each chip shows the math. First slice where good decisions feel like good decisions.
- **Slice 3 — distance matters.** Combat tracks a distance band (Point Blank → Far). Your weapon has a sweet spot. Repositioning lets you fight at your range. New enemies (Sniper opens distance, Brawler closes) push or pull you out of that sweet spot.
- **Slice 4 — armor that actually does something.** Hits roll Location (head / chest / limbs / gap) and Pen vs Armor. A plate either holds the threshold or doesn't. Seam shots (~2%) bypass armor — your dedicated lucky-shot lethality.
- **Slice 5 — recon before you commit.** Walking next to a threat tile reveals partial info — maybe just count and archetype, maybe HP and weapon, depends on observability. You see what you're walking into.
- **Slice 6 — initiative matters.** Whoever started the fight gets a free round 0. Heat-gated ambushes (between-tile rolls) can flip that against you.
- **Slice 7 — gear procs.** Items carry conditional bonuses (Bipod after a Reposition, Adrenaline after taking damage, Suppressor for silent round 0 kills). Loadout builds become a thing.
- **Slice 8 — rare catastrophes.** Weapon jam at the worst moment. Enemy crit-stack. Ambush-from-behind. Stories you remember, gated so they hit at most once a long fight.
- **Slice 9 — content + tuning.** More archetype variants and procs, numbers tuned based on what felt off in 1-8.

## Core scope (load-bearing)

### Engagement entry
- **Chosen** — you move into a visible-threat tile. You get round 0 (free attack at base accuracy).
- **Ambush** — they triggered you (between-tile roll, Heat-gated). They get round 0.

### Recon — passive, unordered, observability-driven
Moving into a tile auto-reveals partial info about adjacent threat tiles. **Info pieces are unordered** — you draw some subset of the available facts, not a "tier 1 unlocks tier 2" ladder. Better observability (gear, eventual scan ability, intel finds) increases the number and detail of pieces you get, not a fixed sequence.

Available info pieces (any combination possible):
- Enemy count
- Archetype(s)
- Starting distance band (if you initiate)
- Est. HP
- Armor class
- Equip / weapon hint
- Specific stats (top-tier observability only)

Active scan / intel / scanner gear are parked for later. v1 just leans on tile-entry passive reveal.

### Multi-round combat
Each round, pick a stance:
- **Press** — attack at current band, high return fire. Strong vs Brawler.
- **Suppress** — lower their next-round accuracy.
- **Reposition → Close In / Fall Back** — ±1 distance band, cover bonus next round.
- **Disengage** — roll to break off. Modified by distance + Heat + gear. Failure = enemy free hit, stay in combat.

**Simultaneous resolution.** Everyone picks, everything resolves together. Round 0 is the only asymmetric round.

Round length / decision timer ≈ current action-decision timer (reuses the interrupt-event timer pattern and chip UI).

### Distance bands
Combat tracks distance: **Point Blank / Close / Medium / Long / Far** (5 bands).

- Each weapon has an effective band (SMG → Close, Carbine → Medium, Sniper → Long). Accuracy drops sharply outside the band.
- Archetype intent drives enemy movement: Brawler closes 1/round, Sniper opens 1/round, Grunt holds.
- Reposition is the player's distance lever. Pick the direction that puts you in your weapon's sweet spot.
- Disengage difficulty scales with distance — easier at Far, much harder at Point Blank.

### Layered damage resolution
Each incoming attack rolls:
1. **Hit** — their accuracy (band-modified) vs your evasion/stance.
2. **Location** — head / chest / limbs / gap. Armor coverage % per slot. Gap is always a small unprotected slice that can't be eliminated.
3. **Pen** — threshold model: their pen ≥ your armor → through; pen < armor → mostly stopped.
4. **Damage** — variance even on through-hits.

### Seam-shot crit slot
Flat ~2% chance any incoming hit bypasses armor entirely. Gear reduces but never to zero (helmet -1%, plate -1%, never below ~0.5%). This is the dedicated **lucky-shot lethality** lever, Tarkov-flavor. Isolated and tunable.

### Catastrophic floor events
Very rare (~0.5-1% per combat each):
- Weapon jam at worst moment — skip your round, enemy free shot
- Enemy crit-stack — their next hit auto-rolls seam
- Ambush-from-behind — round 0 hit ignores stance defense

Stories, not punishments. Gated to combats long enough to matter.

### Visible odds before commit
Every stance chip shows the math:

> Press — 78% you hit, 22% they hit you, est 2 rounds

This is the fairness contract. Without it, RNG feels cheap. With it, every death is a bet that didn't pay off.

The odds are honest (not averaged over a hidden enemy distribution) because **enemy intent is telegraphed** — each enemy row shows the stance they'll take this round, derived from archetype + previous round state. You see Brawler-Closing-Pressing before you commit your stance. See "Decisions locked 2026-05-17" up top.

### Loadout = stack of modifiers + conditional procs
Gear is statline + sometimes a conditional bonus. Examples:
- "Bipod: +15% acc when Reposition was last stance"
- "Adrenaline Stim: +20% acc next round after taking damage"
- "Threaded Suppressor: round 0 kills don't add Heat"

Long-term build variety lives in the proc system. Balatro-joker-flavor.

### Mid-turn instant actions (don't consume a stance)
- Meds
- Food
- Reload

### Full-turn consumable actions (replace stance pick)
- Grenade
- Smoke
- Other thrown / heavy consumables

### Target selection in 1vX
Auto-target highest threat with a **free mid-round override** click. Not a separate stance pick.

### Three archetypes for v1
Engine reads generic stat blocks; archetypes are data presets:
- **Grunt** — baseline, no special intent, low pen low HP
- **Sniper** — high damage, opens distance, punishes Press, rewards Reposition (Close In)
- **Brawler** — closes distance, punishes Reposition (Fall Back), rewards Press

### Armor + penetration — threshold model
Plates absorb up to threshold; AP rounds bypass. Drives clean "this gun won't touch their plates" reads.

### Weapon condition ↔ jam chance
Existing condition stat gains bite — degraded weapons jam more often.

### Post-combat readout
Brief log:

> R1: they missed.
> R2: chest hit, plate held.
> R3: seam shot, 12 dmg, bled.
> R4: you killed Grunt.

Lets the player replay the bet and learn from it. Makes the rare deaths feel earned.

## Parked for later (write-down, not v1)

- **Operative skills** — Marksmanship / Composure / Field Medicine / Athletics / Tactics. Grow per-use. Hook into existing rolls as another modifier source. Perk picks at milestones.
- **More archetypes** — Hacker (gives Suppress unique utility — interrupts their disable each round if not silenced). Pack-of-grunts (gives grenades real value).
- **Mid-fight reinforcement waves** — chance for more enemies to join an ongoing engagement.
- **End-game HP pool expansion** — keeps seam-shot lethality proportional at top-end power levels.
- **Active scan ability / scanner gear / intel finds** — more ways to gather recon info beyond tile-entry passive reveal.
- **Top-tier recon gear** — scan drones, multi-target sweeps, hideout module pings.
- **Wheel-of-fortune item** — 25% chance modifier roll, not combat-specific. Separate Balatro-flavor BACKLOG entry.

## Example combats

**1. The clean win.** Geared op, IIIA plate + suppressed carbine, vs lone Grunt. Tile entry revealed Silhouette + Distance (Grunt at Medium). You move in: round 0 free shot, suppressor means no Heat tick. Grunt at low HP. Round 1 you Press, kill. Two rounds total. No damage.

**2. The grind.** Mid-tier op vs Sniper. Recon revealed archetype but not HP. You initiate (round 0 partial hit). Round 1 chip says Press 71% / they 28%. You pick Reposition → Close In (correct read vs Sniper). They miss. Round 2 Press, hit. Round 3 they hit chest, plate threshold holds, you take 3. Round 4 Press, kill. Leave at 78% HP, 40% ammo, +1 Heat. Earned.

**3. The lucky-shot loss.** Top-geared op gets ambushed (Heat hit between-tile roll). Two Grunts get round 0. First grunt: hit → gap → seam-crit proc → 14 dmg straight to HP + bleed. You Press round 1, kill one. Round 2 try Disengage — Heat high, roll fails, second grunt hits you. Round 3 stim and Press, kill the second. Bleed and Heat cascade kill the op two tiles later. Post-combat readout shows the seam shot. "Got got," not "cheated."

**4. The misplay.** Press into a Sniper without scanning. Round 1 Sniper hits chest, plate holds, you take 4. Round 2 keep Pressing — chest hit, threshold *fails*, 11 dmg. Panic-pop a med (mid-round, free). Switch to Reposition → Close In round 3. Sniper misses. Round 4-5 Press, kill. Leave at 30% HP, short on meds. Survivable misplay.

**5. The disengage that worked.** Round 3 of a Brawler fight, ammo low, HP 50%. Press odds dropping (Brawler at Close). Hit Disengage — moderate Heat, +Athletics gear, roll succeeds. Brawler parting swing misses. Out, scarred, alive.

The shape: **good gear + good reads = high-probability survival, but never 100%. Mistakes compound. Rare bad rolls are catastrophic but visible. Death stories are always *something specific that happened* — seam shot, failed disengage, ambush on high Heat — never "dice hated you."**

## Code state — 2026-05-11 ground truth

Verified against the codebase before writing the slices:

- **Combat today** lives in `engine/raid.ts:515-568` (`handleFight` / `handleFlee`) and is **one-shot, flag-driven**. A `combat_engaged` flag on `runState.flags` gates eligibility in `engine/actions.ts:59-70`. Outcome is a fixed `rand() < 0.55` split (target_down / trade_shots / target_fled). No `CombatState`, no enemy data is read.
- **`ActionTickResult`** (`raid.ts:596-625`) already has `combatOutcome` and `pendingChoice` — the new combat will extend this with multi-round state on `CurrentRaid` rather than a per-tick outcome.
- **No `enemies.ts`** exists. Threat tiles (`MapTile.threat`) are a single boolean. Threat seeding is in `map.ts:269-271` (~10% of eligible tiles).
- **Item type has no stat fields.** `EquipSlot = "bag" | "rig" | "weapon" | "armor" | "helmet"` exists but the `weapon` / `armor` / `helmet` slots are unused — comment at `types.ts:17` confirms *"slots exist but nothing reads stat effects yet."* No weapons, no armor, no helmets in `data/items.ts` today. Military-category items (Combat Knife, Ceramic Plate, Frag Grenade, Mil Optic, Suppressor Tube) exist but have no `slot` field, so they aren't equippable.
- **BranchModal + PendingChoice** (`components/panels/BranchModal.tsx`, 10s timer, arrow-key nav, auto-resolve on timeout) is the right reuse target for stance picks.
- **Patrol interrupt** today (`spotted_patrol` event in `data/events.ts:65-112`) has Hide / Engage / Reposition outcomes. Engage flips the `combat_engaged` flag; in the new model it instead initializes `currentRaid.combat`.
- **SCHEMA_VERSION = 30** (`engine/save.ts:15`, bumped today for construction). Every slice that touches save shape bumps it and writes a migration.

### Implications for the slice plan

- The plan's old "Slice 9 — data pass" framed the work as backfilling stats onto existing weapons. There are no existing weapons. **Add a Slice 0 to introduce weapons / armor / helmets as a class of items at all** — minimum 1-2 weapons, 1-2 armor pieces, 1 helmet, with placeholder stats. Each later mechanical slice adds the stat dimension it needs (band, threshold, coverage%) to those items rather than introducing items wholesale at the end.
- The `Item` type needs new optional fields: `weaponStats?`, `armorStats?`, `helmetStats?`, `procs?`. Add only the fields each slice needs, when it needs them — no speculative shape.
- The `combat_engaged` flag gets removed in Slice 1 in favor of `currentRaid.combat != null`. Action eligibility checks in `engine/actions.ts:59-70` are updated to read the new shape. The Engage outcome of `spotted_patrol` calls a new `initCombat(...)` rather than adding the flag.
- `MapTile` gains an optional `enemySpawn` (deterministic at map gen — what enemies the tile holds) and a `recon` field (a set of revealed info pieces). Adding both means Slice 0's map-gen pass can already seed `enemySpawn`, even before Slice 5 reads it for recon.

## Implementation plan — slices

Each slice leaves the game playable. Slices 1-4 are the "is this fun?" gate; tune before pushing 5-9 if needed.

### Slice 0 — weapons / armor / helmets exist
Introduce the first equippable items in these slots so later mechanical slices have something to attach stats to. Placeholder stats fine; only the *fields* matter.

- New: `Item` type extended with `weaponStats?`, `armorStats?`, `helmetStats?` (optional, shape evolves per slice). Stats live on the catalog (`ITEMS[id]`) only — `StashItem` instances carry just `itemId` and never a copy of stats. Future slices that grow the stats shape don't need per-instance migrations. New item entries in `data/items.ts`: 1-2 weapons (e.g., Scavenged Pistol, Worn Carbine), 1-2 armor pieces (e.g., Soft Vest, Plate Carrier), 1 helmet (e.g., Salvaged Helmet). All carry a `slot` field so they route to equipment slots.
- Touches: `map.ts` gen pass adds optional `enemySpawn` to tiles where `threat === true` (no enemy data yet — just the shape and a placeholder).
- Schema: v31 — migrate existing saves (add empty `enemySpawn: undefined`).
- No felt change in combat yet; player can equip items into previously-dead slots.

### Slice 1 — multi-round combat skeleton
Replace today's one-shot `handleFight` / `handleFlee` (`raid.ts:515-568`) with a `CombatState` on `CurrentRaid` and a pure round resolver. Single stance only (Press). Introduce a minimal `enemies.ts` data file with one stat block ("Grunt") that the resolver reads. New post-combat readout entry. Spine in place, testable.

- New: `engine/combat.ts` (pure round resolver), `CombatState` shape on `CurrentRaid`, `data/enemies.ts` with one entry, combat UI panel that takes over when `currentRaid.combat != null`.
- Touches: `engine/actions.ts:59-70` (eligibility now reads `currentRaid.combat != null`, not the flag), `engine/raid.ts` (`handleFight` becomes `initCombat` + the tick loop calls `resolveCombatRound` while `currentRaid.combat != null`), `spotted_patrol` event Engage outcome calls `initCombat`, remove `combat_engaged` flag entirely.
- Schema: v32 — migrate by clearing legacy `combat_engaged` from any persisted flags and ensuring `currentRaid.combat` defaults to `undefined`. If a player loads mid-raid with the flag set, drop it, append a `combat_resolved`-kind log entry ("Contact broken. Threat slipped away.") and leave the operative on their current tile with all pack/equipment intact. No forced raid-failure, no synthesized `CombatState`. See "Decisions locked 2026-05-17".
- Tests: deterministic round resolution, multi-round HP tracking, RNG seeded, save migration clears the legacy flag.

### Slice 2 — stance system
Add Press / Suppress / Reposition / Disengage. Reposition single chip for now (no direction). Disengage uses a roll modified only by Heat. Combat panel shows stance chips — **reuse `BranchModal` / `PendingChoice`** (10s timer, chip rendering, auto-resolve on timeout). **Visible odds on each chip from day one.**

- New: stance enum on `CombatState`, stance-effect resolver, odds-display helper (returns `{ hitPct, takeHitPct, estRounds }` from current state).
- Touches: `BranchModal` may need a small extension to support stance-style chips (or a sibling component `CombatStanceModal` if cleaner).
- First slice with felt change.

### Slice 3 — distance bands + per-weapon range
Add Distance to `CombatState`. Reposition splits into Close In / Fall Back. Weapons get `band` stat on `weaponStats`. Archetype intent enum on enemy data — engine reads it each round.

- New: distance band constants, `weaponStats.band`, `weaponStats.bandFalloff`, archetype `intent` enum (`hold | close | open`).
- Touches: hit-chance math is now band-modified, Reposition splits in chip UI, enemy moves a band per round per intent.
- Backfill Slice 0 weapons with band stats.
- Add 2 more enemies to `enemies.ts`: Sniper, Brawler.

### Slice 4 — layered damage resolution
Hit → Location → Pen → Damage as discrete pure-function rolls. Seam-shot constant (`SEAM_SHOT_PCT = 0.02`). Armor threshold model. Backfill Slice 0 armor + helmets with `threshold` + `coverage` per location.

- New: `resolveHit`, `rollLocation`, `resolvePen`, `rollDamage` as separate exported helpers in `engine/combat.ts` for testability.
- Touches: enemy stat blocks gain `pen`. Armor items gain `armorStats: { threshold, coverage: { head, chest, limbs } }`. Helmets gain `helmetStats: { threshold, headCoverage }`.

### Slice 5 — recon on tile entry
Adjacent threat tiles roll an info-piece draw on first reveal. **Pieces are unordered** — any combination from {count, archetype, starting distance, est HP, armor class, equip hint, exact stats}. Better observability (gear, eventual scan, intel) increases pieces drawn and detail level. Pieces stored on `MapTile.recon`. Threat-tile tooltip surfaces them. Pre-combat preview panel (on tile entry / pre-engage) shows the same pieces plus the engagement-start distance.

- New: `recon: ReconPiece[]` field on `MapTile`, info-piece draw helper, preview panel.
- Touches: `map.ts` tile-entry pass populates adjacent threat tile `recon`. Map tooltip component reads `recon`.

### Slice 6 — round 0 + ambush
Initiator gets round 0. Ambush trigger (Heat-gated between-tile roll, mirror of patrol interrupt logic) gives enemy round 0. Combat panel surfaces who got it via the post-combat readout and a banner in-fight.

### Slice 7 — conditional gear procs
Items can carry a `procs: ItemProc[]` field that the round resolver consults. `ItemProc = { trigger: enum, effect: enum, value: number }`. Three or four launch procs to validate the system (Bipod, Adrenaline Stim, Suppressor, etc.).

- New: proc trigger + effect enums, resolver consults proc list each round.
- Touches: Slice 0 items get procs where appropriate (Suppressor → `round0KillsNoHeat`, etc.).

### Slice 8 — catastrophic floor events
Jam (~1% per combat, ties to existing `weapon condition` stat — degraded weapons jam more often), crit-stack (~1%), ambush-from-behind (~0.5%). Low-% rolls in the resolver. Distinct readout lines so they read as stories.

### Slice 9 — content + tuning pass
After playtest of 1-8: expand archetype variants (Veteran Grunt, Wounded Sniper, etc. — all data presets, no engine work), write 6-10 more conditional procs across gear, tune band-vs-accuracy curves and seam-shot floor based on what feels right in play.

## Engine design notes

- **Generic stat blocks, not classes.** The combat resolver doesn't know "this is a Sniper" — it reads `{ hp, accuracy, pen, armor, preferred_band, intent, gear, procs }` from data. "Grunt" / "Sniper" / "Brawler" are data presets in `lib/data/enemies.ts`. Adding `Veteran Sniper`, `Wounded Grunt`, etc. later is a data-layer addition, not an engine change. A "boss" enemy is just a stat block with high numbers — no special handling required.
- **Movement intent is an enum on data** (`hold | close | open | erratic`), not a class.
- **Procs are data, not code.** A `proc` is `{ trigger: enum, effect: enum, value: number }`. The resolver has a switch over trigger/effect enums. Adding a new item proc is a data entry; adding a *new kind* of proc is an engine change (small, localized).
- **Stay pure + seeded.** All combat math takes `rand: () => number` and returns next state. Wall-clock comes from the store only. Same discipline as the rest of `lib/engine/`.

## Open / parked questions

- Exact cadence of stance chip timer (matches existing action timer for now — tune in playtest)
- Whether the post-combat readout is always-shown or expandable
- Exact band-vs-accuracy curves per weapon class (numerical tuning, do in slice 3-4)
- How "ambush from behind" catastrophic event actually surfaces in UI (a flash interrupt? a readout line?)
