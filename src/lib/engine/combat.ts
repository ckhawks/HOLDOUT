// Combat-revamp Slice 1 — pure round resolver.
//
// Replaces the one-shot handleFight (~55/30/15 outcome split) with a
// multi-round combat tracked on CurrentRaid.combat. Slice 1 ships
// Press-only (no stance picks yet); the resolver still reads weapon
// stats from the equipped weapon so equipping items has felt impact
// from day one.
//
// Pure + seedable: all randomness comes in as `rand`. The store is the
// only allowed caller of `Date.now()` / `Math.random()`; tests pass a
// seeded rand and assert deterministic outcomes.

import type { CombatState, Equipment, LogKind } from "@/lib/types";
import { ITEMS } from "@/lib/data/items";
import { getEnemy } from "@/lib/data/enemies";

// Fallback stats when the operative has no weapon equipped (bare-fist).
// Deliberately weak so the player feels the lift from equipping anything.
const FIST_DAMAGE = 4;
const FIST_ACCURACY = 0.4;

export interface RoundLogLine {
  kind: LogKind;
  text: string;
}

export interface RoundOutcome {
  // Next combat state, or null when combat ended this round.
  combat: CombatState | null;
  outcome: "ongoing" | "target_down" | "player_down";
  // Damage applied this round, summed for the store to fold into runState.
  damageToPlayer: number;
  damageToEnemy: number;
  ammoSpent: number;
  heatDelta: number;
  logs: RoundLogLine[];
}

export function initCombat(
  spawn: { archetypeId: string },
  initiator: "player" | "enemy",
): CombatState {
  const enemy = getEnemy(spawn.archetypeId);
  return {
    enemyArchetypeId: enemy.id,
    enemyHp: enemy.hp,
    enemyHpMax: enemy.hp,
    round: 0,
    initiator,
  };
}

interface PlayerStats {
  damage: number;
  accuracy: number;
  weaponName: string;
}

function readPlayerStats(equipment: Equipment | null): PlayerStats {
  const weaponSlot = equipment?.weapon ?? null;
  if (!weaponSlot) {
    return { damage: FIST_DAMAGE, accuracy: FIST_ACCURACY, weaponName: "bare hands" };
  }
  const def = ITEMS[weaponSlot.itemId];
  const stats = def?.weaponStats;
  if (!stats) {
    return { damage: FIST_DAMAGE, accuracy: FIST_ACCURACY, weaponName: def?.name ?? "weapon" };
  }
  return {
    damage: stats.baseDamage,
    accuracy: stats.baseAccuracy,
    weaponName: def?.name ?? "weapon",
  };
}

function rollDamage(base: number, rand: () => number): number {
  // ±25% variance, rounded to integer. Keeps individual hits readable.
  const variance = base * 0.25;
  const roll = base + (rand() * 2 - 1) * variance;
  return Math.max(1, Math.round(roll));
}

// Resolve one round of combat. Slice 1 is Press-only (no stance pick).
// On round 0 with the player as initiator, the enemy doesn't fire back —
// the operative got the drop. On all other rounds both sides roll.
export function resolveCombatRound(
  combat: CombatState,
  equipment: Equipment | null,
  rand: () => number,
): RoundOutcome {
  const enemy = getEnemy(combat.enemyArchetypeId);
  const player = readPlayerStats(equipment);
  const logs: RoundLogLine[] = [];
  let damageToEnemy = 0;
  let damageToPlayer = 0;

  // Player attack — Press
  const playerHit = rand() < player.accuracy;
  if (playerHit) {
    damageToEnemy = rollDamage(player.damage, rand);
    logs.push({
      kind: "damage",
      text: `You hit the ${enemy.name} for ${damageToEnemy}.`,
    });
  } else {
    logs.push({
      kind: "flavor",
      text: `Shot wide on the ${enemy.name}. (${player.weaponName})`,
    });
  }

  const enemyHpAfter = combat.enemyHp - damageToEnemy;

  // Enemy attack — skipped if the player got round-0 initiative or the
  // enemy is already down from this round's damage.
  const enemyDownThisRound = enemyHpAfter <= 0;
  const playerHasInitiative =
    combat.round === 0 && combat.initiator === "player";
  if (!enemyDownThisRound && !playerHasInitiative) {
    const enemyHit = rand() < enemy.accuracy;
    if (enemyHit) {
      damageToPlayer = rollDamage(
        (enemy.damageMin + enemy.damageMax) / 2,
        rand,
      );
      // Clamp into the archetype's declared range to keep the variance
      // narrow even when rollDamage's ±25% pushes wider.
      damageToPlayer = Math.max(
        enemy.damageMin,
        Math.min(enemy.damageMax, damageToPlayer),
      );
      logs.push({
        kind: "damage",
        text: `${enemy.name} hit you for ${damageToPlayer}.`,
      });
    } else {
      logs.push({
        kind: "flavor",
        text: `${enemy.name}'s shot went wide.`,
      });
    }
  } else if (playerHasInitiative && !enemyDownThisRound) {
    logs.push({
      kind: "flavor",
      text: `${enemy.name} hasn't drawn yet — you fired first.`,
    });
  }

  if (enemyDownThisRound) {
    logs.push({
      kind: "combat_resolved",
      text: `${enemy.name} down.`,
    });
    return {
      combat: null,
      outcome: "target_down",
      damageToPlayer,
      damageToEnemy,
      ammoSpent: 1,
      heatDelta: 4,
      logs,
    };
  }

  return {
    combat: {
      ...combat,
      enemyHp: enemyHpAfter,
      round: combat.round + 1,
    },
    outcome: "ongoing",
    damageToPlayer,
    damageToEnemy,
    ammoSpent: 1,
    heatDelta: 2,
    logs,
  };
}

// Slice 1's flee — Heat-gated disengage roll. Slice 2 will replace this
// with a proper Disengage stance using distance + Athletics gear.
// Returns combat: null on success (broke contact, raid continues),
// otherwise leaves combat state intact and applies a parting hit.
export interface DisengageOutcome {
  combat: CombatState | null;
  success: boolean;
  damageToPlayer: number;
  ammoSpent: number;
  heatDelta: number;
  logs: RoundLogLine[];
}

export function resolveDisengage(
  combat: CombatState,
  heat: number,
  rand: () => number,
): DisengageOutcome {
  const enemy = getEnemy(combat.enemyArchetypeId);
  // Base 60% break, falling off with heat (high heat = harder to slip).
  const heatPenalty = Math.min(0.4, heat / 250);
  const breakChance = Math.max(0.2, 0.6 - heatPenalty);
  if (rand() < breakChance) {
    return {
      combat: null,
      success: true,
      damageToPlayer: 0,
      ammoSpent: 0,
      heatDelta: 4,
      logs: [
        {
          kind: "combat_resolved",
          text: `Broke contact. Lost the ${enemy.name} in the noise.`,
        },
      ],
    };
  }
  // Failed disengage — parting hit from the enemy.
  const damage = Math.max(
    enemy.damageMin,
    Math.round((enemy.damageMin + enemy.damageMax) / 2),
  );
  return {
    combat: { ...combat, round: combat.round + 1 },
    success: false,
    damageToPlayer: damage,
    ammoSpent: 1,
    heatDelta: 6,
    logs: [
      {
        kind: "damage",
        text: `Tried to slip out — the ${enemy.name} put one in you on the way (${damage}).`,
      },
    ],
  };
}
