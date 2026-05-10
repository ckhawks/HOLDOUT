import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useGame } from "./game";
import type { Equipment, Operative, StashItem, Upgrades } from "@/lib/types";
import { pocketsDimensions, stashCapacity } from "@/lib/engine/upgrades";

// Integration tests for the Zustand store. Cover the high-level lifecycle
// flows the engine purity refactor + tick-loop ownership refactor depend on,
// so the next big refactor (#3 — split god-file into slices) has a safety net.

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

function makeOperative(upgrades: Upgrades): Operative {
  return {
    name: "TEST-OP",
    state: "idle",
    injuryDebuff: false,
    skills: { sneak: 1, shoot: 1, scrounge: 1 },
    equipment: makeEquipment(upgrades),
  };
}

function makeEquipment(upgrades: Upgrades): Equipment {
  return {
    pockets: { grid: pocketsDimensions(upgrades), items: [] },
    bag: null,
    weapon: null,
    armor: null,
    helmet: null,
  };
}

// Reset useGame to a deterministic clean slate. Runs before each test.
function resetStore(stash: StashItem[] = []) {
  const upgrades: Upgrades = { pocketsLevel: 0, stashLevel: 0 };
  useGame.setState({
    cash: 100,
    stash,
    operative: makeOperative(upgrades),
    hideout: {
      modules: {
        stash: { unlocked: true, capacity: stashCapacity(upgrades) },
        pockets: { unlocked: true, capacity: 16 },
        workbench: { unlocked: false },
        medbay: { unlocked: false },
        loadout: { unlocked: true },
      },
    },
    unlocks: { workbench: false, medbay: false, biolab: false },
    upgrades,
    currentRaid: null,
    shop: { offers: [], lastRefreshAt: 0 },
    activePanel: "ops",
    rngSeed: 12345,
    hydrated: true,
    raidOutcome: null,
  });
}

beforeEach(() => {
  vi.stubGlobal("window", {});
  vi.stubGlobal("localStorage", new MemoryStorage());
  resetStore();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("beginRaid", () => {
  it("flips operative to raiding and creates a CurrentRaid", () => {
    useGame.getState().beginRaid("warehouse");
    const s = useGame.getState();
    expect(s.operative.state).toBe("raiding");
    expect(s.currentRaid).not.toBeNull();
    expect(s.currentRaid?.locationId).toBe("warehouse");
    expect(s.currentRaid?.active).toBe(true);
    expect(s.currentRaid?.runState.health).toBe(100);
  });

  it("auto-routes to feed panel", () => {
    useGame.getState().beginRaid("warehouse");
    expect(useGame.getState().activePanel).toBe("feed");
  });

  it("refuses to start when operative is not idle", () => {
    useGame.getState().beginRaid("warehouse");
    const before = useGame.getState().currentRaid;
    useGame.getState().beginRaid("subway");
    // Second call should noop — currentRaid stays the warehouse one.
    expect(useGame.getState().currentRaid).toBe(before);
    expect(useGame.getState().currentRaid?.locationId).toBe("warehouse");
  });

  it("refuses to start a locked location without the unlock token", () => {
    useGame.getState().beginRaid("datacenter");
    expect(useGame.getState().currentRaid).toBeNull();
    expect(useGame.getState().operative.state).toBe("idle");
  });

  it("consumes a consumable unlock token from stash on entry", () => {
    resetStore([
      { uid: "card1", itemId: "datacenter_keycard" },
      { uid: "scrap1", itemId: "scrap_metal" },
    ]);
    useGame.getState().beginRaid("datacenter");
    const stash = useGame.getState().stash;
    expect(stash.find((s) => s.itemId === "datacenter_keycard")).toBeUndefined();
    expect(stash.find((s) => s.uid === "scrap1")).toBeDefined();
  });
});

describe("doTick", () => {
  it("advances the raid log on each tick", () => {
    useGame.getState().beginRaid("warehouse");
    const before = useGame.getState().currentRaid!.log.length;
    useGame.getState().doTick();
    const after = useGame.getState().currentRaid!.log.length;
    expect(after).toBeGreaterThan(before);
  });

  it("noops when there's no current raid", () => {
    useGame.getState().doTick();
    expect(useGame.getState().currentRaid).toBeNull();
  });

  it("noops when the raid is paused", () => {
    useGame.getState().beginRaid("warehouse");
    useGame.getState().togglePause();
    const before = useGame.getState().currentRaid!.log.length;
    useGame.getState().doTick();
    expect(useGame.getState().currentRaid!.log.length).toBe(before);
  });

  it("sets pendingEnd on death (health ≤ 0) instead of chaining setTimeout", () => {
    useGame.getState().beginRaid("warehouse");
    // Force health to 0; next tick should trip the death branch.
    const raid = useGame.getState().currentRaid!;
    useGame.setState({
      currentRaid: {
        ...raid,
        runState: { ...raid.runState, health: 0 },
      },
    });
    useGame.getState().doTick();
    const next = useGame.getState().currentRaid!;
    expect(next.active).toBe(false);
    expect(next.pendingEnd).not.toBeNull();
    expect(next.pendingEnd?.success).toBe(false);
    expect(next.pendingEnd?.at).toBeGreaterThan(Date.now() - 100);
  });

  it("sets pendingEnd on extract success when operative reaches entry tile", () => {
    useGame.getState().beginRaid("warehouse");
    const raid = useGame.getState().currentRaid!;
    // Place the operative on the entry tile, mark them extracting, queue a
    // tick. doTick should detect "at extract" and set pendingEnd.success=true.
    useGame.setState({
      currentRaid: {
        ...raid,
        operativePos: { x: raid.map.entry.x, y: raid.map.entry.y },
        // nextStep null so extract_step doesn't see a forward-pointing
        // destination tile and fire a patrol-encounter pendingChoice.
        nextStep: null,
        runState: { ...raid.runState, flags: ["extracting"] },
        queuedAction: "extract_step",
      },
    });
    useGame.getState().doTick();
    const next = useGame.getState().currentRaid!;
    expect(next.active).toBe(false);
    expect(next.pendingEnd?.success).toBe(true);
  });
});

describe("togglePause", () => {
  it("sets pausedAt on first toggle, clears + shifts actionStartedAt on second", async () => {
    useGame.getState().beginRaid("warehouse");
    const startedAt = useGame.getState().currentRaid!.actionStartedAt;

    useGame.getState().togglePause();
    expect(useGame.getState().currentRaid?.pausedAt).not.toBeNull();

    // Wait a tick of wall-clock time so the resume shift is observable.
    await new Promise((r) => setTimeout(r, 25));

    useGame.getState().togglePause();
    const next = useGame.getState().currentRaid!;
    expect(next.pausedAt).toBeNull();
    // actionStartedAt should have shifted forward by ~the pause duration.
    expect(next.actionStartedAt).toBeGreaterThan(startedAt);
  });
});

describe("recall + cancelRecall", () => {
  it("recall sets the extracting flag", () => {
    useGame.getState().beginRaid("warehouse");
    useGame.getState().recall();
    const flags = useGame.getState().currentRaid!.runState.flags;
    expect(flags).toContain("extracting");
  });

  it("cancelRecall removes the extracting flag", () => {
    useGame.getState().beginRaid("warehouse");
    useGame.getState().recall();
    useGame.getState().cancelRecall();
    const flags = useGame.getState().currentRaid!.runState.flags;
    expect(flags).not.toContain("extracting");
  });
});

describe("sellItem", () => {
  it("removes item from stash and credits cash by sellValue", () => {
    resetStore([{ uid: "u1", itemId: "scrap_metal" }]);
    const before = useGame.getState().cash;
    useGame.getState().sellItem("u1");
    const s = useGame.getState();
    expect(s.stash.find((x) => x.uid === "u1")).toBeUndefined();
    expect(s.cash).toBeGreaterThan(before);
  });

  it("noops on unknown uid", () => {
    resetStore([{ uid: "u1", itemId: "scrap_metal" }]);
    const before = useGame.getState().cash;
    useGame.getState().sellItem("does-not-exist");
    expect(useGame.getState().cash).toBe(before);
  });
});

describe("kit / equipment flow", () => {
  it("equipFromStash bag → operative.equipment.bag set, stash entry removed", () => {
    resetStore([{ uid: "bag1", itemId: "canvas_satchel" }]);
    const ok = useGame.getState().equipFromStash("bag1");
    expect(ok).toBe(true);
    const s = useGame.getState();
    expect(s.stash.find((x) => x.uid === "bag1")).toBeUndefined();
    expect(s.operative.equipment.bag).not.toBeNull();
    expect(s.operative.equipment.bag?.slot.itemId).toBe("canvas_satchel");
  });

  it("unequipToStash refuses a non-empty bag", () => {
    resetStore([{ uid: "bag1", itemId: "canvas_satchel" }]);
    useGame.getState().equipFromStash("bag1");
    // Inject an item directly into the bag to simulate "had stuff in it".
    const op = useGame.getState().operative;
    useGame.setState({
      operative: {
        ...op,
        equipment: {
          ...op.equipment,
          bag: {
            ...op.equipment.bag!,
            items: [
              {
                uid: "stashed",
                itemId: "bandage_pack",
                x: 0,
                y: 0,
                rotation: 0,
              },
            ],
          },
        },
      },
    });
    const ok = useGame.getState().unequipToStash("bag");
    expect(ok).toBe(false);
    expect(useGame.getState().operative.equipment.bag).not.toBeNull();
  });

  it("kitFromStash places a stash item into pockets", () => {
    resetStore([{ uid: "u1", itemId: "bandage_pack" }]);
    const ok = useGame.getState().kitFromStash("u1", "pockets", 0, 0, 0);
    expect(ok).toBe(true);
    const s = useGame.getState();
    expect(s.stash.find((x) => x.uid === "u1")).toBeUndefined();
    expect(s.operative.equipment.pockets.items).toHaveLength(1);
    expect(s.operative.equipment.pockets.items[0].uid).toBe("u1");
  });

  it("stashFromKit moves an item from pockets back to stash", () => {
    resetStore([{ uid: "u1", itemId: "bandage_pack" }]);
    useGame.getState().kitFromStash("u1", "pockets", 0, 0, 0);
    const ok = useGame.getState().stashFromKit("u1");
    expect(ok).toBe(true);
    const s = useGame.getState();
    expect(s.stash.find((x) => x.uid === "u1")).toBeDefined();
    expect(s.operative.equipment.pockets.items).toHaveLength(0);
  });
});
