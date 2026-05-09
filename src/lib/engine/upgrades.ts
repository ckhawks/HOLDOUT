import type { Equipment, Upgrades } from "@/lib/types";

export const STASH_BASE_SLOTS = 30;
export const STASH_SLOTS_PER_LEVEL = 10;

// Pockets are the operative's built-in inventory grid. Width is fixed; height
// grows with pocketsLevel. Intentionally a 6×1 strip at base so a bag is
// strictly additive: many items are 2+ cells tall and only fit in a bag.
export const POCKETS_WIDTH = 6;
export const POCKETS_BASE_HEIGHT = 1;

export function pocketsDimensions(u: Upgrades): { width: number; height: number } {
  return { width: POCKETS_WIDTH, height: POCKETS_BASE_HEIGHT + u.pocketsLevel };
}

// Total cells across pockets + equipped bag. Used by the kit summary chip.
export function totalEquipmentCells(equipment: Equipment): number {
  const p = equipment.pockets.grid.width * equipment.pockets.grid.height;
  const b = equipment.bag
    ? equipment.bag.grid.width * equipment.bag.grid.height
    : 0;
  return p + b;
}

export function stashCapacity(u: Upgrades): number {
  return STASH_BASE_SLOTS + u.stashLevel * STASH_SLOTS_PER_LEVEL;
}

export function pocketsUpgradeCost(u: Upgrades): number {
  return 500 + u.pocketsLevel * 250;
}

export function stashUpgradeCost(u: Upgrades): number {
  return 800 + u.stashLevel * 400;
}
