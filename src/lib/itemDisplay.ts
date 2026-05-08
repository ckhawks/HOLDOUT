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
