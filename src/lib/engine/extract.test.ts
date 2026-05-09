import { describe, expect, it } from "vitest";
import { makeRng, tickRaid } from "./raid";
import type { RunState } from "@/lib/types";

function freshRunState(over: Partial<RunState> = {}): RunState {
  return {
    alertness: 0,
    health: 100,
    energy: 100,
    ammo: 30,
    depth: 5,
    distanceFromExtract: 5,
    flags: [],
    ...over,
  };
}

describe("extract event pool", () => {
  it("only fires extract events when extracting flag is set", () => {
    const state = freshRunState({ flags: ["extracting"] });
    const extractIds = new Set([
      "extract_clear",
      "extract_skirmish",
      "extract_corner_loot",
    ]);
    let saw = false;
    for (let seed = 1; seed < 200; seed++) {
      const t = tickRaid(makeRng(seed), "warehouse", state);
      // Detect extract events via their distinctive distanceAdvance: -1.
      expect(t.distanceAdvance).toBe(-1);
      // Should not be a branching event (extract pool has no branches).
      expect(t.pendingChoice).toBeNull();
      saw = true;
      void extractIds;
    }
    expect(saw).toBe(true);
  });

  it("extract events advance distance toward 0 (negative), not deeper", () => {
    const state = freshRunState({ flags: ["extracting"] });
    for (let seed = 1; seed < 50; seed++) {
      const t = tickRaid(makeRng(seed), "warehouse", state);
      expect(t.distanceAdvance).toBe(-1);
      expect(t.depthAdvance).toBe(0);
    }
  });

  it("non-extracting state does NOT roll extract events", () => {
    const state = freshRunState({ flags: [], depth: 5 });
    for (let seed = 1; seed < 100; seed++) {
      const t = tickRaid(makeRng(seed), "warehouse", state);
      // Non-extract events advance distance by +1 (default) or 0 (branching).
      expect(t.distanceAdvance).not.toBe(-1);
    }
  });

  it("extract_skirmish can produce minor bleed sometimes (~35%)", () => {
    const state = freshRunState({ flags: ["extracting"] });
    let damage = 0;
    let bleed = 0;
    for (let seed = 1; seed < 5000; seed++) {
      const t = tickRaid(makeRng(seed), "warehouse", state);
      if (t.log.kind === "damage") {
        damage++;
        if (t.flagsAdded.includes("bleeding_minor")) bleed++;
      }
    }
    expect(damage).toBeGreaterThan(50);
    // Loose bound around 35%.
    expect(bleed / damage).toBeGreaterThan(0.15);
    expect(bleed / damage).toBeLessThan(0.55);
  });
});
