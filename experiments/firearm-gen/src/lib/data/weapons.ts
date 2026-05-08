import type {
  AmmoType,
  Attachment,
  Brand,
  Caliber,
  Tier,
  WeaponBase,
} from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Calibers — 14 entries, family-tagged for ammo compatibility
// ─────────────────────────────────────────────────────────────────────────────

export const CALIBERS: Record<string, Caliber> = {
  "9x19":     { id: "9x19",     name: "9×19mm",            family: "ballistic", era: "modern",   weaponClasses: ["pistol"] },
  "45acp":    { id: "45acp",    name: ".45 ACP",           family: "ballistic", era: "modern",   weaponClasses: ["pistol"] },
  "47smart":  { id: "47smart",  name: "4.7mm Smart",       family: "ballistic", era: "advanced", weaponClasses: ["pistol", "burst"] },
  "arc-coil": { id: "arc-coil", name: "Arc Coil",          family: "energy",    era: "exotic",   weaponClasses: ["pistol"] },

  "556x45":   { id: "556x45",   name: "5.56×45mm",         family: "ballistic", era: "modern",   weaponClasses: ["burst"] },
  "762x39":   { id: "762x39",   name: "7.62×39mm",         family: "ballistic", era: "modern",   weaponClasses: ["burst", "lmg"] },
  "46case":   { id: "46case",   name: "4.6mm Caseless",    family: "ballistic", era: "advanced", weaponClasses: ["burst", "pistol"] },
  "plasma":   { id: "plasma",   name: "Plasma Bolt",       family: "energy",    era: "exotic",   weaponClasses: ["burst", "shotgun"] },

  "12ga":     { id: "12ga",     name: "12 Gauge",          family: "ballistic", era: "modern",   weaponClasses: ["shotgun"] },
  "10flech":  { id: "10flech",  name: "10ga Flechette",    family: "ballistic", era: "advanced", weaponClasses: ["shotgun"] },

  "762x51":   { id: "762x51",   name: "7.62×51mm NATO",    family: "ballistic", era: "modern",   weaponClasses: ["lmg"] },
  "127link":  { id: "127link",  name: "12.7×99mm Linked",  family: "ballistic", era: "advanced", weaponClasses: ["lmg"] },
  "rail":     { id: "rail",     name: "Rail Slug",         family: "energy",    era: "exotic",   weaponClasses: ["lmg"] },

  "p-cell":   { id: "p-cell",   name: "Pulse Cell",        family: "energy",    era: "exotic",   weaponClasses: ["energy"] },
  "f-rod":    { id: "f-rod",    name: "Fusion Rod",        family: "energy",    era: "exotic",   weaponClasses: ["energy"] },
};

export const CALIBER_IDS = Object.keys(CALIBERS);

// ─────────────────────────────────────────────────────────────────────────────
// Ammo types — loaded into instances at generation
// ─────────────────────────────────────────────────────────────────────────────

export const AMMO_TYPES: Record<string, AmmoType> = {
  fmj:        { id: "fmj",        name: "FMJ",          family: "ballistic", tier: "common",       modifiers: {},                                          blurb: "Standard full-metal jacket. The default load." },
  ap:         { id: "ap",         name: "AP",           family: "ballistic", tier: "uncommon",     modifiers: { damage: 4, recoil: 2 },                    blurb: "Armor-piercing. Punches through plate; kicks harder." },
  hp:         { id: "hp",         name: "Hollow-Point", family: "ballistic", tier: "uncommon",     modifiers: { damage: 6, range: -8 },                    blurb: "Soft expanding round. Hurts more, carries less." },
  sub:        { id: "sub",        name: "Subsonic",     family: "ballistic", tier: "rare",         modifiers: { range: -10, recoil: -4, accuracy: 2 },     blurb: "Below the sound barrier. Quiet, short, controllable." },
  tracer:     { id: "tracer",     name: "Tracer",       family: "ballistic", tier: "common",       modifiers: { accuracy: 2 },                             blurb: "Phosphor-tipped. Visible flight path." },
  match:      { id: "match",      name: "Match Grade",  family: "ballistic", tier: "rare",         modifiers: { accuracy: 6, range: 8, reliability: 2 },   blurb: "Hand-loaded competition rounds. Uncommon, expensive." },

  cell_std:   { id: "cell_std",   name: "Standard Cell",family: "energy",    tier: "common",       modifiers: {},                                          blurb: "Factory-charge cell. Stable, unremarkable." },
  cell_over:  { id: "cell_over",  name: "Overcharged",  family: "energy",    tier: "uncommon",     modifiers: { damage: 8, reliability: -6 },              blurb: "Boosted output. More punch, more burnout." },
  cell_focus: { id: "cell_focus", name: "Focused Beam", family: "energy",    tier: "rare",         modifiers: { accuracy: 8, range: 14, rpm: -20 },        blurb: "Tight-coherence load. Precision, slow cycle." },
  cell_burst: { id: "cell_burst", name: "Burst Cycle",  family: "energy",    tier: "experimental", modifiers: { rpm: 60, damage: -4, reliability: -4 },    blurb: "Rapid discharge. Spray-and-pray with ions." },
};

export const AMMO_IDS = Object.keys(AMMO_TYPES);

// ─────────────────────────────────────────────────────────────────────────────
// Weapon bases — 19 across 5 classes × 3 eras
// ─────────────────────────────────────────────────────────────────────────────

export const WEAPON_BASES: Record<string, WeaponBase> = {
  // ── Pistols
  "p-3": {
    id: "p-3", modelCode: "P-3", className: "Compact Sidearm",
    weaponClass: "pistol", era: "modern", brandId: "reike", caliberId: "9x19",
    baseStats: { damage: 22, accuracy: 58, rpm: 280, range: 30, recoil: 18, reliability: 75, weight: 2.0 },
    variance: { damage: 4, accuracy: 8, rpm: 20, range: 5, recoil: 5, reliability: 10, weight: 0.3 },
    slots: ["sight", "barrel", "mag", "underbarrel"],
  },
  "hd-45": {
    id: "hd-45", modelCode: "HD-45", className: "Heavy Service Pistol",
    weaponClass: "pistol", era: "modern", brandId: "vossen", caliberId: "45acp",
    baseStats: { damage: 34, accuracy: 54, rpm: 220, range: 28, recoil: 28, reliability: 78, weight: 2.4 },
    variance: { damage: 5, accuracy: 6, rpm: 15, range: 4, recoil: 6, reliability: 8, weight: 0.3 },
    slots: ["sight", "barrel", "mag", "underbarrel"],
  },
  "smart-9": {
    id: "smart-9", modelCode: "Smart-9", className: "Smart-Linked Pistol",
    weaponClass: "pistol", era: "advanced", brandId: "aetius", caliberId: "47smart",
    baseStats: { damage: 26, accuracy: 70, rpm: 260, range: 38, recoil: 16, reliability: 70, weight: 2.2 },
    variance: { damage: 5, accuracy: 6, rpm: 15, range: 6, recoil: 4, reliability: 8, weight: 0.3 },
    slots: ["sight", "barrel", "mag"],
  },
  "mp-9": {
    id: "mp-9", modelCode: "MP-9", className: "Machine Pistol",
    weaponClass: "pistol", era: "advanced", brandId: "quill", caliberId: "46case",
    baseStats: { damage: 20, accuracy: 50, rpm: 920, range: 24, recoil: 32, reliability: 64, weight: 2.6 },
    variance: { damage: 4, accuracy: 8, rpm: 40, range: 4, recoil: 8, reliability: 10, weight: 0.3 },
    slots: ["sight", "barrel", "stock", "mag"],
  },
  "coil-2": {
    id: "coil-2", modelCode: "Coil-2", className: "Coil Sidearm",
    weaponClass: "pistol", era: "exotic", brandId: "sablefield", caliberId: "arc-coil",
    baseStats: { damage: 32, accuracy: 76, rpm: 90, range: 55, recoil: 8, reliability: 60, weight: 2.8 },
    variance: { damage: 6, accuracy: 8, rpm: 10, range: 8, recoil: 3, reliability: 12, weight: 0.3 },
    slots: ["sight", "mag"],
  },

  // ── Burst rifles
  "br-19": {
    id: "br-19", modelCode: "BR-19", className: "Burst Combat Rifle",
    weaponClass: "burst", era: "modern", brandId: "skarn", caliberId: "556x45",
    baseStats: { damage: 38, accuracy: 65, rpm: 540, range: 80, recoil: 32, reliability: 72, weight: 4.0 },
    variance: { damage: 6, accuracy: 8, rpm: 30, range: 10, recoil: 8, reliability: 10, weight: 0.5 },
    slots: ["sight", "barrel", "stock", "mag", "underbarrel"],
  },
  "vk-7": {
    id: "vk-7", modelCode: "VK-7", className: "Heavy Battle Rifle",
    weaponClass: "burst", era: "modern", brandId: "brickeye", caliberId: "762x39",
    baseStats: { damage: 48, accuracy: 58, rpm: 460, range: 90, recoil: 42, reliability: 80, weight: 4.6 },
    variance: { damage: 8, accuracy: 6, rpm: 25, range: 12, recoil: 10, reliability: 8, weight: 0.5 },
    slots: ["sight", "barrel", "stock", "mag", "underbarrel"],
  },
  "icr-7": {
    id: "icr-7", modelCode: "ICR-7", className: "Integrated Combat Rifle",
    weaponClass: "burst", era: "advanced", brandId: "halberd", caliberId: "46case",
    baseStats: { damage: 41, accuracy: 78, rpm: 600, range: 95, recoil: 26, reliability: 68, weight: 4.2 },
    variance: { damage: 6, accuracy: 6, rpm: 25, range: 12, recoil: 6, reliability: 8, weight: 0.5 },
    slots: ["sight", "barrel", "stock", "mag", "underbarrel"],
  },
  "dmr-12": {
    id: "dmr-12", modelCode: "DMR-12", className: "Designated Marksman Rifle",
    weaponClass: "burst", era: "advanced", brandId: "pellucid", caliberId: "46case",
    baseStats: { damage: 62, accuracy: 88, rpm: 180, range: 160, recoil: 36, reliability: 70, weight: 5.2 },
    variance: { damage: 8, accuracy: 6, rpm: 20, range: 18, recoil: 6, reliability: 10, weight: 0.6 },
    slots: ["sight", "barrel", "stock", "mag", "underbarrel"],
  },
  "pulse-ar": {
    id: "pulse-ar", modelCode: "Pulse-AR", className: "Pulse Rifle",
    weaponClass: "burst", era: "exotic", brandId: "cipher", caliberId: "plasma",
    baseStats: { damage: 48, accuracy: 80, rpm: 360, range: 110, recoil: 24, reliability: 58, weight: 4.5 },
    variance: { damage: 8, accuracy: 8, rpm: 30, range: 15, recoil: 6, reliability: 12, weight: 0.5 },
    slots: ["sight", "barrel", "stock", "mag"],
  },

  // ── Shotguns
  "sg-12": {
    id: "sg-12", modelCode: "SG-12", className: "Combat Shotgun",
    weaponClass: "shotgun", era: "modern", brandId: "vossen", caliberId: "12ga",
    baseStats: { damage: 78, accuracy: 42, rpm: 90, range: 18, recoil: 58, reliability: 82, weight: 4.5 },
    variance: { damage: 12, accuracy: 8, rpm: 10, range: 4, recoil: 10, reliability: 8, weight: 0.5 },
    slots: ["sight", "stock", "mag"],
  },
  "dbl-2": {
    id: "dbl-2", modelCode: "DBL-2", className: "Double-Barrel Coachgun",
    weaponClass: "shotgun", era: "modern", brandId: "ironworks", caliberId: "12ga",
    baseStats: { damage: 110, accuracy: 38, rpm: 60, range: 14, recoil: 72, reliability: 88, weight: 3.6 },
    variance: { damage: 18, accuracy: 6, rpm: 8, range: 3, recoil: 12, reliability: 4, weight: 0.4 },
    slots: ["barrel", "stock"],
  },
  "auto-flech": {
    id: "auto-flech", modelCode: "AF-3", className: "Auto-Flechette Shotgun",
    weaponClass: "shotgun", era: "advanced", brandId: "nemora", caliberId: "10flech",
    baseStats: { damage: 65, accuracy: 55, rpm: 220, range: 28, recoil: 44, reliability: 70, weight: 5.0 },
    variance: { damage: 10, accuracy: 8, rpm: 20, range: 5, recoil: 8, reliability: 10, weight: 0.5 },
    slots: ["sight", "barrel", "stock", "mag"],
  },
  "storm-1": {
    id: "storm-1", modelCode: "Storm-1", className: "Disruptor Shotgun",
    weaponClass: "shotgun", era: "exotic", brandId: "sablefield", caliberId: "plasma",
    baseStats: { damage: 92, accuracy: 60, rpm: 110, range: 32, recoil: 38, reliability: 55, weight: 5.8 },
    variance: { damage: 14, accuracy: 8, rpm: 12, range: 6, recoil: 6, reliability: 12, weight: 0.6 },
    slots: ["sight", "barrel", "stock"],
  },

  // ── LMGs
  "mg-44": {
    id: "mg-44", modelCode: "MG-44", className: "Squad Machine Gun",
    weaponClass: "lmg", era: "modern", brandId: "brickeye", caliberId: "762x51",
    baseStats: { damage: 42, accuracy: 50, rpm: 720, range: 90, recoil: 48, reliability: 70, weight: 8.0 },
    variance: { damage: 6, accuracy: 8, rpm: 40, range: 15, recoil: 10, reliability: 10, weight: 0.8 },
    slots: ["sight", "barrel", "stock", "mag", "underbarrel"],
  },
  "chain-hmg": {
    id: "chain-hmg", modelCode: "C-HMG", className: "Chain-Fed HMG",
    weaponClass: "lmg", era: "advanced", brandId: "halberd", caliberId: "127link",
    baseStats: { damage: 50, accuracy: 58, rpm: 900, range: 120, recoil: 42, reliability: 65, weight: 9.0 },
    variance: { damage: 8, accuracy: 6, rpm: 50, range: 20, recoil: 8, reliability: 10, weight: 0.8 },
    slots: ["sight", "barrel", "stock", "mag"],
  },
  "railgun-mg": {
    id: "railgun-mg", modelCode: "RG-9", className: "Railgun Repeater",
    weaponClass: "lmg", era: "exotic", brandId: "ostrog", caliberId: "rail",
    baseStats: { damage: 88, accuracy: 70, rpm: 240, range: 180, recoil: 38, reliability: 55, weight: 10.0 },
    variance: { damage: 12, accuracy: 6, rpm: 20, range: 25, recoil: 8, reliability: 12, weight: 0.8 },
    slots: ["sight", "barrel", "stock"],
  },

  // ── Energy
  "plasma-1": {
    id: "plasma-1", modelCode: "Plasma-1", className: "Plasma Lance",
    weaponClass: "energy", era: "exotic", brandId: "ostrog", caliberId: "p-cell",
    baseStats: { damage: 70, accuracy: 75, rpm: 60, range: 90, recoil: 12, reliability: 50, weight: 5.0 },
    variance: { damage: 12, accuracy: 8, rpm: 10, range: 15, recoil: 4, reliability: 14, weight: 0.5 },
    slots: ["sight", "barrel"],
  },
  "lance-9": {
    id: "lance-9", modelCode: "Lance-9", className: "Energy DMR",
    weaponClass: "energy", era: "exotic", brandId: "cipher", caliberId: "f-rod",
    baseStats: { damage: 95, accuracy: 92, rpm: 30, range: 200, recoil: 16, reliability: 48, weight: 5.5 },
    variance: { damage: 15, accuracy: 6, rpm: 8, range: 25, recoil: 4, reliability: 12, weight: 0.5 },
    slots: ["sight", "barrel"],
  },
  "pulse-cell": {
    id: "pulse-cell", modelCode: "P-Cell", className: "Pulse Carbine",
    weaponClass: "energy", era: "exotic", brandId: "cipher", caliberId: "p-cell",
    baseStats: { damage: 38, accuracy: 68, rpm: 440, range: 70, recoil: 18, reliability: 55, weight: 4.0 },
    variance: { damage: 6, accuracy: 8, rpm: 30, range: 10, recoil: 5, reliability: 12, weight: 0.5 },
    slots: ["sight", "barrel", "mag"],
  },
};

export const WEAPON_BASE_IDS = Object.keys(WEAPON_BASES);

// ─────────────────────────────────────────────────────────────────────────────
// Brands — 14 corp-flavored manufacturers with brand color
// ─────────────────────────────────────────────────────────────────────────────

export const BRANDS: Record<string, Brand> = {
  // Modern
  brickeye:   { id: "brickeye",   name: "Brickeye",          era: "modern",   color: "#f59e0b" }, // amber
  skarn:      { id: "skarn",      name: "Skarn",             era: "modern",   color: "#ef4444" }, // red
  vossen:     { id: "vossen",     name: "Vossen-Holt",       era: "modern",   color: "#fb923c" }, // orange
  ironworks:  { id: "ironworks",  name: "Ironworks",         era: "modern",   color: "#a8a29e" }, // stone
  reike:      { id: "reike",      name: "Reike Defense",     era: "modern",   color: "#facc15" }, // yellow
  // Advanced
  halberd:    { id: "halberd",    name: "Halberd-Dynamics",  era: "advanced", color: "#38bdf8" }, // sky
  aetius:     { id: "aetius",     name: "Aetius",            era: "advanced", color: "#34d399" }, // emerald
  nemora:     { id: "nemora",     name: "Nemora",            era: "advanced", color: "#2dd4bf" }, // teal
  quill:      { id: "quill",      name: "Quill-9",           era: "advanced", color: "#22d3ee" }, // cyan
  pellucid:   { id: "pellucid",   name: "Pellucid",          era: "advanced", color: "#818cf8" }, // indigo
  // Exotic
  ostrog:     { id: "ostrog",     name: "Ostrog",            era: "exotic",   color: "#a78bfa" }, // violet
  cipher:     { id: "cipher",     name: "Cipher Industries", era: "exotic",   color: "#e879f9" }, // fuchsia
  sablefield: { id: "sablefield", name: "Sablefield",        era: "exotic",   color: "#fb7185" }, // rose
  wraith:     { id: "wraith",     name: "Wraithcorp",        era: "exotic",   color: "#c084fc" }, // purple
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
    "DENT", "SCRAP", "PAYCHECK", "BACKLOT",
  ],
  uncommon: [
    "SHRIKE", "JACKAL", "NIGHTJAR", "KESTREL", "HARRIER", "CONDOR",
    "KITE", "MAGPIE", "LYNX", "HAWK", "RAVEN", "FERAL",
    "COYOTE", "OSPREY", "VIPER", "CARRION",
  ],
  rare: [
    "ANVIL", "BREAKER", "REAPER", "BLACKLINE", "BAYONET", "CLEAVER",
    "ASHFALL", "OFFRAMP", "VERDICT", "OVERWATCH", "GRAVELINE", "HUSK",
    "OUTLAW", "SUNSET", "RADIANT", "GIBSON",
  ],
  experimental: [
    "REVENANT", "WIDOWMAKER", "SPECTER", "LAST-CALL", "WINTER", "NULL",
    "COMPLIANCE", "SLEEPER", "EXIT-SIGN", "DEAD-AIR", "ICONOCLAST", "CHAPTER-7",
    "INHERITOR", "TERMINUS", "SAINT-MARROW", "OBLIGATE",
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Attachments — 35 across 5 slots
// ─────────────────────────────────────────────────────────────────────────────

export const ATTACHMENTS: Record<string, Attachment> = {
  // ── Sights
  iron_sights:  { id: "iron_sights",  name: "Iron Sights",     slot: "sight", tier: "common",       modifiers: {} },
  red_dot:      { id: "red_dot",      name: "Red Dot",         slot: "sight", tier: "common",       modifiers: { accuracy: 6 } },
  reflex:       { id: "reflex",       name: "Reflex Sight",    slot: "sight", tier: "uncommon",     modifiers: { accuracy: 9 } },
  holographic:  { id: "holographic",  name: "Holographic",     slot: "sight", tier: "uncommon",     modifiers: { accuracy: 11, range: 4 } },
  acog_3x:      { id: "acog_3x",      name: "ACOG-3X",         slot: "sight", tier: "uncommon",     modifiers: { accuracy: 14, range: 10 } },
  variable:     { id: "variable",     name: "Variable Scope",  slot: "sight", tier: "rare",         modifiers: { accuracy: 16, range: 18 } },
  smartlink:    { id: "smartlink",    name: "Smart-Link",      slot: "sight", tier: "rare",         modifiers: { accuracy: 18, recoil: -4 } },
  thermal:      { id: "thermal",      name: "Thermal Optic",   slot: "sight", tier: "rare",         modifiers: { accuracy: 16, range: 20 } },
  ir_overlay:   { id: "ir_overlay",   name: "IR Overlay",      slot: "sight", tier: "experimental", modifiers: { accuracy: 22, range: 25 } },
  digital_recon:{ id: "digital_recon",name: "Digital Recon",   slot: "sight", tier: "experimental", modifiers: { accuracy: 24, range: 30, recoil: -2 } },

  // ── Barrels
  short_barrel: { id: "short_barrel", name: "Short Barrel",    slot: "barrel", tier: "common",       modifiers: { damage: -3, recoil: -4, weight: -0.3 } },
  std_barrel:   { id: "std_barrel",   name: "Standard Barrel", slot: "barrel", tier: "common",       modifiers: {} },
  ported:       { id: "ported",       name: "Ported Barrel",   slot: "barrel", tier: "uncommon",     modifiers: { recoil: -6, accuracy: 2 } },
  long_barrel:  { id: "long_barrel",  name: "Long Barrel",     slot: "barrel", tier: "uncommon",     modifiers: { range: 15, accuracy: 6, weight: 0.4 } },
  suppressor:   { id: "suppressor",   name: "Suppressor",      slot: "barrel", tier: "uncommon",     modifiers: { recoil: -3, reliability: -3 } },
  comp_brake:   { id: "comp_brake",   name: "Compensator",     slot: "barrel", tier: "uncommon",     modifiers: { recoil: -8 } },
  bull_barrel:  { id: "bull_barrel",  name: "Bull Barrel",     slot: "barrel", tier: "rare",         modifiers: { damage: 6, accuracy: 8, weight: 0.6, recoil: -3 } },
  heavy_barrel: { id: "heavy_barrel", name: "Heavy Barrel",    slot: "barrel", tier: "rare",         modifiers: { damage: 8, range: 12, weight: 0.7 } },
  cryo_vent:    { id: "cryo_vent",    name: "Cryo Vent",       slot: "barrel", tier: "experimental", modifiers: { recoil: -10, reliability: 6 } },
  null_barrel:  { id: "null_barrel",  name: "Null-Field Barrel", slot: "barrel", tier: "experimental", modifiers: { accuracy: 12, range: 22, recoil: -6 } },

  // ── Stocks
  folding_stock:{ id: "folding_stock",name: "Folding Stock",        slot: "stock", tier: "common",       modifiers: { weight: -0.4, recoil: 4 } },
  std_stock:    { id: "std_stock",    name: "Standard Stock",       slot: "stock", tier: "common",       modifiers: {} },
  ergo_stock:   { id: "ergo_stock",   name: "Ergonomic Stock",      slot: "stock", tier: "uncommon",     modifiers: { accuracy: 4, recoil: -4 } },
  heavy_stock:  { id: "heavy_stock",  name: "Heavy Stock",          slot: "stock", tier: "uncommon",     modifiers: { damage: 6, recoil: -5, weight: 0.5 } },
  recoil_stock: { id: "recoil_stock", name: "Recoil Buffer Stock",  slot: "stock", tier: "rare",         modifiers: { recoil: -10, accuracy: 4 } },
  tactical_stk: { id: "tactical_stk", name: "Tactical Stock",       slot: "stock", tier: "rare",         modifiers: { accuracy: 8, recoil: -6 } },

  // ── Mags
  std_mag:      { id: "std_mag",      name: "Standard Mag",         slot: "mag", tier: "common",       modifiers: {} },
  ext_mag:      { id: "ext_mag",      name: "Extended Mag",         slot: "mag", tier: "uncommon",     modifiers: { weight: 0.3 } },
  quick_mag:    { id: "quick_mag",    name: "Quick-Eject Mag",      slot: "mag", tier: "uncommon",     modifiers: { reliability: 4 } },
  drum_mag:     { id: "drum_mag",     name: "Drum Mag",             slot: "mag", tier: "rare",         modifiers: { weight: 0.8, rpm: 30 } },
  smart_mag:    { id: "smart_mag",    name: "Smart Mag",            slot: "mag", tier: "rare",         modifiers: { reliability: 6, accuracy: 4 } },

  // ── Underbarrel
  laser:        { id: "laser",        name: "Laser Pointer",        slot: "underbarrel", tier: "common",       modifiers: { accuracy: 4 } },
  flashlight:   { id: "flashlight",   name: "Flashlight",           slot: "underbarrel", tier: "common",       modifiers: {} },
  grip:         { id: "grip",         name: "Foregrip",             slot: "underbarrel", tier: "common",       modifiers: { recoil: -4 } },
  angled_grip:  { id: "angled_grip",  name: "Angled Grip",          slot: "underbarrel", tier: "uncommon",     modifiers: { recoil: -3, accuracy: 3 } },
  bipod:        { id: "bipod",        name: "Bipod",                slot: "underbarrel", tier: "uncommon",     modifiers: { accuracy: 8, recoil: -6, weight: 0.3 } },
  rangefinder:  { id: "rangefinder",  name: "Rangefinder",          slot: "underbarrel", tier: "rare",         modifiers: { range: 10, accuracy: 6 } },
  tac_light:    { id: "tac_light",    name: "Tactical Light/Laser", slot: "underbarrel", tier: "rare",         modifiers: { accuracy: 8, reliability: 2 } },
};

export const ATTACHMENT_IDS = Object.keys(ATTACHMENTS);
