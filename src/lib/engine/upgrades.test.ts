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

  it("stash cost follows the construction-system ladder (cash + components)", () => {
    // L0 -> L1 is cash-only.
    expect(stashUpgradeCost(lvl(0, 0)).cash).toBe(300);
    expect(stashUpgradeCost(lvl(0, 0)).items ?? []).toEqual([]);
    // L1 -> L2 adds components.
    const l2 = stashUpgradeCost(lvl(0, 1));
    expect(l2.cash).toBe(700);
    expect(l2.items?.map((i) => i.id).sort()).toEqual(["industrial_shelving", "scrap_metal"].sort());
    // L3 -> L4 adds metals.
    const l4 = stashUpgradeCost(lvl(0, 3));
    expect(l4.cash).toBe(3500);
    expect(l4.metals?.[0]).toEqual({ id: "steel", count: 200 });
  });

  it("stash cost falls back to a cash-only progression past the ladder's end", () => {
    // Ladder runs through level 6. Beyond, fall back to a steep cash-only
    // curve so the game doesn't dead-end.
    const beyond = stashUpgradeCost(lvl(0, 12));
    expect(beyond.items).toBeUndefined();
    expect(beyond.metals).toBeUndefined();
    expect(beyond.cash).toBeGreaterThan(0);
  });

  it("pockets cost is strictly increasing (endless progression assumption)", () => {
    let prev = -1;
    for (let i = 0; i < 20; i++) {
      const c = pocketsUpgradeCost(lvl(i, 0));
      expect(c).toBeGreaterThan(prev);
      prev = c;
    }
  });
});
