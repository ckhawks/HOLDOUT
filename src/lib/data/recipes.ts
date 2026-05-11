import type { MetalId } from "@/lib/types";

// Workbench craft recipes. Inputs can be items (consumed from stash) or
// metals (consumed from foundry vessels). Recipes either start unlocked
// or require a research run at the Research Bench. See engine/workbench.ts
// and engine/research.ts.

export interface RecipeInput {
  type: "item" | "metal";
  id: string | MetalId;
  count: number; // metals counted in foundry units
}

export interface ResearchCost {
  docs: ReadonlyArray<{ id: string; count: number }>;       // intel-category items
  components: ReadonlyArray<{ id: string; count: number }>;
  tileTicks: number; // operative move-tiles needed to complete
}

export interface CraftRecipe {
  id: string;
  output: { itemId: string; count: number };
  inputs: ReadonlyArray<RecipeInput>;
  minWorkbenchTier: 1 | 2 | 3;
  unlockedByDefault?: boolean;
  research?: ResearchCost;
}

// Apparel recipes
const APPAREL_RECIPES: CraftRecipe[] = [
  {
    id: "craft_canvas_satchel",
    output: { itemId: "canvas_satchel", count: 1 },
    inputs: [
      { type: "item", id: "cloth_scrap", count: 4 },
      { type: "item", id: "spring_coil", count: 2 },
    ],
    minWorkbenchTier: 1,
    unlockedByDefault: true,
  },
  {
    id: "craft_light_rig",
    output: { itemId: "light_rig", count: 1 },
    inputs: [
      { type: "item", id: "cloth_scrap", count: 3 },
      { type: "item", id: "spring_coil", count: 2 },
    ],
    minWorkbenchTier: 1,
    unlockedByDefault: true,
  },
  {
    id: "craft_tactical_pack",
    output: { itemId: "tactical_pack", count: 1 },
    inputs: [
      { type: "item", id: "cloth_scrap", count: 6 },
      { type: "item", id: "modular_harness", count: 3 },
      { type: "item", id: "control_board", count: 1 },
    ],
    minWorkbenchTier: 2,
    research: {
      docs: [{ id: "shipping_manifest", count: 1 }],
      components: [{ id: "modular_harness", count: 1 }],
      tileTicks: 35,
    },
  },
  {
    id: "craft_combat_rig",
    output: { itemId: "combat_rig", count: 1 },
    inputs: [
      { type: "item", id: "cloth_scrap", count: 5 },
      { type: "item", id: "ceramic_plate", count: 1 },
      { type: "item", id: "modular_harness", count: 1 },
    ],
    minWorkbenchTier: 2,
    research: {
      docs: [{ id: "corp_id", count: 1 }],
      components: [{ id: "modular_harness", count: 2 }],
      tileTicks: 45,
    },
  },
  {
    id: "craft_modular_pack",
    output: { itemId: "modular_pack", count: 1 },
    inputs: [
      { type: "item", id: "cloth_scrap", count: 5 },
      { type: "item", id: "modular_harness", count: 2 },
      { type: "metal", id: "steel", count: 100 },
    ],
    minWorkbenchTier: 2,
    research: {
      docs: [{ id: "redacted_dossier", count: 1 }],
      components: [{ id: "cloth_scrap", count: 2 }],
      tileTicks: 40,
    },
  },
  {
    id: "craft_raider_rucksack",
    output: { itemId: "raider_rucksack", count: 1 },
    inputs: [
      { type: "item", id: "cloth_scrap", count: 8 },
      { type: "item", id: "modular_harness", count: 4 },
      { type: "metal", id: "steel", count: 200 },
      { type: "item", id: "vault_door", count: 1 },
    ],
    minWorkbenchTier: 3,
    research: {
      docs: [{ id: "encrypted_drive", count: 1 }],
      components: [{ id: "modular_harness", count: 3 }],
      tileTicks: 90,
    },
  },
  {
    id: "craft_recon_rig",
    output: { itemId: "recon_rig", count: 1 },
    inputs: [
      { type: "item", id: "cloth_scrap", count: 6 },
      { type: "item", id: "modular_harness", count: 2 },
      { type: "item", id: "calibration_jig", count: 1 },
    ],
    minWorkbenchTier: 3,
    research: {
      docs: [{ id: "patrol_schedule", count: 1 }],
      components: [{ id: "modular_harness", count: 1 }, { id: "optic_lens", count: 2 }],
      tileTicks: 75,
    },
  },
];

// Medical recipes
const MED_RECIPES: CraftRecipe[] = [
  {
    id: "craft_bandage_pack",
    output: { itemId: "bandage_pack", count: 1 },
    inputs: [
      { type: "item", id: "botanical", count: 1 },
      { type: "item", id: "synthate", count: 2 },
    ],
    minWorkbenchTier: 1,
    unlockedByDefault: true,
  },
  {
    id: "craft_antiseptic_vial",
    output: { itemId: "antiseptic_vial", count: 1 },
    inputs: [{ type: "item", id: "synthate", count: 2 }],
    minWorkbenchTier: 1,
    unlockedByDefault: true,
  },
  {
    id: "craft_iodine_packet",
    output: { itemId: "iodine_packet", count: 1 },
    inputs: [
      { type: "item", id: "synthate", count: 2 },
      { type: "item", id: "botanical", count: 1 },
    ],
    minWorkbenchTier: 1,
    unlockedByDefault: true,
  },
  {
    id: "craft_gauze_roll",
    output: { itemId: "gauze_roll", count: 1 },
    inputs: [
      { type: "item", id: "cloth_scrap", count: 3 },
      { type: "item", id: "synthate", count: 1 },
    ],
    minWorkbenchTier: 1,
    unlockedByDefault: true,
  },
  {
    id: "craft_med_syrette",
    output: { itemId: "med_syrette", count: 1 },
    inputs: [
      { type: "item", id: "synthate", count: 3 },
      { type: "item", id: "botanical", count: 1 },
    ],
    minWorkbenchTier: 1,
    research: {
      docs: [{ id: "shipping_manifest", count: 1 }],
      components: [{ id: "synthate", count: 2 }],
      tileTicks: 25,
    },
  },
  {
    id: "craft_combat_stim",
    output: { itemId: "combat_stim", count: 1 },
    inputs: [
      { type: "item", id: "synthate", count: 2 },
      { type: "item", id: "botanical", count: 2 },
    ],
    minWorkbenchTier: 2,
    research: {
      docs: [{ id: "redacted_dossier", count: 1 }],
      components: [{ id: "synthate", count: 2 }, { id: "botanical", count: 2 }],
      tileTicks: 35,
    },
  },
  {
    id: "craft_vitamin_shot",
    output: { itemId: "vitamin_shot", count: 1 },
    inputs: [
      { type: "item", id: "synthate", count: 1 },
      { type: "item", id: "botanical", count: 3 },
    ],
    minWorkbenchTier: 2,
    research: {
      docs: [{ id: "shipping_manifest", count: 1 }],
      components: [{ id: "botanical", count: 3 }],
      tileTicks: 30,
    },
  },
  {
    id: "craft_nano_clot",
    output: { itemId: "nano_clot", count: 1 },
    inputs: [
      { type: "item", id: "synthate", count: 4 },
      { type: "item", id: "botanical", count: 3 },
      { type: "item", id: "control_board", count: 1 },
    ],
    minWorkbenchTier: 3,
    research: {
      docs: [{ id: "encrypted_drive", count: 1 }],
      components: [{ id: "bio_synth_sample", count: 1 }, { id: "synthate", count: 3 }],
      tileTicks: 80,
    },
  },
];

export const CRAFT_RECIPES: Record<string, CraftRecipe> = Object.fromEntries(
  [...APPAREL_RECIPES, ...MED_RECIPES].map((r) => [r.id, r]),
);

export const DEFAULT_UNLOCKED_RECIPES: string[] = Object.values(CRAFT_RECIPES)
  .filter((r) => r.unlockedByDefault)
  .map((r) => r.id);
