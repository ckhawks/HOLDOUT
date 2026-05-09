import type { Item, ItemCategory, Location, ShapeCells } from "@/lib/types";

const S = {
  one: [[0, 0]] as const,
  horiz2: [[0, 0], [1, 0]] as const,
  vert2: [[0, 0], [0, 1]] as const,
  square2: [[0, 0], [1, 0], [0, 1], [1, 1]] as const,
  l3: [[0, 0], [0, 1], [1, 1]] as const,
  j4: [[0, 0], [0, 1], [1, 1], [2, 1]] as const,
  t4: [[0, 0], [1, 0], [2, 0], [1, 1]] as const,
  i3: [[0, 0], [1, 0], [2, 0]] as const,
  s4: [[1, 0], [2, 0], [0, 1], [1, 1]] as const,
} satisfies Record<string, ShapeCells>;

export const ITEMS: Record<string, Item> = {
  // mechanical
  scrap_metal:      { id: "scrap_metal",      name: "Scrap Metal",       tier: "common",       category: "mechanical",  sellValue: 8,   weight: 2, shape: S.one },
  rusted_bolt:      { id: "rusted_bolt",      name: "Rusted Bolt",       tier: "common",       category: "mechanical",  sellValue: 4,   weight: 1, shape: S.one },
  copper_wire:      { id: "copper_wire",      name: "Copper Wire Spool", tier: "common",       category: "mechanical",  sellValue: 14,  weight: 1, shape: S.l3 },
  spring_coil:      { id: "spring_coil",      name: "Spring Coil",       tier: "common",       category: "mechanical",  sellValue: 6,   weight: 1, shape: S.one },
  rail_clamp:       { id: "rail_clamp",       name: "Rail Clamp",        tier: "uncommon",     category: "mechanical",  sellValue: 32,  weight: 2, shape: S.horiz2 },
  hydraulic_piston: { id: "hydraulic_piston", name: "Hydraulic Piston",  tier: "uncommon",     category: "mechanical",  sellValue: 55,  weight: 3, shape: S.i3 },
  exo_servo:        { id: "exo_servo",        name: "Exo Servo",         tier: "rare",         category: "mechanical",  sellValue: 260, weight: 2, shape: S.j4 },
  tungsten_gear:    { id: "tungsten_gear",    name: "Tungsten Gear",     tier: "rare",         category: "mechanical",  sellValue: 165, weight: 3, shape: S.square2 },

  // electronics
  cracked_battery:  { id: "cracked_battery",  name: "Cracked Battery",   tier: "common",       category: "electronics", sellValue: 12,  weight: 1, shape: S.vert2 },
  optic_lens:       { id: "optic_lens",       name: "Optic Lens",        tier: "uncommon",     category: "electronics", sellValue: 45,  weight: 1, shape: S.one },
  capacitor_bank:   { id: "capacitor_bank",   name: "Capacitor Bank",    tier: "uncommon",     category: "electronics", sellValue: 48,  weight: 1, shape: S.vert2 },
  signal_jammer:    { id: "signal_jammer",    name: "Signal Jammer",     tier: "uncommon",     category: "electronics", sellValue: 70,  weight: 1, shape: S.horiz2 },
  holo_display:     { id: "holo_display",     name: "Holo Display",      tier: "rare",         category: "electronics", sellValue: 155, weight: 1, shape: S.i3 },

  // chems
  bandage_pack:     { id: "bandage_pack",     name: "Bandage Pack",      tier: "common",       category: "chems",       sellValue: 6,   weight: 1, shape: S.one },
  antiseptic_vial:  { id: "antiseptic_vial",  name: "Antiseptic Vial",   tier: "common",       category: "chems",       sellValue: 9,   weight: 1, shape: S.one },
  med_syrette:      { id: "med_syrette",      name: "Med Syrette",       tier: "uncommon",     category: "chems",       sellValue: 35,  weight: 1, shape: S.one },
  combat_stim:      { id: "combat_stim",      name: "Combat Stim",       tier: "uncommon",     category: "chems",       sellValue: 50,  weight: 1, shape: S.vert2 },
  nano_clot:        { id: "nano_clot",        name: "Nano-Clot Syringe", tier: "rare",         category: "chems",       sellValue: 130, weight: 1, shape: S.one },

  // consumables
  ration_pack:      { id: "ration_pack",      name: "Ration Pack",       tier: "common",       category: "consumables", sellValue: 10,  weight: 1, shape: S.horiz2 },
  water_bulb:       { id: "water_bulb",       name: "Water Bulb",        tier: "common",       category: "consumables", sellValue: 5,   weight: 1, shape: S.one },
  coffee_can:       { id: "coffee_can",       name: "Coffee Can",        tier: "common",       category: "consumables", sellValue: 12,  weight: 1, shape: S.vert2 },
  fuel_cell:        { id: "fuel_cell",        name: "Fuel Cell",         tier: "uncommon",     category: "consumables", sellValue: 38,  weight: 2, shape: S.vert2 },

  // valuables
  silver_chain:     { id: "silver_chain",     name: "Silver Chain",      tier: "common",       category: "valuables",   sellValue: 22,  weight: 1, shape: S.one },
  gold_tooth:       { id: "gold_tooth",       name: "Gold Tooth",        tier: "uncommon",     category: "valuables",   sellValue: 60,  weight: 1, shape: S.one },
  swiss_watch:      { id: "swiss_watch",      name: "Swiss Watch",       tier: "rare",         category: "valuables",   sellValue: 210, weight: 1, shape: S.one },
  micro_diamond:    { id: "micro_diamond",    name: "Micro Diamond",     tier: "rare",         category: "valuables",   sellValue: 290, weight: 1, shape: S.one },
  art_chip:         { id: "art_chip",         name: "Corp Art Chip",     tier: "rare",         category: "valuables",   sellValue: 245, weight: 1, shape: S.horiz2 },

  // intel
  data_card:        { id: "data_card",        name: "Data Card",         tier: "common",       category: "intel",       sellValue: 16,  weight: 1, shape: S.one },
  corp_id:          { id: "corp_id",          name: "Corp ID Badge",     tier: "uncommon",     category: "intel",       sellValue: 38,  weight: 1, shape: S.one },
  redacted_dossier: { id: "redacted_dossier", name: "Redacted Dossier",  tier: "uncommon",     category: "intel",       sellValue: 55,  weight: 1, shape: S.horiz2 },
  encrypted_drive:  { id: "encrypted_drive",  name: "Encrypted Drive",   tier: "rare",         category: "intel",       sellValue: 140, weight: 1, shape: S.horiz2 },
  datacenter_keycard:{ id: "datacenter_keycard", name: "Keycard: Datacenter", tier: "rare",     category: "intel",       sellValue: 0,   weight: 1, shape: S.horiz2 },
  biolab_coords:    { id: "biolab_coords",    name: "Biolab Coordinates", tier: "experimental", category: "intel",      sellValue: 0,   weight: 1, shape: S.one },

  // military
  rifle_round:      { id: "rifle_round",      name: "Rifle Round",       tier: "common",       category: "military",    sellValue: 7,   weight: 1, shape: S.one },
  pistol_mag:       { id: "pistol_mag",       name: "Pistol Magazine",   tier: "uncommon",     category: "military",    sellValue: 28,  weight: 1, shape: S.vert2 },
  ceramic_plate:    { id: "ceramic_plate",    name: "Ceramic Plate",     tier: "uncommon",     category: "military",    sellValue: 60,  weight: 3, shape: S.square2 },
  frag_grenade:     { id: "frag_grenade",     name: "Frag Grenade",      tier: "uncommon",     category: "military",    sellValue: 65,  weight: 1, shape: S.one },
  mil_optic:        { id: "mil_optic",        name: "Military Optic",    tier: "rare",         category: "military",    sellValue: 180, weight: 1, shape: S.i3 },
  suppressor_tube:  { id: "suppressor_tube",  name: "Suppressor Tube",   tier: "rare",         category: "military",    sellValue: 170, weight: 1, shape: S.horiz2 },

  // experimental
  prototype_chip:   { id: "prototype_chip",   name: "Prototype Chip",    tier: "rare",         category: "experimental", sellValue: 220, weight: 1, shape: S.one },
  exotic_alloy:     { id: "exotic_alloy",     name: "Exotic Alloy Slab", tier: "rare",         category: "experimental", sellValue: 320, weight: 3, shape: S.square2 },
  prototype_lens:   { id: "prototype_lens",   name: "Prototype Lens",    tier: "experimental", category: "experimental", sellValue: 450, weight: 1, shape: S.one },
  black_box:        { id: "black_box",        name: "Black Box",         tier: "experimental", category: "experimental", sellValue: 500, weight: 2, shape: S.t4 },
  workbench_schematic:{ id: "workbench_schematic", name: "Schematic: Workbench", tier: "experimental", category: "experimental", sellValue: 0, weight: 1, shape: S.s4 },
};

export const ITEM_IDS = Object.keys(ITEMS);

const TIER_POOLS: Record<string, string[]> = {
  common: Object.values(ITEMS).filter((i) => i.tier === "common").map((i) => i.id),
  uncommon: Object.values(ITEMS).filter((i) => i.tier === "uncommon").map((i) => i.id),
  rare: Object.values(ITEMS).filter((i) => i.tier === "rare" && i.id !== "datacenter_keycard").map((i) => i.id),
  experimental: Object.values(ITEMS).filter((i) => i.tier === "experimental" && i.id !== "biolab_coords" && i.id !== "workbench_schematic").map((i) => i.id),
};

// Items keyed unlock items are excluded from generic pools so they only drop
// from location-specific tagged events.
export function pickCommonItemId(rand: () => number, depth: number = 0): string {
  // Depth lifts the mean tier without flattening the lucky-rare floor (~5% at any depth).
  const lift = Math.min(0.35, depth * 0.02);
  const r = rand();
  const commonCut = 0.7 - lift;
  const uncommonCut = 0.95 - lift * 0.5;
  const tier = r < commonCut ? "common" : r < uncommonCut ? "uncommon" : "rare";
  const pool = TIER_POOLS[tier];
  return pool[Math.floor(rand() * pool.length)];
}

export function pickRareItemId(rand: () => number): string {
  const r = rand();
  if (r < 0.05) return "workbench_schematic";
  if (r < 0.2) return "black_box";
  const pool = TIER_POOLS.rare;
  return pool[Math.floor(rand() * pool.length)];
}

function pickWeighted<T>(rand: () => number, entries: ReadonlyArray<readonly [T, number]>): T | null {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  if (total <= 0) return null;
  let r = rand() * total;
  for (const [v, w] of entries) {
    r -= w;
    if (r <= 0) return v;
  }
  return entries[entries.length - 1][0];
}

function rollTier(
  rand: () => number,
  isRare: boolean,
  depth: number = 0,
): "common" | "uncommon" | "rare" | "experimental" {
  const r = rand();
  if (isRare) {
    if (r < 0.6) return "rare";
    if (r < 0.9) return "uncommon";
    return "experimental";
  }
  // Depth lifts the curve; ceiling is clamped so very deep raids don't flatten.
  const lift = Math.min(0.35, depth * 0.02);
  const commonCut = 0.65 - lift;
  const uncommonCut = 0.92 - lift * 0.5;
  if (r < commonCut) return "common";
  if (r < uncommonCut) return "uncommon";
  return "rare";
}

// Drop tables for unlock-token / quest items: very rare, location-gated.
const UNLOCK_TOKEN_DROPS: Record<string, string> = {
  drone_graveyard: "datacenter_keycard",
  subway: "biolab_coords",
};
const UNLOCK_TOKEN_CHANCE = 0.04; // ~4% of rare-event drops in eligible locations

export function pickItemForLocation(
  rand: () => number,
  location: Location,
  isRare: boolean,
  depth: number = 0,
): string {
  // Rare-event tokens (Datacenter Keycard / Biolab Coordinates) only drop on rare events.
  if (isRare) {
    const token = UNLOCK_TOKEN_DROPS[location.id];
    if (token && rand() < UNLOCK_TOKEN_CHANCE) return token;
    if (rand() < 0.05) return "workbench_schematic";
  }

  const weights = location.categoryWeights;
  if (!weights || Object.keys(weights).length === 0) {
    return isRare ? pickRareItemId(rand) : pickCommonItemId(rand, depth);
  }
  const entries = Object.entries(weights) as Array<[ItemCategory, number]>;

  // Try up to 4 times: pick category, pick tier, find item in slice. Fall back to generic on miss.
  for (let attempt = 0; attempt < 4; attempt++) {
    const cat = pickWeighted(rand, entries);
    if (!cat) break;
    const tier = rollTier(rand, isRare, depth);
    const slice = Object.values(ITEMS).filter(
      (i) =>
        i.category === cat &&
        i.tier === tier &&
        !["datacenter_keycard", "biolab_coords", "workbench_schematic"].includes(i.id),
    );
    if (slice.length > 0) {
      return slice[Math.floor(rand() * slice.length)].id;
    }
  }
  return isRare ? pickRareItemId(rand) : pickCommonItemId(rand, depth);
}
