import type {
  AppliedModifier,
  Attachment,
  AttachmentSlot,
  Brand,
  Era,
  FirearmInstance,
  Tier,
  WeaponBase,
  WeaponStats,
} from "@/lib/types";
import { INVERTED_STATS, STAT_KEYS } from "@/lib/types";
import {
  ATTACHMENTS,
  BRANDS,
  NICKNAMES_BY_TIER,
  VARIANTS_BY_TIER,
  WEAPON_BASES,
} from "@/lib/data/weapons";
import { makeRand, pick, pickWeighted, rollVariance, uid, type Rand } from "@/lib/rng";

// ─────────────────────────────────────────────────────────────────────────────
// Tier rolling
// ─────────────────────────────────────────────────────────────────────────────

const TIER_WEIGHTS: [Tier, number][] = [
  ["common", 60],
  ["uncommon", 25],
  ["rare", 12],
  ["experimental", 3],
];

const TIER_QUALITY: Record<Tier, number> = {
  common: 0.0,
  uncommon: 0.3,
  rare: 0.6,
  experimental: 0.9,
};

const TIER_SLOT_FILL: Record<Tier, number> = {
  common: 0.4,
  uncommon: 0.6,
  rare: 0.85,
  experimental: 0.95,
};

const TIER_RANK: Record<Tier, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  experimental: 3,
};

const TIER_NICKNAME_CHANCE: Record<Tier, number> = {
  common: 0.15,
  uncommon: 0.55,
  rare: 0.95,
  experimental: 1.0,
};

function rollTier(rand: Rand): Tier {
  return pickWeighted(rand, TIER_WEIGHTS);
}

// ─────────────────────────────────────────────────────────────────────────────
// Brand selection — match weapon era when possible
// ─────────────────────────────────────────────────────────────────────────────

const ERA_RANK: Record<Era, number> = { modern: 0, advanced: 1, exotic: 2 };

function pickBrand(rand: Rand, base: WeaponBase): Brand {
  const all = Object.values(BRANDS);
  const targetRank = ERA_RANK[base.era];
  const scored = all.map((b) => {
    const dist = Math.abs(ERA_RANK[b.era] - targetRank);
    const weight = dist === 0 ? 5 : dist === 1 ? 1.5 : 0.3;
    return [b, weight] as [Brand, number];
  });
  return pickWeighted(rand, scored);
}

// ─────────────────────────────────────────────────────────────────────────────
// Attachment selection
// ─────────────────────────────────────────────────────────────────────────────

function compatibleAttachments(slot: AttachmentSlot, base: WeaponBase): Attachment[] {
  return Object.values(ATTACHMENTS).filter((a) => {
    if (a.slot !== slot) return false;
    if (a.compatibleClasses && !a.compatibleClasses.includes(base.weaponClass)) return false;
    return true;
  });
}

function pickAttachment(rand: Rand, slot: AttachmentSlot, base: WeaponBase, tier: Tier): Attachment | null {
  const candidates = compatibleAttachments(slot, base);
  if (candidates.length === 0) return null;

  const targetRank = TIER_RANK[tier];
  // Weight by closeness to weapon tier; prefer attachments at or one tier above the weapon tier.
  const scored = candidates.map((a) => {
    const ar = TIER_RANK[a.tier];
    const dist = Math.abs(ar - targetRank);
    const aboveBonus = ar === targetRank + 1 ? 0.3 : 0; // small chance to roll up
    let weight: number;
    if (dist === 0) weight = 5;
    else if (dist === 1) weight = 2.5;
    else if (dist === 2) weight = 0.6;
    else weight = 0.15;
    weight += aboveBonus;
    return [a, weight] as [Attachment, number];
  });
  return pickWeighted(rand, scored);
}

// ─────────────────────────────────────────────────────────────────────────────
// Stat rolls and attachment application
// ─────────────────────────────────────────────────────────────────────────────

function rollBaseStats(rand: Rand, base: WeaponBase, tier: Tier): WeaponStats {
  const quality = TIER_QUALITY[tier];
  const out = {} as WeaponStats;
  for (const key of STAT_KEYS) {
    const inverted = INVERTED_STATS.has(key);
    const val = rollVariance(rand, base.baseStats[key], base.variance[key], quality, inverted);
    out[key] = round(val, key);
  }
  return out;
}

function applyAttachments(
  baseStats: WeaponStats,
  attachments: Attachment[]
): { final: WeaponStats; attributions: AppliedModifier[] } {
  const final: WeaponStats = { ...baseStats };
  const attributions: AppliedModifier[] = [];
  for (const att of attachments) {
    for (const stat of STAT_KEYS) {
      const delta = att.modifiers[stat];
      if (delta === undefined || delta === 0) continue;
      final[stat] = round(final[stat] + delta, stat);
      attributions.push({
        attachmentId: att.id,
        attachmentName: att.name,
        stat,
        delta,
      });
    }
  }
  return { final, attributions };
}

function round(value: number, stat: keyof WeaponStats): number {
  if (stat === "weight") return Math.round(value * 10) / 10;
  return Math.round(value);
}

// ─────────────────────────────────────────────────────────────────────────────
// Name assembly
// ─────────────────────────────────────────────────────────────────────────────

function assembleName(brand: Brand, base: WeaponBase, variant: string, nickname?: string): string {
  const head = `${brand.name} ${base.modelCode} ${variant}`;
  return nickname ? `${head} '${nickname}'` : head;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export interface GenerateOptions {
  rand?: Rand;
  seed?: number;
  tier?: Tier;
  baseId?: string;
}

export function generateFirearm(opts: GenerateOptions = {}): FirearmInstance {
  const rand = opts.rand ?? (opts.seed !== undefined ? makeRand(opts.seed) : makeRand());

  const tier = opts.tier ?? rollTier(rand);
  const base = opts.baseId ? WEAPON_BASES[opts.baseId] : pick(rand, Object.values(WEAPON_BASES));
  if (!base) throw new Error(`unknown baseId: ${opts.baseId}`);

  const brand = pickBrand(rand, base);
  const variant = pick(rand, VARIANTS_BY_TIER[tier]);
  const nickname =
    rand() < TIER_NICKNAME_CHANCE[tier] ? pick(rand, NICKNAMES_BY_TIER[tier]) : undefined;

  // Roll base stats
  const baseStats = rollBaseStats(rand, base, tier);

  // Roll attachments per slot
  const slotFill = TIER_SLOT_FILL[tier];
  const attachments: Attachment[] = [];
  for (const slot of base.slots) {
    if (rand() > slotFill) continue;
    const att = pickAttachment(rand, slot, base, tier);
    if (att) attachments.push(att);
  }

  // Apply
  const { final: finalStats, attributions } = applyAttachments(baseStats, attachments);

  // Condition: 50–100, biased high for higher tiers
  const condBase = 50 + Math.floor(rand() * 51); // 50–100
  const condBoost = Math.floor(TIER_QUALITY[tier] * 10);
  const condition = Math.min(100, condBase + condBoost);

  const fullName = assembleName(brand, base, variant, nickname);

  return {
    uid: uid(rand),
    baseId: base.id,
    brandId: brand.id,
    variant,
    nickname,
    fullName,
    tier,
    era: base.era,
    weaponClass: base.weaponClass,
    baseStats,
    finalStats,
    attachments,
    attributions,
    condition,
  };
}

export function generateMany(n: number, opts: GenerateOptions = {}): FirearmInstance[] {
  const rand = opts.rand ?? (opts.seed !== undefined ? makeRand(opts.seed) : makeRand());
  return Array.from({ length: n }, () => generateFirearm({ ...opts, rand }));
}
