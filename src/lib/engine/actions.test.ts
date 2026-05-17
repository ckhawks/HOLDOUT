import { describe, expect, it } from "vitest";
import { ACTIONS, autoPickAction } from "./actions";
import { generateMap } from "./map";
import { makeRng, tickAction } from "./raid";
import { applyConsumable } from "./consumables";
import type { CurrentRaid, MapTile, PackPlacement, RunState } from "@/lib/types";

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
  const equipment = {
    pockets: { grid: { width: 4, height: 4 }, items: [] },
    bag: null,
    rig: null,
    weapon: null,
    armor: null,
    helmet: null,
  };
  return {
    locationId: "warehouse",
    startedAt: 0,
    runState: freshRunState(),
    log: [],
    equipment,
    startingEquipment: equipment,
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
    active: true,
    pendingChoice: null,
    map,
    operativePos: { x: map.entry.x, y: map.entry.y },
    nextStep: null,
    pausedAt: null,
    queuedAction: "move_forward",
    actionStartedAt: 0,
    pendingEnd: null,
    combat: null,
    ...over,
  };
}

// Combat-revamp Slice 1: helper for tests that need to seed an active
// combat. Mirrors the shape of initCombat output but lets the test pin
// HP for predictable outcomes.
function activeCombat(over: Partial<CurrentRaid["combat"] & object> = {}) {
  return {
    enemyArchetypeId: "grunt",
    enemyHp: 20,
    enemyHpMax: 20,
    round: 0,
    initiator: "player" as const,
    ...over,
  };
}

describe("autoPickAction", () => {
  it("picks extract_step when extracting flag is set and operative is away from entry", () => {
    const baseMap = generateMap(makeRng(1));
    const offEntry = baseMap.tiles.find(
      (t) => t.type !== "entry" && !t.blocked,
    );
    if (!offEntry) throw new Error("seed produced no off-entry tile");
    const raid = makeRaid({
      map: baseMap,
      operativePos: { x: offEntry.x, y: offEntry.y },
      runState: freshRunState({ flags: ["extracting"], distanceFromExtract: 5 }),
    });
    expect(autoPickAction(raid)).toBe("extract_step");
  });

  it("picks extract_now when extracting and standing on the entry tile", () => {
    const raid = makeRaid({
      runState: freshRunState({ flags: ["extracting"], distanceFromExtract: 0 }),
    });
    expect(autoPickAction(raid)).toBe("extract_now");
  });

  it("does NOT auto-pick extract_now when on entry tile but not extracting", () => {
    const raid = makeRaid();
    expect(autoPickAction(raid)).not.toBe("extract_now");
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
    const result = tickAction(raid, makeRng(1), 0);
    expect(result.movement).toBe("forward");
  });

  it("stay returns movement: none and reduces heat", () => {
    const raid = makeRaid({ queuedAction: "stay" });
    const result = tickAction(raid, makeRng(1), 0);
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
      const result = tickAction(raid, makeRng(seed), 0);
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
      const result = tickAction(raid, makeRng(seed), 0);
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
    const result = tickAction(raid, makeRng(1), 0);
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
    const result = tickAction(raid, makeRng(1), 0);
    expect(result.consumedLoot).toBe(false);
    expect(result.droppedItem).toBeUndefined();
  });
});

describe("combat sub-mode", () => {
  it("autoPickAction returns 'stay' when raid.combat is active (modal owns combat)", () => {
    const raid = makeRaid({ combat: activeCombat() });
    // Slice 2: combat is driven entirely by the stance_pick pendingChoice
    // modal. The action card / autoPicker stays out of the way and is
    // shadowed by the modal — engine tests for fight/flee resolution
    // live in combat.test.ts instead.
    expect(autoPickAction(raid)).toBe("stay");
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
    const result = tickAction(raid, makeRng(1), 0);
    // Combat-revamp follow-up: walking into a threat tile no longer
    // raises a forced-choice modal — it commits the move and initializes
    // combat with the player as round-0 initiator. The stance picker is
    // raised by the store after applying the tick.
    expect(result.pendingChoice).toBeUndefined();
    expect(result.movement).toBe("forward");
    expect(result.combatNext).toBeDefined();
    expect(result.combatNext?.initiator).toBe("player");
  });

  it("at high heat, move_forward into a clean tile sometimes ambushes (enemy initiator)", () => {
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
    // enemy-initiator combat starts via combatNext.
    let ambushes = 0;
    for (let seed = 1; seed < 200; seed++) {
      const result = tickAction(raid, makeRng(seed), 0);
      if (result.combatNext && result.combatNext.initiator === "enemy") {
        ambushes++;
      }
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
      const result = tickAction(raid, makeRng(seed), 0);
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

describe("exhaustion (Phase K)", () => {
  it("at energy 0, tickAction drains HP via the exhaustion penalty", () => {
    const raid = makeRaid({
      runState: freshRunState({ energy: 0 }),
      queuedAction: "stay",
    });
    const result = tickAction(raid, makeRng(1), 0);
    // Bleed is zero (no flags), so any negative healthDelta comes from exhaustion.
    expect(result.healthDelta).toBeLessThan(0);
  });

  it("at energy > 0, no exhaustion drain (only bleed if any)", () => {
    const raid = makeRaid({
      runState: freshRunState({ energy: 50 }),
      queuedAction: "stay",
    });
    const result = tickAction(raid, makeRng(1), 0);
    // Vitest distinguishes +0 from -0; check the absolute value instead.
    expect(Math.abs(result.healthDelta)).toBe(0);
  });

  it("logs an exhaustion warning when at energy 0", () => {
    const raid = makeRaid({
      runState: freshRunState({ energy: 0 }),
      queuedAction: "stay",
    });
    const result = tickAction(raid, makeRng(1), 0);
    const exhaustLog = result.logs.find((l) => l.text.toLowerCase().includes("empty"));
    expect(exhaustLog).toBeDefined();
  });
});

describe("applyConsumable", () => {
  function packed(itemId: string, uid = "u1"): PackPlacement {
    return { uid, itemId, x: 0, y: 0, rotation: 0 };
  }

  it("antiseptic_vial restores +10 HP and consumes the item", () => {
    const raid = makeRaid({
      runState: freshRunState({ health: 50 }),
      equipment: {
        pockets: { grid: { width: 4, height: 4 }, items: [packed("antiseptic_vial", "u1")] },
        bag: null,
        rig: null,
        weapon: null,
        armor: null,
        helmet: null,
      },
    });
    const next = applyConsumable(raid, "u1", 0, makeRng(1));
    expect(next.runState.health).toBe(60);
    expect(next.equipment.pockets.items).toHaveLength(0);
  });

  it("med_syrette restores +30 HP, clamped at 100", () => {
    const raid = makeRaid({
      runState: freshRunState({ health: 90 }),
      equipment: {
        pockets: { grid: { width: 4, height: 4 }, items: [packed("med_syrette", "u1")] },
        bag: null,
        rig: null,
        weapon: null,
        armor: null,
        helmet: null,
      },
    });
    const next = applyConsumable(raid, "u1", 0, makeRng(1));
    expect(next.runState.health).toBe(100);
  });

  it("nano_clot restores +60 HP AND clears all bleeds", () => {
    const raid = makeRaid({
      runState: freshRunState({
        health: 20,
        flags: ["bleeding_minor", "bleeding_major"],
      }),
      equipment: {
        pockets: { grid: { width: 4, height: 4 }, items: [packed("nano_clot", "u1")] },
        bag: null,
        rig: null,
        weapon: null,
        armor: null,
        helmet: null,
      },
    });
    const next = applyConsumable(raid, "u1", 0, makeRng(1));
    expect(next.runState.health).toBe(80);
    expect(next.runState.flags).not.toContain("bleeding_minor");
    expect(next.runState.flags).not.toContain("bleeding_major");
  });

  it("ration_pack restores +30 energy, clamped at 100", () => {
    const raid = makeRaid({
      runState: freshRunState({ energy: 80 }),
      equipment: {
        pockets: { grid: { width: 4, height: 4 }, items: [packed("ration_pack", "u1")] },
        bag: null,
        rig: null,
        weapon: null,
        armor: null,
        helmet: null,
      },
    });
    const next = applyConsumable(raid, "u1", 0, makeRng(1));
    expect(next.runState.energy).toBe(100);
  });

  it("noops on unknown uid", () => {
    const raid = makeRaid();
    const next = applyConsumable(raid, "does-not-exist", 0, makeRng(1));
    expect(next).toBe(raid);
  });

  it("bandage with no bleed is a no-op (would-help guard saves the bandage)", () => {
    const raid = makeRaid({
      equipment: {
        pockets: { grid: { width: 4, height: 4 }, items: [packed("bandage_pack", "u1")] },
        bag: null,
        rig: null,
        weapon: null,
        armor: null,
        helmet: null,
      },
    });
    const next = applyConsumable(raid, "u1", 0, makeRng(1));
    expect(next).toBe(raid);
    expect(next.equipment.pockets.items).toHaveLength(1);
  });

  it("bandage with bleed clears the bleed and consumes the item", () => {
    const raid = makeRaid({
      runState: freshRunState({ flags: ["bleeding_minor"] }),
      equipment: {
        pockets: { grid: { width: 4, height: 4 }, items: [packed("bandage_pack", "u1")] },
        bag: null,
        rig: null,
        weapon: null,
        armor: null,
        helmet: null,
      },
    });
    const next = applyConsumable(raid, "u1", 0, makeRng(1));
    expect(next.runState.flags).not.toContain("bleeding_minor");
    expect(next.equipment.pockets.items).toHaveLength(0);
  });

  it("syrette at full HP no-ops (would-help guard prevents waste)", () => {
    const raid = makeRaid({
      runState: freshRunState({ health: 100 }),
      equipment: {
        pockets: { grid: { width: 4, height: 4 }, items: [packed("med_syrette", "u1")] },
        bag: null,
        rig: null,
        weapon: null,
        armor: null,
        helmet: null,
      },
    });
    const next = applyConsumable(raid, "u1", 0, makeRng(1));
    expect(next).toBe(raid);
    expect(next.equipment.pockets.items).toHaveLength(1);
  });

  it("ration at full energy no-ops (would-help guard)", () => {
    const raid = makeRaid({
      runState: freshRunState({ energy: 100 }),
      equipment: {
        pockets: { grid: { width: 4, height: 4 }, items: [packed("ration_pack", "u1")] },
        bag: null,
        rig: null,
        weapon: null,
        armor: null,
        helmet: null,
      },
    });
    const next = applyConsumable(raid, "u1", 0, makeRng(1));
    expect(next).toBe(raid);
  });

  it("noops on uid that maps to an item not in CONSUMABLE_EFFECTS", () => {
    const raid = makeRaid({
      equipment: {
        pockets: { grid: { width: 4, height: 4 }, items: [packed("scrap_metal", "u1")] },
        bag: null,
        rig: null,
        weapon: null,
        armor: null,
        helmet: null,
      },
    });
    const next = applyConsumable(raid, "u1", 0, makeRng(1));
    expect(next).toBe(raid);
  });

  it("pulls from bag if not in pockets", () => {
    const raid = makeRaid({
      runState: freshRunState({ health: 50 }),
      equipment: {
        pockets: { grid: { width: 4, height: 4 }, items: [] },
        bag: {
          slot: { uid: "bag", itemId: "canvas_satchel" },
          sections: [
            {
              id: "main",
              label: "Main",
              grid: { width: 4, height: 4 },
              items: [packed("antiseptic_vial", "u1")],
            },
          ],
        },
        rig: null,
        weapon: null,
        armor: null,
        helmet: null,
      },
    });
    const next = applyConsumable(raid, "u1", 0, makeRng(1));
    expect(next.runState.health).toBe(60);
    expect(next.equipment.bag?.sections[0].items).toHaveLength(0);
  });
});
