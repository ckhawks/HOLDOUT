import type {
  ArmorBase,
  ArmorInstance,
  ArmorStats,
  Brand,
  Tier,
} from "@/lib/types";
import { ARMOR_INVERTED_STATS, ARMOR_STAT_KEYS } from "@/lib/types";
import { ARMOR_BASES, ARMOR_NICKNAMES_BY_TIER } from "@/lib/data/armor";
import { BRANDS, VARIANTS_BY_TIER } from "@/lib/data/weapons";
import { makeRand, pick, pickWeighted, rollVariance, uid, type Rand } from "@/lib/rng";

// Tier shape mirrors weaponGen — will be factored into shared core later.
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

const TIER_NICKNAME_CHANCE: Record<Tier, number> = {
  common: 0.15,
  uncommon: 0.55,
  rare: 0.95,
  experimental: 1.0,
};

function rollTier(rand: Rand): Tier {
  return pickWeighted(rand, TIER_WEIGHTS);
}

function brandForBase(base: ArmorBase): Brand {
  const b = BRANDS[base.brandId];
  if (!b) throw new Error(`unknown brandId on armor base ${base.id}: ${base.brandId}`);
  return b;
}

function rollBaseStats(rand: Rand, base: ArmorBase, tier: Tier): ArmorStats {
  const quality = TIER_QUALITY[tier];
  const out = {} as ArmorStats;
  for (const key of ARMOR_STAT_KEYS) {
    const inverted = ARMOR_INVERTED_STATS.has(key);
    const val = rollVariance(rand, base.baseStats[key], base.variance[key], quality, inverted);
    out[key] = roundStat(val, key);
  }
  // plate_tier is discrete 0–4
  out.plate_tier = Math.max(0, Math.min(4, Math.round(out.plate_tier)));
  return out;
}

function roundStat(v: number, stat: keyof ArmorStats): number {
  if (stat === "weight") return Math.round(v * 10) / 10;
  if (stat === "plate_tier") return Math.round(v);
  return Math.round(v);
}

function assembleName(base: ArmorBase, variant: string, nickname?: string): string {
  const head = `${base.modelCode} ${variant}`;
  return nickname ? `${head} '${nickname}'` : head;
}

export interface GenerateArmorOptions {
  rand?: Rand;
  seed?: number;
  tier?: Tier;
  baseId?: string;
}

export function generateArmor(opts: GenerateArmorOptions = {}): ArmorInstance {
  const rand = opts.rand ?? (opts.seed !== undefined ? makeRand(opts.seed) : makeRand());

  const tier = opts.tier ?? rollTier(rand);
  const base = opts.baseId ? ARMOR_BASES[opts.baseId] : pick(rand, Object.values(ARMOR_BASES));
  if (!base) throw new Error(`unknown armor baseId: ${opts.baseId}`);

  const brand = brandForBase(base);
  const variant = pick(rand, VARIANTS_BY_TIER[tier]);
  const nickname =
    rand() < TIER_NICKNAME_CHANCE[tier]
      ? pick(rand, ARMOR_NICKNAMES_BY_TIER[tier])
      : undefined;

  const baseStats = rollBaseStats(rand, base, tier);
  // No attachments yet — finalStats == baseStats for v0.
  const finalStats: ArmorStats = { ...baseStats };

  const condBase = 50 + Math.floor(rand() * 51);
  const condBoost = Math.floor(TIER_QUALITY[tier] * 10);
  const condition = Math.min(100, condBase + condBoost);

  return {
    uid: uid(rand),
    baseId: base.id,
    brandId: brand.id,
    variant,
    nickname,
    fullName: assembleName(base, variant, nickname),
    tier,
    era: base.era,
    piece: base.piece,
    baseStats,
    finalStats,
    coverage: [...base.coverage],
    condition,
  };
}

export function generateManyArmor(n: number, opts: GenerateArmorOptions = {}): ArmorInstance[] {
  const rand = opts.rand ?? (opts.seed !== undefined ? makeRand(opts.seed) : makeRand());
  return Array.from({ length: n }, () => generateArmor({ ...opts, rand }));
}
