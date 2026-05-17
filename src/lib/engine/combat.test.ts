import { describe, expect, it } from "vitest";
import type { CombatState, Equipment } from "@/lib/types";
import { makeRng } from "./raid";
import {
  computeStanceOdds,
  initCombat,
  makeStancePickChoice,
  resolveCombatRound,
  resolveDisengage,
} from "./combat";

function bareEquipment(): Equipment {
  return {
    pockets: { grid: { width: 6, height: 1 }, items: [] },
    bag: null,
    rig: null,
    weapon: null,
    armor: null,
    helmet: null,
  };
}

function armedEquipment(weaponId: string): Equipment {
  return {
    ...bareEquipment(),
    weapon: { uid: "w1", itemId: weaponId },
  };
}

describe("initCombat", () => {
  it("seeds enemy HP and round from the catalog", () => {
    const state = initCombat({ archetypeId: "grunt" }, "player");
    expect(state.enemyArchetypeId).toBe("grunt");
    expect(state.enemyHp).toBe(20);
    expect(state.enemyHpMax).toBe(20);
    expect(state.round).toBe(0);
    expect(state.initiator).toBe("player");
  });

  it("falls back to grunt for unknown archetype ids", () => {
    const state = initCombat({ archetypeId: "doesnt_exist" }, "enemy");
    expect(state.enemyHpMax).toBe(20);
  });
});

describe("resolveCombatRound — Slice 1 Press behavior", () => {
  it("deterministic with the same seed", () => {
    const combat = initCombat({ archetypeId: "grunt" }, "player");
    const a = resolveCombatRound(combat, bareEquipment(), "press", makeRng(42));
    const b = resolveCombatRound(combat, bareEquipment(), "press", makeRng(42));
    expect(a.damageToEnemy).toBe(b.damageToEnemy);
    expect(a.damageToPlayer).toBe(b.damageToPlayer);
    expect(a.outcome).toBe(b.outcome);
  });

  it("on round-0 with player initiator, the enemy doesn't return fire", () => {
    // Sweep seeds — on round 0 player-initiated, damageToPlayer must be 0.
    for (let seed = 1; seed < 50; seed++) {
      const combat = initCombat({ archetypeId: "grunt" }, "player");
      const r = resolveCombatRound(combat, bareEquipment(), "press", makeRng(seed));
      expect(r.damageToPlayer).toBe(0);
    }
  });

  it("ends combat (combat === null) when enemy HP drops to 0", () => {
    // Use a 1-HP enemy so any landed hit drops them.
    const combat: CombatState = {
      enemyArchetypeId: "grunt",
      enemyHp: 1,
      enemyHpMax: 20,
      round: 0,
      initiator: "player",
    };
    let downs = 0;
    for (let seed = 1; seed < 50; seed++) {
      const r = resolveCombatRound(
        combat,
        armedEquipment("worn_carbine"),
        "press",
        makeRng(seed),
      );
      if (r.outcome === "target_down" && r.combat === null) downs++;
    }
    // Worn Carbine has 60% accuracy; across 49 seeds we expect a clean
    // majority to land the hit.
    expect(downs).toBeGreaterThan(20);
  });

  it("increments round number while combat continues", () => {
    const combat = initCombat({ archetypeId: "grunt" }, "player");
    let state: CombatState | null = combat;
    let rounds = 0;
    const rand = makeRng(7);
    while (state && rounds < 4) {
      const r = resolveCombatRound(state, bareEquipment(), "press", rand);
      if (r.combat) expect(r.combat.round).toBe(state.round + 1);
      state = r.combat;
      rounds++;
    }
  });

  it("armed operative (worn_carbine) kills a Grunt faster than bare hands", () => {
    function avgRoundsToKill(equipment: Equipment): number {
      let total = 0;
      let runs = 0;
      for (let seed = 1; seed < 60; seed++) {
        let state: CombatState | null = initCombat(
          { archetypeId: "grunt" },
          "player",
        );
        const rand = makeRng(seed);
        let rounds = 0;
        while (state && rounds < 25) {
          const r = resolveCombatRound(state, equipment, "press", rand);
          state = r.combat;
          rounds++;
          if (!state) break;
        }
        if (rounds < 25) {
          total += rounds;
          runs++;
        }
      }
      return runs ? total / runs : Infinity;
    }
    const bare = avgRoundsToKill(bareEquipment());
    const armed = avgRoundsToKill(armedEquipment("worn_carbine"));
    expect(armed).toBeLessThan(bare);
  });
});

describe("resolveCombatRound — Slice 2 stance system", () => {
  it("Suppress deals less damage than Press but sets next-round enemy debuff", () => {
    // Same RNG seed for both stances; Suppress must do <= Press damage
    // and the next-round combat state must carry enemyAccuracyMod < 0.
    const combat = initCombat({ archetypeId: "grunt" }, "player");
    const equipment = armedEquipment("worn_carbine");
    const press = resolveCombatRound(combat, equipment, "press", makeRng(5));
    const suppress = resolveCombatRound(combat, equipment, "suppress", makeRng(5));
    if (press.combat && suppress.combat) {
      expect(suppress.damageToEnemy).toBeLessThanOrEqual(press.damageToEnemy);
      expect(suppress.combat.enemyAccuracyMod).toBeLessThan(0);
      expect(press.combat.enemyAccuracyMod).toBe(0);
    }
  });

  it("Reposition deals no damage but sets cover for the next round", () => {
    const combat = initCombat({ archetypeId: "grunt" }, "player");
    const r = resolveCombatRound(combat, bareEquipment(), "reposition", makeRng(3));
    expect(r.damageToEnemy).toBe(0);
    if (r.combat) {
      expect(r.combat.playerCoverNextRound).toBe(true);
    }
  });

  it("cover halves incoming damage on the following round", () => {
    // Force round 1 (no player initiative). Compare an enemy hit with
    // and without cover at the same RNG seed.
    function hitDamageWithCover(cover: boolean): number {
      const combat: CombatState = {
        enemyArchetypeId: "grunt",
        enemyHp: 20,
        enemyHpMax: 20,
        round: 2,
        initiator: "player",
        enemyAccuracyMod: 0,
        playerCoverNextRound: cover,
        enemyIntent: "press",
      };
      // Sweep seeds and average; cover should drop the mean.
      let total = 0;
      let runs = 0;
      for (let seed = 1; seed < 80; seed++) {
        const r = resolveCombatRound(combat, bareEquipment(), "press", makeRng(seed));
        if (r.damageToPlayer > 0) {
          total += r.damageToPlayer;
          runs++;
        }
      }
      return runs ? total / runs : 0;
    }
    const withCover = hitDamageWithCover(true);
    const noCover = hitDamageWithCover(false);
    expect(withCover).toBeLessThan(noCover);
  });
});

describe("computeStanceOdds", () => {
  it("Press hit% matches weapon accuracy when player has no carryover", () => {
    const combat = initCombat({ archetypeId: "grunt" }, "player");
    const odds = computeStanceOdds(combat, armedEquipment("worn_carbine"), "press");
    // worn_carbine baseAccuracy = 0.6
    expect(odds.hitPct).toBe(60);
  });

  it("Reposition hit% is 0 (no shot)", () => {
    const combat = initCombat({ archetypeId: "grunt" }, "player");
    const odds = computeStanceOdds(combat, armedEquipment("worn_carbine"), "reposition");
    expect(odds.hitPct).toBe(0);
  });

  it("round-0 player-initiator: takeHit% is 0 (free shot)", () => {
    const combat = initCombat({ archetypeId: "grunt" }, "player");
    const odds = computeStanceOdds(combat, bareEquipment(), "press");
    expect(odds.takeHitPct).toBe(0);
  });
});

describe("makeStancePickChoice", () => {
  it("produces 4 stance options with the correct ids", () => {
    const combat = initCombat({ archetypeId: "grunt" }, "player");
    const choice = makeStancePickChoice(combat, bareEquipment(), 0, 1000);
    expect(choice.eventId).toBe("stance_pick");
    expect(choice.defaultId).toBe("press");
    expect(choice.options.map((o) => o.id)).toEqual([
      "press",
      "suppress",
      "reposition",
      "disengage",
    ]);
  });

  it("each option carries pre-rendered chips (no BranchEffects)", () => {
    const combat = initCombat({ archetypeId: "grunt" }, "player");
    const choice = makeStancePickChoice(combat, bareEquipment(), 0, 1000);
    for (const opt of choice.options) {
      expect(opt.chips).toBeDefined();
      expect((opt.chips ?? []).length).toBeGreaterThan(0);
      expect(opt.effects).toBeUndefined();
    }
  });
});

describe("resolveDisengage — Slice 1 Heat-gated break", () => {
  it("deterministic with the same seed", () => {
    const combat = initCombat({ archetypeId: "grunt" }, "player");
    const a = resolveDisengage(combat, 30, makeRng(11));
    const b = resolveDisengage(combat, 30, makeRng(11));
    expect(a.success).toBe(b.success);
    expect(a.damageToPlayer).toBe(b.damageToPlayer);
  });

  it("break-contact rate falls with rising heat", () => {
    function breakRate(heat: number): number {
      const combat = initCombat({ archetypeId: "grunt" }, "player");
      let breaks = 0;
      for (let seed = 1; seed < 200; seed++) {
        const r = resolveDisengage(combat, heat, makeRng(seed));
        if (r.success) breaks++;
      }
      return breaks / 200;
    }
    const lowHeat = breakRate(0);
    const highHeat = breakRate(100);
    expect(lowHeat).toBeGreaterThan(highHeat);
  });

  it("on success clears combat (combat === null)", () => {
    const combat = initCombat({ archetypeId: "grunt" }, "player");
    let cleared = 0;
    for (let seed = 1; seed < 100; seed++) {
      const r = resolveDisengage(combat, 0, makeRng(seed));
      if (r.success) {
        expect(r.combat).toBeNull();
        cleared++;
      }
    }
    expect(cleared).toBeGreaterThan(40);
  });
});
