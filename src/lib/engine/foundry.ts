import type { FoundryState, MetalId, ModuleState, StashItem } from "@/lib/types";
import {
  METAL_DISPLAY_NAME,
  METAL_SELL_PRICE,
  SMELT_RECIPES,
  vesselCapacity,
} from "@/lib/data/smelt";

// Pure foundry engine. Smelts metallic items into vessel-stored metals;
// overflow over capacity is reported as `wasted`. Withdraws clip to the
// stored amount. Tier gating mirrors the recycle pattern.

export interface SmeltResult {
  consumedUid: string;
  added: Partial<Record<MetalId, number>>;
  wasted: Partial<Record<MetalId, number>>;
}

export type SmeltError =
  | { error: "no_recipe" }
  | { error: "tier_too_low"; required: 1 | 2 | 3 }
  | { error: "not_built" };

export function smeltItem(
  item: StashItem,
  foundry: FoundryState,
  module: ModuleState,
): { foundry: FoundryState; result: SmeltResult } | SmeltError {
  if (!module.built) return { error: "not_built" };
  const tier = module.tier as 1 | 2 | 3;
  const recipe = SMELT_RECIPES[item.itemId];
  if (!recipe) return { error: "no_recipe" };
  const required = (recipe.minTier ?? 1) as 1 | 2 | 3;
  if (required > tier) return { error: "tier_too_low", required };

  const added: Partial<Record<MetalId, number>> = {};
  const wasted: Partial<Record<MetalId, number>> = {};
  const vessels: Record<MetalId, number> = { ...foundry.vessels };
  for (const out of recipe.outputs) {
    const cap = vesselCapacity(out.metal, tier);
    const current = vessels[out.metal] ?? 0;
    const headroom = Math.max(0, cap - current);
    const accepted = Math.min(out.amount, headroom);
    const overflow = out.amount - accepted;
    if (accepted > 0) {
      vessels[out.metal] = current + accepted;
      added[out.metal] = (added[out.metal] ?? 0) + accepted;
    }
    if (overflow > 0) {
      wasted[out.metal] = (wasted[out.metal] ?? 0) + overflow;
    }
  }
  return {
    foundry: { vessels },
    result: { consumedUid: item.uid, added, wasted },
  };
}

export function withdrawMetal(
  foundry: FoundryState,
  metal: MetalId,
  amount: number,
): { foundry: FoundryState; withdrawn: number } {
  if (amount <= 0) return { foundry, withdrawn: 0 };
  const have = foundry.vessels[metal] ?? 0;
  const withdrawn = Math.min(have, amount);
  if (withdrawn === 0) return { foundry, withdrawn: 0 };
  const vessels = { ...foundry.vessels, [metal]: have - withdrawn };
  return { foundry: { vessels }, withdrawn };
}

export function metalSellValue(metal: MetalId, units: number): number {
  return Math.round(units * METAL_SELL_PRICE[metal]);
}

export function describeSmelt(result: SmeltResult): string {
  const parts: string[] = [];
  for (const [metal, n] of Object.entries(result.added) as Array<[MetalId, number]>) {
    if (n > 0) parts.push(`+${n} ${METAL_DISPLAY_NAME[metal]}`);
  }
  for (const [metal, n] of Object.entries(result.wasted) as Array<[MetalId, number]>) {
    if (n > 0) parts.push(`${n} ${METAL_DISPLAY_NAME[metal]} wasted (vessel full)`);
  }
  return parts.length === 0 ? "nothing recovered" : parts.join(", ");
}

export { vesselCapacity } from "@/lib/data/smelt";
