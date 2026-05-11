import type { MetalId } from "@/lib/types";

// Foundry smelt recipes. Outputs are numeric metal units, stored in the
// foundry's vessels (no inventory items). See engine/foundry.ts.

export interface SmeltOutput {
  metal: MetalId;
  amount: number;
}

export interface SmeltRecipe {
  input: string;
  outputs: ReadonlyArray<SmeltOutput>;
  minTier?: 1 | 2 | 3; // default 1
}

export const SMELT_RECIPES: Record<string, SmeltRecipe> = {
  scrap_metal:      { input: "scrap_metal",      outputs: [{ metal: "steel", amount: 30 }] },
  rusted_bolt:      { input: "rusted_bolt",      outputs: [{ metal: "steel", amount: 8 }] },
  ball_bearing:     { input: "ball_bearing",     outputs: [{ metal: "steel", amount: 12 }] },
  spring_coil:      { input: "spring_coil",      outputs: [{ metal: "steel", amount: 10 }] },
  valve_handle:     { input: "valve_handle",     outputs: [{ metal: "steel", amount: 18 }] },
  copper_wire:      { input: "copper_wire",      outputs: [{ metal: "copper", amount: 25 }] },
  rail_clamp:       { input: "rail_clamp",       outputs: [{ metal: "steel", amount: 60 }] },
  hydraulic_piston: { input: "hydraulic_piston", outputs: [{ metal: "steel", amount: 80 }, { metal: "copper", amount: 20 }] },
  precision_gear:   { input: "precision_gear",   outputs: [{ metal: "steel", amount: 35 }] },
  combat_knife:     { input: "combat_knife",     outputs: [{ metal: "steel", amount: 35 }] },
  pistol_mag:       { input: "pistol_mag",       outputs: [{ metal: "steel", amount: 25 }] },
  frag_grenade:     { input: "frag_grenade",     outputs: [{ metal: "steel", amount: 15 }, { metal: "copper", amount: 5 }] },
  powered_actuator: { input: "powered_actuator", outputs: [{ metal: "steel", amount: 80 }, { metal: "copper", amount: 40 }] },
  tungsten_gear:    { input: "tungsten_gear",    outputs: [{ metal: "titanium", amount: 60 }], minTier: 2 },
  exo_servo:        { input: "exo_servo",        outputs: [{ metal: "titanium", amount: 40 }, { metal: "copper", amount: 30 }], minTier: 2 },
  exotic_alloy:     { input: "exotic_alloy",     outputs: [{ metal: "titanium", amount: 120 }, { metal: "voidsteel", amount: 30 }], minTier: 3 },
};

export const SMELTABLE_IDS = new Set(Object.keys(SMELT_RECIPES));

// Per-metal sell prices. Tuned so raw selling typically beats smelt+sell;
// smelting only wins when a metal is gating an upgrade. See spec §5.6.
export const METAL_SELL_PRICE: Record<MetalId, number> = {
  steel: 0.4,
  copper: 0.6,
  titanium: 1.2,
  chromite: 2.5,
  voidsteel: 4.0,
};

// Per-metal vessel capacity by foundry tier (1..3). Index = tier - 1.
const CAPACITY_PER_TIER: Record<MetalId, readonly [number, number, number]> = {
  steel:     [500, 1500, 5000],
  copper:    [500, 1500, 5000],
  titanium:  [200,  600, 2000],
  chromite:  [  0,    0,  500], // unlocked at L3
  voidsteel: [  0,    0,  500], // unlocked at L3
};

export function vesselCapacity(metal: MetalId, tier: 1 | 2 | 3): number {
  return CAPACITY_PER_TIER[metal][tier - 1];
}

export const METAL_DISPLAY_NAME: Record<MetalId, string> = {
  steel: "Steel",
  copper: "Copper",
  titanium: "Titanium",
  chromite: "Chromite",
  voidsteel: "Voidsteel",
};
