export type WeaponClass = "pistol" | "burst" | "shotgun" | "lmg" | "energy";
export type Era = "modern" | "advanced" | "exotic";
export type Tier = "common" | "uncommon" | "rare" | "experimental";
export type AttachmentSlot = "sight" | "barrel" | "stock" | "mag" | "underbarrel";

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

export interface WeaponBase {
  id: string;
  modelCode: string;
  className: string;
  weaponClass: WeaponClass;
  era: Era;
  baseStats: WeaponStats;
  variance: WeaponStats;
  slots: AttachmentSlot[];
}

export interface Brand {
  id: string;
  name: string;
  era: Era;
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
  baseStats: WeaponStats;
  finalStats: WeaponStats;
  attachments: Attachment[];
  attributions: AppliedModifier[];
  condition: number;
}
