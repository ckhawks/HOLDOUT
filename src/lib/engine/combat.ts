// Combat revamp — pure round resolver.
//
// Slice 1 introduced multi-round combat (Press only). Slice 2 adds the
// stance system: each round the player picks Press / Suppress /
// Reposition / Disengage. Carry-over effects (Suppress lowers enemy
// accuracy next round; Reposition halves incoming damage next round)
// live on CombatState. Visible odds for each stance come from
// computeStanceOdds — the fairness contract is honest because enemy
// intent is telegraphed, not hidden.
//
// Pure + seedable: all randomness comes in as `rand`. The store is the
// only allowed caller of `Date.now()` / `Math.random()`; tests pass a
// seeded rand and assert deterministic outcomes.

import type {
  CombatState,
  EnemyIntent,
  Equipment,
  LogKind,
  PendingChoice,
  Stance,
} from "@/lib/types";
import { ITEMS } from "@/lib/data/items";
import { getEnemy } from "@/lib/data/enemies";

// Slice 2 — stance-pick PendingChoice timer. Matches the patrol timer
// pattern (BranchModal auto-resolves to defaultId on timeout).
export const STANCE_PICK_TIMER_MS = 10000;

// Fallback stats when the operative has no weapon equipped (bare-fist).
// Deliberately weak so the player feels the lift from equipping anything.
const FIST_DAMAGE = 4;
const FIST_ACCURACY = 0.4;

// Slice 2 — stance tuning. These are first-pass values; expect to retune
// in playtest. The plan's "visible odds" only stays honest if these
// numbers actually match the resolver — keep computeStanceOdds and the
// resolver in lock-step.
const SUPPRESS_DAMAGE_MULT = 0.5;
const SUPPRESS_ACCURACY_DEBUFF = 0.2;
const REPOSITION_COVER_MULT = 0.5;

export interface RoundLogLine {
  kind: LogKind;
  text: string;
}

export interface RoundOutcome {
  // Next combat state, or null when combat ended this round.
  combat: CombatState | null;
  outcome: "ongoing" | "target_down" | "player_down" | "broke_contact";
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
    enemyAccuracyMod: 0,
    playerCoverNextRound: false,
    enemyIntent: rollEnemyIntent(enemy.id, 0),
  };
}

// Slice 2 — telegraphed enemy intent. Slice 1's resolver baked a fixed
// "they shoot back" behavior; with telegraphing the player needs to see
// what the enemy will do this round. For now a Grunt always Presses;
// Slice 3 will roll in archetype variance (Sniper opens, Brawler closes).
function rollEnemyIntent(archetypeId: string, _round: number): EnemyIntent {
  if (archetypeId === "grunt") return "press";
  return "press";
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

// Resolve one round of combat with the player's chosen stance.
//
// Per-stance mechanics:
// - press: full damage attack at base accuracy. Enemy returns fire at
//   their accuracy (modulated by enemyAccuracyMod from prior Suppress).
// - suppress: half damage to enemy; debuffs enemy accuracy on their
//   *next* round (via enemyAccuracyMod carryover).
// - reposition: no offensive output this round; sets cover for next
//   round so incoming damage is halved.
// - disengage: routed to resolveDisengage by the dispatcher; this
//   function does not handle disengage directly.
//
// Round-0 player-initiator gets the free shot (enemy doesn't return
// fire); same rule as Slice 1.
export function resolveCombatRound(
  combat: CombatState,
  equipment: Equipment | null,
  stance: Stance,
  rand: () => number,
): RoundOutcome {
  if (stance === "disengage") {
    // Caller should have routed to resolveDisengage. Treat as Press for
    // defensive safety so combat doesn't get stuck.
    stance = "press";
  }
  const enemy = getEnemy(combat.enemyArchetypeId);
  const player = readPlayerStats(equipment);
  const logs: RoundLogLine[] = [];
  let damageToEnemy = 0;
  let damageToPlayer = 0;

  // Player attack
  if (stance === "reposition") {
    logs.push({
      kind: "flavor",
      text: `Repositioning — moving for cover instead of firing.`,
    });
  } else {
    const playerHit = rand() < player.accuracy;
    if (playerHit) {
      const baseDmg = rollDamage(player.damage, rand);
      damageToEnemy =
        stance === "suppress"
          ? Math.max(1, Math.round(baseDmg * SUPPRESS_DAMAGE_MULT))
          : baseDmg;
      const verb = stance === "suppress" ? "suppressed" : "hit";
      logs.push({
        kind: "damage",
        text: `You ${verb} the ${enemy.name} for ${damageToEnemy}.`,
      });
    } else {
      logs.push({
        kind: "flavor",
        text: `Shot wide on the ${enemy.name}. (${player.weaponName})`,
      });
    }
  }

  const enemyHpAfter = combat.enemyHp - damageToEnemy;
  const enemyDownThisRound = enemyHpAfter <= 0;
  const playerHasInitiative =
    combat.round === 0 && combat.initiator === "player";

  // Enemy attack — skipped on round-0 with player initiative or if the
  // enemy died from this round's damage. Suppress carryover applies to
  // their accuracy *this* round (the carryover was applied to the prior
  // Suppress; consumed here). playerCoverNextRound halves incoming dmg.
  if (!enemyDownThisRound && !playerHasInitiative) {
    const effectiveAccuracy = Math.max(
      0.05,
      enemy.accuracy + combat.enemyAccuracyMod,
    );
    const enemyHit = rand() < effectiveAccuracy;
    if (enemyHit) {
      let dmg = rollDamage((enemy.damageMin + enemy.damageMax) / 2, rand);
      dmg = Math.max(enemy.damageMin, Math.min(enemy.damageMax, dmg));
      if (combat.playerCoverNextRound) {
        dmg = Math.max(1, Math.round(dmg * REPOSITION_COVER_MULT));
      }
      damageToPlayer = dmg;
      const coverNote = combat.playerCoverNextRound ? " (cover held)" : "";
      logs.push({
        kind: "damage",
        text: `${enemy.name} hit you for ${damageToPlayer}${coverNote}.`,
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
      ammoSpent: stance === "reposition" ? 0 : 1,
      heatDelta: stance === "suppress" ? 6 : 4,
      logs,
    };
  }

  // Carryover for the next round: Suppress sets a debuff on enemy
  // accuracy; Reposition sets cover. Always reset cover to false after
  // the round consumes it (or leaves it false). Otherwise lingering
  // bonuses would stack incorrectly.
  const nextAccMod = stance === "suppress" ? -SUPPRESS_ACCURACY_DEBUFF : 0;
  const nextCover = stance === "reposition";

  return {
    combat: {
      ...combat,
      enemyHp: enemyHpAfter,
      round: combat.round + 1,
      enemyAccuracyMod: nextAccMod,
      playerCoverNextRound: nextCover,
      enemyIntent: rollEnemyIntent(combat.enemyArchetypeId, combat.round + 1),
    },
    outcome: "ongoing",
    damageToPlayer,
    damageToEnemy,
    ammoSpent: stance === "reposition" ? 0 : 1,
    heatDelta: stance === "reposition" ? 1 : stance === "suppress" ? 4 : 2,
    logs,
  };
}

// Slice 2 — visible-odds helper for the stance chip UI. Returns the
// honest probabilities for each stance given current combat state +
// equipment, accounting for telegraphed enemy intent. Keep this in lock-
// step with resolveCombatRound — the chip math is the fairness contract
// and lying here means lying to the player.
export interface StanceOdds {
  // 0-100 chance the player lands a hit this round.
  hitPct: number;
  // 0-100 chance the enemy lands a hit this round.
  takeHitPct: number;
  // Rough estimate of rounds to finish at current trajectory.
  estRounds: number;
}

export function computeStanceOdds(
  combat: CombatState,
  equipment: Equipment | null,
  stance: Stance,
): StanceOdds {
  if (stance === "disengage") {
    return {
      hitPct: 0,
      takeHitPct: 0,
      estRounds: 0,
    };
  }
  const enemy = getEnemy(combat.enemyArchetypeId);
  const player = readPlayerStats(equipment);
  const playerHasInitiative =
    combat.round === 0 && combat.initiator === "player";

  const playerAccuracy = stance === "reposition" ? 0 : player.accuracy;
  const enemyEffectiveAccuracy =
    playerHasInitiative
      ? 0
      : Math.max(0.05, enemy.accuracy + combat.enemyAccuracyMod);

  const expectedPlayerDamage =
    stance === "reposition"
      ? 0
      : player.accuracy *
        (stance === "suppress"
          ? player.damage * SUPPRESS_DAMAGE_MULT
          : player.damage);

  const estRounds =
    expectedPlayerDamage > 0
      ? Math.max(1, Math.ceil(combat.enemyHp / expectedPlayerDamage))
      : 99;

  return {
    hitPct: Math.round(playerAccuracy * 100),
    takeHitPct: Math.round(enemyEffectiveAccuracy * 100),
    estRounds,
  };
}

// Slice 1 disengage retained; Slice 2's Disengage stance routes through
// this same Heat-gated roll. Slice 2 adds the disengage success chance
// to the stance odds chip via computeDisengageOdds.
export interface DisengageOutcome {
  combat: CombatState | null;
  success: boolean;
  damageToPlayer: number;
  ammoSpent: number;
  heatDelta: number;
  logs: RoundLogLine[];
}

// Slice 2 — builds a stance_pick PendingChoice the store can raise after
// initCombat and after each non-terminal round. Chips are pre-rendered
// from computed odds so BranchModal can render them as-is (its default
// chip-from-effects derivation doesn't apply to combat).
export function makeStancePickChoice(
  combat: CombatState,
  equipment: Equipment | null,
  heat: number,
  now: number,
): PendingChoice {
  const enemy = getEnemy(combat.enemyArchetypeId);
  const intentLabel: Record<EnemyIntent, string> = {
    press: "Pressing",
    suppress: "Suppressing",
    hold: "Holding",
  };
  const pressOdds = computeStanceOdds(combat, equipment, "press");
  const suppressOdds = computeStanceOdds(combat, equipment, "suppress");
  const repoOdds = computeStanceOdds(combat, equipment, "reposition");
  const disengageOdds = computeDisengageOdds(heat);

  return {
    eventId: "stance_pick",
    prompt: `Engaged: ${enemy.name} — ${intentLabel[combat.enemyIntent]}. HP ${combat.enemyHp}/${combat.enemyHpMax}.`,
    defaultId: "press",
    startedAt: now,
    timerMs: STANCE_PICK_TIMER_MS,
    options: [
      {
        id: "press",
        label: "Press",
        description: `Full attack. ~${pressOdds.estRounds}r to drop.`,
        isDefault: true,
        chips: [
          { text: `${pressOdds.hitPct}% to hit`, tone: "good" },
          { text: `${pressOdds.takeHitPct}% incoming`, tone: "bad" },
        ],
      },
      {
        id: "suppress",
        label: "Suppress",
        description: `Trade damage for control. Their next shot is shakier.`,
        chips: [
          { text: `½ damage`, tone: "neutral" },
          { text: `-${Math.round(SUPPRESS_ACCURACY_DEBUFF * 100)}% them next`, tone: "good" },
          { text: `${suppressOdds.takeHitPct}% incoming`, tone: "bad" },
        ],
      },
      {
        id: "reposition",
        label: "Reposition",
        description: `Don't shoot. Take cover.`,
        chips: [
          { text: `no shot`, tone: "neutral" },
          { text: `½ incoming next`, tone: "good" },
          { text: `${repoOdds.takeHitPct}% incoming`, tone: "bad" },
        ],
      },
      {
        id: "disengage",
        label: "Disengage",
        description: `Break contact.`,
        chips: [
          { text: `${disengageOdds.breakPct}% break`, tone: "good" },
          { text: `fail = parting hit`, tone: "bad" },
        ],
      },
    ],
  };
}

export function computeDisengageOdds(heat: number): { breakPct: number } {
  const heatPenalty = Math.min(0.4, heat / 250);
  const breakChance = Math.max(0.2, 0.6 - heatPenalty);
  return { breakPct: Math.round(breakChance * 100) };
}

export function resolveDisengage(
  combat: CombatState,
  heat: number,
  rand: () => number,
): DisengageOutcome {
  const enemy = getEnemy(combat.enemyArchetypeId);
  const { breakPct } = computeDisengageOdds(heat);
  if (rand() * 100 < breakPct) {
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
  const damage = Math.max(
    enemy.damageMin,
    Math.round((enemy.damageMin + enemy.damageMax) / 2),
  );
  return {
    combat: {
      ...combat,
      round: combat.round + 1,
      enemyAccuracyMod: 0,
      playerCoverNextRound: false,
    },
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
