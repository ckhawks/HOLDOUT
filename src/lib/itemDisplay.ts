import type { ItemTier } from "@/lib/types";
import { ITEMS } from "@/lib/data/items";

export const TIER_COLOR: Record<ItemTier, string> = {
  common: "text-zinc-200",
  uncommon: "text-sky-400",
  rare: "text-violet-400",
  experimental: "text-amber-400",
};

export const TIER_TILE_BG: Record<ItemTier, string> = {
  common: "bg-zinc-700/70 border-zinc-500/60",
  uncommon: "bg-sky-900/70 border-sky-500/60",
  rare: "bg-violet-900/70 border-violet-500/60",
  experimental: "bg-amber-900/70 border-amber-500/60",
};

export function tileBgFor(itemId: string | undefined): string {
  if (!itemId) return TIER_TILE_BG.common;
  const tier = ITEMS[itemId]?.tier;
  return tier ? TIER_TILE_BG[tier] : TIER_TILE_BG.common;
}

export function tierColorFor(itemId: string | undefined): string {
  if (!itemId) return TIER_COLOR.common;
  const tier = ITEMS[itemId]?.tier;
  return tier ? TIER_COLOR[tier] : TIER_COLOR.common;
}

// Background-color equivalents of TIER_COLOR. Used for small rarity dots
// next to item names where applying the tier color to the text itself
// would be too loud (cost checklists, etc.).
export const TIER_DOT: Record<ItemTier, string> = {
  common: "bg-zinc-200",
  uncommon: "bg-sky-400",
  rare: "bg-violet-400",
  experimental: "bg-amber-400",
};

export function tierDotFor(itemId: string | undefined): string {
  if (!itemId) return TIER_DOT.common;
  const tier = ITEMS[itemId]?.tier;
  return tier ? TIER_DOT[tier] : TIER_DOT.common;
}

// 2-3 letter monogram for an item — used as the inner label on inventory
// tiles where the full name doesn't fit. Multi-word names get one letter
// per word (up to 3); single-word names get the first 3 letters.
export function abbreviate(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return parts.slice(0, 3).map((p) => p[0]).join("").toUpperCase();
  return name.slice(0, 3).toUpperCase();
}

export function splitItemText(text: string): { parts: { text: string; isItem: boolean }[] } {
  const parts: { text: string; isItem: boolean }[] = [];
  const re = /⟦(.+?)⟧/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index), isItem: false });
    parts.push({ text: m[1], isItem: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), isItem: false });
  return { parts };
}
