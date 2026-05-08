export type WeaponClass = "pistol" | "burst" | "shotgun" | "lmg" | "energy";
export type Era = "modern" | "advanced" | "exotic";
export type Tier = "common" | "uncommon" | "rare" | "experimental";
export type AttachmentSlot = "sight" | "barrel" | "stock" | "mag" | "underbarrel";
export type AmmoFamily = "ballistic" | "energy";

export interface WeaponStats {
  damage: number;
  accuracy: number;
  rpm: number;
  range: number;
  recoil: number;
  reliability: number;
  weight: number;
}

export const STAT_KEYS: (keyof WeaponStats)[] = [
  "damage",
  "accuracy",
  "rpm",
  "range",
  "recoil",
  "reliability",
  "weight",
];

export const STAT_LABELS: Record<keyof WeaponStats, string> = {
  damage: "Damage",
  accuracy: "Accuracy",
  rpm: "RPM",
  range: "Range",
  recoil: "Recoil",
  reliability: "Reliability",
  weight: "Weight",
};

export const INVERTED_STATS: ReadonlySet<keyof WeaponStats> = new Set([
  "recoil",
  "weight",
]);

export interface Caliber {
  id: string;
  name: string;
  family: AmmoFamily;
  era: Era;
  weaponClasses: WeaponClass[];
}

export interface AmmoType {
  id: string;
  name: string;
  family: AmmoFamily;
  tier: Tier;
  modifiers: Partial<WeaponStats>;
  blurb: string;
}

export interface WeaponBase {
  id: string;
  modelCode: string;
  className: string;
  weaponClass: WeaponClass;
  era: Era;
  brandId: string;
  caliberId: string;
  baseStats: WeaponStats;
  variance: WeaponStats;
  slots: AttachmentSlot[];
}

export interface Brand {
  id: string;
  name: string;
  era: Era;
  color: string; // hex, used for logo tint
}

export interface Attachment {
  id: string;
  name: string;
  slot: AttachmentSlot;
  tier: Tier;
  modifiers: Partial<WeaponStats>;
  compatibleClasses?: WeaponClass[];
}

export interface AppliedModifier {
  attachmentId: string;
  attachmentName: string;
  stat: keyof WeaponStats;
  delta: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Armor — separate stat axis & piece system. Shares Tier, Era, Brand.
// ─────────────────────────────────────────────────────────────────────────────

export type ArmorPiece = "helmet" | "chest" | "legs" | "boots";

export type CoverageZone =
  // helmet
  | "head" | "face" | "neck"
  // chest
  | "torso" | "shoulders" | "arms" | "gut"
  // legs
  | "hips" | "thighs" | "knees" | "shins"
  // boots
  | "feet" | "ankles";

export interface ArmorStats {
  soak: number;       // flat damage reduction on covered hit
  plate_tier: number; // 0–4, vs ammo pen_tier
  stealth: number;    // bonus/penalty to stealth checks
  mobility: number;   // bonus/penalty to movement
  weight: number;     // kg, inverted
  durability: number; // hits before condition decay accelerates
}

export const ARMOR_STAT_KEYS: (keyof ArmorStats)[] = [
  "soak",
  "plate_tier",
  "stealth",
  "mobility",
  "weight",
  "durability",
];

export const ARMOR_STAT_LABELS: Record<keyof ArmorStats, string> = {
  soak: "Soak",
  plate_tier: "Plate Tier",
  stealth: "Stealth",
  mobility: "Mobility",
  weight: "Weight",
  durability: "Durability",
};

export const ARMOR_INVERTED_STATS: ReadonlySet<keyof ArmorStats> = new Set([
  "weight",
]);

export interface ArmorBase {
  id: string;
  modelCode: string;
  className: string;
  piece: ArmorPiece;
  era: Era;
  brandId: string;
  baseStats: ArmorStats;
  variance: ArmorStats;
  coverage: CoverageZone[];
}

export interface ArmorInstance {
  uid: string;
  baseId: string;
  brandId: string;
  variant: string;
  nickname?: string;
  fullName: string;
  tier: Tier;
  era: Era;
  piece: ArmorPiece;
  baseStats: ArmorStats;
  finalStats: ArmorStats;
  coverage: CoverageZone[];
  condition: number;
}

export interface FirearmInstance {
  uid: string;
  baseId: string;
  brandId: string;
  variant: string;
  nickname?: string;
  fullName: string;
  tier: Tier;
  era: Era;
  weaponClass: WeaponClass;
  caliberId: string;
  ammoTypeId: string;
  baseStats: WeaponStats;
  finalStats: WeaponStats;
  attachments: Attachment[];
  attributions: AppliedModifier[];
  condition: number;
}
