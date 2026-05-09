import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearSave, loadGame, saveGame, type PersistedState } from "./save";

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(k: string) {
    return this.store.has(k) ? this.store.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.store.set(k, v);
  }
  removeItem(k: string) {
    this.store.delete(k);
  }
  clear() {
    this.store.clear();
  }
}

function freshState(): PersistedState {
  return {
    cash: 250,
    stash: [{ uid: "s1", itemId: "scrap_metal" }],
    operative: {
      name: "OP",
      state: "idle",
      injuryDebuff: false,
      skills: { sneak: 1, shoot: 1, scrounge: 1 },
    },
    hideout: {
      modules: {
        stash: { unlocked: true, capacity: 30 },
        backpack: { unlocked: true, capacity: 12 },
        workbench: { unlocked: false },
        medbay: { unlocked: false },
      },
    },
    unlocks: { workbench: false, medbay: false, biolab: false },
    upgrades: { backpackLevel: 1, stashLevel: 2 },
    currentRaid: null,
  };
}

describe("save round-trip", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", new MemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("save -> load returns the same persisted state", () => {
    const s = freshState();
    saveGame(s);
    const loaded = loadGame();
    expect(loaded).toEqual(s);
  });

  it("load returns null when no save exists", () => {
    expect(loadGame()).toBeNull();
  });

  it("clearSave removes the entry", () => {
    saveGame(freshState());
    expect(loadGame()).not.toBeNull();
    clearSave();
    expect(loadGame()).toBeNull();
  });

  it("preserves a flags array on currentRaid round-trip (not a Set)", () => {
    const s = freshState();
    s.currentRaid = {
      locationId: "warehouse",
      startedAt: 123,
      runState: {
        alertness: 10,
        health: 90,
        energy: 80,
        ammo: 30,
        depth: 5,
        distanceFromExtract: 3,
        flags: ["bleeding", "alarm_triggered"],
      },
      log: [],
      pack: [],
      pending: [],
      packGrid: { width: 4, height: 4 },
      pendingCapacity: 4,
      active: true,
      pendingChoice: null,
      map: { width: 1, height: 1, entry: { x: 0, y: 0 }, tiles: [{ x: 0, y: 0, type: "entry", name: "entry", blocked: false, looted: false, seen: true }] },
      operativePos: { x: 0, y: 0 },
      nextStep: null,
      pausedAt: null,
    };
    saveGame(s);
    const loaded = loadGame();
    expect(loaded?.currentRaid?.runState.flags).toEqual(["bleeding", "alarm_triggered"]);
    expect(Array.isArray(loaded?.currentRaid?.runState.flags)).toBe(true);
  });

  it("returns null on corrupted JSON instead of throwing", () => {
    localStorage.setItem("holdout:save", "{not valid json");
    expect(loadGame()).toBeNull();
  });
});
