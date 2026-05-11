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
  rect2x3: [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]] as const,
  square3: [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]] as const,
  rect3x4: [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2], [0, 3], [1, 3], [2, 3]] as const,
  rect4x5: [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1], [1, 1], [2, 1], [3, 1], [0, 2], [1, 2], [2, 2], [3, 2], [0, 3], [1, 3], [2, 3], [3, 3], [0, 4], [1, 4], [2, 4], [3, 4]] as const,
} satisfies Record<string, ShapeCells>;

export const ITEMS: Record<string, Item> = {
  // mechanical
  scrap_metal:      { id: "scrap_metal",      name: "Scrap Metal",       tier: "common",       category: "mechanical",  sellValue: 8,   weight: 2, shape: S.one },
  rusted_bolt:      { id: "rusted_bolt",      name: "Rusted Bolt",       tier: "common",       category: "mechanical",  sellValue: 4,   weight: 1, shape: S.one },
  ball_bearing:     { id: "ball_bearing",     name: "Ball Bearing",      tier: "common",       category: "mechanical",  sellValue: 5,   weight: 1, shape: S.one },
  valve_handle:     { id: "valve_handle",     name: "Valve Handle",      tier: "common",       category: "mechanical",  sellValue: 7,   weight: 1, shape: S.one },
  copper_wire:      { id: "copper_wire",      name: "Copper Wire Spool", tier: "common",       category: "mechanical",  sellValue: 14,  weight: 1, shape: S.l3 },
  spring_coil:      { id: "spring_coil",      name: "Spring Coil",       tier: "common",       category: "mechanical",  sellValue: 6,   weight: 1, shape: S.one },
  rail_clamp:       { id: "rail_clamp",       name: "Rail Clamp",        tier: "uncommon",     category: "mechanical",  sellValue: 32,  weight: 2, shape: S.horiz2 },
  hydraulic_piston: { id: "hydraulic_piston", name: "Hydraulic Piston",  tier: "uncommon",     category: "mechanical",  sellValue: 55,  weight: 3, shape: S.i3 },
  precision_gear:   { id: "precision_gear",   name: "Precision Gear",    tier: "uncommon",     category: "mechanical",  sellValue: 42,  weight: 1, shape: S.one },
  exo_servo:        { id: "exo_servo",        name: "Exo Servo",         tier: "rare",         category: "mechanical",  sellValue: 260, weight: 2, shape: S.j4 },
  tungsten_gear:    { id: "tungsten_gear",    name: "Tungsten Gear",     tier: "rare",         category: "mechanical",  sellValue: 165, weight: 3, shape: S.square2 },
  powered_actuator: { id: "powered_actuator", name: "Powered Actuator",  tier: "rare",         category: "mechanical",  sellValue: 210, weight: 3, shape: S.horiz2 },

  // electronics
  cracked_battery:  { id: "cracked_battery",  name: "Cracked Battery",   tier: "common",       category: "electronics", sellValue: 12,  weight: 1, shape: S.vert2 },
  microchip:        { id: "microchip",        name: "Microchip",         tier: "common",       category: "electronics", sellValue: 18,  weight: 1, shape: S.one },
  optic_lens:       { id: "optic_lens",       name: "Optic Lens",        tier: "uncommon",     category: "electronics", sellValue: 45,  weight: 1, shape: S.one },
  capacitor_bank:   { id: "capacitor_bank",   name: "Capacitor Bank",    tier: "uncommon",     category: "electronics", sellValue: 48,  weight: 1, shape: S.vert2 },
  signal_jammer:    { id: "signal_jammer",    name: "Signal Jammer",     tier: "uncommon",     category: "electronics", sellValue: 70,  weight: 1, shape: S.horiz2 },
  coolant_loop:     { id: "coolant_loop",     name: "Coolant Loop",      tier: "uncommon",     category: "electronics", sellValue: 58,  weight: 2, shape: S.horiz2 },
  holo_display:     { id: "holo_display",     name: "Holo Display",      tier: "rare",         category: "electronics", sellValue: 155, weight: 1, shape: S.i3 },
  quantum_capacitor:{ id: "quantum_capacitor",name: "Quantum Capacitor", tier: "rare",         category: "electronics", sellValue: 240, weight: 1, shape: S.vert2 },

  // medical
  bandage_pack:     { id: "bandage_pack",     name: "Bandage Pack",      tier: "common",       category: "medical",       sellValue: 6,   weight: 1, shape: S.one },
  antiseptic_vial:  { id: "antiseptic_vial",  name: "Antiseptic Vial",   tier: "common",       category: "medical",       sellValue: 9,   weight: 1, shape: S.one },
  gauze_roll:       { id: "gauze_roll",       name: "Gauze Roll",        tier: "common",       category: "medical",       sellValue: 8,   weight: 1, shape: S.one },
  iodine_packet:    { id: "iodine_packet",    name: "Iodine Packet",     tier: "common",       category: "medical",       sellValue: 7,   weight: 1, shape: S.one },
  med_syrette:      { id: "med_syrette",      name: "Med Syrette",       tier: "uncommon",     category: "medical",       sellValue: 35,  weight: 1, shape: S.one },
  combat_stim:      { id: "combat_stim",      name: "Combat Stim",       tier: "uncommon",     category: "medical",       sellValue: 50,  weight: 1, shape: S.vert2 },
  vitamin_shot:     { id: "vitamin_shot",     name: "Vitamin Shot",      tier: "uncommon",     category: "medical",       sellValue: 32,  weight: 1, shape: S.one },
  nano_clot:        { id: "nano_clot",        name: "Nano-Clot Syringe", tier: "rare",         category: "medical",       sellValue: 130, weight: 1, shape: S.one },

  // consumables
  ration_pack:      { id: "ration_pack",      name: "Ration Pack",       tier: "common",       category: "consumables", sellValue: 10,  weight: 1, shape: S.horiz2 },
  water_bulb:       { id: "water_bulb",       name: "Water Bulb",        tier: "common",       category: "consumables", sellValue: 5,   weight: 1, shape: S.one },
  coffee_can:       { id: "coffee_can",       name: "Coffee Can",        tier: "common",       category: "consumables", sellValue: 12,  weight: 1, shape: S.vert2 },
  protein_bar:      { id: "protein_bar",      name: "Protein Bar",       tier: "common",       category: "consumables", sellValue: 14,  weight: 1, shape: S.one },
  tea_brick:        { id: "tea_brick",        name: "Tea Brick",         tier: "common",       category: "consumables", sellValue: 9,   weight: 1, shape: S.one },
  electrolyte_pouch:{ id: "electrolyte_pouch",name: "Electrolyte Pouch", tier: "uncommon",     category: "consumables", sellValue: 38,  weight: 1, shape: S.vert2 },
  // fuel_cell: industrial salvage — sells well, no consumable use (we don't
  // run on batteries). Lives in electronics since that's what it is.
  fuel_cell:        { id: "fuel_cell",        name: "Fuel Cell",         tier: "uncommon",     category: "electronics", sellValue: 38,  weight: 2, shape: S.vert2 },

  // valuables
  silver_chain:     { id: "silver_chain",     name: "Silver Chain",      tier: "common",       category: "valuables",   sellValue: 22,  weight: 1, shape: S.one },
  copper_coin_stack:{ id: "copper_coin_stack",name: "Copper Coin Stack", tier: "common",       category: "valuables",   sellValue: 18,  weight: 1, shape: S.one },
  vintage_zippo:    { id: "vintage_zippo",    name: "Vintage Zippo",     tier: "common",       category: "valuables",   sellValue: 25,  weight: 1, shape: S.one },
  gold_tooth:       { id: "gold_tooth",       name: "Gold Tooth",        tier: "uncommon",     category: "valuables",   sellValue: 60,  weight: 1, shape: S.one },
  tarnished_pendant:{ id: "tarnished_pendant",name: "Tarnished Pendant", tier: "uncommon",     category: "valuables",   sellValue: 75,  weight: 1, shape: S.one },
  swiss_watch:      { id: "swiss_watch",      name: "Swiss Watch",       tier: "rare",         category: "valuables",   sellValue: 210, weight: 1, shape: S.one },
  micro_diamond:    { id: "micro_diamond",    name: "Micro Diamond",     tier: "rare",         category: "valuables",   sellValue: 290, weight: 1, shape: S.one },
  art_chip:         { id: "art_chip",         name: "Corp Art Chip",     tier: "rare",         category: "valuables",   sellValue: 245, weight: 1, shape: S.horiz2 },
  collector_pin:    { id: "collector_pin",    name: "Collector Pin",     tier: "rare",         category: "valuables",   sellValue: 180, weight: 1, shape: S.one },
  platinum_band:    { id: "platinum_band",    name: "Platinum Band",     tier: "rare",         category: "valuables",   sellValue: 320, weight: 1, shape: S.one },

  // intel
  data_card:        { id: "data_card",        name: "Data Card",         tier: "common",       category: "intel",       sellValue: 16,  weight: 1, shape: S.one },
  shipping_manifest:{ id: "shipping_manifest",name: "Shipping Manifest", tier: "common",       category: "intel",       sellValue: 14,  weight: 1, shape: S.horiz2 },
  corp_id:          { id: "corp_id",          name: "Corp ID Badge",     tier: "uncommon",     category: "intel",       sellValue: 38,  weight: 1, shape: S.one },
  redacted_dossier: { id: "redacted_dossier", name: "Redacted Dossier",  tier: "uncommon",     category: "intel",       sellValue: 55,  weight: 1, shape: S.horiz2 },
  // Single-use bypass key. Quiet alternative to breach_locked — consumes one
  // on use, no ammo cost, minimal heat. Drops in the regular intel pool.
  bypass_key:       { id: "bypass_key",       name: "Bypass Key",        tier: "uncommon",     category: "intel",       sellValue: 70,  weight: 1, shape: S.one },
  encrypted_drive:  { id: "encrypted_drive",  name: "Encrypted Drive",   tier: "rare",         category: "intel",       sellValue: 140, weight: 1, shape: S.horiz2 },
  patrol_schedule:  { id: "patrol_schedule",  name: "Patrol Schedule",   tier: "rare",         category: "intel",       sellValue: 130, weight: 1, shape: S.horiz2 },
  datacenter_keycard:{ id: "datacenter_keycard", name: "Keycard: Datacenter", tier: "rare",     category: "intel",       sellValue: 0,   weight: 1, shape: S.horiz2 },
  biolab_coords:    { id: "biolab_coords",    name: "Biolab Coordinates", tier: "experimental", category: "intel",      sellValue: 0,   weight: 1, shape: S.one },

  // military
  rifle_round:      { id: "rifle_round",      name: "Rifle Round",       tier: "common",       category: "military",    sellValue: 7,   weight: 1, shape: S.one },
  spent_casing:     { id: "spent_casing",     name: "Spent Shell Casing",tier: "common",       category: "military",    sellValue: 3,   weight: 1, shape: S.one },
  combat_knife:     { id: "combat_knife",     name: "Combat Knife",      tier: "common",       category: "military",    sellValue: 22,  weight: 1, shape: S.vert2 },
  pistol_mag:       { id: "pistol_mag",       name: "Pistol Magazine",   tier: "uncommon",     category: "military",    sellValue: 28,  weight: 1, shape: S.vert2 },
  ceramic_plate:    { id: "ceramic_plate",    name: "Ceramic Plate",     tier: "uncommon",     category: "military",    sellValue: 60,  weight: 3, shape: S.square2 },
  frag_grenade:     { id: "frag_grenade",     name: "Frag Grenade",      tier: "uncommon",     category: "military",    sellValue: 65,  weight: 1, shape: S.one },
  camo_strip:       { id: "camo_strip",       name: "Camo Strip",        tier: "uncommon",     category: "military",    sellValue: 42,  weight: 1, shape: S.horiz2 },
  mil_optic:        { id: "mil_optic",        name: "Military Optic",    tier: "rare",         category: "military",    sellValue: 180, weight: 1, shape: S.i3 },
  suppressor_tube:  { id: "suppressor_tube",  name: "Suppressor Tube",   tier: "rare",         category: "military",    sellValue: 170, weight: 1, shape: S.horiz2 },

  // experimental
  prototype_chip:   { id: "prototype_chip",   name: "Prototype Chip",    tier: "rare",         category: "experimental", sellValue: 220, weight: 1, shape: S.one },
  exotic_alloy:     { id: "exotic_alloy",     name: "Reactor Plate",     tier: "rare",         category: "experimental", sellValue: 320, weight: 3, shape: S.square2 },
  corrupted_data_slug:{ id: "corrupted_data_slug", name: "Corrupted Data Slug", tier: "rare", category: "experimental", sellValue: 235, weight: 1, shape: S.one },
  prototype_lens:   { id: "prototype_lens",   name: "Prototype Lens",    tier: "experimental", category: "experimental", sellValue: 450, weight: 1, shape: S.one },
  black_box:        { id: "black_box",        name: "Black Box",         tier: "experimental", category: "experimental", sellValue: 500, weight: 2, shape: S.t4 },
  bio_synth_sample: { id: "bio_synth_sample", name: "Bio-Synth Sample",  tier: "experimental", category: "experimental", sellValue: 380, weight: 1, shape: S.vert2 },
  workbench_schematic:{ id: "workbench_schematic", name: "Schematic: Workbench", tier: "experimental", category: "experimental", sellValue: 0, weight: 1, shape: S.s4 },

  // bags — equippable apparel into the `bag` slot. Provides one or more
  // independent sub-grids alongside built-in pockets. Single-section bags
  // render as one grid; multi-section bags render stacked sub-grids.
  canvas_satchel:   { id: "canvas_satchel",   name: "Canvas Satchel",     tier: "common",   category: "apparel", sellValue: 60,  weight: 2, shape: S.rect2x3, slot: "bag", bagSections: [
    { id: "main", label: "Main", width: 4, height: 2 },
  ] },
  tactical_pack:    { id: "tactical_pack",    name: "Tactical Pack",      tier: "uncommon", category: "apparel", sellValue: 220, weight: 3, shape: S.square3, slot: "bag", bagSections: [
    { id: "main", label: "Main", width: 5, height: 5 },
  ] },
  // Modular pack: a wide main compartment + a side pocket. Sits between
  // tactical_pack and raider_rucksack on the value curve.
  modular_pack:     { id: "modular_pack",     name: "Modular Pack",       tier: "uncommon", category: "apparel", sellValue: 320, weight: 3, shape: S.rect3x4, slot: "bag", bagSections: [
    { id: "main", label: "Main", width: 4, height: 4 },
    { id: "side", label: "Side", width: 2, height: 3 },
  ] },
  raider_rucksack:  { id: "raider_rucksack",  name: "Raider Rucksack",    tier: "rare",     category: "apparel", sellValue: 540, weight: 4, shape: S.rect4x5, slot: "bag", bagSections: [
    { id: "main", label: "Main", width: 6, height: 7 },
  ] },

  // chest rigs — equippable apparel into the new `rig` slot. Worn alongside
  // a bag (not instead of). Always multi-section (it's the rig fantasy);
  // smaller cell counts than bags but the split layout makes loadout
  // organization meaningful (admin pouch for meds, main pouch for ammo).
  light_rig:        { id: "light_rig",        name: "Scrap Chest Rig",    tier: "common",   category: "apparel", sellValue: 90,  weight: 1, shape: S.rect2x3, slot: "rig", bagSections: [
    { id: "main",  label: "Main",  width: 3, height: 2 },
    { id: "admin", label: "Admin", width: 2, height: 1 },
  ] },
  combat_rig:       { id: "combat_rig",       name: "Skirmisher Rig",     tier: "uncommon", category: "apparel", sellValue: 240, weight: 2, shape: S.square3, slot: "rig", bagSections: [
    { id: "main",  label: "Main",  width: 4, height: 2 },
    { id: "admin", label: "Admin", width: 2, height: 2 },
  ] },
  recon_rig:        { id: "recon_rig",        name: "Ghost Harness",      tier: "rare",     category: "apparel", sellValue: 480, weight: 2, shape: S.rect3x4, slot: "rig", bagSections: [
    { id: "main",  label: "Main",  width: 4, height: 3 },
    { id: "admin", label: "Admin", width: 3, height: 2 },
    { id: "side",  label: "Side",  width: 2, height: 2 },
  ] },

  // ─── Construction-system base components (added 2026-05-11) ───
  // Medical bases. Synthate = synthetic chemistry (lab-sourced);
  // botanical = plant extracts (civilian/outdoor). Recipes mix them.
  synthate:         { id: "synthate",         name: "Synthate Vial",     tier: "common",   category: "medical",    sellValue: 12, weight: 1, shape: S.one },
  botanical:        { id: "botanical",        name: "Botanical Sample",  tier: "common",   category: "medical",    sellValue: 9,  weight: 1, shape: S.one },
  // Fabric / polymer bases for apparel + recycler output.
  cloth_scrap:      { id: "cloth_scrap",      name: "Cloth Scrap",       tier: "common",   category: "apparel",    sellValue: 5,  weight: 1, shape: S.one },
  polymer_strip:    { id: "polymer_strip",    name: "Polymer Strip",     tier: "common",   category: "mechanical", sellValue: 6,  weight: 1, shape: S.one },

  // ─── Specialized construction junk ───
  // Direct upgrade gates. Each named item is consumed by one or two
  // specific module recipes (see data/modules.ts + data/recipes.ts).
  industrial_motor:    { id: "industrial_motor",    name: "Industrial Motor",     tier: "uncommon", category: "mechanical",  sellValue: 80,  weight: 3, shape: S.square2 },
  industrial_shelving: { id: "industrial_shelving", name: "Industrial Shelving",  tier: "common",   category: "mechanical",  sellValue: 35,  weight: 2, shape: S.i3 },
  reinforced_locker:   { id: "reinforced_locker",   name: "Reinforced Locker",    tier: "uncommon", category: "mechanical",  sellValue: 110, weight: 4, shape: S.rect2x3 },
  vault_door:          { id: "vault_door",          name: "Vault Door Mechanism", tier: "rare",     category: "mechanical",  sellValue: 280, weight: 4, shape: S.square2 },
  power_tool:          { id: "power_tool",          name: "Power Tool",           tier: "uncommon", category: "mechanical",  sellValue: 90,  weight: 2, shape: S.horiz2 },
  calibration_jig:     { id: "calibration_jig",     name: "Calibration Jig",      tier: "uncommon", category: "mechanical",  sellValue: 130, weight: 2, shape: S.l3 },
  precision_lathe:     { id: "precision_lathe",     name: "Precision Lathe",      tier: "rare",     category: "mechanical",  sellValue: 320, weight: 4, shape: S.rect2x3 },
  control_board:       { id: "control_board",       name: "Control Board",        tier: "uncommon", category: "electronics", sellValue: 95,  weight: 1, shape: S.horiz2 },
  medical_autoclave:   { id: "medical_autoclave",   name: "Medical Autoclave",    tier: "uncommon", category: "medical",     sellValue: 140, weight: 3, shape: S.square2 },
  anesthesia_rig:      { id: "anesthesia_rig",      name: "Anesthesia Rig",       tier: "rare",     category: "medical",     sellValue: 240, weight: 2, shape: S.rect2x3 },
  surgical_kit:        { id: "surgical_kit",        name: "Surgical Kit",         tier: "uncommon", category: "medical",     sellValue: 110, weight: 1, shape: S.horiz2 },
  modular_harness:     { id: "modular_harness",     name: "Modular Harness",      tier: "uncommon", category: "apparel",     sellValue: 100, weight: 1, shape: S.horiz2 },
};

// Component flags applied after the item table so we don't repeat them
// on every line above. Order: existing items repurposed as components,
// then the new base components from the construction system, then the
// specialized "named junk" gating module recipes.
const COMPONENT_IDS = [
  // Mechanical
  "scrap_metal", "rusted_bolt", "ball_bearing", "valve_handle", "copper_wire",
  "spring_coil", "rail_clamp", "hydraulic_piston", "precision_gear",
  "exo_servo", "tungsten_gear", "powered_actuator",
  // Electronics
  "cracked_battery", "microchip", "optic_lens", "capacitor_bank",
  "signal_jammer", "coolant_loop", "holo_display", "quantum_capacitor",
  // New construction-system base components
  "synthate", "botanical", "cloth_scrap", "polymer_strip",
] as const;

const SPECIALIZED_IDS = [
  "industrial_motor", "industrial_shelving", "reinforced_locker", "vault_door",
  "power_tool", "calibration_jig", "precision_lathe", "control_board",
  "medical_autoclave", "anesthesia_rig", "surgical_kit", "modular_harness",
] as const;

for (const id of COMPONENT_IDS) {
  const def = ITEMS[id];
  if (def) def.component = true;
}
for (const id of SPECIALIZED_IDS) {
  const def = ITEMS[id];
  if (def) {
    def.specialized = true;
    def.component = true;
  }
}

export const ITEM_IDS = Object.keys(ITEMS);

// Tagged unlock items are excluded so they only drop from location-tagged
// rare events. Bags participate in the regular pools at their natural tier
// rate, so they can land in regular containers (via pickCommonItemId/
// pickRareItemId) and locked containers (via pickItemForLocation fallback).
const TIER_POOLS: Record<string, string[]> = {
  common: Object.values(ITEMS).filter((i) => i.tier === "common" && !i.specialized).map((i) => i.id),
  uncommon: Object.values(ITEMS).filter((i) => i.tier === "uncommon" && !i.specialized).map((i) => i.id),
  rare: Object.values(ITEMS).filter((i) => i.tier === "rare" && !i.specialized && i.id !== "datacenter_keycard").map((i) => i.id),
  experimental: Object.values(ITEMS).filter((i) => i.tier === "experimental" && !i.specialized && i.id !== "biolab_coords" && i.id !== "workbench_schematic").map((i) => i.id),
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

// Wildcard drops: small probability that a location-weighted roll bypasses
// its categoryWeights and picks from the generic pool instead. Gives every
// location a slim chance of producing surprises (a stray medkit in the
// Datacenter, a frag grenade in the Warehouse). Keep this small — the whole
// point of category weights is location flavor.
const WILDCARD_CHANCE = 0.06;

// Per-location chance that a regular loot roll is replaced by a specialized
// construction-junk drop. Kept low so the rare/specialized pool doesn't
// crowd out generic loot, but high enough to give a build target.
const SPECIALIZED_DROP_CHANCE = 0.04;

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

  // Specialized construction-junk drops — per-location pool, small flat
  // chance. Lets every location have a build target without inflating the
  // generic tier pools.
  if (location.specializedDrops && location.specializedDrops.length > 0) {
    if (rand() < SPECIALIZED_DROP_CHANCE) {
      return location.specializedDrops[Math.floor(rand() * location.specializedDrops.length)];
    }
  }

  const weights = location.categoryWeights;
  if (!weights || Object.keys(weights).length === 0) {
    return isRare ? pickRareItemId(rand) : pickCommonItemId(rand, depth);
  }
  // Wildcard: rare bypass of location weighting. Pulls from the unweighted
  // generic pool, so even hyper-specialized locations occasionally drop
  // off-category surprises.
  if (rand() < WILDCARD_CHANCE) {
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
        !i.specialized &&
        !["datacenter_keycard", "biolab_coords", "workbench_schematic"].includes(i.id),
    );
    if (slice.length > 0) {
      return slice[Math.floor(rand() * slice.length)].id;
    }
  }
  return isRare ? pickRareItemId(rand) : pickCommonItemId(rand, depth);
}
