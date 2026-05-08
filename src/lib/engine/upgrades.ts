import type { Upgrades } from "@/lib/types";

export const BACKPACK_BASE_SLOTS = 12;
export const STASH_BASE_SLOTS = 30;

export const BACKPACK_SLOTS_PER_LEVEL = 2;
export const STASH_SLOTS_PER_LEVEL = 10;

export function backpackCapacity(u: Upgrades): number {
  return BACKPACK_BASE_SLOTS + u.backpackLevel * BACKPACK_SLOTS_PER_LEVEL;
}

export const PACK_GRID_WIDTH = 4;
export const PACK_GRID_BASE_HEIGHT = 4;

export function packDimensions(u: Upgrades): { width: number; height: number } {
  return { width: PACK_GRID_WIDTH, height: PACK_GRID_BASE_HEIGHT + u.backpackLevel };
}

export const PENDING_BASE_CAPACITY = 4;
export function pendingCapacity(_u: Upgrades): number {
  return PENDING_BASE_CAPACITY;
}

export function stashCapacity(u: Upgrades): number {
  return STASH_BASE_SLOTS + u.stashLevel * STASH_SLOTS_PER_LEVEL;
}

export function backpackUpgradeCost(u: Upgrades): number {
  return 500 + u.backpackLevel * 250;
}

export function stashUpgradeCost(u: Upgrades): number {
  return 800 + u.stashLevel * 400;
}
