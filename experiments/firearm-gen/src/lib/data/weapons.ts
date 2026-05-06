import type {
  Attachment,
  Brand,
  Tier,
  WeaponBase,
} from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Weapon bases — 5 classes × varying eras
// ─────────────────────────────────────────────────────────────────────────────

export const WEAPON_BASES: Record<string, WeaponBase> = {
  // Pistols
  "p-3": {
    id: "p-3",
    modelCode: "P-3",
    className: "Compact Sidearm",
    weaponClass: "pistol",
    era: "modern",
    baseStats: { damage: 22, accuracy: 58, rpm: 280, range: 30, recoil: 18, reliability: 75, weight: 2.0 },
    variance: { damage: 4, accuracy: 8, rpm: 20, range: 5, recoil: 5, reliability: 10, weight: 0.3 },
    slots: ["sight", "barrel", "mag", "underbarrel"],
  },
  "smart-9": {
    id: "smart-9",
    modelCode: "Smart-9",
    className: "Smart-Linked Pistol",
    weaponClass: "pistol",
    era: "advanced",
    baseStats: { damage: 26, accuracy: 70, rpm: 260, range: 38, recoil: 16, reliability: 70, weight: 2.2 },
    variance: { damage: 5, accuracy: 6, rpm: 15, range: 6, recoil: 4, reliability: 8, weight: 0.3 },
    slots: ["sight", "barrel", "mag"],
  },
  "coil-2": {
    id: "coil-2",
    modelCode: "Coil-2",
    className: "Coil Sidearm",
    weaponClass: "pistol",
    era: "exotic",
    baseStats: { damage: 32, accuracy: 76, rpm: 90, range: 55, recoil: 8, reliability: 60, weight: 2.8 },
    variance: { damage: 6, accuracy: 8, rpm: 10, range: 8, recoil: 3, reliability: 12, weight: 0.3 },
    slots: ["sight", "mag"],
  },

  // Bursts (modern combat rifles)
  "br-19": {
    id: "br-19",
    modelCode: "BR-19",
    className: "Burst Combat Rifle",
    weaponClass: "burst",
    era: "modern",
    baseStats: { damage: 38, accuracy: 65, rpm: 540, range: 80, recoil: 32, reliability: 72, weight: 4.0 },
    variance: { damage: 6, accuracy: 8, rpm: 30, range: 10, recoil: 8, reliability: 10, weight: 0.5 },
    slots: ["sight", "barrel", "stock", "mag", "underbarrel"],
  },
  "icr-7": {
    id: "icr-7",
    modelCode: "ICR-7",
    className: "Integrated Combat Rifle",
    weaponClass: "burst",
    era: "advanced",
    baseStats: { damage: 41, accuracy: 78, rpm: 600, range: 95, recoil: 26, reliability: 68, weight: 4.2 },
    variance: { damage: 6, accuracy: 6, rpm: 25, range: 12, recoil: 6, reliability: 8, weight: 0.5 },
    slots: ["sight", "barrel", "stock", "mag", "underbarrel"],
  },
  "pulse-ar": {
    id: "pulse-ar",
    modelCode: "Pulse-AR",
    className: "Pulse Rifle",
    weaponClass: "burst",
    era: "exotic",
    baseStats: { damage: 48, accuracy: 80, rpm: 360, range: 110, recoil: 24, reliability: 58, weight: 4.5 },
    variance: { damage: 8, accuracy: 8, rpm: 30, range: 15, recoil: 6, reliability: 12, weight: 0.5 },
    slots: ["sight", "barrel", "stock", "mag"],
  },

  // Shotguns
  "sg-12": {
    id: "sg-12",
    modelCode: "SG-12",
    className: "Combat Shotgun",
    weaponClass: "shotgun",
    era: "modern",
    baseStats: { damage: 78, accuracy: 42, rpm: 90, range: 18, recoil: 58, reliability: 82, weight: 4.5 },
    variance: { damage: 12, accuracy: 8, rpm: 10, range: 4, recoil: 10, reliability: 8, weight: 0.5 },
    slots: ["sight", "stock", "mag"],
  },
  "auto-flech": {
    id: "auto-flech",
    modelCode: "AF-3",
    className: "Auto-Flechette Shotgun",
    weaponClass: "shotgun",
    era: "advanced",
    baseStats: { damage: 65, accuracy: 55, rpm: 220, range: 28, recoil: 44, reliability: 70, weight: 5.0 },
    variance: { damage: 10, accuracy: 8, rpm: 20, range: 5, recoil: 8, reliability: 10, weight: 0.5 },
    slots: ["sight", "barrel", "stock", "mag"],
  },

  // LMGs
  "mg-44": {
    id: "mg-44",
    modelCode: "MG-44",
    className: "Squad Machine Gun",
    weaponClass: "lmg",
    era: "modern",
    baseStats: { damage: 42, accuracy: 50, rpm: 720, range: 90, recoil: 48, reliability: 70, weight: 8.0 },
    variance: { damage: 6, accuracy: 8, rpm: 40, range: 15, recoil: 10, reliability: 10, weight: 0.8 },
    slots: ["sight", "barrel", "stock", "mag", "underbarrel"],
  },
  "chain-hmg": {
    id: "chain-hmg",
    modelCode: "C-HMG",
    className: "Chain-Fed HMG",
    weaponClass: "lmg",
    era: "advanced",
    baseStats: { damage: 50, accuracy: 58, rpm: 900, range: 120, recoil: 42, reliability: 65, weight: 9.0 },
    variance: { damage: 8, accuracy: 6, rpm: 50, range: 20, recoil: 8, reliability: 10, weight: 0.8 },
    slots: ["sight", "barrel", "stock", "mag"],
  },
  "railgun-mg": {
    id: "railgun-mg",
    modelCode: "RG-9",
    className: "Railgun Repeater",
    weaponClass: "lmg",
    era: "exotic",
    baseStats: { damage: 88, accuracy: 70, rpm: 240, range: 180, recoil: 38, reliability: 55, weight: 10.0 },
    variance: { damage: 12, accuracy: 6, rpm: 20, range: 25, recoil: 8, reliability: 12, weight: 0.8 },
    slots: ["sight", "barrel", "stock"],
  },

  // Energy (exotic-only)
  "plasma-1": {
    id: "plasma-1",
    modelCode: "Plasma-1",
    className: "Plasma Lance",
    weaponClass: "energy",
    era: "exotic",
    baseStats: { damage: 70, accuracy: 75, rpm: 60, range: 90, recoil: 12, reliability: 50, weight: 5.0 },
    variance: { damage: 12, accuracy: 8, rpm: 10, range: 15, recoil: 4, reliability: 14, weight: 0.5 },
    slots: ["sight", "barrel"],
  },
  "lance-9": {
    id: "lance-9",
    modelCode: "Lance-9",
    className: "Energy DMR",
    weaponClass: "energy",
    era: "exotic",
    baseStats: { damage: 95, accuracy: 92, rpm: 30, range: 200, recoil: 16, reliability: 48, weight: 5.5 },
    variance: { damage: 15, accuracy: 6, rpm: 8, range: 25, recoil: 4, reliability: 12, weight: 0.5 },
    slots: ["sight", "barrel"],
  },
  "pulse-cell": {
    id: "pulse-cell",
    modelCode: "P-Cell",
    className: "Pulse Carbine",
    weaponClass: "energy",
    era: "exotic",
    baseStats: { damage: 38, accuracy: 68, rpm: 440, range: 70, recoil: 18, reliability: 55, weight: 4.0 },
    variance: { damage: 6, accuracy: 8, rpm: 30, range: 10, recoil: 5, reliability: 12, weight: 0.5 },
    slots: ["sight", "barrel", "mag"],
  },
};

export const WEAPON_BASE_IDS = Object.keys(WEAPON_BASES);

// ─────────────────────────────────────────────────────────────────────────────
// Brands — corp-flavored manufacturers, era-aligned
// ─────────────────────────────────────────────────────────────────────────────

export const BRANDS: Record<string, Brand> = {
  brickeye:   { id: "brickeye",   name: "Brickeye",          era: "modern" },
  skarn:      { id: "skarn",      name: "Skarn",             era: "modern" },
  vossen:     { id: "vossen",     name: "Vossen-Holt",       era: "modern" },
  ironworks:  { id: "ironworks",  name: "Ironworks",         era: "modern" },
  halberd:    { id: "halberd",    name: "Halberd-Dynamics",  era: "advanced" },
  aetius:     { id: "aetius",     name: "Aetius",            era: "advanced" },
  nemora:     { id: "nemora",     name: "Nemora",            era: "advanced" },
  quill:      { id: "quill",      name: "Quill-9",           era: "advanced" },
  ostrog:     { id: "ostrog",     name: "Ostrog",            era: "exotic" },
  cipher:     { id: "cipher",     name: "Cipher Industries", era: "exotic" },
  sablefield: { id: "sablefield", name: "Sablefield",        era: "exotic" },
};

export const BRAND_IDS = Object.keys(BRANDS);

// ─────────────────────────────────────────────────────────────────────────────
// Variants — model designations
// ─────────────────────────────────────────────────────────────────────────────

export const VARIANTS_BY_TIER: Record<Tier, string[]> = {
  common:       ["Mk-I", "Mk-II", "CIV", "PD"],
  uncommon:     ["Mk-II", "Mk-III", "PD", "SF"],
  rare:         ["Mk-IV", "Mk-V", "SF", "Proto"],
  experimental: ["Proto", "X-1", "Black-Spec", "Null"],
};

// ─────────────────────────────────────────────────────────────────────────────
// Nicknames — name-shape signals tier
// ─────────────────────────────────────────────────────────────────────────────

export const NICKNAMES_BY_TIER: Record<Tier, string[]> = {
  common: [
    "STUBBY", "KICKER", "JAMMY", "LIMPER", "OLD-RELIABLE", "LOUD-MOUTH",
    "RUNT", "MULE", "SQUAT", "TUMBLER", "RATTLE", "CLUNKER",
  ],
  uncommon: [
    "SHRIKE", "JACKAL", "NIGHTJAR", "KESTREL", "HARRIER", "CONDOR",
    "KITE", "MAGPIE", "LYNX", "HAWK", "RAVEN", "FERAL",
  ],
  rare: [
    "ANVIL", "BREAKER", "REAPER", "BLACKLINE", "BAYONET", "CLEAVER",
    "ASHFALL", "OFFRAMP", "VERDICT", "OVERWATCH", "GRAVELINE", "HUSK",
  ],
  experimental: [
    "REVENANT", "WIDOWMAKER", "SPECTER", "LAST-CALL", "WINTER", "NULL",
    "COMPLIANCE", "SLEEPER", "EXIT-SIGN", "DEAD-AIR", "ICONOCLAST", "CHAPTER-7",
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Attachments — slot-keyed, tier-keyed, with stat modifiers
// ─────────────────────────────────────────────────────────────────────────────

export const ATTACHMENTS: Record<string, Attachment> = {
  // Sights
  iron_sights: { id: "iron_sights", name: "Iron Sights", slot: "sight", tier: "common", modifiers: {} },
  red_dot:     { id: "red_dot",     name: "Red Dot",     slot: "sight", tier: "common", modifiers: { accuracy: 6 } },
  reflex:      { id: "reflex",      name: "Reflex Sight", slot: "sight", tier: "uncommon", modifiers: { accuracy: 9 } },
  acog_3x:     { id: "acog_3x",     name: "ACOG-3X",     slot: "sight", tier: "uncommon", modifiers: { accuracy: 14, range: 10 } },
  smartlink:   { id: "smartlink",   name: "Smart-Link",  slot: "sight", tier: "rare",     modifiers: { accuracy: 18, recoil: -4 } },
  thermal:     { id: "thermal",     name: "Thermal Optic", slot: "sight", tier: "rare",   modifiers: { accuracy: 16, range: 20 } },
  ir_overlay:  { id: "ir_overlay",  name: "IR Overlay",  slot: "sight", tier: "experimental", modifiers: { accuracy: 22, range: 25 } },

  // Barrels
  short_barrel: { id: "short_barrel", name: "Short Barrel",   slot: "barrel", tier: "common",   modifiers: { damage: -3, recoil: -4, weight: -0.3 } },
  std_barrel:   { id: "std_barrel",   name: "Standard Barrel", slot: "barrel", tier: "common",   modifiers: {} },
  long_barrel:  { id: "long_barrel",  name: "Long Barrel",    slot: "barrel", tier: "uncommon", modifiers: { range: 15, accuracy: 6, weight: 0.4 } },
  suppressor:   { id: "suppressor",   name: "Suppressor",     slot: "barrel", tier: "uncommon", modifiers: { recoil: -3, reliability: -3 } },
  comp_brake:   { id: "comp_brake",   name: "Compensator",    slot: "barrel", tier: "uncommon", modifiers: { recoil: -8 } },
  bull_barrel:  { id: "bull_barrel",  name: "Bull Barrel",    slot: "barrel", tier: "rare",     modifiers: { damage: 6, accuracy: 8, weight: 0.6, recoil: -3 } },
  cryo_vent:    { id: "cryo_vent",    name: "Cryo Vent",      slot: "barrel", tier: "experimental", modifiers: { recoil: -10, reliability: 6 } },

  // Stocks
  folding_stock: { id: "folding_stock", name: "Folding Stock",       slot: "stock", tier: "common",   modifiers: { weight: -0.4, recoil: 4 } },
  std_stock:     { id: "std_stock",     name: "Standard Stock",      slot: "stock", tier: "common",   modifiers: {} },
  heavy_stock:   { id: "heavy_stock",   name: "Heavy Stock",         slot: "stock", tier: "uncommon", modifiers: { damage: 6, recoil: -5, weight: 0.5 } },
  recoil_stock:  { id: "recoil_stock",  name: "Recoil Buffer Stock", slot: "stock", tier: "rare",     modifiers: { recoil: -10, accuracy: 4 } },

  // Mags
  std_mag:   { id: "std_mag",   name: "Standard Mag", slot: "mag", tier: "common",   modifiers: {} },
  ext_mag:   { id: "ext_mag",   name: "Extended Mag", slot: "mag", tier: "uncommon", modifiers: { weight: 0.3 } },
  drum_mag:  { id: "drum_mag",  name: "Drum Mag",     slot: "mag", tier: "rare",     modifiers: { weight: 0.8, rpm: 30 } },
  smart_mag: { id: "smart_mag", name: "Smart Mag",    slot: "mag", tier: "rare",     modifiers: { reliability: 6, accuracy: 4 } },

  // Underbarrel
  laser:        { id: "laser",        name: "Laser Pointer", slot: "underbarrel", tier: "common",   modifiers: { accuracy: 4 } },
  flashlight:   { id: "flashlight",   name: "Flashlight",    slot: "underbarrel", tier: "common",   modifiers: {} },
  grip:         { id: "grip",         name: "Foregrip",      slot: "underbarrel", tier: "common",   modifiers: { recoil: -4 } },
  bipod:        { id: "bipod",        name: "Bipod",         slot: "underbarrel", tier: "uncommon", modifiers: { accuracy: 8, recoil: -6, weight: 0.3 } },
  rangefinder:  { id: "rangefinder",  name: "Rangefinder",   slot: "underbarrel", tier: "rare",     modifiers: { range: 10, accuracy: 6 } },
};

export const ATTACHMENT_IDS = Object.keys(ATTACHMENTS);
