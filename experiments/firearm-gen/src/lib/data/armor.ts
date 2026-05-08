import type { ArmorBase, Tier } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Armor bases — 14 across 4 pieces × 3 eras
// ─────────────────────────────────────────────────────────────────────────────

export const ARMOR_BASES: Record<string, ArmorBase> = {
  // ── Helmets
  "bh-2": {
    id: "bh-2", modelCode: "BH-2", className: "Bump Helmet",
    piece: "helmet", era: "modern", brandId: "brickeye",
    baseStats: { soak: 6, plate_tier: 1, stealth: 0, mobility: 0, weight: 0.7, durability: 60 },
    variance: { soak: 2, plate_tier: 0, stealth: 2, mobility: 2, weight: 0.2, durability: 10 },
    coverage: ["head"],
  },
  "th-9": {
    id: "th-9", modelCode: "TH-9", className: "Combat Helmet",
    piece: "helmet", era: "modern", brandId: "vossen",
    baseStats: { soak: 12, plate_tier: 2, stealth: -2, mobility: -2, weight: 1.4, durability: 78 },
    variance: { soak: 3, plate_tier: 0, stealth: 2, mobility: 2, weight: 0.3, durability: 12 },
    coverage: ["head", "neck"],
  },
  "vr-7": {
    id: "vr-7", modelCode: "VR-7", className: "Visor Rig",
    piece: "helmet", era: "advanced", brandId: "pellucid",
    baseStats: { soak: 14, plate_tier: 3, stealth: -4, mobility: -1, weight: 1.6, durability: 72 },
    variance: { soak: 3, plate_tier: 1, stealth: 3, mobility: 2, weight: 0.3, durability: 10 },
    coverage: ["head", "face", "neck"],
  },
  "ph-1": {
    id: "ph-1", modelCode: "PH-1", className: "Phase Hood",
    piece: "helmet", era: "exotic", brandId: "wraith",
    baseStats: { soak: 5, plate_tier: 1, stealth: 12, mobility: 2, weight: 0.6, durability: 55 },
    variance: { soak: 2, plate_tier: 1, stealth: 4, mobility: 3, weight: 0.2, durability: 12 },
    coverage: ["head", "face"],
  },

  // ── Chest
  "sv-1": {
    id: "sv-1", modelCode: "SV-1", className: "Soft Vest",
    piece: "chest", era: "modern", brandId: "reike",
    baseStats: { soak: 14, plate_tier: 1, stealth: -2, mobility: 0, weight: 2.4, durability: 70 },
    variance: { soak: 4, plate_tier: 1, stealth: 3, mobility: 2, weight: 0.4, durability: 12 },
    coverage: ["torso"],
  },
  "pc-2": {
    id: "pc-2", modelCode: "PC-2", className: "Plate Carrier",
    piece: "chest", era: "modern", brandId: "brickeye",
    baseStats: { soak: 24, plate_tier: 2, stealth: -8, mobility: -4, weight: 5.2, durability: 80 },
    variance: { soak: 4, plate_tier: 1, stealth: 3, mobility: 3, weight: 0.6, durability: 10 },
    coverage: ["torso", "gut"],
  },
  "hc-v": {
    id: "hc-v", modelCode: "HC-V", className: "Heavy Carrier",
    piece: "chest", era: "advanced", brandId: "halberd",
    baseStats: { soak: 32, plate_tier: 3, stealth: -12, mobility: -8, weight: 7.0, durability: 88 },
    variance: { soak: 5, plate_tier: 1, stealth: 4, mobility: 3, weight: 0.7, durability: 10 },
    coverage: ["torso", "shoulders", "gut"],
  },
  "gs-x": {
    id: "gs-x", modelCode: "GS-X", className: "Ghost Shroud",
    piece: "chest", era: "exotic", brandId: "wraith",
    baseStats: { soak: 10, plate_tier: 1, stealth: 18, mobility: 4, weight: 1.8, durability: 50 },
    variance: { soak: 3, plate_tier: 1, stealth: 5, mobility: 4, weight: 0.3, durability: 12 },
    coverage: ["torso", "arms"],
  },

  // ── Legs
  "lp-3": {
    id: "lp-3", modelCode: "LP-3", className: "Combat Pants",
    piece: "legs", era: "modern", brandId: "vossen",
    baseStats: { soak: 6, plate_tier: 1, stealth: 0, mobility: 0, weight: 1.2, durability: 60 },
    variance: { soak: 2, plate_tier: 0, stealth: 2, mobility: 2, weight: 0.3, durability: 10 },
    coverage: ["thighs"],
  },
  "tg-2": {
    id: "tg-2", modelCode: "TG-2", className: "Thigh Guards",
    piece: "legs", era: "modern", brandId: "ironworks",
    baseStats: { soak: 14, plate_tier: 2, stealth: -4, mobility: -4, weight: 2.4, durability: 72 },
    variance: { soak: 3, plate_tier: 1, stealth: 3, mobility: 3, weight: 0.4, durability: 10 },
    coverage: ["hips", "thighs", "knees"],
  },
  "pl-7": {
    id: "pl-7", modelCode: "PL-7", className: "Powered Greaves",
    piece: "legs", era: "advanced", brandId: "aetius",
    baseStats: { soak: 16, plate_tier: 2, stealth: -3, mobility: 6, weight: 3.0, durability: 78 },
    variance: { soak: 3, plate_tier: 1, stealth: 3, mobility: 4, weight: 0.5, durability: 10 },
    coverage: ["thighs", "knees", "shins"],
  },

  // ── Boots
  "bt-1": {
    id: "bt-1", modelCode: "BT-1", className: "Combat Boots",
    piece: "boots", era: "modern", brandId: "ironworks",
    baseStats: { soak: 4, plate_tier: 0, stealth: -2, mobility: 0, weight: 1.4, durability: 64 },
    variance: { soak: 1, plate_tier: 0, stealth: 2, mobility: 2, weight: 0.3, durability: 10 },
    coverage: ["feet", "ankles"],
  },
  "ss-2": {
    id: "ss-2", modelCode: "SS-2", className: "Silent Sole",
    piece: "boots", era: "modern", brandId: "wraith",
    baseStats: { soak: 3, plate_tier: 0, stealth: 8, mobility: -2, weight: 1.0, durability: 55 },
    variance: { soak: 1, plate_tier: 0, stealth: 3, mobility: 2, weight: 0.2, durability: 10 },
    coverage: ["feet"],
  },
  "mc-1": {
    id: "mc-1", modelCode: "MC-1", className: "Mag-Clamp Boots",
    piece: "boots", era: "advanced", brandId: "halberd",
    baseStats: { soak: 5, plate_tier: 1, stealth: -4, mobility: 4, weight: 1.8, durability: 70 },
    variance: { soak: 1, plate_tier: 0, stealth: 2, mobility: 3, weight: 0.3, durability: 10 },
    coverage: ["feet", "ankles"],
  },
};

export const ARMOR_BASE_IDS = Object.keys(ARMOR_BASES);

// ─────────────────────────────────────────────────────────────────────────────
// Armor nicknames — distinct vibe from weapons (defensive / shelter / saint imagery)
// ─────────────────────────────────────────────────────────────────────────────

export const ARMOR_NICKNAMES_BY_TIER: Record<Tier, string[]> = {
  common: [
    "SHELL", "HUSK", "RAINCOAT", "BROWNCOAT", "BUDGET", "ISSUE",
    "TOSSER", "HAND-ME", "SCRAPSKIN", "SECOND-SHIFT", "DAYRATE", "PATCHWORK",
  ],
  uncommon: [
    "BUNKER", "SHIELD", "BEDROCK", "SECONDSKIN", "COMPOSITE", "SLAB",
    "WARDEN", "BARRIER", "BULKHEAD", "BACKSTOP", "STANCHION", "ANCHOR",
  ],
  rare: [
    "AEGIS", "CITADEL", "BULWARK", "MAUSOLEUM", "KEEPSAFE", "MOUNTAIN",
    "FORTRESS", "RAMPART", "REDOUBT", "GARRISON", "VAULT", "SANCTUM",
  ],
  experimental: [
    "INHERITOR", "SAINT-MARROW", "CINDER-FIELD", "NULL-WEAVE", "PROMISE", "COVENANT",
    "OBLIGATE", "RELIQUARY", "PALATINE", "INVIOLATE", "CATAFALQUE", "CHAPTER-7",
  ],
};
