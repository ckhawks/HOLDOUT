import type { Item } from "@/lib/types";

export const ITEMS: Record<string, Item> = {
  scrap_metal: { id: "scrap_metal", name: "Scrap Metal", tier: "common", sellValue: 8, weight: 2 },
  rusted_bolt: { id: "rusted_bolt", name: "Rusted Bolt", tier: "common", sellValue: 4, weight: 1 },
  cracked_battery: { id: "cracked_battery", name: "Cracked Battery", tier: "common", sellValue: 12, weight: 1 },
  ration_pack: { id: "ration_pack", name: "Ration Pack", tier: "common", sellValue: 10, weight: 1 },
  copper_wire: { id: "copper_wire", name: "Copper Wire Spool", tier: "common", sellValue: 14, weight: 1 },
  med_syrette: { id: "med_syrette", name: "Med Syrette", tier: "uncommon", sellValue: 35, weight: 1 },
  optic_lens: { id: "optic_lens", name: "Optic Lens", tier: "uncommon", sellValue: 45, weight: 1 },
  pistol_mag: { id: "pistol_mag", name: "Pistol Magazine", tier: "uncommon", sellValue: 28, weight: 1 },
  ceramic_plate: { id: "ceramic_plate", name: "Ceramic Plate", tier: "uncommon", sellValue: 60, weight: 3 },
  encrypted_drive: { id: "encrypted_drive", name: "Encrypted Drive", tier: "rare", sellValue: 140, weight: 1 },
  mil_optic: { id: "mil_optic", name: "Military Optic", tier: "rare", sellValue: 180, weight: 1 },
  prototype_chip: { id: "prototype_chip", name: "Prototype Chip", tier: "rare", sellValue: 220, weight: 1 },
  exo_servo: { id: "exo_servo", name: "Exo Servo", tier: "rare", sellValue: 260, weight: 2 },
  workbench_schematic: { id: "workbench_schematic", name: "Workbench Schematic", tier: "experimental", sellValue: 0, weight: 1 },
  black_box: { id: "black_box", name: "Black Box", tier: "experimental", sellValue: 500, weight: 2 },
};

export const ITEM_IDS = Object.keys(ITEMS);

const TIER_POOLS: Record<string, string[]> = {
  common: Object.values(ITEMS).filter((i) => i.tier === "common").map((i) => i.id),
  uncommon: Object.values(ITEMS).filter((i) => i.tier === "uncommon").map((i) => i.id),
  rare: Object.values(ITEMS).filter((i) => i.tier === "rare" && i.id !== "workbench_schematic").map((i) => i.id),
  experimental: Object.values(ITEMS).filter((i) => i.tier === "experimental").map((i) => i.id),
};

export function pickCommonItemId(rand: () => number): string {
  const r = rand();
  const tier = r < 0.7 ? "common" : r < 0.95 ? "uncommon" : "rare";
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
