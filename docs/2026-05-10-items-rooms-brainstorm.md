# Items, Rooms & Hideout Utility Brainstorm — 2026-05-10

Brainstorm session covering: current locations + room types, item ideas keyed to those locations (corpo/post-collapse 2090 flavor), hideout room/feature expansions, and the variety of ways items could feed hideout modules instead of just being sold.

This is ideation — not a commitment. Pull from this when planning module or content work.

---

## 1. Current locations & room types

**Locations** (`src/lib/data/locations.ts`):
- **Warehouse** (T1, low) — abandoned logistics hub
- **Subway** (T2, mid) — flooded transit tunnels, dense blockers
- **Drone Graveyard** (T2, mid) — auto-salvage yard for retired security drones
- **Datacenter** (T3, high) — keycard-gated, coolant-fire damaged server farm
- **Biolab** (T3, high) — Triton-Saxon R&D, coords-gated

**Room types** (used in `roomTypeWeights`):
- `corridor`, `storage`, `mechanical`, `gantry`, `office`, `locked`

---

## 2. Item ideas by location (corpo/post-collapse 2090 flavor)

Existing categories: mechanical / electronics / medical / consumables / valuables / intel / military / experimental / bag.

**Warehouse** — pallet jack handle, freight seal, forklift key fob, packing-foam blocks, barcode scanner, Triton shipping tape, broken dolly wheel, drum of unmarked grease, expired logistics coffee, contraband pallet (sealed, mystery contents).

**Subway** — service tunnel keyring, soaked transit map, conductor's flask, mildewed transit-cop badge, third-rail insulator, emergency phone receiver (cut), waterlogged paperback, brass-and-leather token from a vending booth, bag of moldering cash, "Lost & Found" tag bundle, signal-relay box, rebreather filter.

**Drone Graveyard** — drone chassis husk, gyro stabilizer, IR sensor cluster, half-charged power cell, severed manipulator arm, drone-pilot dog tag, scorched circuit fan, motor windings, gimbal bracket, swarm-coordinator chip, obsolete firmware ROM, recycler's torch tip.

**Datacenter** — server blade, melted RAM stick, fiber bundle, biometric reader, exec NDA tablet, redacted email cache, coolant phial (volatile), heatsink tower, KVM dongle, badge of a dead admin, root-cert smartcard, leaked source-code spool.

**Biolab** — sealed petri stack, gene-print cartridge, autoclave key, lab-grown organ in nutrient gel, pheromone vial, neural-graft kit, prototype combat chem, mutagen sample, animal-test data slate, scientist's panic note, cryo-canister.

**Cross-cutting flavor** — corp ration coupons, branded merch (Triton-Saxon mug, Saxon-Yamada lighter), faction armband, blackmail polaroid, pre-collapse newspaper, pre-war currency, kid's drawing in a wallet, mil-surplus MRE, old-world cigarettes (always sells well), stim inhaler, faraday pouch, lockpick set, thermite charge, EMP grenade, pheromone lure (anti-drone).

**New categories worth considering** — `tool` (lockpicks, multitool, welder), `chemical` (acid, accelerant, coolant), `crafting_component` (catch-all to feed the workbench cleanly).

---

## 3. Hideout rooms / features

Already designed/locked: **Stash, Workbench (locked), Medbay (locked, later phase), Ops Console, Vitals, Live Feed**.

Brainstormed expansions:

- **Armory** — dedicated weapon/mod storage + loadout presets per location
- **Reloading bench** — convert spent casings + powder into rounds
- **Server rack / Decryption suite** — process Encrypted Drives & Corrupted Data Slugs into intel currency or unlocks
- **Forge / Smelter** — consume Scrap, Tungsten Gear, Exotic Alloy into ingots/components
- **Greenhouse / Hydroponics** — consume Vitamin Shots / Tea Bricks; produces ration packs over in-game ticks
- **Drone Bay** — assemble salvaged drone parts into a scout drone (pre-raid intel)
- **Black Market Comms / Fence Desk** — better sell prices, daily rotating buyer demands
- **Bio Vault** — store unstable Biolab finds without spoilage
- **Map Room / Intel Desk** — burn intel items to reveal future raid map fog
- **Safe Room / Vault** — secure stash that survives if hideout is ever raided (future systems)
- **Recreation Nook** — flex/display rares (collector pins, art chips), morale bonus
- **Generator Room** — Fuel Cells / Cracked Batteries power other modules; brownouts if undersupplied
- **Dog kennel / Companion alcove** — future second operative or pet
- **Trophy wall** — display rare experimental finds for passive bonuses

---

## 4. Item → hideout utility ideas

Principle: most items already **sell**. Make a *subset* also feed a module so the player chooses sell-vs-invest. Some items should require **combinations** to spend, so category-hoarding becomes meaningful.

- **Scrap Metal / Rusted Bolt / Spring Coil** → Forge feedstock for crafting components; or Workbench repair stock for armor/weapon condition
- **Copper Wire / Microchip / Cracked Battery** → wire up new hideout modules (consumed at install)
- **Fuel Cell** → Generator Room; powers Workbench tier-2, Decryption suite
- **Coolant Loop** → required to install Server Rack; one-shot consumed
- **Capacitor Bank / Quantum Capacitor** → speeds Decryption Suite jobs
- **Optic Lens / Mil Optic / Prototype Lens** → Workbench mod for the operative's scope/sight
- **Signal Jammer** → Drone Bay component; or pre-raid burn to reduce starting alertness
- **Holo Display** → install in Map Room to expand fog-reveal radius
- **Bandage / Gauze / Antiseptic / Iodine** → Medbay restock; cheaper injury recovery vs. selling
- **Med Syrette / Combat Stim / Nano-Clot** → load into pre-raid kit slot or stockpile in Medbay reserve
- **Vitamin Shot / Electrolyte Pouch** → Greenhouse fertilizer (multiplies ration yield)
- **Ration Pack / Protein Bar / Coffee / Tea** → operative morale / energy ceiling buff per-raid
- **Rifle Round / Pistol Mag / Spent Casing** → Reloading bench; casings + scrap + chip = new ammo
- **Ceramic Plate / Camo Strip** → Armory: armor patches, stealth profile mods
- **Frag Grenade / Suppressor Tube** → equip slot only (no decompose)
- **Combat Knife** → melee equip OR Workbench break-down → 2 scrap (sink for surplus)
- **Silver Chain / Gold Tooth / Platinum Band / Micro Diamond** → Fence Desk: bulk-trade for premium currency or to buy intel
- **Swiss Watch / Vintage Zippo / Collector Pin / Art Chip** → Trophy Wall display; passive bonuses (luck, morale, fence reputation)
- **Data Card / Shipping Manifest / Patrol Schedule** → Map Room: reveal fog / threat / loot tags at a target location for next raid
- **Corp ID / Redacted Dossier** → Decryption Suite input; outputs blueprint or location coords
- **Encrypted Drive / Corrupted Data Slug** → long Decryption job; chance of a workbench schematic or new location unlock
- **Prototype Chip / Black Box** → install in Drone Bay or Workbench to unlock experimental tier crafts
- **Exotic Alloy** → Forge: late-game alloy required for T4 weapons/armor
- **Bio-Synth Sample** → Bio Vault → Biolab-derived buffs (temporary regen, stamina cap)
- **Bags (canvas/tactical/raider)** → Armory loadouts; or strip a duplicate for canvas → satchel patch (small extra slot mod)

The design move: each high-tier item should have **two viable destinies** (sell now vs. feed a module), and module paths should require *combinations* of items so the player has to think about which categories they're hoarding for what.
