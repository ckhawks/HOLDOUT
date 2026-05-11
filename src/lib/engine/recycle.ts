import type { StashItem } from "@/lib/types";
import { ITEMS } from "@/lib/data/items";
import { RECYCLE_RECIPES, type RecycleRecipe } from "@/lib/data/recycle";

// Pure recycler engine. Given an item + a recycler tier + a seeded RNG,
// returns the list of items produced (with stack counts). No store reach-in,
// no Date.now, no Math.random — the store layer supplies a seeded rand and
// stamps acquiredAt on the resulting stash items.

export interface RecycleProduced {
  id: string;
  count: number;
}

export interface RecycleResult {
  consumedUid: string;
  produced: RecycleProduced[];
}

export type RecycleError =
  | { error: "no_recipe" }
  | { error: "tier_too_low"; required: 1 | 2 | 3 };

// Per-tier bonuses applied to every output chance. L3 also rolls a per-
// output bonus-stack chance (2× count).
const TIER_CHANCE_BONUS: Record<1 | 2 | 3, number> = { 1: 0, 2: 0.15, 3: 0.3 };
const TIER_BONUS_STACK_CHANCE: Record<1 | 2 | 3, number> = { 1: 0, 2: 0, 3: 0.2 };

export function rolledOutputs(
  recipe: RecycleRecipe,
  recyclerTier: 1 | 2 | 3,
  rand: () => number,
): RecycleProduced[] {
  const chanceBonus = TIER_CHANCE_BONUS[recyclerTier];
  const bonusStackChance = TIER_BONUS_STACK_CHANCE[recyclerTier];
  const out: RecycleProduced[] = [];
  for (const o of recipe.outputs) {
    if (rand() < Math.min(1, o.chance + chanceBonus)) {
      let count = o.count ?? 1;
      if (rand() < bonusStackChance) count *= 2;
      out.push({ id: o.id, count });
    }
  }
  return out;
}

export function recycleItem(
  item: StashItem,
  recyclerTier: 1 | 2 | 3,
  rand: () => number,
): RecycleResult | RecycleError {
  const recipe = RECYCLE_RECIPES[item.itemId];
  if (!recipe) return { error: "no_recipe" };
  const required = (recipe.minTier ?? 1) as 1 | 2 | 3;
  if (required > recyclerTier) return { error: "tier_too_low", required };
  return {
    consumedUid: item.uid,
    produced: rolledOutputs(recipe, recyclerTier, rand),
  };
}

// Pretty-print a list of produced outputs for the construction log.
export function describeProduced(produced: RecycleProduced[]): string {
  if (produced.length === 0) return "nothing of value";
  return produced
    .map((p) => {
      const name = ITEMS[p.id]?.name ?? p.id;
      return p.count > 1 ? `${p.count}× ${name}` : name;
    })
    .join(", ");
}
