import { describe, expect, it } from "vitest";
import { makeRng } from "./raid";
import { pickEvent, rollEvent } from "./events";
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

function countByKind(N: number, roomType?: Parameters<typeof pickEvent>[3], roomLooted?: boolean) {
  const counts: Record<string, number> = {};
  const state = freshRunState();
  for (let seed = 1; seed <= N; seed++) {
    const ev = pickEvent(makeRng(seed), state, undefined, roomType, roomLooted);
    counts[ev.id] = (counts[ev.id] ?? 0) + 1;
  }
  return counts;
}

describe("ROOM_EVENT_BIAS", () => {
  it("storage rooms produce more looted_container than corridors", () => {
    const N = 3000;
    const corridor = countByKind(N, "corridor");
    const storage = countByKind(N, "storage");
    expect(storage.looted_container ?? 0).toBeGreaterThan(
      corridor.looted_container ?? 0,
    );
  });

  it("gantry rooms produce more spotted_patrol than corridors", () => {
    const N = 3000;
    const corridor = countByKind(N, "corridor");
    const gantry = countByKind(N, "gantry");
    expect(gantry.spotted_patrol ?? 0).toBeGreaterThan(
      corridor.spotted_patrol ?? 0,
    );
  });

  it("mechanical rooms produce more took_damage than corridors", () => {
    const N = 3000;
    const corridor = countByKind(N, "corridor");
    const mech = countByKind(N, "mechanical");
    expect(mech.took_damage ?? 0).toBeGreaterThan(corridor.took_damage ?? 0);
  });

  it("looted rooms suppress looted_container significantly", () => {
    const N = 3000;
    const fresh = countByKind(N, "storage", false);
    const looted = countByKind(N, "storage", true);
    // looted multiplier 0.35 → expect roughly a third of fresh.
    expect(looted.looted_container ?? 0).toBeLessThan(
      (fresh.looted_container ?? 0) * 0.6,
    );
  });
});

describe("rollEvent forwards room context", () => {
  it("does not throw and produces valid templates with room bias", () => {
    const rand = makeRng(7);
    for (let i = 0; i < 100; i++) {
      const ev = rollEvent(rand, "warehouse", freshRunState({ depth: 4 }), "office", false);
      expect(ev.text.length).toBeGreaterThan(0);
      expect(ev.text).not.toMatch(/\{[a-z]+\}/);
    }
  });

  it("does not apply room bias while extracting (exclusive pool)", () => {
    const rand = makeRng(11);
    // While extracting, only extract events should fire regardless of room.
    for (let seed = 1; seed < 100; seed++) {
      const ev = rollEvent(
        makeRng(seed),
        "warehouse",
        freshRunState({ flags: ["extracting"] }),
        "storage",
        false,
      );
      expect(["extract_clear", "extract_skirmish", "extract_corner_loot"]).toContain(ev.kind);
    }
    void rand;
  });
});
