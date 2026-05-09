import { describe, expect, it } from "vitest";
import {
  POCKETS_BASE_HEIGHT,
  POCKETS_WIDTH,
  STASH_BASE_SLOTS,
  STASH_SLOTS_PER_LEVEL,
  pocketsDimensions,
  pocketsUpgradeCost,
  stashCapacity,
  stashUpgradeCost,
} from "./upgrades";

const lvl = (p: number, s: number) => ({ pocketsLevel: p, stashLevel: s });

describe("pocketsDimensions", () => {
  it("width is constant; height grows with pocketsLevel", () => {
    expect(pocketsDimensions(lvl(0, 0))).toEqual({ width: POCKETS_WIDTH, height: POCKETS_BASE_HEIGHT });
    expect(pocketsDimensions(lvl(2, 0))).toEqual({ width: POCKETS_WIDTH, height: POCKETS_BASE_HEIGHT + 2 });
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

describe("upgrade costs", () => {
  it("pockets cost grows by 250/level from 500", () => {
    expect(pocketsUpgradeCost(lvl(0, 0))).toBe(500);
    expect(pocketsUpgradeCost(lvl(1, 0))).toBe(750);
    expect(pocketsUpgradeCost(lvl(4, 0))).toBe(1500);
  });

  it("stash cost grows by 400/level from 800", () => {
    expect(stashUpgradeCost(lvl(0, 0))).toBe(800);
    expect(stashUpgradeCost(lvl(0, 1))).toBe(1200);
    expect(stashUpgradeCost(lvl(0, 3))).toBe(2000);
  });

  it("costs are strictly increasing (endless progression assumption)", () => {
    let prev = -1;
    for (let i = 0; i < 20; i++) {
      const c = pocketsUpgradeCost(lvl(i, 0));
      expect(c).toBeGreaterThan(prev);
      prev = c;
    }
  });
});
