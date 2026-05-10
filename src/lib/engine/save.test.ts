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
      equipment: {
        pockets: { grid: { width: 4, height: 4 }, items: [] },
        bag: null,
        weapon: null,
        armor: null,
        helmet: null,
      },
      health: 100,
      energy: 100,
      ammo: 30,
    },
    hideout: {
      modules: {
        stash: { unlocked: true, capacity: 30 },
        pockets: { unlocked: true, capacity: 16 },
        workbench: { unlocked: false },
        medbay: { unlocked: false },
        loadout: { unlocked: true },
      },
    },
    unlocks: { workbench: false, medbay: false, biolab: false },
    upgrades: { pocketsLevel: 1, stashLevel: 2 },
    currentRaid: null,
    shop: { offers: [], lastRefreshAt: 0 },
    debugMode: false,
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
        heat: 10,
        health: 90,
        energy: 80,
        ammo: 30,
        depth: 5,
        distanceFromExtract: 3,
        flags: ["bleeding", "alarm_triggered"],
      },
      log: [],
      equipment: {
        pockets: { grid: { width: 4, height: 4 }, items: [] },
        bag: null,
        weapon: null,
        armor: null,
        helmet: null,
      },
      active: true,
      pendingChoice: null,
      map: { width: 1, height: 1, entry: { x: 0, y: 0 }, tiles: [{ x: 0, y: 0, type: "entry", name: "entry", blocked: false, visited: true, lootRemaining: 0, lootMax: 0, containers: [], lockedContainers: [], contents: [], seen: true, threat: false }] },
      operativePos: { x: 0, y: 0 },
      nextStep: null,
      pausedAt: null,
      queuedAction: "move_forward",
      actionStartedAt: 0,
      pendingEnd: null,
      startingEquipment: {
        pockets: { grid: { width: 4, height: 4 }, items: [] },
        bag: null,
        weapon: null,
        armor: null,
        helmet: null,
      },
      tally: {
        damageTaken: 0,
        energySpent: 0,
        heatPeak: 0,
        combatTargetsDown: 0,
        combatTargetsFled: 0,
        combatBrokeContact: 0,
        combatTradedShots: 0,
        choicesMade: [],
        consumablesUsed: [],
      },
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
