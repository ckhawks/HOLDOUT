import type { ModuleId, UpgradeCost } from "@/lib/types";

// Module build + tier-up costs. The build cost is paid once to construct
// the module; tier-up costs progress L1→L2→L3. See engine/hideout.ts.

export interface ModuleDef {
  id: ModuleId;
  name: string;
  maxTier: number;
  description: string;
}

export const MODULE_DEFS: Record<ModuleId, ModuleDef> = {
  recycler: {
    id: "recycler",
    name: "Recycler",
    maxTier: 3,
    description: "Decompose junk into components.",
  },
  workbench: {
    id: "workbench",
    name: "Workbench",
    maxTier: 3,
    description: "Craft apparel and medical items from components.",
  },
  research_bench: {
    id: "research_bench",
    name: "Research Bench",
    maxTier: 2,
    description: "Unlock craft recipes by spending docs + tile-ticks.",
  },
  foundry: {
    id: "foundry",
    name: "Foundry",
    maxTier: 3,
    description: "Smelt metallic items into vessels of base metals.",
  },
  armory: {
    id: "armory",
    name: "Armory",
    maxTier: 2,
    description: "Specialized storage for equippable gear.",
  },
  armor_stand: {
    id: "armor_stand",
    name: "Armor Stand",
    maxTier: 3,
    description: "Loadout presets (coming soon).",
  },
  repair_bench: {
    id: "repair_bench",
    name: "Repair Bench",
    maxTier: 1,
    description: "Restore item condition (pending weapon-condition system).",
  },
  generator: {
    id: "generator",
    name: "Generator",
    maxTier: 2,
    description: "Power high-tier modules with deposited power cells.",
  },
};

export const MODULE_BUILD_COSTS: Record<ModuleId, UpgradeCost> = {
  recycler: {
    cash: 600,
    items: [{ id: "industrial_motor", count: 1 }],
  },
  workbench: {
    cash: 800,
    items: [
      { id: "workbench_schematic", count: 1 },
      { id: "scrap_metal", count: 4 },
      { id: "copper_wire", count: 2 },
      { id: "power_tool", count: 1 },
    ],
  },
  research_bench: {
    cash: 900,
    items: [
      { id: "microchip", count: 3 },
      { id: "redacted_dossier", count: 2 },
      { id: "control_board", count: 1 },
    ],
  },
  foundry: {
    cash: 2500,
    items: [
      { id: "scrap_metal", count: 6 },
      { id: "ceramic_plate", count: 3 },
      { id: "industrial_motor", count: 1 },
      { id: "control_board", count: 1 },
    ],
  },
  armory: {
    cash: 1200,
    items: [
      { id: "scrap_metal", count: 5 },
      { id: "reinforced_locker", count: 1 },
    ],
  },
  armor_stand: {
    cash: 500,
    items: [
      { id: "spring_coil", count: 2 },
      { id: "modular_harness", count: 1 },
    ],
  },
  repair_bench: {
    cash: 1000,
    items: [
      { id: "scrap_metal", count: 3 },
      { id: "power_tool", count: 1 },
      { id: "calibration_jig", count: 1 },
    ],
  },
  generator: {
    cash: 3000,
    items: [
      { id: "capacitor_bank", count: 4 },
      { id: "hydraulic_piston", count: 2 },
      { id: "control_board", count: 1 },
    ],
  },
};

// Tier-up costs keyed by `${moduleId}:${nextTier}`. Indexed lookup keeps the
// engine helper simple.
export const MODULE_TIER_COSTS: Record<string, UpgradeCost> = {
  "recycler:2": { cash: 1500, items: [{ id: "copper_wire", count: 3 }, { id: "control_board", count: 1 }] },
  "recycler:3": { cash: 4000, items: [{ id: "microchip", count: 6 }, { id: "control_board", count: 2 }, { id: "calibration_jig", count: 1 }], metals: [{ id: "copper", count: 100 }] },

  "workbench:2": { cash: 2000, items: [{ id: "microchip", count: 3 }, { id: "optic_lens", count: 2 }, { id: "calibration_jig", count: 1 }] },
  "workbench:3": { cash: 5000, items: [{ id: "microchip", count: 6 }, { id: "optic_lens", count: 4 }, { id: "precision_lathe", count: 1 }], metals: [{ id: "titanium", count: 200 }] },

  "research_bench:2": { cash: 2500, items: [{ id: "holo_display", count: 4 }, { id: "quantum_capacitor", count: 2 }] },

  "foundry:2": { cash: 4000, items: [{ id: "hydraulic_piston", count: 6 }, { id: "control_board", count: 1 }], metals: [{ id: "steel", count: 100 }] },
  "foundry:3": { cash: 10000, items: [{ id: "hydraulic_piston", count: 12 }, { id: "precision_lathe", count: 1 }], metals: [{ id: "steel", count: 500 }, { id: "copper", count: 200 }] },

  "armory:2": { cash: 2500, items: [{ id: "scrap_metal", count: 8 }, { id: "reinforced_locker", count: 1 }] },

  "armor_stand:2": { cash: 1500, items: [{ id: "modular_harness", count: 4 }] },

  "generator:2": { cash: 6000, items: [{ id: "capacitor_bank", count: 6 }, { id: "hydraulic_piston", count: 4 }], metals: [{ id: "copper", count: 100 }] },
};

// Stash upgrade ladder (L1=base → L7). Per-level slot counts come from the
// design doc and are tuned in engine/upgrades.ts. Keys here are 1-indexed
// target levels (i.e. STASH_UPGRADE_COSTS[2] is the cost to reach stashLevel=1
// from stashLevel=0). We use 0-indexed `stashLevel`, so the cost to reach
// level N is `STASH_UPGRADE_COSTS[N]` where N starts at 1.
export const STASH_UPGRADE_COSTS: Record<number, UpgradeCost> = {
  1: { cash: 300 },
  2: { cash: 700, items: [{ id: "scrap_metal", count: 4 }, { id: "industrial_shelving", count: 1 }] },
  3: { cash: 1500, items: [{ id: "scrap_metal", count: 8 }, { id: "copper_wire", count: 3 }, { id: "reinforced_locker", count: 1 }] },
  4: { cash: 3500, items: [{ id: "scrap_metal", count: 15 }, { id: "copper_wire", count: 6 }, { id: "vault_door", count: 1 }], metals: [{ id: "steel", count: 200 }] },
  5: { cash: 8000, items: [{ id: "scrap_metal", count: 25 }, { id: "copper_wire", count: 12 }], metals: [{ id: "steel", count: 500 }, { id: "titanium", count: 100 }] },
  6: { cash: 18000, items: [{ id: "scrap_metal", count: 40 }, { id: "copper_wire", count: 20 }], metals: [{ id: "steel", count: 1500 }, { id: "titanium", count: 400 }, { id: "voidsteel", count: 50 }] },
};
