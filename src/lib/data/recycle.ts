import type { ItemTier } from "@/lib/types";

// Recycler decompose recipes. Each output rolls independently with `chance`.
// Tier scaling adds +15% (L2) / +30% (L3) to every chance; L3 also rolls a
// per-output bonus-stack chance (2× count). See engine/recycle.ts.

export interface RecycleOutput {
  id: string;
  chance: number; // 0..1 base probability per scrap operation
  count?: number; // default 1
}

export interface RecycleRecipe {
  input: string;
  outputs: ReadonlyArray<RecycleOutput>;
  minTier?: 1 | 2 | 3; // default 1
}

export const RECYCLE_RECIPES: Record<string, RecycleRecipe> = {
  // Military / sharp goods
  combat_knife:  { input: "combat_knife",  outputs: [{ id: "scrap_metal", chance: 0.9 }, { id: "spring_coil", chance: 0.5 }] },
  pistol_mag:    { input: "pistol_mag",    outputs: [{ id: "scrap_metal", chance: 0.8 }, { id: "spring_coil", chance: 0.7 }] },
  frag_grenade:  { input: "frag_grenade",  outputs: [{ id: "scrap_metal", chance: 1.0 }, { id: "spring_coil", chance: 0.3 }] },

  // Electronics
  signal_jammer:    { input: "signal_jammer",    outputs: [{ id: "microchip", chance: 0.8 }, { id: "copper_wire", chance: 0.7 }, { id: "capacitor_bank", chance: 0.3 }] },
  coolant_loop:     { input: "coolant_loop",     outputs: [{ id: "copper_wire", chance: 0.6 }, { id: "polymer_strip", chance: 0.5 }] },
  holo_display:     { input: "holo_display",     outputs: [{ id: "optic_lens", chance: 0.9 }, { id: "microchip", chance: 0.8 }, { id: "capacitor_bank", chance: 0.6 }], minTier: 2 },
  exo_servo:        { input: "exo_servo",        outputs: [{ id: "hydraulic_piston", chance: 0.9 }, { id: "precision_gear", chance: 0.7 }, { id: "copper_wire", chance: 0.8 }], minTier: 2 },
  quantum_capacitor:{ input: "quantum_capacitor",outputs: [{ id: "capacitor_bank", chance: 1.0 }, { id: "microchip", chance: 0.7 }, { id: "optic_lens", chance: 0.4 }], minTier: 2 },

  // Apparel-flavor / armor
  ceramic_plate: { input: "ceramic_plate", outputs: [{ id: "scrap_metal", chance: 0.6 }, { id: "polymer_strip", chance: 0.4 }] },

  // Medical
  bandage_pack:    { input: "bandage_pack",    outputs: [{ id: "botanical", chance: 0.5 }, { id: "synthate", chance: 0.3 }] },
  antiseptic_vial: { input: "antiseptic_vial", outputs: [{ id: "synthate", chance: 0.9 }] },
  iodine_packet:   { input: "iodine_packet",   outputs: [{ id: "synthate", chance: 0.7 }, { id: "botanical", chance: 0.2 }] },
  gauze_roll:      { input: "gauze_roll",      outputs: [{ id: "botanical", chance: 0.3 }, { id: "cloth_scrap", chance: 0.7 }] },
  med_syrette:     { input: "med_syrette",     outputs: [{ id: "synthate", chance: 0.8 }, { id: "botanical", chance: 0.3 }] },
  combat_stim:     { input: "combat_stim",     outputs: [{ id: "synthate", chance: 0.7 }, { id: "botanical", chance: 0.6 }], minTier: 2 },
  nano_clot:       { input: "nano_clot",       outputs: [{ id: "synthate", chance: 0.9 }, { id: "botanical", chance: 0.8 }], minTier: 3 },
  vitamin_shot:    { input: "vitamin_shot",    outputs: [{ id: "synthate", chance: 0.5 }, { id: "botanical", chance: 0.4 }] },
  bio_synth_sample:{ input: "bio_synth_sample",outputs: [{ id: "synthate", chance: 0.9 }, { id: "botanical", chance: 0.7 }], minTier: 2 },

  // Consumables (food / drink)
  ration_pack:  { input: "ration_pack",  outputs: [{ id: "botanical", chance: 0.6 }, { id: "polymer_strip", chance: 0.3 }] },
  coffee_can:   { input: "coffee_can",   outputs: [{ id: "botanical", chance: 0.4 }] },
  tea_brick:    { input: "tea_brick",    outputs: [{ id: "botanical", chance: 0.8 }] },
  protein_bar:  { input: "protein_bar",  outputs: [{ id: "botanical", chance: 0.5 }, { id: "synthate", chance: 0.2 }] },
};

export const RECYCLABLE_IDS = new Set(Object.keys(RECYCLE_RECIPES));

// Helper: items whose recycle recipe's minTier is satisfied at `recyclerTier`.
export function isRecyclableAt(itemId: string, recyclerTier: 1 | 2 | 3): boolean {
  const r = RECYCLE_RECIPES[itemId];
  if (!r) return false;
  return (r.minTier ?? 1) <= recyclerTier;
}

// Tier rejection labels for UI tooltips. Cheap to live here so the panel
// doesn't have to recompute strings.
export const TIER_LABEL: Record<ItemTier, string> = {
  common: "common",
  uncommon: "uncommon",
  rare: "rare",
  experimental: "experimental",
};
