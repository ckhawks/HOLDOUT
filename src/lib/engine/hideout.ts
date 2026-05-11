import type {
  ConstructionState,
  ModuleId,
  StashItem,
  UpgradeCost,
} from "@/lib/types";
import { MODULE_BUILD_COSTS, MODULE_TIER_COSTS } from "@/lib/data/modules";

// Pure cost-paying helpers shared by module builds, module tier-ups, and
// stash upgrades. Consumes from a stash + foundry + cash bundle atomically:
// the helper returns either { ok: false, missing } or the full new state.

export interface CostPaymentInputs {
  cash: number;
  stash: StashItem[];
  foundry: ConstructionState["foundry"];
}

export interface CostPaymentResult {
  cash: number;
  stash: StashItem[];
  foundry: ConstructionState["foundry"];
}

export interface CostFailure {
  reason: "missing_cash" | "missing_items" | "missing_metals";
  missingCash?: number;
  missingItems?: Array<{ id: string; need: number; have: number }>;
  missingMetals?: Array<{ id: string; need: number; have: number }>;
}

export function canAfford(
  cost: UpgradeCost,
  inputs: CostPaymentInputs,
): { ok: true } | { ok: false; failure: CostFailure } {
  if (inputs.cash < cost.cash) {
    return {
      ok: false,
      failure: { reason: "missing_cash", missingCash: cost.cash - inputs.cash },
    };
  }
  const itemCounts: Record<string, number> = {};
  for (const si of inputs.stash) {
    if (si.pinned) continue;
    itemCounts[si.itemId] = (itemCounts[si.itemId] ?? 0) + 1;
  }
  const missingItems: CostFailure["missingItems"] = [];
  for (const req of cost.items ?? []) {
    const have = itemCounts[req.id] ?? 0;
    if (have < req.count) missingItems.push({ id: req.id, need: req.count, have });
  }
  if (missingItems.length > 0) {
    return { ok: false, failure: { reason: "missing_items", missingItems } };
  }
  const missingMetals: CostFailure["missingMetals"] = [];
  for (const req of cost.metals ?? []) {
    const have = inputs.foundry.vessels[req.id] ?? 0;
    if (have < req.count) missingMetals.push({ id: req.id, need: req.count, have });
  }
  if (missingMetals.length > 0) {
    return { ok: false, failure: { reason: "missing_metals", missingMetals } };
  }
  return { ok: true };
}

// Pay a cost atomically. Caller MUST have checked canAfford first — this
// function trusts inputs and just spends. Consumes non-pinned stash items
// from oldest first (lowest array index, which is acquisition order).
export function payCost(
  cost: UpgradeCost,
  inputs: CostPaymentInputs,
): CostPaymentResult {
  const stash = [...inputs.stash];
  for (const req of cost.items ?? []) {
    let remaining = req.count;
    for (let i = 0; i < stash.length && remaining > 0; i++) {
      const si = stash[i];
      if (si.pinned || si.itemId !== req.id) continue;
      stash.splice(i, 1);
      i -= 1;
      remaining -= 1;
    }
  }
  const vessels = { ...inputs.foundry.vessels };
  for (const req of cost.metals ?? []) {
    vessels[req.id] = (vessels[req.id] ?? 0) - req.count;
  }
  return {
    cash: inputs.cash - cost.cash,
    stash,
    foundry: { vessels },
  };
}

export function moduleBuildCost(id: ModuleId): UpgradeCost {
  return MODULE_BUILD_COSTS[id];
}

export function moduleTierUpCost(id: ModuleId, targetTier: number): UpgradeCost | undefined {
  return MODULE_TIER_COSTS[`${id}:${targetTier}`];
}
