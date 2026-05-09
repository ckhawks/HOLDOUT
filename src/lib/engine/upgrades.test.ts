import { describe, expect, it } from "vitest";
import {
  BACKPACK_BASE_SLOTS,
  BACKPACK_SLOTS_PER_LEVEL,
  PACK_GRID_BASE_HEIGHT,
  PACK_GRID_WIDTH,
  PENDING_BASE_CAPACITY,
  STASH_BASE_SLOTS,
  STASH_SLOTS_PER_LEVEL,
  backpackCapacity,
  backpackUpgradeCost,
  packDimensions,
  pendingCapacity,
  stashCapacity,
  stashUpgradeCost,
} from "./upgrades";

const lvl = (b: number, s: number) => ({ backpackLevel: b, stashLevel: s });

describe("backpackCapacity", () => {
  it("starts at the base", () => {
    expect(backpackCapacity(lvl(0, 0))).toBe(BACKPACK_BASE_SLOTS);
  });
  it("adds slots per level linearly", () => {
    expect(backpackCapacity(lvl(3, 0))).toBe(BACKPACK_BASE_SLOTS + 3 * BACKPACK_SLOTS_PER_LEVEL);
  });
});

describe("stashCapacity", () => {
  it("starts at the base", () => {
    expect(stashCapacity(lvl(0, 0))).toBe(STASH_BASE_SLOTS);
  });
  it("adds slots per level linearly", () => {
    expect(stashCapacity(lvl(0, 5))).toBe(STASH_BASE_SLOTS + 5 * STASH_SLOTS_PER_LEVEL);
  });
});

describe("packDimensions", () => {
  it("width is constant; height grows with backpackLevel", () => {
    expect(packDimensions(lvl(0, 0))).toEqual({ width: PACK_GRID_WIDTH, height: PACK_GRID_BASE_HEIGHT });
    expect(packDimensions(lvl(2, 0))).toEqual({ width: PACK_GRID_WIDTH, height: PACK_GRID_BASE_HEIGHT + 2 });
  });
});

describe("pendingCapacity", () => {
  it("is constant regardless of upgrades for now", () => {
    expect(pendingCapacity(lvl(0, 0))).toBe(PENDING_BASE_CAPACITY);
    expect(pendingCapacity(lvl(10, 10))).toBe(PENDING_BASE_CAPACITY);
  });
});

describe("upgrade costs", () => {
  it("backpack cost grows by 250/level from 500", () => {
    expect(backpackUpgradeCost(lvl(0, 0))).toBe(500);
    expect(backpackUpgradeCost(lvl(1, 0))).toBe(750);
    expect(backpackUpgradeCost(lvl(4, 0))).toBe(1500);
  });

  it("stash cost grows by 400/level from 800", () => {
    expect(stashUpgradeCost(lvl(0, 0))).toBe(800);
    expect(stashUpgradeCost(lvl(0, 1))).toBe(1200);
    expect(stashUpgradeCost(lvl(0, 3))).toBe(2000);
  });

  it("costs are strictly increasing (endless progression assumption)", () => {
    let prev = -1;
    for (let i = 0; i < 20; i++) {
      const c = backpackUpgradeCost(lvl(i, 0));
      expect(c).toBeGreaterThan(prev);
      prev = c;
    }
  });
});
