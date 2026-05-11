# HOLDOUT — Components + Construction System (archived 2026-05-11)

> **Archived snapshot.** This is the implementation spec that drove the construction-system rollout. Designed 2026-05-10, implemented 2026-05-11 in 6 stages (see `docs/BACKLOG.md` Changelog → "Construction system — components + 8 hideout modules (2026-05-11)" for what shipped per stage, and the "Parked during construction-system implementation (2026-05-11)" parking-lot section for items intentionally deferred).
>
> Kept here as a record of the design intent at the time of the build. The codebase is now the source of truth; if a section here disagrees with the code, the code wins.

---

# Implementation spec (original 2026-05-10 doc preserved below)

For the high-level motivation + parking-lot of ideas not in scope, see the corresponding section in `docs/BACKLOG.md`. For the locked design constraints this system must respect (no real-world clock, pure engine, schema versioning, etc.), see `docs/DESIGN.md`.

---

## 1. Goal

Replace the current cash-only upgrade economy with a layered system where:

- Loot decomposes into components (via Recycler / Foundry)
- Components feed hideout module upgrades and crafting
- Modules unlock new content / capabilities
- Some specialized named items act as direct upgrade gates

Outcomes:

- Raids become directional (`I need circuits → server farm`)
- Loot has multiple roles (sell / equip / scrap / forge / craft input / upgrade input) so individual items have meaningful trade-offs
- Upgrade tree gets shape beyond a flat cash gate
- Hideout panel becomes a place worth visiting between raids

---

## 2. Locked decisions

These are non-negotiable for v1 of this system. Don't revisit without explicit reason.

1. **Components reuse existing items where possible.** `scrap_metal`, `copper_wire`, `microchip`, `optic_lens`, `capacitor_bank`, `cracked_battery`, etc. already exist in `src/lib/data/items.ts` and serve as base components. No parallel "Refined Scrap" item. The sell-vs-save tension is the loop's beating heart.
2. **Two new med base components:** **Synthates** (synthetic chemistry) and **Botanicals** (plant extracts). Recipes mix them. Bioculture as a third med component is parked.
3. **Foundry stores molten metal in vessels, not as inventory items.** No ingot items exist. Selling happens via the foundry UI.
4. **Three base metals v1:** steel, copper, titanium. Late-game corp-fictional metals at higher tiers (placeholder ids `chromite`, `voidsteel`; rename during content pass).
5. **Pockets capacity upgrades cut.** Carrying capacity is governed by equipped bag/rig only.
6. **No weapon crafting.** Workbench produces apparel + meds only.
7. **Recycler uses per-item decompose recipes with rolled outputs.** Each output rolls independently with a probability; tier upgrades multiply roll chances.
8. **Research progresses on per-tile-moved during raids.** Not real-world clock, not per-raid (cheesable by in-and-out), not per-action (would tick on `stay`).
9. **Components only drop from container loot in v1.** Flavor-event grants are parked.
10. **Components are flat-tier.** No common/uncommon/rare component variants. If a component should be "better", it's a different component.
11. **No alloying in v1 foundry.** Just store + dispense base metals. Bronze/brass/etc. parked.
12. **Single research at a time.** No queue. Parked.
13. **Hideout state lives at game-state top level**, not under operative. The hideout outlives operatives in spirit (even if there's only one for now) and is the persistent thing.

---

## 3. Component model

### 3.1 Existing items repurposed as components

Tag in `src/lib/data/items.ts`. They keep tier / sellValue / weight / shape unchanged. The flag is metadata for upgrade-cost lookups + UI grouping.

**Mechanical components:** `scrap_metal`, `rusted_bolt`, `ball_bearing`, `valve_handle`, `copper_wire`, `spring_coil`, `rail_clamp`, `hydraulic_piston`, `precision_gear`, `exo_servo`, `tungsten_gear`, `powered_actuator`.

**Electronics components:** `cracked_battery`, `microchip`, `optic_lens`, `capacitor_bank`, `signal_jammer`, `coolant_loop`, `holo_display`, `quantum_capacitor`.

(Derive the `component: true` flag at module load from a manifest or by enumerating these ids — do not hand-set on each item, easy to drift.)

### 3.2 New base components to add

| ID | Name | Tier | Category | sellValue | Weight | Shape | Drops from |
|---|---|---|---|---|---|---|---|
| `synthate` | Synthate Vial | common | medical | 12 | 1 | one | medical, biolab containers; recycle output of pharma items |
| `botanical` | Botanical Sample | common | medical | 9 | 1 | one | civilian, outdoor containers; recycle output of consumables |
| `cloth_scrap` | Cloth Scrap | common | apparel | 5 | 1 | one | civilian, residential containers |
| `polymer_strip` | Polymer Strip | common | mechanical | 6 | 1 | one | civilian, industrial containers |

Naming flexibility: if "Synthate Vial" reads weirdly in playtest, fall back to "Compound Vial". Lock the final string after first UI pass.

### 3.3 Specialized construction items (new named loot)

These are direct upgrade gates. Each has a specific cosmetic identity, drops at a chosen tier, and is consumed by exactly one (or two) upgrade recipes. Add all in the same `items.ts` pass to avoid revisiting the file.

| ID | Name | Tier | Category | sellValue | Used by |
|---|---|---|---|---|---|
| `industrial_motor` | Industrial Motor | uncommon | mechanical | 80 | Recycler L1 build, Foundry L1 build |
| `industrial_shelving` | Industrial Shelving | common | mechanical | 35 | Stash L2→L3 |
| `reinforced_locker` | Reinforced Locker | uncommon | mechanical | 110 | Stash L3→L4, Armory build |
| `vault_door` | Vault Door Mechanism | rare | mechanical | 280 | Stash L4→L5 |
| `power_tool` | Power Tool | uncommon | mechanical | 90 | Workbench build, Repair Bench build |
| `calibration_jig` | Calibration Jig | uncommon | mechanical | 130 | Workbench L1→L2, Repair Bench build |
| `precision_lathe` | Precision Lathe | rare | mechanical | 320 | Workbench L2→L3, Foundry L2→L3 |
| `control_board` | Control Board | uncommon | electronics | 95 | Recycler L1→L2, Foundry L1 build, Generator build, Research Bench build |
| `medical_autoclave` | Medical Autoclave | uncommon | medical | 140 | (deferred Medbay L1) |
| `anesthesia_rig` | Anesthesia Rig | rare | medical | 240 | (deferred Medbay L2) |
| `surgical_kit` | Surgical Kit | uncommon | medical | 110 | (deferred Medbay L1) |
| `modular_harness` | Modular Harness | uncommon | apparel | 100 | Workbench L1→L2 (apparel recipe), Armor Stand build |

The medbay items can be added now and sit dormant until the Medbay is unparked — their specialized status means they always feel like "save this" loot regardless.

### 3.4 Foundry metals (NOT items)

Stored as numeric values inside the foundry's save state. See §6.

v1 metals: `steel`, `copper`, `titanium`. Late-game (foundry L3+) `chromite`, `voidsteel`. Rename during content pass; intentionally unfamiliar so they read as rare/late.

---

## 4. Recycler

### 4.1 Behavior

Player opens Recycler panel → sees stash items eligible for recycling (anything with a recipe in the data file at or below current recycler tier) → clicks "Scrap" → engine rolls each output independently → outputs land in stash. Input item consumed.

### 4.2 Recipe data shape

New file: `src/lib/data/recycle.ts`.

```ts
export interface RecycleOutput {
  id: ItemId;
  chance: number;   // 0..1, base probability per scrap operation
  count?: number;   // default 1
}

export interface RecycleRecipe {
  input: ItemId;
  outputs: ReadonlyArray<RecycleOutput>;
  minTier?: 1 | 2 | 3;  // recycler tier required (default 1)
}

export const RECYCLE_RECIPES: Record<ItemId, RecycleRecipe>;
```

### 4.3 Representative recipes

(Fill out for every recyclable item during implementation. These are the seeds.)

| Input | Outputs (base) | Min tier |
|---|---|---|
| combat_knife | scrap_metal 90%, spring_coil 50% | 1 |
| pistol_mag | scrap_metal 80%, spring_coil 70% | 1 |
| frag_grenade | scrap_metal 100%, spring_coil 30% | 1 |
| signal_jammer | microchip 80%, copper_wire 70%, capacitor_bank 30% | 1 |
| coolant_loop | copper_wire 60%, polymer_strip 50% | 1 |
| ceramic_plate | scrap_metal 60%, polymer_strip 40% | 1 |
| holo_display | optic_lens 90%, microchip 80%, capacitor_bank 60% | 2 |
| exo_servo | hydraulic_piston 90%, precision_gear 70%, copper_wire 80% | 2 |
| quantum_capacitor | capacitor_bank 100%, microchip 70%, optic_lens 40% | 2 |
| bandage_pack | botanical 50%, synthate 30% | 1 |
| antiseptic_vial | synthate 90% | 1 |
| iodine_packet | synthate 70%, botanical 20% | 1 |
| ration_pack | botanical 60%, polymer_strip 30% | 1 |
| coffee_can | botanical 40% | 1 |
| tea_brick | botanical 80% | 1 |
| protein_bar | botanical 50%, synthate 20% | 1 |
| gauze_roll | botanical 30%, cloth_scrap 70% | 1 |
| med_syrette | synthate 80%, botanical 30% | 1 |
| combat_stim | synthate 70%, botanical 60% | 2 |
| nano_clot | synthate 90%, botanical 80% | 3 |
| bio_synth_sample | synthate 90%, botanical 70% | 2 |

**Not recyclable:** valuables (silver_chain etc.), intel docs (data_card etc.), bags/rigs, weapons/armor (until weapon-condition lands).

### 4.4 Tier scaling

```ts
function rolledOutputs(
  recipe: RecycleRecipe,
  recyclerTier: 1 | 2 | 3,
  rand: () => number,
): Array<{ id: ItemId; count: number }> {
  const tierBonus = recyclerTier === 1 ? 0 : recyclerTier === 2 ? 0.15 : 0.30;
  const bonusStackChance = recyclerTier === 3 ? 0.20 : 0;
  const out: Array<{ id: ItemId; count: number }> = [];
  for (const o of recipe.outputs) {
    if (rand() < Math.min(1, o.chance + tierBonus)) {
      let count = o.count ?? 1;
      if (rand() < bonusStackChance) count *= 2;
      out.push({ id: o.id, count });
    }
  }
  return out;
}
```

- L1: base chances. Cannot scrap items with `minTier > 1`.
- L2: +15% to all chances. Bulk-scrap a whole stack with one click. Can scrap minTier ≤ 2.
- L3: +30% to all chances. 20% chance per output to roll a bonus stack (2× output). Can scrap any minTier.

### 4.5 Engine

New file: `src/lib/engine/recycle.ts`.

```ts
export interface RecycleResult {
  consumedUid: string;
  produced: Array<{ id: ItemId; count: number }>;
}

export type RecycleError = "no_recipe" | "tier_too_low";

export function recycleItem(
  item: StashItem,
  recyclerTier: 1 | 2 | 3,
  rand: () => number,
): RecycleResult | { error: RecycleError };
```

Pure. No `Date.now()`, no `Math.random()`, no store reach-in. Receives item + tier + rand.

### 4.6 Store action

In a new `src/store/slices/construction.ts` slice:

```ts
recycleStashItem(uid: string): void
recycleStackByItemId(itemId: ItemId, count?: number): void  // L2+ bulk
```

Looks up item, calls engine with `Math.random`, removes input from stash, pushes outputs into stash with `acquiredAt = Date.now()`, appends to per-module activity log.

---

## 5. Foundry

### 5.1 Behavior

Player opens Foundry panel → sees vessel fill bars per metal → clicks "Smelt" on metallic items in stash → metal value increments in vessels (capped at vessel capacity, overflow wasted with warning). Player can sell metal directly per vessel via foundry UI.

### 5.2 State shape

```ts
type MetalId = "steel" | "copper" | "titanium" | "chromite" | "voidsteel";

export interface FoundryState {
  built: boolean;
  tier: 0 | 1 | 2 | 3;
  vessels: Record<MetalId, number>;   // current units stored
}
```

### 5.3 Capacity per tier

```ts
const CAPACITY_PER_TIER: Record<MetalId, [number, number, number]> = {
  steel:     [500, 1500, 5000],
  copper:    [500, 1500, 5000],
  titanium:  [200,  600, 2000],
  chromite:  [  0,    0,  500],   // unlocked at L3
  voidsteel: [  0,    0,  500],   // unlocked at L3
};

export function vesselCapacity(metal: MetalId, tier: 1 | 2 | 3): number {
  return CAPACITY_PER_TIER[metal][tier - 1];
}
```

### 5.4 Smelt recipes

New file: `src/lib/data/smelt.ts`.

```ts
export interface SmeltOutput {
  metal: MetalId;
  amount: number;
}

export interface SmeltRecipe {
  input: ItemId;
  outputs: ReadonlyArray<SmeltOutput>;
  minTier?: 1 | 2 | 3;  // foundry tier required (default 1)
}

export const SMELT_RECIPES: Record<ItemId, SmeltRecipe>;
```

### 5.5 Representative smelt recipes

| Input | Outputs | Min tier |
|---|---|---|
| scrap_metal | steel 30 | 1 |
| rusted_bolt | steel 8 | 1 |
| ball_bearing | steel 12 | 1 |
| spring_coil | steel 10 | 1 |
| valve_handle | steel 18 | 1 |
| copper_wire | copper 25 | 1 |
| rail_clamp | steel 60 | 1 |
| hydraulic_piston | steel 80, copper 20 | 1 |
| precision_gear | steel 35 | 1 |
| combat_knife | steel 35 | 1 |
| pistol_mag | steel 25 | 1 |
| frag_grenade | steel 15, copper 5 | 1 |
| powered_actuator | steel 80, copper 40 | 1 |
| tungsten_gear | titanium 60 | 2 |
| exo_servo | titanium 40, copper 30 | 2 |
| exotic_alloy (renamed) | titanium 120, voidsteel 30 | 3 |

Items can route to either Recycler OR Foundry — player picks based on what they need. UI shows both routes.

### 5.6 Sell from foundry

Per-metal sell controls in the foundry UI. Sell prices per unit (tune):

| Metal | ¤/unit |
|---|---|
| steel | 0.4 |
| copper | 0.6 |
| titanium | 1.2 |
| chromite | 2.5 |
| voidsteel | 4.0 |

Smelting a `combat_knife` into 35 steel = ¤14, vs the knife's sell value of ¤22. Selling raw is *better* unless the metal is gating an upgrade. That's the desired tension — players smelt only when they're building toward something.

### 5.7 Engine

New file: `src/lib/engine/foundry.ts`.

```ts
export interface SmeltResult {
  consumedUid: string;
  added: Partial<Record<MetalId, number>>;
  wasted: Partial<Record<MetalId, number>>;  // overflow lost to capacity
}

export type SmeltError = "no_recipe" | "tier_too_low";

export function smeltItem(
  item: StashItem,
  foundry: FoundryState,
): { foundry: FoundryState; result: SmeltResult } | { error: SmeltError };

export function withdrawMetal(
  foundry: FoundryState,
  metal: MetalId,
  amount: number,
): { foundry: FoundryState; withdrawn: number };

export function vesselCapacity(metal: MetalId, tier: 1 | 2 | 3): number;
```

### 5.8 Store actions

In `construction.ts`:

```ts
smeltStashItem(uid: string): void
sellMetal(metal: MetalId, amount: number): void
```

`sellMetal` calls `withdrawMetal` then credits cash via the existing economy slice helpers.

---

## 6. Workbench

### 6.1 Behavior

Crafting panel. Shows recipes in `unlockedRecipes`; player clicks one to craft if inputs available. Outputs land in stash.

### 6.2 Recipe data shape

New file: `src/lib/data/recipes.ts`.

```ts
export interface RecipeInput {
  type: "item" | "metal";
  id: ItemId | MetalId;
  count: number;  // metals counted in foundry units
}

export interface ResearchCost {
  docs: ReadonlyArray<{ id: ItemId; count: number }>;     // intel-category items
  components: ReadonlyArray<{ id: ItemId; count: number }>;
  tileTicks: number;  // operative move-tiles needed to complete
}

export interface CraftRecipe {
  id: string;
  output: { itemId: ItemId; count: number };
  inputs: ReadonlyArray<RecipeInput>;
  minWorkbenchTier: 1 | 2 | 3;
  unlockedByDefault?: boolean;
  research?: ResearchCost;  // required if not unlockedByDefault
}

export const CRAFT_RECIPES: Record<string, CraftRecipe>;
```

### 6.3 Representative recipes

**Apparel:**

| ID | Output | Inputs | Tier | Unlocked? |
|---|---|---|---|---|
| `craft_canvas_satchel` | canvas_satchel | 4 cloth_scrap, 2 spring_coil | 1 | default |
| `craft_light_rig` | light_rig | 3 cloth_scrap, 2 spring_coil | 1 | default |
| `craft_tactical_pack` | tactical_pack | 6 cloth_scrap, 3 modular_harness, 1 control_board | 2 | research |
| `craft_combat_rig` | combat_rig | 5 cloth_scrap, 1 ceramic_plate, 1 modular_harness | 2 | research |
| `craft_modular_pack` | modular_pack | 5 cloth_scrap, 2 modular_harness, 100 steel | 2 | research |
| `craft_raider_rucksack` | raider_rucksack | 8 cloth_scrap, 4 modular_harness, 200 steel, 1 vault_door | 3 | research |
| `craft_recon_rig` | recon_rig | 6 cloth_scrap, 2 modular_harness, 1 calibration_jig | 3 | research |

**Med:**

| ID | Output | Inputs | Tier | Unlocked? |
|---|---|---|---|---|
| `craft_bandage_pack` | bandage_pack | 1 botanical, 2 synthate | 1 | default |
| `craft_antiseptic_vial` | antiseptic_vial | 2 synthate | 1 | default |
| `craft_iodine_packet` | iodine_packet | 2 synthate, 1 botanical | 1 | default |
| `craft_gauze_roll` | gauze_roll | 3 cloth_scrap, 1 synthate | 1 | default |
| `craft_med_syrette` | med_syrette | 3 synthate, 1 botanical | 1 | research |
| `craft_combat_stim` | combat_stim | 2 synthate, 2 botanical | 2 | research |
| `craft_vitamin_shot` | vitamin_shot | 1 synthate, 3 botanical | 2 | research |
| `craft_nano_clot` | nano_clot | 4 synthate, 3 botanical, 1 control_board | 3 | research |

### 6.4 Engine

New file: `src/lib/engine/workbench.ts`.

```ts
export function canCraft(
  recipe: CraftRecipe,
  stash: StashItem[],
  foundry: FoundryState,
  workbenchTier: number,
): { ok: true } | { ok: false; reason: "tier" | "missing_items" | "missing_metals" | "locked"; missing?: RecipeInput[] };

export function craft(
  recipe: CraftRecipe,
  stash: StashItem[],
  foundry: FoundryState,
  now: number,
  rand: () => number,
): { stash: StashItem[]; foundry: FoundryState; produced: StashItem };
```

`craft` is atomic — validates first, then mutates copies and returns. No partial application.

### 6.5 Store action

```ts
craftRecipe(recipeId: string): void
```

---

## 7. Research Bench

### 7.1 Behavior

Player picks a locked recipe → goes to Research Bench → spends docs + components → recipe enters "researching" state with N tile-ticks remaining → as operative moves during raids, ticks decrement → on zero, recipe moves to unlocked. Only one recipe researches at a time (parking lot for queue).

### 7.2 State

```ts
export interface ResearchState {
  unlockedRecipes: ReadonlyArray<string>;   // recipe ids
  active: { recipeId: string; ticksRemaining: number } | null;
}
```

On game start (and on save migration), `unlockedRecipes` is seeded with all `unlockedByDefault: true` recipe ids.

### 7.3 Representative research costs

(Per the recipe table above. These are the seeds.)

| Recipe | Docs | Components | Tile-ticks |
|---|---|---|---|
| `craft_med_syrette` | 1 shipping_manifest | 2 synthate | 25 |
| `craft_combat_stim` | 1 redacted_dossier | 2 synthate, 2 botanical | 35 |
| `craft_vitamin_shot` | 1 shipping_manifest | 3 botanical | 30 |
| `craft_nano_clot` | 1 encrypted_drive | 1 bio_synth_sample, 3 synthate | 80 |
| `craft_tactical_pack` | 1 shipping_manifest | 1 modular_harness | 35 |
| `craft_combat_rig` | 1 corp_id | 2 modular_harness | 45 |
| `craft_modular_pack` | 1 redacted_dossier | 2 cloth_scrap | 40 |
| `craft_raider_rucksack` | 1 encrypted_drive | 3 modular_harness | 90 |
| `craft_recon_rig` | 1 patrol_schedule | 1 modular_harness, 2 optic_lens | 75 |

### 7.4 Engine + tick integration

New file: `src/lib/engine/research.ts`.

```ts
export function startResearch(
  research: ResearchState,
  recipeId: string,
  recipe: CraftRecipe,
  stash: StashItem[],
): { research: ResearchState; stash: StashItem[] } | { error: "already_active" | "missing_inputs" | "no_research_cost" };

export function tickResearch(
  research: ResearchState,
): { research: ResearchState; completed: string | null };
```

`tickResearch` is called from `tickAction` in `engine/raid.ts` after the operative completes a `move_forward` or `extract_step` tick AND `research.active != null`. Decrements `ticksRemaining`. When zero, moves recipeId from `active` to `unlockedRecipes`, returns the completed id so the raid log can announce it.

### 7.5 Store action

```ts
startResearch(recipeId: string): void
```

(Cancellation can wait — parking lot.)

---

## 8. Stash upgrades (rework)

### 8.1 Cost shape change

`engine/upgrades.ts` currently has cash-only costs. Extend:

```ts
export interface UpgradeCost {
  cash: number;
  items?: ReadonlyArray<{ id: ItemId; count: number }>;
  metals?: ReadonlyArray<{ id: MetalId; count: number }>;
}
```

`canAfford(cost, stash, foundry, cash) → boolean` and `payCost(cost, stash, foundry, cash) → { stash, foundry, cash }`. Pay is atomic.

### 8.2 Stash cost ladder

| Upgrade | Cash | Items | Metals |
|---|---|---|---|
| L1 → L2 | 300 | — | — |
| L2 → L3 | 700 | 4 scrap_metal, 1 industrial_shelving | — |
| L3 → L4 | 1500 | 8 scrap_metal, 3 copper_wire, 1 reinforced_locker | — |
| L4 → L5 | 3500 | 15 scrap_metal, 6 copper_wire, 1 vault_door | 200 steel |
| L5 → L6 | 8000 | 25 scrap_metal, 12 copper_wire | 500 steel, 100 titanium |
| L6 → L7 | 18000 | 40 scrap_metal, 20 copper_wire | 1500 steel, 400 titanium, 50 voidsteel |

Slot increments per tier (rough): L1 6×8 → L2 6×10 → L3 8×10 → L4 10×12 → L5 12×14 → L6 12×16 → L7 14×18. Tune.

### 8.3 Pockets — kept cash-only, no further capacity upgrades

Per locked decision #5. Current Pockets-upgrade UI removed or stubbed to "no upgrades available" (pick: removal is cleaner if no save data depends on it).

### 8.4 Module build costs

| Module | Cash | Items |
|---|---|---|
| Recycler | 600 | 1 industrial_motor |
| Workbench | 800 | workbench_schematic (existing drop), 4 scrap_metal, 2 copper_wire, 1 power_tool |
| Research Bench | 900 | 3 microchip, 2 redacted_dossier, 1 control_board |
| Foundry | 2500 | 6 scrap_metal, 3 ceramic_plate, 1 industrial_motor, 1 control_board |
| Armory | 1200 | 5 scrap_metal, 1 reinforced_locker |
| Armor Stand | 500 | 2 spring_coil, 1 modular_harness |
| Repair Bench | 1000 | 3 scrap_metal, 1 power_tool, 1 calibration_jig |
| Generator | 3000 | 4 capacitor_bank, 2 hydraulic_piston, 1 control_board |

### 8.5 Module tier-up costs

(Sketched. Pattern: each tier ~2-2.5× cash, comparable component scaling, +1 specialized item per tier. Tune freely during balance.)

| Upgrade | Cash | Items | Metals |
|---|---|---|---|
| Recycler L1→L2 | 1500 | 3 copper_wire, 1 control_board | — |
| Recycler L2→L3 | 4000 | 6 microchip, 2 control_board, 1 calibration_jig | 100 copper |
| Workbench L1→L2 | 2000 | 3 microchip, 2 optic_lens, 1 calibration_jig | — |
| Workbench L2→L3 | 5000 | 6 microchip, 4 optic_lens, 1 precision_lathe | 200 titanium |
| Research Bench L1→L2 | 2500 | 4 holo_display, 2 quantum_capacitor | — |
| Foundry L1→L2 | 4000 | 6 hydraulic_piston, 1 control_board | 100 steel |
| Foundry L2→L3 | 10000 | 12 hydraulic_piston, 1 precision_lathe | 500 steel, 200 copper |
| Armory L1→L2 | 2500 | 8 scrap_metal, 1 reinforced_locker | — |
| Armor Stand L1→L2 | 1500 | 4 modular_harness | — |
| Generator L1→L2 | 6000 | 6 capacitor_bank, 4 hydraulic_piston | 100 copper |

---

## 9. Other modules

### 9.1 Armory (functional v1)

Specialized stash for equippable items only. Predicate: items with `slot` field set, OR with category in `["military", "apparel"]` whose ids point to weapons/armor. Defer the exact predicate to implementation; safest is "items with `slot` defined".

State:

```ts
export interface ArmoryState {
  built: boolean;
  tier: 0 | 1 | 2;
  items: StashItem[];     // capacity-limited
}
```

Capacity per tier: L1 = 8 items, L2 = 16. (Item-count, not cells, for simplicity.)

Items in armory are excluded from main stash UI and don't count against stash capacity. Player can move items between via dedicated buttons in either panel.

UI: new `ArmoryPanel.tsx` similar to stash but filtered. Includes "→ Stash" button per item.

Store actions:

```ts
depositArmoryItem(uid: string): void   // stash → armory
withdrawArmoryItem(uid: string): void  // armory → stash
```

### 9.2 Armor Stand (placeholder shell)

Buildable. Panel displays "Loadout presets — coming soon" with greyed slots scaled by tier (L1: 1 slot, L2: 3, L3: 5). No store action wires up loadout-save yet; that's a future phase.

State:

```ts
export interface ArmorStandState {
  built: boolean;
  tier: 0 | 1 | 2 | 3;
  // future: presets: LoadoutPreset[]
}
```

### 9.3 Repair Bench (placeholder shell)

Buildable. Panel displays "Repair — coming soon — pending weapon condition system". Functionality blocked on weapon-condition not existing.

State:

```ts
export interface RepairBenchState {
  built: boolean;
  tier: 0 | 1;
}
```

### 9.4 Generator (functional, late phase)

State:

```ts
export interface GeneratorState {
  built: boolean;
  tier: 0 | 1 | 2;
  powerCells: number;     // cracked_battery items deposited
}
```

Player deposits `cracked_battery` items into the generator via panel UI. On raid start, deduct N cells based on which high-tier modules are built:

| Module config | Cells/raid |
|---|---|
| Workbench L3 | 1 |
| Recycler L3 | 1 |
| Foundry L2 | 1 |
| Foundry L3 | 2 |
| Research Bench L2 | 1 |

If insufficient cells: high-tier modules degrade to their max-funded tier for that raid (Recycler L3 → effective L2 if no cells). Cells are consumed even if degradation happens.

Generator tier scales storage capacity: L1 = 20 cells, L2 = 60 cells.

This makes `cracked_battery` (and similar power items) a real recurring sink instead of pure sell-fodder.

---

## 10. Item pool rework

### 10.1 Renames

- `exotic_alloy` (id stays for save compat, name + flavor changes) → "Reactor Plate" or "Salvaged Bulkhead". Tier stays rare. Now smelts into rare metals — its high sell value becomes correct hoarding behavior.
- Optional cleanup: `valve_handle` → "Pump Valve" for naming consistency. Low priority.

### 10.2 New items added (one pass)

All items listed in §3.2 and §3.3. Add in a single edit to `items.ts`.

### 10.3 Item flag tagging

Add to the `Item` type:

```ts
interface Item {
  // ... existing fields
  component?: boolean;          // counts as upgrade-cost-payable (set on the items in §3.1, §3.2)
  specialized?: boolean;        // named construction junk (set on items in §3.3)
  // recyclerInput / foundryInput derived at runtime from recipe registries
}
```

Don't store derived flags. At module init:

```ts
export const RECYCLABLE_IDS = new Set(Object.keys(RECYCLE_RECIPES));
export const SMELTABLE_IDS = new Set(Object.keys(SMELT_RECIPES));
```

### 10.4 Drop weights / sources

Update `categoryWeights` on locations in `src/lib/data/locations.ts` so new items land naturally:

- Civilian / warehouse: bump apparel + mechanical (cloth_scrap, polymer_strip, industrial_shelving)
- Server farm / datacenter: heavy electronics + intel (already true; control_board lands here)
- Medical / biolab: synthate + botanical drop here primarily
- Outdoor / overgrown: botanical-heavy
- Corp HQ / mil: rare specialized items (precision_lathe, anesthesia_rig)

### 10.5 Specialized item drop mechanism

Specialized items (the §3.3 table) shouldn't inflate the generic tier pool. Cleanest approach:

- Add a `specialized: true` flag on these items
- Add a `specializedDrops?: ItemId[]` field to `Location`
- In `pickItemForLocation`, after the normal roll, if the rolled result is a `specialized` item, replace it with a per-location specialized substitution at low chance (~5%); otherwise drop the original

Alternative simpler approach: gate specialized items behind a per-location small additive chance (`if rand() < 0.04: pick from this location's specializedDrops`).

Go with the simpler version unless playtest shows specialized items clogging the rare pool.

---

## 11. Save shape changes

### 11.1 Migrations

Bump `SCHEMA_VERSION` in `engine/save.ts`. Migration steps (one version per shape change keeps rollback simpler):

- **vN+1**: Add `hideout.modules` populated with all module ids at `{ built: false, tier: 0 }`. Backward compat: if old save had `hideout.workbench.unlocked = true`, set `modules.workbench = { built: true, tier: 1 }`.
- **vN+2**: Add `foundry: { built: false, tier: 0, vessels: { steel: 0, copper: 0, titanium: 0, chromite: 0, voidsteel: 0 } }`.
- **vN+3**: Add `research: { unlockedRecipes: [defaults], active: null }`.
- **vN+4**: Add `armory: { built: false, tier: 0, items: [] }`.
- **vN+5**: Add `generator: { built: false, tier: 0, powerCells: 0 }`.

All migrations drop in-progress raids (existing pattern for state-shape changes). Schema fields on existing items don't need migration since the new flags are optional.

### 11.2 acquiredAt propagation

Outputs of recycle/smelt/craft are new stash items — stamp `acquiredAt = Date.now()` at the store layer (engine receives `now` as a param). Same pattern as existing `stashFromKit` etc.

---

## 12. UI changes

### 12.1 Hideout panel rework

Current panel shows a small handful of modules. Will grow to 9 visible modules (Stash, Recycler, Workbench, Research Bench, Foundry, Armory, Armor Stand, Repair Bench, Generator). Needs:

- 3-column grid of module cards
- Each card: icon + name + tier badge + status (built/unbuilt/can-upgrade/can-build) + click-through to dedicated panel
- Affordance indicator: green ring if upgradeable now, amber if missing some inputs, grey if locked
- Click into a built module → opens its dedicated panel in the main panel area (replacing whatever was there)

Use shadcn Card components. Match the terminal aesthetic — mono labels, sans descriptions.

### 12.2 Upgrade cost display

Wherever a build / upgrade cost is shown:

- Cash: `¤700` (existing format, mono)
- Items: row per item — `Scrap Metal · 4 needed · 3/4 in stash` with a small progress bar; red if insufficient
- Metals: row per metal — `Steel · 200 needed · 120/200 in foundry` with progress bar; red if insufficient
- Single "Upgrade" button at the bottom, disabled until all costs met
- Hover the cost row to see where an item drops (location hint) — small tooltip

Reuse a single `<UpgradeCostDisplay cost={...} />` component everywhere costs render. Lives in `src/components/hideout/UpgradeCostDisplay.tsx`.

### 12.3 Per-module activity log

Each module panel gets a small "Recent activity" strip showing the last ~10 actions performed there. Concrete:

- Recycler: `Scrapped Combat Knife → 1× scrap_metal, 1× spring_coil`
- Foundry: `Smelted Hydraulic Piston → +80 steel, +20 copper`
- Workbench: `Crafted Bandage Pack`
- Research: `Research complete: Combat Stim`

Per-module log state lives in the construction slice as a ring buffer (capacity ~20). Survives saves.

```ts
export interface ConstructionLog {
  recycler: LogEntry[];
  foundry: LogEntry[];
  workbench: LogEntry[];
  research: LogEntry[];
}
```

### 12.4 In-raid research progress

Small chip in Feed panel showing `Research: Combat Stim · 12/35 tiles` when active. Disappears when no active research.

### 12.5 Stash-side affordances

In the stash panel, when hovering a recyclable / smeltable item, show small "scrap" / "smelt" hint chips. Don't add buttons inline (would clutter); the player goes to the module panel to act. The hint just tells them "this has a use beyond selling."

---

## 13. Engine / store map (post-implementation)

### 13.1 New engine modules

- `src/lib/engine/recycle.ts` — recycleItem
- `src/lib/engine/foundry.ts` — smeltItem, withdrawMetal, vesselCapacity
- `src/lib/engine/workbench.ts` — canCraft, craft
- `src/lib/engine/research.ts` — startResearch, tickResearch
- `src/lib/engine/hideout.ts` — buildModule, upgradeModule, canAfford, payCost

### 13.2 New data files

- `src/lib/data/recycle.ts` — RECYCLE_RECIPES
- `src/lib/data/smelt.ts` — SMELT_RECIPES
- `src/lib/data/recipes.ts` — CRAFT_RECIPES
- `src/lib/data/modules.ts` — MODULE_BUILD_COSTS, MODULE_TIER_COSTS

### 13.3 Existing engine touches

- `engine/upgrades.ts` — extend cost shape to include `items` and `metals`; existing functions accept the wider shape
- `engine/raid.ts` — `tickAction` calls `tickResearch` after each successful `move_forward` / `extract_step` tick
- `engine/save.ts` — migration sequence per §11.1

### 13.4 New store slice

`src/store/slices/construction.ts`:

```ts
export interface ConstructionSlice {
  recycleStashItem(uid: string): void;
  recycleStackByItemId(itemId: ItemId, count?: number): void;
  smeltStashItem(uid: string): void;
  sellMetal(metal: MetalId, amount: number): void;
  buildModule(id: ModuleId): void;
  upgradeModule(id: ModuleId): void;
  craftRecipe(recipeId: string): void;
  startResearch(recipeId: string): void;
  depositArmoryItem(uid: string): void;
  withdrawArmoryItem(uid: string): void;
  depositPowerCell(uid: string): void;       // generator
}
```

### 13.5 Existing store touches

- `economy.ts` — extend stash-spending helpers to accept item + metal payments; keep existing cash-only selling
- `raid.ts` — call into research tick on move
- `game.ts` — compose the new slice; persistence subscription includes new state branches

---

## 14. Tests

Engine purity makes this straightforward. Add `*.test.ts` next to each engine module:

- `recycle.test.ts` — seeded RNG produces deterministic outputs; tier multiplier math (L2 +15%, L3 +30%); bonus stack chance fires at L3 only; minTier rejection; missing-recipe case
- `foundry.test.ts` — capacity overflow rejects/wastes correctly per metal; withdraw can't exceed stored; tier-gated metals not addressable below tier 3
- `workbench.test.ts` — `canCraft` validates stash AND foundry; `craft` consumes both atomically; insufficient inputs → no-op; tier gating respected
- `research.test.ts` — tick decrements only on configured action types (move_forward/extract_step); completion moves recipeId from active to unlocked; cost validation on start; can't start if already active
- `hideout.test.ts` — canAfford handles cash + items + metals; payCost is atomic (rolls back on partial pay); module tier transitions
- `upgrades.test.ts` — extend existing tests for new cost shape; backward-compat with cash-only entries

Add migration tests in `save.test.ts` for each new schema version, asserting old saves load cleanly with new fields populated and old workbench-unlocked flag becomes `modules.workbench = { built: true, tier: 1 }`.

UI components remain untested (per existing project policy).

---

## 15. Implementation order (within the single push)

For internal sequencing:

1. **Items.ts** — add new items (synthate, botanical, cloth_scrap, polymer_strip, all 12 specialized), rename exotic_alloy. Tag `component: true` and `specialized: true` flags.
2. **types.ts** — types for FoundryState, ResearchState, ArmoryState, GeneratorState, ArmorStandState, RepairBenchState, ConstructionLog, MetalId. Extend UpgradeCost. Extend GameState root with `hideout.modules`, `foundry`, `research`, `armory`, `generator`, `constructionLog`.
3. **Data files** — recycle.ts, smelt.ts, recipes.ts, modules.ts. Numbers from this doc as starting point.
4. **Save migrations** — one per shape change in `engine/save.ts`. Bump SCHEMA_VERSION.
5. **Engine modules** — recycle, foundry, workbench, research, hideout. Each with its test file.
6. **engine/raid.ts** — research tick integration.
7. **engine/upgrades.ts** — cost shape rework. Apply to Stash ladder.
8. **Store slice** — construction.ts. Wire into game.ts. Update economy.ts as needed.
9. **UI: hideout panel rework** — module grid, upgrade cost display component. The new entry point.
10. **UI: per-module panels** — RecyclerPanel, FoundryPanel, WorkbenchPanel, ResearchBenchPanel, ArmoryPanel.
11. **UI: placeholder panels** — ArmorStandPanel, RepairBenchPanel, GeneratorPanel (Generator can be functional in this push if §9.4 logic is ready).
12. **UI: in-raid research chip** in Feed panel.
13. **UI: stash-side scrap/smelt hint chips.**
14. **Drop-weight tuning pass** on locations.ts.
15. **Playtest + balance pass** — tune costs, yields, drop rates. Likely 2-3 cycles before it feels right.

---

## 16. Out of scope (parked, see BACKLOG.md parking lot)

These were discussed and explicitly deferred:

- Bank / Stock Market hideout module
- Farm / Greenhouse module for med ingredients
- Components from flavor events
- Equipment quality / rarity tiers
- Foundry alloying recipes (Bronze, Brass, fictional alloys)
- Bioculture as 3rd med base component
- Comms Suite / Medbay / Intel Desk modules (need real purpose)
- Trading molten metal between hideouts (multiplayer dependency)
- Loadout-preset functionality at Armor Stand
- Repair functionality at Repair Bench (waits on weapon-condition system)
- Research queue (multiple active researches)
- Cancellation of in-progress research
- Pockets capacity upgrades (cut as OP)
- Weapon crafting at Workbench

---

## 17. Open implementation questions

These can be settled during build, but flagging:

1. **Bulk recycle UX** — checkboxes per stash item, or "scrap all of type X"? Lean toward "scrap all of type X" (one button per item type with stack count); checkboxes are heavier and don't give much over per-type bulk.
2. **Generator wiring** — when does it deduct cells? On raid start, or per-tick? Raid start is simpler and matches the "I prepared for this raid" framing. Going with raid start unless there's a reason otherwise.
3. **Recycler-vs-Foundry routing UI** — when an item has both recipes, do we show two action buttons in stash, or only on the relevant module's panel? Lean toward: stash shows hint chips only ("scrap" / "smelt"); the actual buttons live in each module's panel. Stays uncluttered.
4. **Armory predicate** — exact rule for "this item belongs in the Armory." Safest: items with `slot` defined (bag, rig, weapon, armor, helmet). Loose bullets and consumables stay in main stash.
5. **Cost balance philosophy** — every cost number above is illustrative. First playtest pass should overshoot on cost; cheaper to be too expensive than too cheap (harder to add friction once players are spoiled).
6. **Upgrade panel: progress bars per requirement** — animated fills or static? Static is cheaper to implement; animation can come later.

---

End of spec. Ready for implementation.
