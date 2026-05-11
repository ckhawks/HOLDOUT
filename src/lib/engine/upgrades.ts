import type { Equipment, UpgradeCost, Upgrades } from "@/lib/types";
import { kitCellCapacity } from "@/lib/engine/equipment";
import { STASH_UPGRADE_COSTS } from "@/lib/data/modules";

export const STASH_BASE_SLOTS = 30;
// Slot increment per level. Tuned conservatively until the construction
// system's full ladder lands; spec §8.2 has a more aggressive curve later.
export const STASH_SLOTS_PER_LEVEL = 10;

// Pockets are the operative's built-in inventory grid. Width is fixed; height
// grows with pocketsLevel. Intentionally a 6×1 strip at base so a bag is
// strictly additive: many items are 2+ cells tall and only fit in a bag.
export const POCKETS_WIDTH = 6;
export const POCKETS_BASE_HEIGHT = 1;

export function pocketsDimensions(u: Upgrades): { width: number; height: number } {
  return { width: POCKETS_WIDTH, height: POCKETS_BASE_HEIGHT + u.pocketsLevel };
}

// Total cells across pockets + every equipped container (bag + rig).
// Used by the kit summary chip.
export function totalEquipmentCells(equipment: Equipment): number {
  return kitCellCapacity(equipment);
}

export function stashCapacity(u: Upgrades): number {
  return STASH_BASE_SLOTS + u.stashLevel * STASH_SLOTS_PER_LEVEL;
}

export function pocketsUpgradeCost(u: Upgrades): number {
  return 500 + u.pocketsLevel * 250;
}

// Cost to reach stashLevel = current+1. The ladder lives in
// data/modules.ts (STASH_UPGRADE_COSTS); we look up by target level. Past
// the ladder's last entry, falls back to a steep cash-only progression so
// the game doesn't dead-end if the player out-runs the ladder.
export function stashUpgradeCost(u: Upgrades): UpgradeCost {
  const target = u.stashLevel + 1;
  return STASH_UPGRADE_COSTS[target] ?? { cash: 800 + u.stashLevel * 400 };
}

// Back-compat helper: callers that only need the cash component (rendering
// affordability glyphs) without spreading the full cost.
export function stashUpgradeCashCost(u: Upgrades): number {
  return stashUpgradeCost(u).cash;
}
