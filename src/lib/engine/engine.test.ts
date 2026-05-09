import { describe, expect, it } from "vitest";
import { makeRng, tickRaid } from "./raid";
import { pickEvent, rollEvent } from "./events";
import { migrateSave, SCHEMA_VERSION, type SavedGame } from "./save";
import { pickCommonItemId, pickItemForLocation } from "@/lib/data/items";
import { ITEMS } from "@/lib/data/items";
import { LOCATIONS_BY_ID } from "@/lib/data/locations";
import type { RaidEventDef, RunState } from "@/lib/types";

function freshRunState(over: Partial<RunState> = {}): RunState {
  return {
    alertness: 0,
    health: 100,
    energy: 100,
    ammo: 30,
    depth: 0,
    distanceFromExtract: 0,
    flags: [],
    ...over,
  };
}

describe("makeRng", () => {
  it("produces deterministic sequences for the same seed", () => {
    const a = makeRng(42);
    const b = makeRng(42);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it("produces different sequences for different seeds", () => {
    const a = makeRng(1);
    const b = makeRng(2);
    expect(a()).not.toBe(b());
  });
});

describe("pickEvent precondition filter", () => {
  it("excludes events whose precondition is false", () => {
    // found_rare requires depth >= 3. At depth 0 it must never be picked.
    const rand = makeRng(1);
    const state = freshRunState({ depth: 0 });
    for (let i = 0; i < 200; i++) {
      const ev = pickEvent(rand, state);
      expect(ev.id).not.toBe("found_rare");
    }
  });

  it("admits events once precondition flips true", () => {
    const rand = makeRng(7);
    const state = freshRunState({ depth: 10 });
    let sawRare = false;
    for (let i = 0; i < 500; i++) {
      const ev = pickEvent(rand, state);
      if (ev.id === "found_rare") {
        sawRare = true;
        break;
      }
    }
    expect(sawRare).toBe(true);
  });

  it("falls back to full pool when every event's precondition fails", () => {
    const stubA: RaidEventDef = {
      id: "looted_container",
      weight: 1,
      kind: "loot",
      templates: ["x"],
      preconditions: () => false,
    };
    const stubB: RaidEventDef = {
      id: "spotted_patrol",
      weight: 1,
      kind: "flavor",
      templates: ["y"],
      preconditions: () => false,
    };
    const rand = makeRng(3);
    const state = freshRunState();
    const ev = pickEvent(rand, state, [stubA, stubB]);
    // Both fail their preconditions, so the fallback returns one of them anyway.
    expect([stubA.id, stubB.id]).toContain(ev.id);
  });

  it("respects weights among eligible events", () => {
    const heavy: RaidEventDef = {
      id: "looted_container",
      weight: 99,
      kind: "loot",
      templates: ["a"],
    };
    const light: RaidEventDef = {
      id: "spotted_patrol",
      weight: 1,
      kind: "flavor",
      templates: ["b"],
    };
    const rand = makeRng(11);
    let heavyCount = 0;
    for (let i = 0; i < 1000; i++) {
      if (pickEvent(rand, undefined, [heavy, light]).id === heavy.id) heavyCount++;
    }
    // Expect ≥90% heavy; loose bound to avoid flakes.
    expect(heavyCount).toBeGreaterThan(900);
  });
});

describe("tickRaid postconditions and advances", () => {
  it("returns postcondition flags when a postcondition'd event fires", () => {
    // Force took_damage by seeding until we get one.
    let saw = false;
    for (let seed = 1; seed < 200 && !saw; seed++) {
      const rand = makeRng(seed);
      const t = tickRaid(rand, undefined, freshRunState());
      if (t.log.kind === "damage") {
        expect(t.flagsAdded).toContain("bleeding");
        saw = true;
      }
    }
    expect(saw).toBe(true);
  });

  it("defaults depthAdvance and distanceAdvance to 1", () => {
    const rand = makeRng(5);
    const t = tickRaid(rand, undefined, freshRunState());
    expect(t.depthAdvance).toBe(1);
    expect(t.distanceAdvance).toBe(1);
  });
});

describe("depth-biased loot tier", () => {
  it("shifts the mean item value upward at deep depth vs shallow", () => {
    const N = 4000;
    const rand = makeRng(123);
    let shallowSum = 0;
    let deepSum = 0;
    for (let i = 0; i < N; i++) {
      shallowSum += ITEMS[pickCommonItemId(rand, 0)].sellValue;
    }
    for (let i = 0; i < N; i++) {
      deepSum += ITEMS[pickCommonItemId(rand, 20)].sellValue;
    }
    const shallowMean = shallowSum / N;
    const deepMean = deepSum / N;
    expect(deepMean).toBeGreaterThan(shallowMean);
  });

  it("location-biased picks also shift upward with depth", () => {
    const loc = LOCATIONS_BY_ID["warehouse"];
    expect(loc).toBeDefined();
    const N = 3000;
    const rand = makeRng(99);
    let shallowSum = 0;
    let deepSum = 0;
    for (let i = 0; i < N; i++) {
      shallowSum += ITEMS[pickItemForLocation(rand, loc, false, 0)].sellValue;
    }
    for (let i = 0; i < N; i++) {
      deepSum += ITEMS[pickItemForLocation(rand, loc, false, 20)].sellValue;
    }
    expect(deepSum / N).toBeGreaterThan(shallowSum / N);
  });
});

describe("rollEvent template substitution", () => {
  it("expands {item} into ⟦Name⟧ markers for loot events", () => {
    // Force a loot event with a stub.
    const lootStub: RaidEventDef = {
      id: "looted_container",
      weight: 1,
      kind: "loot",
      templates: ["Found a {item}."],
    };
    // We can't override the EVENTS module, but rollEvent reads the def via pickEvent.
    // Instead, run rollEvent many times against the real pool and verify *every*
    // loot log line wrapped its item name in ⟦…⟧.
    const rand = makeRng(17);
    let checked = 0;
    for (let i = 0; i < 200 && checked < 10; i++) {
      const ev = rollEvent(rand, "warehouse", freshRunState({ depth: 5 }));
      if (ev.itemId) {
        const name = ITEMS[ev.itemId].name;
        expect(ev.text).toContain(`⟦${name}⟧`);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
    void lootStub;
  });

  it("does not leave un-substituted template tokens in the text", () => {
    const rand = makeRng(31);
    for (let i = 0; i < 100; i++) {
      const ev = rollEvent(rand, "warehouse", freshRunState({ depth: 4 }));
      expect(ev.text).not.toMatch(/\{[a-z]+\}/);
    }
  });
});

describe("doTick flag/distance plumbing (via tickRaid + manual apply)", () => {
  it("flagsAdded is empty for events without postconditions", () => {
    const rand = makeRng(5);
    let saw = false;
    for (let seed = 1; seed < 50 && !saw; seed++) {
      const t = tickRaid(makeRng(seed), undefined, freshRunState());
      if (t.log.kind !== "damage") {
        // Non-damage events have no postconditions in the current data.
        expect(t.flagsAdded).toEqual([]);
        saw = true;
      }
    }
    expect(saw).toBe(true);
    void rand;
  });
});

describe("save migration v4 → v5", () => {
  it("backfills flags=[] and distanceFromExtract=depth on in-progress raids", () => {
    const v4: SavedGame = {
      schemaVersion: 4,
      timestamp: 0,
      // RunState shape pre-v5 had no flags/distanceFromExtract.
      state: {
        cash: 0,
        stash: [],
        operative: {
          name: "x",
          state: "raiding",
          injuryDebuff: false,
          skills: { sneak: 1, shoot: 1, scrounge: 1 },
        },
        hideout: {
          modules: {
            stash: { unlocked: true, capacity: 20 },
            backpack: { unlocked: true, capacity: 12 },
            workbench: { unlocked: false },
            medbay: { unlocked: false },
          },
        },
        unlocks: { workbench: false, medbay: false, biolab: false },
        upgrades: { backpackLevel: 0, stashLevel: 0 },
        currentRaid: {
          locationId: "warehouse",
          startedAt: 0,
          // @ts-expect-error — exercising legacy shape on purpose
          runState: { alertness: 0, health: 100, energy: 100, ammo: 30, depth: 7 },
          log: [],
          pack: [],
          pending: [],
          packGrid: { width: 4, height: 4 },
          pendingCapacity: 4,
          active: true,
        },
      },
    };
    const migrated = migrateSave(v4);
    expect(migrated.schemaVersion).toBe(SCHEMA_VERSION);
    const rs = migrated.state.currentRaid!.runState;
    expect(rs.flags).toEqual([]);
    expect(rs.distanceFromExtract).toBe(7);
  });

  it("leaves null currentRaid alone", () => {
    const v4: SavedGame = {
      schemaVersion: 4,
      timestamp: 0,
      state: {
        cash: 100,
        stash: [],
        operative: {
          name: "x",
          state: "idle",
          injuryDebuff: false,
          skills: { sneak: 1, shoot: 1, scrounge: 1 },
        },
        hideout: {
          modules: {
            stash: { unlocked: true, capacity: 20 },
            backpack: { unlocked: true, capacity: 12 },
            workbench: { unlocked: false },
            medbay: { unlocked: false },
          },
        },
        unlocks: { workbench: false, medbay: false, biolab: false },
        upgrades: { backpackLevel: 0, stashLevel: 0 },
        currentRaid: null,
      },
    };
    const migrated = migrateSave(v4);
    expect(migrated.state.currentRaid).toBeNull();
  });
});
