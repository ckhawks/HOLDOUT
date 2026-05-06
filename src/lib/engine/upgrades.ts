import type { Upgrades } from "@/lib/types";

export const BACKPACK_BASE_SLOTS = 12;
export const STASH_BASE_SLOTS = 30;

export const BACKPACK_SLOTS_PER_LEVEL = 2;
export const STASH_SLOTS_PER_LEVEL = 10;

export function backpackCapacity(u: Upgrades): number {
  return BACKPACK_BASE_SLOTS + u.backpackLevel * BACKPACK_SLOTS_PER_LEVEL;
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
