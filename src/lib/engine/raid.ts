import type {
  ActionId,
  CurrentRaid,
  Equipment,
  LogEntry,
  PendingChoice,
  StashItem,
} from "@/lib/types";
import { ITEMS, pickItemForLocation } from "@/lib/data/items";
import { LOCATIONS_BY_ID } from "@/lib/data/locations";
import { generateMap, revealFrom, stepForward } from "@/lib/engine/map";
import { makeLogger, makeUid } from "./logging";
import { lootVerb } from "./flavor";

export const TICK_MIN_MS = 3000;
export const TICK_MAX_MS = 8000;
export const BLEED_MINOR_DRAIN = 1;
export const BLEED_MAJOR_DRAIN = 4;

export function makeRng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function startRaid(
  locationId: string,
  equipment: Equipment,
  vitals: { health: number; energy: number; ammo: number },
  rand: () => number,
  now: number,
): CurrentRaid {
  const baseMap = generateMap(rand, LOCATIONS_BY_ID[locationId]);
  // Entry tile starts visited. It has no loot pool so it's never "looted."
  const entryIdx = baseMap.entry.y * baseMap.width + baseMap.entry.x;
  const tiles = baseMap.tiles.slice();
  tiles[entryIdx] = { ...tiles[entryIdx], visited: true };
  // Reveal entry + its orthogonal neighbors (the operative can see what's
  // immediately around them on insertion).
  const map = revealFrom({ ...baseMap, tiles }, baseMap.entry.x, baseMap.entry.y);
  const log = makeLogger(now, rand);
  const locName = LOCATIONS_BY_ID[locationId]?.name ?? locationId;
  return {
    locationId,
    startedAt: now,
    runState: {
      heat: 0,
      health: vitals.health,
      energy: vitals.energy,
      ammo: vitals.ammo,
      depth: 0,
      distanceFromExtract: 0,
      flags: [],
    },
    log: [log("system", `Operative inserted at ${locName}. Comms green.`)],
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
    nextStep: stepForward(map, { x: map.entry.x, y: map.entry.y }, rand),
    pausedAt: null,
    // Initial action: push out of the entry. autoPickAction can refine but
    // entry tile has no loot, so move_forward is the natural start.
    queuedAction: "move_forward",
    actionStartedAt: now,
    pendingEnd: null,
  };
}

export function bleedDrain(flags: ReadonlyArray<string>): number {
  let d = 0;
  if (flags.includes("bleeding_minor")) d += BLEED_MINOR_DRAIN;
  if (flags.includes("bleeding_major")) d += BLEED_MAJOR_DRAIN;
  return d;
}

export function nextTickDelay(rand: () => number): number {
  return TICK_MIN_MS + Math.floor(rand() * (TICK_MAX_MS - TICK_MIN_MS));
}

export const ENERGY_BASE_DRAIN = 3;
// HP loss per tick when energy is at 0. Phase K — gives energy real teeth.
export const EXHAUSTION_DRAIN = 2;

// ---- Action-driven tick ----

export const ACTION_TIMER_MS = 6000;
export const INTERRUPT_CHANCE = 0.22;
export const PATROL_TIMER_MS = 10000;
// Heat → ambush probability per move tick: heat / HEAT_AMBUSH_DIVISOR.
// At heat 100 → 25% ambush per move with the default 400.
export const HEAT_AMBUSH_DIVISOR = 400;

// Per-kg heat tick added on every locomotion tick (move_forward,
// extract_step) — a heavy operative is louder. Tuning lever: bump up to
// punish over-stuffing more, drop to ignore weight. Total carried weight
// is summed via `carriedWeight(equipment)` below; with the default 0.025
// a 40-kg pack adds +1 heat per move (a Stay tick wipes ~8 of these).
//
// 2026-05-10 first cut — likely too weak rather than too strong; expect
// to retune after a few raids of playtest.
export const WEIGHT_HEAT_PER_KG = 0.025;

export function carriedWeight(equipment: import("@/lib/types").Equipment): number {
  let w = 0;
  for (const p of equipment.pockets.items) w += ITEMS[p.itemId]?.weight ?? 0;
  if (equipment.bag) for (const p of equipment.bag.items) w += ITEMS[p.itemId]?.weight ?? 0;
  return w;
}

// A patrol encounter — fired as a forced-choice modal when the operative
// runs into hostiles while pushing forward.
function patrolPendingChoice(now: number): PendingChoice {
  return {
    eventId: "spotted_patrol",
    prompt:
      "Movement up ahead — patrol in the next room. They haven't spotted me yet.",
    defaultId: "hide",
    startedAt: now,
    timerMs: PATROL_TIMER_MS,
    options: [
      {
        id: "engage",
        label: "Engage",
        description: "Open fire. Loud — and they'll fight back.",
        effects: {
          heatDelta: 14,
          ammoDelta: -2,
          flagsAdded: ["combat_engaged"],
        },
      },
      {
        id: "hide",
        label: "Hide",
        description: "Hold here. Quiet.",
        effects: { heatDelta: -3, energyDelta: -2 },
        isDefault: true,
      },
      {
        id: "reposition",
        label: "Reposition",
        description: "Slip around them. Lane shift, +1 distance.",
        effects: {
          heatDelta: 3,
          energyDelta: -3,
          distanceAdvance: 1,
          depthAdvance: 0,
        },
      },
    ],
  };
}

// ─── tickAction helpers ──────────────────────────────────────────────────────
// tickAction was once a 315-line switch with shared closure state. Per the
// ARCH_REVIEW #4 decompose, the per-case work now lives in small handlers
// below; tickAction itself is a thin dispatcher that builds a context, calls
// the handler, and merges the result.

function pick<T>(rand: () => number, pool: readonly T[]): T {
  return pool[Math.floor(rand() * pool.length)];
}

// Flavor pools for repeated log lines. Each pool gets sampled per tick so
// players don't see the same string back-to-back. Keep entries terse and in
// the field-report register — short, present-tense, no editorialising.
const STAY_LINES = [
  "Holding position. Listening.",
  "Tucked in. Listening.",
  "Holding. Watching the corridor.",
  "Crouched down. Eyes up.",
] as const;

const MOVE_FORWARD_THREAT_LINES = [
  "Hostiles in the next room. Holding.",
  "Bodies up ahead. Holding.",
  "Movement in the next room. Stopped short.",
] as const;

const MOVE_FORWARD_HEAT_LINES = [
  "Footsteps closing in — they heard me.",
  "Boots in the corridor. They heard me.",
  "Voices coming up fast. Heard me.",
] as const;

const EXTRACT_THREAT_LINES = [
  "Hostiles between me and extract. Holding.",
  "Patrol on the extract route. Holding.",
  "Bodies in the way out. Stopped short.",
] as const;

const EXTRACT_HEAT_LINES = [
  "They're on me. Tracked the noise.",
  "They caught up. Following the noise.",
  "Tail picked me up on the way out.",
] as const;

const EMPTY_LOOT_LINES = [
  "Nothing left worth searching here.",
  "Already cleared this room.",
  "Picked clean.",
] as const;

const NO_LOCKED_LINES = [
  "Nothing locked here.",
  "No locks on this tile.",
  "Nothing to breach.",
] as const;

// Random environmental damage flavor — fires from the post-action interrupt
// layer. No gunfire here: the operative isn't in combat, so a stray round
// would break the fiction. Hazards are limited to what's plausible while
// pushing through an abandoned facility.
const ENV_DAMAGE_LINES = [
  "Snagged a tripwire. Cut on the leg.",
  "Slipped on debris. Twisted ankle.",
  "Walked into a low pipe in the dark. Head ringing.",
  "Caught a jagged edge. Bleeding.",
  "Old wiring shorted as I passed. Burn on the arm.",
  "Stepped on something sharp. Through the boot sole.",
  "Glass under the boots. Cut deep.",
  "Floor gave under me. Came down hard.",
  "Loose grating shifted. Banged the shin.",
] as const;

const HEARD_VOICES_LINES = [
  "Voices through the wall. Muffled.",
  "Chatter on the other side of the wall.",
  "Someone talking. Can't make it out.",
  "Two of them. Couple of corridors over.",
] as const;

const COMBAT_TARGET_DOWN_EMPTY_LINES = [
  "Target down. Nothing on them.",
  "Dropped them. Empty pockets.",
  "Down. Nothing worth taking.",
] as const;

const COMBAT_TRADE_LINES = [
  "Trading shots. Took a glancing hit.",
  "Trading fire. Caught a graze.",
  "Pinned. Took a hit but held.",
] as const;

const COMBAT_FLED_LINES = [
  "Target broke contact and ran. Lost them.",
  "They bolted. Lost the angle.",
  "Ran for it. Lost them in the next room.",
] as const;

const FLEE_BREAK_LINES = [
  "Broke contact — clear of the threat for now.",
  "Slipped them. Clear for now.",
  "Out of sight. Clear.",
] as const;

const FLEE_HIT_LINES = [
  "Couldn't break clean. Took a round on the way out.",
  "Bad break. Caught one running.",
  "Couldn't shake them. Took a hit.",
] as const;

const EXHAUSTION_LINES = [
  "Running on empty — body's eating itself.",
  "Tank's empty. Burning muscle now.",
  "Empty inside. Body's chewing itself up.",
] as const;

type TickLogger = ReturnType<typeof makeLogger>;

interface TickCtx {
  raid: CurrentRaid;
  rand: () => number;
  now: number;
  log: TickLogger;
  uid: () => string;
  currentTile: import("@/lib/types").MapTile | undefined;
}

// Mutable accumulator that handlers update. tickAction seeds it with bleed +
// exhaustion baselines; each case bumps the relevant fields.
interface DeltaAccum {
  logs: LogEntry[];
  droppedItem?: StashItem;
  heatDelta: number;
  healthDelta: number;
  energyDelta: number;
  ammoDelta: number;
  flagsAdded: string[];
  flagsRemoved: string[];
  movement: "none" | "forward" | "lateral" | "backward";
  consumedLoot: boolean;
  breachedLocked: boolean;
  extractedNow: boolean;
  combatOutcome?: CombatOutcome;
}

export type CombatOutcome =
  | "target_down"
  | "target_fled"
  | "broke_contact"
  | "trade_shots";

// Patrol interrupt — fired both pre-move and pre-extract-step. Pre-gen threat
// tiles are visible to the player on the map; heat-driven ambushes are not.
// Returns a fully-formed ActionTickResult with pendingChoice set, or null if
// no interrupt fires.
function tryPatrolInterrupt(
  ctx: TickCtx,
  bleed: number,
  pools: { heat: readonly string[]; threat: readonly string[] },
): ActionTickResult | null {
  const { raid, rand, now, log } = ctx;
  const dest = raid.nextStep;
  const destTile = dest ? raid.map.tiles[dest.y * raid.map.width + dest.x] : undefined;
  const heatRoll =
    !destTile?.threat && rand() < (raid.runState.heat ?? 0) / HEAT_AMBUSH_DIVISOR;
  if (!(destTile && destTile.threat) && !heatRoll) return null;
  return {
    logs: [log("flavor", pick(rand, heatRoll ? pools.heat : pools.threat), undefined)],
    heatDelta: 0,
    healthDelta: -bleed,
    energyDelta: 0,
    ammoDelta: 0,
    flagsAdded: [],
    flagsRemoved: [],
    movement: "none",
    consumedLoot: false,
    breachedLocked: false,
    extractedNow: false,
    pendingChoice: patrolPendingChoice(now),
  };
}

// Roll one loot drop for the current location. Returns the dropped item
// (caller pushes its own log line wrapping the item name) or null on miss.
// Centralizes the location-aware tier roll used by loot, breach_locked, and
// fight target_down.
function rollLoot(ctx: TickCtx, isRare: boolean): StashItem | null {
  const loc = LOCATIONS_BY_ID[ctx.raid.locationId];
  if (!loc) return null;
  const itemId = pickItemForLocation(ctx.rand, loc, isRare, ctx.raid.runState.depth);
  if (!itemId) return null;
  // Per-instance sell-value multiplier ±15%. Two of the same item from
  // different rolls will sell for slightly different prices. Mirrors the
  // VALUE_MOD_MIN/MAX constants in store/slices/economy.ts; kept inline
  // to avoid an engine→store import.
  const valueMod = 0.85 + ctx.rand() * 0.3;
  return { itemId, uid: ctx.uid(), valueMod };
}

// Per-action handlers. Each mutates the delta accumulator; the patrol-style
// ones can short-circuit by returning an early ActionTickResult.

function handleMoveForward(ctx: TickCtx, d: DeltaAccum, bleed: number): ActionTickResult | void {
  const interrupt = tryPatrolInterrupt(ctx, bleed, {
    heat: MOVE_FORWARD_HEAT_LINES,
    threat: MOVE_FORWARD_THREAT_LINES,
  });
  if (interrupt) return interrupt;
  d.movement = "forward";
}

function handleExtractStep(ctx: TickCtx, d: DeltaAccum, bleed: number): ActionTickResult | void {
  const interrupt = tryPatrolInterrupt(ctx, bleed, {
    heat: EXTRACT_HEAT_LINES,
    threat: EXTRACT_THREAT_LINES,
  });
  if (interrupt) return interrupt;
  d.movement = "backward";
}

function handleExtractNow(ctx: TickCtx, d: DeltaAccum): void {
  d.extractedNow = true;
  d.logs.push(ctx.log("system", "At the extract point. Pulling out.", undefined));
}

function handleStay(ctx: TickCtx, d: DeltaAccum): void {
  d.heatDelta = -8;
  d.energyDelta = -2;
  d.logs.push(ctx.log("flavor", pick(ctx.rand, STAY_LINES), undefined));
}

function handleLootAction(ctx: TickCtx, d: DeltaAccum): void {
  const { currentTile, log, rand } = ctx;
  if (!currentTile || currentTile.lootRemaining <= 0) {
    d.logs.push(log("flavor", pick(rand, EMPTY_LOOT_LINES), undefined));
    return;
  }
  d.consumedLoot = true;
  d.energyDelta -= 1;
  const container = currentTile.containers[0] ?? "container";
  const verb = lootVerb(container, rand);
  const article = /^[aeiou]/i.test(container) ? "an" : "a";
  // Each container has a ~70% chance of yielding an item.
  const yields = rand() < 0.7;
  if (!yields) {
    d.logs.push(log("flavor", `${verb} ${article} ${container}. Nothing in it.`, undefined));
    return;
  }
  const isRare = rand() < 0.08;
  const drop = rollLoot(ctx, isRare);
  if (!drop) {
    d.logs.push(log("flavor", `${verb} ${article} ${container}. Empty.`, undefined));
    return;
  }
  d.droppedItem = drop;
  const item = ITEMS[drop.itemId];
  d.logs.push(
    log("loot", `${verb} ${article} ${container}. ⟦${item?.name ?? drop.itemId}⟧ inside.`, drop.itemId),
  );
}

function handleBreachLocked(ctx: TickCtx, d: DeltaAccum): void {
  const { currentTile, log, rand } = ctx;
  const target = currentTile?.lockedContainers[0];
  if (!target) {
    d.logs.push(log("flavor", pick(rand, NO_LOCKED_LINES), undefined));
    return;
  }
  // Effects baked in: -2 ammo, +14 heat. Loot rolled 30% empty / 50% common
  // / 20% rare. Container is consumed by the store after this tick (it sees
  // the breachedLocked flag in the result).
  d.ammoDelta = -2;
  d.heatDelta = 14;
  d.breachedLocked = true;
  // Roll: 25% empty / 40% common / 35% rare. Locked containers should reward
  // the noise + ammo cost more than a regular looter — bumped from the
  // initial 30/50/20 split. Fast-follow on the backlog: require an
  // explosives item (or a quieter key) to actually pop the lock.
  const r = rand();
  if (r < 0.25) {
    d.logs.push(log("flavor", `Blasted the ${target.name}. Empty inside.`, undefined));
    return;
  }
  const isRare = r >= 0.65;
  const drop = rollLoot(ctx, isRare);
  if (!drop) {
    d.logs.push(log("flavor", `Blasted the ${target.name}. Empty inside.`, undefined));
    return;
  }
  d.droppedItem = drop;
  const item = ITEMS[drop.itemId];
  d.logs.push(
    log("loot", `Blasted the ${target.name}. ⟦${item?.name ?? drop.itemId}⟧ inside.`, drop.itemId),
  );
}

function handleFight(ctx: TickCtx, d: DeltaAccum): void {
  const { rand, log } = ctx;
  // Three outcomes:
  //   - target_down (~55%): drop loot, clear combat
  //   - firefight    (~30%): trade fire — HP/ammo cost, possible bleed
  //   - target_fled (~15%): no loot, heat up, clear combat
  const r = rand();
  if (r < 0.55) {
    const drop = rollLoot(ctx, false);
    if (drop) {
      d.droppedItem = drop;
      const item = ITEMS[drop.itemId];
      d.logs.push(
        log("combat_resolved", `Target down. Looted ⟦${item?.name ?? drop.itemId}⟧ off them.`, drop.itemId),
      );
    } else {
      d.logs.push(log("combat_resolved", pick(rand, COMBAT_TARGET_DOWN_EMPTY_LINES), undefined));
    }
    d.heatDelta += 4;
    d.ammoDelta = -1;
    d.flagsRemoved.push("combat_engaged");
    d.combatOutcome = "target_down";
  } else if (r < 0.85) {
    d.healthDelta -= 7;
    d.ammoDelta = -2;
    d.heatDelta += 5;
    if (rand() < 0.25) d.flagsAdded.push("bleeding_minor");
    d.logs.push(log("damage", pick(rand, COMBAT_TRADE_LINES), undefined));
    d.combatOutcome = "trade_shots";
  } else {
    d.heatDelta += 8;
    d.ammoDelta = -1;
    d.flagsRemoved.push("combat_engaged");
    d.logs.push(log("combat_resolved", pick(rand, COMBAT_FLED_LINES), undefined));
    d.combatOutcome = "target_fled";
  }
}

function handleFlee(ctx: TickCtx, d: DeltaAccum): void {
  const { rand, log } = ctx;
  // 60% break-contact, 40% they keep on you.
  if (rand() < 0.6) {
    d.heatDelta += 6;
    d.flagsRemoved.push("combat_engaged");
    d.logs.push(log("combat_resolved", pick(rand, FLEE_BREAK_LINES), undefined));
    d.combatOutcome = "broke_contact";
  } else {
    d.healthDelta -= 5;
    d.ammoDelta = -1;
    if (rand() < 0.2) d.flagsAdded.push("bleeding_minor");
    d.logs.push(log("damage", pick(rand, FLEE_HIT_LINES), undefined));
    d.combatOutcome = "trade_shots";
  }
}

// Post-action interrupt layer: small chance of an environmental hazard or
// ambient flavor tick. Suppressed during extract and combat — those have
// their own resolution pools. Damage events are environmental only (slips,
// cuts, low pipes, debris) — no random gunfire outside combat, since the
// operative isn't in a firefight.
function maybeInterrupt(ctx: TickCtx, d: DeltaAccum, action: ActionId): void {
  const inSubMode = action === "extract_step" || action === "fight" || action === "flee";
  if (inSubMode) return;
  if (ctx.rand() >= INTERRUPT_CHANCE) return;
  if (ctx.rand() < 0.45) {
    // environmental damage
    d.healthDelta -= 6;
    d.energyDelta -= 2;
    // Lower bleed odds than a firefight: most slips/bumps just hurt. ~35%
    // minor bleed, ~10% major (a deep cut from glass or a tripwire).
    const r = ctx.rand();
    if (r < 0.35) d.flagsAdded.push("bleeding_minor");
    else if (r < 0.45) d.flagsAdded.push("bleeding_major");
    d.logs.push(ctx.log("damage", pick(ctx.rand, ENV_DAMAGE_LINES), undefined));
  } else {
    // heard_voices flavor
    d.heatDelta += 3;
    d.logs.push(ctx.log("flavor", pick(ctx.rand, HEARD_VOICES_LINES), undefined));
  }
}

export interface ActionTickResult {
  logs: LogEntry[];
  // Item to add to the current tile's contents (not pending tray).
  droppedItem?: StashItem;
  heatDelta: number;
  healthDelta: number;
  energyDelta: number;
  ammoDelta: number;
  flagsAdded: string[];
  flagsRemoved: string[];
  // How the operative should physically step on the map.
  movement: "none" | "forward" | "lateral" | "backward";
  // True if the action consumed one of the tile's loot containers.
  consumedLoot: boolean;
  // True if the action consumed one of the tile's locked containers.
  breachedLocked: boolean;
  // True if the operative just executed the "leave" action on the extract
  // tile. The store reads this to schedule a successful raid end.
  extractedNow: boolean;
  // Forced-choice modal raised by this action (e.g. patrol encounter on a
  // move). When set, the store sets pendingChoice and the action that
  // would have been applied is suppressed.
  pendingChoice?: PendingChoice;
  // For after-raid report counters: which combat sub-outcome resolved this
  // tick, if any. Set by handleFight / handleFlee.
  combatOutcome?: CombatOutcome;
}

// Resolve one tick by carrying out the queued action on the current raid.
// Pure: returns the result; the store applies it to state. The per-action
// work lives in handleX helpers above; this function builds the context,
// dispatches, runs the post-action interrupt layer, and returns the merged
// deltas.
export function tickAction(
  raid: CurrentRaid,
  rand: () => number,
  now: number,
): ActionTickResult {
  const action = raid.queuedAction;
  const bleed = bleedDrain(raid.runState.flags);
  // Phase K — exhaustion: when energy is already 0 entering this tick, the
  // operative starves down HP. Pairs with consumables (ration / water /
  // coffee / fuel cell / combat stim) so the player has a way out.
  const exhausted = raid.runState.energy <= 0;

  const ctx: TickCtx = {
    raid,
    rand,
    now,
    log: makeLogger(now, rand),
    uid: () => makeUid(now, rand),
    currentTile: raid.map.tiles[raid.operativePos.y * raid.map.width + raid.operativePos.x],
  };

  const d: DeltaAccum = {
    logs: exhausted ? [ctx.log("damage", pick(rand, EXHAUSTION_LINES), undefined)] : [],
    heatDelta: 0,
    healthDelta: -bleed - (exhausted ? EXHAUSTION_DRAIN : 0),
    energyDelta: -ENERGY_BASE_DRAIN,
    ammoDelta: 0,
    flagsAdded: [],
    flagsRemoved: [],
    movement: "none",
    consumedLoot: false,
    breachedLocked: false,
    extractedNow: false,
  };

  // Dispatch. Patrol-style handlers can short-circuit with a full result
  // (pendingChoice + suppressed deltas).
  let early: ActionTickResult | undefined = undefined;
  switch (action) {
    case "move_forward": early = handleMoveForward(ctx, d, bleed) ?? undefined; break;
    case "extract_step": early = handleExtractStep(ctx, d, bleed) ?? undefined; break;
    case "extract_now": handleExtractNow(ctx, d); break;
    case "stay": handleStay(ctx, d); break;
    case "loot": handleLootAction(ctx, d); break;
    case "breach_locked": handleBreachLocked(ctx, d); break;
    case "fight": handleFight(ctx, d); break;
    case "flee": handleFlee(ctx, d); break;
  }
  if (early) return early;

  // Weight → heat: every locomotion tick adds heat proportional to carried
  // weight. Stationary actions (stay, loot, breach) don't pay this cost —
  // it's specifically about how loud you are while moving.
  if (d.movement !== "none") {
    const w = carriedWeight(raid.equipment);
    const wHeat = Math.round(w * WEIGHT_HEAT_PER_KG);
    if (wHeat > 0) d.heatDelta += wHeat;
  }

  maybeInterrupt(ctx, d, action);

  return {
    logs: d.logs,
    droppedItem: d.droppedItem,
    heatDelta: d.heatDelta,
    healthDelta: d.healthDelta,
    energyDelta: d.energyDelta,
    ammoDelta: d.ammoDelta,
    flagsAdded: d.flagsAdded,
    flagsRemoved: d.flagsRemoved,
    movement: d.movement,
    consumedLoot: d.consumedLoot,
    breachedLocked: d.breachedLocked,
    extractedNow: d.extractedNow,
    combatOutcome: d.combatOutcome,
  };
}
