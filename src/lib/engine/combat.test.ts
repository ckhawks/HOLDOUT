import { describe, expect, it } from "vitest";
import type { CombatState, Equipment } from "@/lib/types";
import { makeRng } from "./raid";
import {
  initCombat,
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
    const a = resolveCombatRound(combat, bareEquipment(), makeRng(42));
    const b = resolveCombatRound(combat, bareEquipment(), makeRng(42));
    expect(a.damageToEnemy).toBe(b.damageToEnemy);
    expect(a.damageToPlayer).toBe(b.damageToPlayer);
    expect(a.outcome).toBe(b.outcome);
  });

  it("on round-0 with player initiator, the enemy doesn't return fire", () => {
    // Sweep seeds — on round 0 player-initiated, damageToPlayer must be 0.
    for (let seed = 1; seed < 50; seed++) {
      const combat = initCombat({ archetypeId: "grunt" }, "player");
      const r = resolveCombatRound(combat, bareEquipment(), makeRng(seed));
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
      const r = resolveCombatRound(state, bareEquipment(), rand);
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
          const r = resolveCombatRound(state, equipment, rand);
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
