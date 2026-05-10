# Location Ideas — 2026-05-10

Brainstorm of new raid locations beyond the current roster (Warehouse T1, Subway T2, Drone Graveyard T2, Datacenter T3, Biolab T3). Each entry notes its gear/risk profile and any new engine systems it would require.

---

## 1. Cargo Skylift — T1, low-mid
A wind-shaken freight elevator stack on the side of an arcology. Short, vertical raid. Mostly mechanical + consumables; rare valuables from courier lockboxes.
- **New mechanic (lightweight):** "vertical map" — narrower (5–6 wide) but taller (8–10) map. Tests the engine's tile renderer with a non-12-wide strip. Good first stress test for non-default map shapes.
- **Risk twist:** higher Energy drain per move (climbing).

## 2. Floodline Marina — T2, mid
Sunken marina district, half tide-locked. Smuggler caches in capsized hulls.
- **Heavy `valuables` + `consumables`**, weak on military.
- **New mechanic:** *tide window.* The raid has a soft length cap (~80–100 ticks) after which extract penalties scale; "tide rising" log entries telegraph it. Gives the location its own pacing identity vs. timeless dungeons.

## 3. Rooftop Antenna Farm — T2, mid
Decommissioned broadcast spires above the smog layer. Low patrol, high silhouette.
- **Heavy `electronics` + `intel`.** Rare drop: *Comms Decryption Schematic* (future workbench unlock).
- **New mechanic:** **exposure** — being on gantry/open tiles bleeds Heat (attention) up faster than usual. Doubled chance of "spotted" events outdoors. Indoor structure tiles are safe.

## 4. Pharmacorp Distribution — T2, mid
Former Triton-Saxon distribution warehouse. Extreme medical-category density. Patrolled by autonomous logistics bots.
- **Specializes:** medical + consumables, lots of bots = mechanical scrap on combat.
- **Reason to go:** cheapest reliable source of bandages/medkits if you've burned through stash. No new mechanics — just a category-density extreme.

## 5. Casino Vault Sub-Levels — T3, high
Bombed-out luxury casino; the floor is rubble, the basement is full of unclaimed chips and safe-deposit boxes.
- **Specializes:** `valuables` heavily, low everything else. High cash-per-raid ceiling.
- **New mechanic:** **"safe rooms"** — a new room type (`vault`) where loot is gated behind an interrupt mini-action (Crack / Brute / Skip) instead of normal pickup. Reuses the existing interrupt pattern.
- **Unlock:** Vault Job Tip-off (rare intel drop).

## 6. Refugee Camp Black Market — T1–2, low
A semi-friendly location — patrols replaced by territorial scavengers. Combat is *optional*; lots of barter opportunities.
- **New mechanic:** **NPC trade events.** Mid-raid you can sell/buy at terrible-but-real prices — turn a heavy junk haul into cash *during* the raid to free pack space. Tests an "in-raid economy" wedge ahead of the shop phase.
- Gear demand: stealth-light, social-flavored. Aggressive behavior tanks rewards.

## 7. Maglev Tunnels (Active Line) — T3, high
Still-running corporate transit tubes between arcologies. Sneak between train passes.
- **New mechanic:** **scheduled hazard ticks** — every N ticks, a "train inbound" warning fires; if the operative is on a corridor tile when it arrives, big damage. Forces tile-type awareness and adds a non-combat threat. New room type or just a flag on existing corridor tiles.
- Loot: heavy intel + electronics from cargo cars.

## 8. Cathedral of the Last Algorithm — T3, high
Cult-occupied data shrine in a converted basilica. Religious-tech salvage; unhinged worshippers.
- **Heavy `experimental` + `intel`.** Rare drops include unique cult-only items (different name flavor, same stats).
- **New mechanic:** **alertness propagates.** Combat in one room raises the entire map's threat for the rest of the raid (not just nearby tiles). Distinct alarm flavor vs. other locations.

## 9. Frozen Substation — T2, mid
Geothermal plant gone cold. Deep snow above, frosted-over machinery below.
- **New mechanic:** **Energy drains 1.5×**, but Heat caps lower (cold environment) — different math, different optimal kit.
- Heavy mechanical + electronics; rare military from a buried checkpoint.

## 10. Triton-Saxon Penthouse — T3, high
A single-floor luxury exec residence. Tiny map (e.g., 6×4), dense valuables, one nasty bodyguard archetype.
- **New mechanic:** **boss room** — one fixed tile contains a guaranteed combat encounter with a much harder enemy archetype than current spawns. Tests adding a non-random map feature.
- Specializes in `valuables` + `intel`; minimal junk filler.

## 11. Orbital Drop Site — T3+, high (one-shot windows)
A randomly-landed corp resupply pod that broadcasts coordinates for a limited window.
- **New mechanic:** **time-limited availability** in the location list — appears on the Ops Console for a session-counter, then disappears (no real-world clock; pure session-tick). Player has to pick: "go now or lose it." First scarcity-flavored location.
- High reward, narrow loot table (mostly experimental + military, rolled high tier).
- **Unlock:** drops a *Drop Beacon* item from any other raid; consumed on use.

## 12. The Wormline (Sewer Beneath the Biolab) — T4 (new tier), very high
Connects to Biolab — only accessible if you've completed Biolab raids; entry is "from inside" (different flavor).
- **New mechanic:** **branched location entry.** A new location whose unlock is "complete N Biolab raids," not an item. Models a graph of locations rather than a flat list — useful pattern for endgame content.
- Heavy `experimental`, very dangerous, distance-to-extract is huge.

---

## Cross-cutting engine work

Several ideas surface reusable systems worth doing once:

- **Map shape variants** (vertical, tiny boss-floor, large) — generalize `mapWidth`/`mapHeight` per location.
- **Per-location stat-drain modifiers** (Energy×1.5, Heat-cap variants) — a `stats` modifier block on `Location`.
- **New room types** (`vault`, fixed `boss`) — minor extension to `roomTypeWeights` + handlers in `engine/map.ts`.
- **Time-limited / chained unlocks** — extend the `unlock` discriminated union beyond `consumable` / `permanent` to include `session_window` and `chain` (depends on completing X).
