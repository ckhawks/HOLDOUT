import { describe, expect, it } from "vitest";
import { ACTIONS, autoPickAction } from "./actions";
import { generateMap } from "./map";
import { makeRng, tickAction } from "./raid";
import type { CurrentRaid, MapTile, RunState } from "@/lib/types";

function freshRunState(over: Partial<RunState> = {}): RunState {
  return {
    heat: 50,
    health: 100,
    energy: 100,
    ammo: 30,
    depth: 0,
    distanceFromExtract: 0,
    flags: [],
    ...over,
  };
}

function makeRaid(over: Partial<CurrentRaid> = {}): CurrentRaid {
  const map = generateMap(makeRng(1));
  return {
    locationId: "warehouse",
    startedAt: 0,
    runState: freshRunState(),
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
    map,
    operativePos: { x: map.entry.x, y: map.entry.y },
    nextStep: null,
    pausedAt: null,
    queuedAction: "move_forward",
    actionStartedAt: 0,
    ...over,
  };
}

describe("autoPickAction", () => {
  it("picks extract_step when extracting flag is set", () => {
    const raid = makeRaid({
      runState: freshRunState({ flags: ["extracting"], distanceFromExtract: 5 }),
    });
    expect(autoPickAction(raid)).toBe("extract_step");
  });

  it("picks loot when current tile has loot remaining", () => {
    const baseMap = generateMap(makeRng(1));
    const target = baseMap.tiles.find(
      (t) => t.type !== "entry" && !t.blocked && t.lootRemaining > 0,
    );
    if (!target) return; // seed-dependent; skip if none
    const raid = makeRaid({
      map: baseMap,
      operativePos: { x: target.x, y: target.y },
    });
    expect(autoPickAction(raid)).toBe("loot");
  });

  it("picks move_forward when standing on the entry tile (no loot here)", () => {
    const raid = makeRaid();
    expect(autoPickAction(raid)).toBe("move_forward");
  });

  it("picks move_forward when current tile has no loot remaining", () => {
    const baseMap = generateMap(makeRng(1));
    const target = baseMap.tiles.find(
      (t) => t.type !== "entry" && !t.blocked,
    )!;
    const looted: MapTile = { ...target, lootRemaining: 0 };
    const tiles = baseMap.tiles.slice();
    tiles[target.y * baseMap.width + target.x] = looted;
    const raid = makeRaid({
      map: { ...baseMap, tiles },
      operativePos: { x: target.x, y: target.y },
    });
    expect(autoPickAction(raid)).toBe("move_forward");
  });
});

describe("tickAction movement", () => {
  it("move_forward returns movement: forward", () => {
    const raid = makeRaid({ queuedAction: "move_forward" });
    const result = tickAction(raid, makeRng(1));
    expect(result.movement).toBe("forward");
  });

  it("stay returns movement: none and reduces heat", () => {
    const raid = makeRaid({ queuedAction: "stay" });
    const result = tickAction(raid, makeRng(1));
    expect(result.movement).toBe("none");
    expect(result.heatDelta).toBeLessThan(0);
  });

  it("extract_step returns movement: backward and skips interrupts", () => {
    const raid = makeRaid({
      queuedAction: "extract_step",
      // heat=0 so the heat-driven ambush roll never fires.
      runState: freshRunState({ heat: 0, flags: ["extracting"], distanceFromExtract: 3 }),
    });
    for (let seed = 1; seed < 50; seed++) {
      const result = tickAction(raid, makeRng(seed));
      expect(result.movement).toBe("backward");
    }
  });
});

describe("tickAction loot", () => {
  it("loot consumes a loot container and may drop an item into the room", () => {
    const baseMap = generateMap(makeRng(1));
    const target = baseMap.tiles.find(
      (t) => t.type !== "entry" && !t.blocked && t.lootRemaining >= 2,
    );
    if (!target) return;
    const raid = makeRaid({
      map: baseMap,
      operativePos: { x: target.x, y: target.y },
      queuedAction: "loot",
    });
    let drops = 0;
    for (let seed = 1; seed < 50; seed++) {
      const result = tickAction(raid, makeRng(seed));
      expect(result.consumedLoot).toBe(true);
      if (result.droppedItem) drops++;
    }
    expect(drops).toBeGreaterThan(0);
  });

  it("breach_locked resolves directly, consumes a locked container, costs ammo", () => {
    const baseMap = generateMap(makeRng(1));
    const target = baseMap.tiles.find(
      (t) => t.type !== "entry" && !t.blocked,
    )!;
    const tiles = baseMap.tiles.slice();
    tiles[target.y * baseMap.width + target.x] = {
      ...target,
      lockedContainers: [{ name: "wall safe", keyType: "keycard" }],
    };
    const raid = makeRaid({
      map: { ...baseMap, tiles },
      operativePos: { x: target.x, y: target.y },
      queuedAction: "breach_locked",
    });
    const result = tickAction(raid, makeRng(1));
    expect(result.pendingChoice).toBeUndefined();
    expect(result.breachedLocked).toBe(true);
    expect(result.ammoDelta).toBe(-2);
    expect(result.heatDelta).toBe(14);
  });

  it("loot on an empty room logs 'nothing left' and doesn't consume", () => {
    const baseMap = generateMap(makeRng(1));
    const target = baseMap.tiles.find(
      (t) => t.type !== "entry" && !t.blocked,
    )!;
    const tiles = baseMap.tiles.slice();
    tiles[target.y * baseMap.width + target.x] = { ...target, lootRemaining: 0 };
    const raid = makeRaid({
      map: { ...baseMap, tiles },
      operativePos: { x: target.x, y: target.y },
      queuedAction: "loot",
    });
    const result = tickAction(raid, makeRng(1));
    expect(result.consumedLoot).toBe(false);
    expect(result.droppedItem).toBeUndefined();
  });
});

describe("combat sub-mode", () => {
  it("autoPickAction picks fight when combat_engaged is set", () => {
    const raid = makeRaid({
      runState: freshRunState({ flags: ["combat_engaged"] }),
    });
    expect(autoPickAction(raid)).toBe("fight");
  });

  it("fight resolves to one of three outcomes (target_down / firefight / fled)", () => {
    const raid = makeRaid({
      queuedAction: "fight",
      runState: freshRunState({ flags: ["combat_engaged"] }),
    });
    let downs = 0;
    let firefights = 0;
    let fleds = 0;
    for (let seed = 1; seed < 200; seed++) {
      const result = tickAction(raid, makeRng(seed));
      const cleared = result.flagsRemoved.includes("combat_engaged");
      if (cleared && result.droppedItem) downs++;
      else if (cleared) fleds++;
      else firefights++;
    }
    // Loose bounds — all three should fire.
    expect(downs).toBeGreaterThan(20);
    expect(firefights).toBeGreaterThan(20);
    expect(fleds).toBeGreaterThan(5);
  });

  it("flee resolves to break-contact (clears flag) or failed flee (HP loss)", () => {
    const raid = makeRaid({
      queuedAction: "flee",
      runState: freshRunState({ flags: ["combat_engaged"] }),
    });
    let breaks = 0;
    let fails = 0;
    for (let seed = 1; seed < 200; seed++) {
      const result = tickAction(raid, makeRng(seed));
      if (result.flagsRemoved.includes("combat_engaged")) breaks++;
      else fails++;
    }
    expect(breaks).toBeGreaterThan(50);
    expect(fails).toBeGreaterThan(20);
  });

  it("move_forward raises a patrol pendingChoice when destination tile has a threat", () => {
    const baseMap = generateMap(makeRng(1));
    // Place a threat on the tile right of entry by mutating the tile array.
    const entry = baseMap.entry;
    const dest = { x: entry.x + 1, y: entry.y };
    const tiles = baseMap.tiles.slice();
    const idx = dest.y * baseMap.width + dest.x;
    tiles[idx] = { ...tiles[idx], threat: true };
    const raid = makeRaid({
      map: { ...baseMap, tiles },
      operativePos: { x: entry.x, y: entry.y },
      nextStep: dest,
      queuedAction: "move_forward",
    });
    const result = tickAction(raid, makeRng(1));
    expect(result.pendingChoice).toBeDefined();
    expect(result.movement).toBe("none");
    const ids = result.pendingChoice!.options.map((o) => o.id);
    expect(ids).toContain("engage");
    expect(ids).toContain("hide");
  });

  it("at high heat, move_forward into a clean tile sometimes raises an ambush patrol", () => {
    const baseMap = generateMap(makeRng(1));
    const entry = baseMap.entry;
    const dest = { x: entry.x + 1, y: entry.y };
    const tiles = baseMap.tiles.slice();
    const idx = dest.y * baseMap.width + dest.x;
    tiles[idx] = { ...tiles[idx], threat: false };
    const raid = makeRaid({
      map: { ...baseMap, tiles },
      operativePos: { x: entry.x, y: entry.y },
      nextStep: dest,
      queuedAction: "move_forward",
      runState: freshRunState({ heat: 100 }),
    });
    // heat=100 → 25% per tick. Across 200 seeds we should see plenty of
    // ambushes.
    let ambushes = 0;
    for (let seed = 1; seed < 200; seed++) {
      const result = tickAction(raid, makeRng(seed));
      if (result.pendingChoice) ambushes++;
    }
    expect(ambushes).toBeGreaterThan(20);
  });

  it("move_forward into a clean tile (heat=0) does not raise a patrol", () => {
    const baseMap = generateMap(makeRng(1));
    const entry = baseMap.entry;
    const dest = { x: entry.x + 1, y: entry.y };
    const tiles = baseMap.tiles.slice();
    const idx = dest.y * baseMap.width + dest.x;
    tiles[idx] = { ...tiles[idx], threat: false };
    const raid = makeRaid({
      map: { ...baseMap, tiles },
      operativePos: { x: entry.x, y: entry.y },
      nextStep: dest,
      queuedAction: "move_forward",
      runState: freshRunState({ heat: 0 }),
    });
    // Run many seeds — none should raise pendingChoice on a clean dest at
    // heat=0 (heat-driven ambush probability is 0).
    for (let seed = 1; seed < 50; seed++) {
      const result = tickAction(raid, makeRng(seed));
      expect(result.pendingChoice).toBeUndefined();
      expect(result.movement).toBe("forward");
    }
  });
});

describe("ACTIONS eligibility", () => {
  it("loot is ineligible on entry tile", () => {
    const raid = makeRaid();
    expect(ACTIONS.loot.isEligible(raid)).toBe(false);
  });

  it("extract_step only eligible when extracting", () => {
    expect(ACTIONS.extract_step.isEligible(makeRaid())).toBe(false);
    expect(
      ACTIONS.extract_step.isEligible(
        makeRaid({ runState: freshRunState({ flags: ["extracting"] }) }),
      ),
    ).toBe(true);
  });
});
