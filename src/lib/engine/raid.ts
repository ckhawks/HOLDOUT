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
  return {
    locationId,
    startedAt: now,
    runState: {
      heat: 0,
      health: 100,
      energy: 100,
      ammo: 30,
      depth: 0,
      distanceFromExtract: 0,
      flags: [],
    },
    log: [log("system", `Operative inserted at ${locationId}. Comms green.`)],
    equipment,
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

// Engine purity: id + timestamp come from caller-supplied `now` and `rand`
// so raid logic stays seedable and the wall-clock leak is contained to the
// store. See ARCH_REVIEW item #1 / DESIGN.md "Multiplayer port-readiness."
export function makeUid(now: number, rand: () => number): string {
  return `${now.toString(36)}-${rand().toString(36).slice(2, 8)}`;
}

export function makeLog(
  kind: LogEntry["kind"],
  text: string,
  itemId: string | undefined,
  now: number,
  rand: () => number,
): LogEntry {
  return { id: makeUid(now, rand), timestamp: now, text, kind, itemId };
}

// Closure factory to keep internal call sites short: `const log = makeLogger(now, rand)`
// then `log("flavor", "...")` instead of repeating now/rand at every call.
export function makeLogger(
  now: number,
  rand: () => number,
): (kind: LogEntry["kind"], text: string, itemId?: string) => LogEntry {
  return (kind, text, itemId) => makeLog(kind, text, itemId, now, rand);
}

export function nextTickDelay(rand: () => number): number {
  return TICK_MIN_MS + Math.floor(rand() * (TICK_MAX_MS - TICK_MIN_MS));
}

export const ENERGY_BASE_DRAIN = 3;
// HP loss per tick when energy is at 0. Sprint K — gives energy real teeth.
export const EXHAUSTION_DRAIN = 2;

// Build a flavor log line for the operative entering a room. Names the
// specific containers and any loose items on the floor so subsequent Loot
// logs and pickup actions match.
export function entranceLog(
  tile: import("@/lib/types").MapTile,
  now: number,
  rand: () => number,
): LogEntry {
  const lootHint = (() => {
    if (tile.lootMax === 0 && tile.lockedContainers.length === 0) return "";
    if (tile.lootRemaining === 0 && tile.lockedContainers.length === 0)
      return " Already cleared.";
    const parts: string[] = [];
    if (tile.containers.length > 0) {
      parts.push(`${enumerateContainers(tile.containers)} here`);
    }
    if (tile.lockedContainers.length > 0) {
      const names = tile.lockedContainers.map((c) => c.name);
      parts.push(`${enumerateContainers(names)} — locked`);
    }
    return parts.length > 0 ? ` ${parts.join("; ")}.` : "";
  })();
  const inRoom = (() => {
    if (tile.contents.length === 0) return "";
    if (tile.contents.length === 1) {
      const it = tile.contents[0];
      const name = ITEMS[it.itemId]?.name ?? it.itemId;
      return ` ⟦${name}⟧ on the floor.`;
    }
    if (tile.contents.length === 2) {
      const a = ITEMS[tile.contents[0].itemId]?.name ?? tile.contents[0].itemId;
      const b = ITEMS[tile.contents[1].itemId]?.name ?? tile.contents[1].itemId;
      return ` ⟦${a}⟧ and ⟦${b}⟧ on the floor.`;
    }
    return ` ${tile.contents.length} items on the floor.`;
  })();
  return makeLogger(now, rand)(
    "flavor",
    `Stepped into the ${tile.name}.${lootHint}${inRoom}`,
  );
}

// Group same-noun container names into "two crates and a footlocker" form.
function enumerateContainers(names: ReadonlyArray<string>): string {
  const counts = new Map<string, number>();
  for (const c of names) counts.set(c, (counts.get(c) ?? 0) + 1);
  const parts = Array.from(counts.entries()).map(([noun, n]) => pluralize(noun, n));
  if (parts.length === 0) return "";
  if (parts.length === 1) return capitalize(parts[0]);
  if (parts.length === 2) return capitalize(`${parts[0]} and ${parts[1]}`);
  const head = parts.slice(0, -1).join(", ");
  return capitalize(`${head}, and ${parts[parts.length - 1]}`);
}

function pluralize(noun: string, n: number): string {
  if (n === 1) return /^[aeiou]/i.test(noun) ? `an ${noun}` : `a ${noun}`;
  // Simple pluralization that works for our pool.
  const word =
    NUMBER_WORDS[n] ?? `${n}`;
  // crude pluralization: add -s, except for "shelf" → "shelves" and
  // "filing cabinet" / "tool chest" / "junction box" / "spare parts bin"
  // / "monitor cluster" / "supply crate" — most just take -s. Box → boxes.
  const plural = noun.endsWith("box")
    ? noun.replace(/box$/, "boxes")
    : noun === "shelf"
      ? "shelves"
      : `${noun}s`;
  return `${word} ${plural}`;
}

const NUMBER_WORDS: Record<number, string> = {
  2: "two",
  3: "three",
  4: "four",
  5: "five",
};

function capitalize(s: string): string {
  return s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// Verb pool per container type, used by the Loot action. Picks one variant
// per call so successive Loot ticks vary their phrasing.
function lootVerb(container: string, rand: () => number): string {
  const pool = LOOT_VERBS[container] ?? LOOT_VERBS_DEFAULT;
  return pool[Math.floor(rand() * pool.length)];
}

const LOOT_VERBS_DEFAULT = ["Searched", "Pried open", "Pulled apart"];

const LOOT_VERBS: Record<string, string[]> = {
  crate: ["Pried open", "Cracked open", "Tipped over"],
  "supply crate": ["Pried open", "Cracked open", "Cut into"],
  footlocker: ["Cracked open", "Tipped", "Pried into"],
  locker: ["Cracked open", "Forced", "Snapped the lock on"],
  shelf: ["Searched", "Swept", "Cleared"],
  duffel: ["Rummaged through", "Tossed", "Unzipped"],
  desk: ["Tossed", "Pulled apart", "Searched"],
  "filing cabinet": ["Pulled open", "Rifled through", "Forced"],
  drawer: ["Pulled open", "Rifled through"],
  "monitor cluster": ["Sifted through", "Searched"],
  "tool chest": ["Tipped open", "Cracked into", "Forced open"],
  "junction box": ["Pried back", "Cracked into", "Forced open"],
  "spare parts bin": ["Tipped over", "Sifted through"],
  panel: ["Pried back", "Forced", "Pulled aside"],
};

// ---- Action-driven tick ----

export const ACTION_TIMER_MS = 6000;
export const INTERRUPT_CHANCE = 0.22;
export const PATROL_TIMER_MS = 10000;
// Heat → ambush probability per move tick: heat / HEAT_AMBUSH_DIVISOR.
// At heat 100 → 25% ambush per move with the default 400.
export const HEAT_AMBUSH_DIVISOR = 400;

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
}

// Patrol interrupt — fired both pre-move and pre-extract-step. Pre-gen threat
// tiles are visible to the player on the map; heat-driven ambushes are not.
// Returns a fully-formed ActionTickResult with pendingChoice set, or null if
// no interrupt fires.
function tryPatrolInterrupt(
  ctx: TickCtx,
  bleed: number,
  modeText: { heat: string; threat: string },
): ActionTickResult | null {
  const { raid, rand, now, log } = ctx;
  const dest = raid.nextStep;
  const destTile = dest ? raid.map.tiles[dest.y * raid.map.width + dest.x] : undefined;
  const heatRoll =
    !destTile?.threat && rand() < (raid.runState.heat ?? 0) / HEAT_AMBUSH_DIVISOR;
  if (!(destTile && destTile.threat) && !heatRoll) return null;
  return {
    logs: [log("flavor", heatRoll ? modeText.heat : modeText.threat, undefined)],
    heatDelta: 0,
    healthDelta: -bleed,
    energyDelta: 0,
    ammoDelta: 0,
    flagsAdded: [],
    flagsRemoved: [],
    movement: "none",
    consumedLoot: false,
    breachedLocked: false,
    pendingChoice: patrolPendingChoice(now),
  };
}

// Roll one loot drop for the current location. Returns the dropped item
// (caller pushes its own log line wrapping the item name) or null on miss.
// Centralizes the location-aware tier roll used by loot, breach_locked, and
// fight target_down.
function rollLoot(ctx: TickCtx, isRare: boolean): { itemId: string; uid: string } | null {
  const loc = LOCATIONS_BY_ID[ctx.raid.locationId];
  if (!loc) return null;
  const itemId = pickItemForLocation(ctx.rand, loc, isRare, ctx.raid.runState.depth);
  if (!itemId) return null;
  return { itemId, uid: ctx.uid() };
}

// Per-action handlers. Each mutates the delta accumulator; the patrol-style
// ones can short-circuit by returning an early ActionTickResult.

function handleMoveForward(ctx: TickCtx, d: DeltaAccum, bleed: number): ActionTickResult | void {
  const interrupt = tryPatrolInterrupt(ctx, bleed, {
    heat: "Footsteps closing in — they heard me.",
    threat: "Hostiles in the next room. Holding.",
  });
  if (interrupt) return interrupt;
  d.movement = "forward";
}

function handleExtractStep(ctx: TickCtx, d: DeltaAccum, bleed: number): ActionTickResult | void {
  const interrupt = tryPatrolInterrupt(ctx, bleed, {
    heat: "Caught up to. They tracked the noise.",
    threat: "Hostiles between me and extract. Holding.",
  });
  if (interrupt) return interrupt;
  d.movement = "backward";
}

function handleStay(_ctx: TickCtx, d: DeltaAccum): void {
  d.heatDelta = -8;
  d.energyDelta = -2;
  d.logs.push(_ctx.log("flavor", "Holding position. Listening.", undefined));
}

function handleLootAction(ctx: TickCtx, d: DeltaAccum): void {
  const { currentTile, log, rand } = ctx;
  if (!currentTile || currentTile.lootRemaining <= 0) {
    d.logs.push(log("flavor", "Nothing left worth searching here.", undefined));
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
    d.logs.push(log("flavor", "Nothing locked here.", undefined));
    return;
  }
  // Effects baked in: -2 ammo, +14 heat. Loot rolled 30% empty / 50% common
  // / 20% rare. Container is consumed by the store after this tick (it sees
  // the breachedLocked flag in the result).
  d.ammoDelta = -2;
  d.heatDelta = 14;
  d.breachedLocked = true;
  const r = rand();
  if (r < 0.3) {
    d.logs.push(log("flavor", `Blasted the ${target.name}. Empty inside.`, undefined));
    return;
  }
  const isRare = r >= 0.8;
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
      d.logs.push(log("combat_resolved", "Target down. Nothing on them.", undefined));
    }
    d.heatDelta += 4;
    d.ammoDelta = -1;
    d.flagsRemoved.push("combat_engaged");
  } else if (r < 0.85) {
    d.healthDelta -= 7;
    d.ammoDelta = -2;
    d.heatDelta += 5;
    if (rand() < 0.25) d.flagsAdded.push("bleeding_minor");
    d.logs.push(log("damage", "Trading shots. Took a glancing hit.", undefined));
  } else {
    d.heatDelta += 8;
    d.ammoDelta = -1;
    d.flagsRemoved.push("combat_engaged");
    d.logs.push(log("combat_resolved", "Target broke contact and ran. Lost them.", undefined));
  }
}

function handleFlee(ctx: TickCtx, d: DeltaAccum): void {
  const { rand, log } = ctx;
  // 60% break-contact, 40% they keep on you.
  if (rand() < 0.6) {
    d.heatDelta += 6;
    d.flagsRemoved.push("combat_engaged");
    d.logs.push(log("combat_resolved", "Broke contact — clear of the threat for now.", undefined));
  } else {
    d.healthDelta -= 5;
    d.ammoDelta = -1;
    if (rand() < 0.2) d.flagsAdded.push("bleeding_minor");
    d.logs.push(log("damage", "Couldn't break clean. Took a round on the way out.", undefined));
  }
}

// Post-action interrupt layer: small chance of a hazard. Suppressed during
// extract and combat — those have their own resolution pools.
function maybeInterrupt(ctx: TickCtx, d: DeltaAccum, action: ActionId): void {
  const inSubMode = action === "extract_step" || action === "fight" || action === "flee";
  if (inSubMode) return;
  if (ctx.rand() >= INTERRUPT_CHANCE) return;
  if (ctx.rand() < 0.45) {
    // took_damage
    d.healthDelta -= 8;
    d.energyDelta -= 2;
    const r = ctx.rand();
    if (r < 0.6) d.flagsAdded.push("bleeding_minor");
    else if (r < 0.85) d.flagsAdded.push("bleeding_major");
    d.logs.push(ctx.log("damage", "Took fire. Plate held — mostly.", undefined));
  } else {
    // heard_voices flavor
    d.heatDelta += 3;
    d.logs.push(ctx.log("flavor", "Voices through the wall. Muffled.", undefined));
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
  // Forced-choice modal raised by this action (e.g. patrol encounter on a
  // move). When set, the store sets pendingChoice and the action that
  // would have been applied is suppressed.
  pendingChoice?: PendingChoice;
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
  // Sprint K — exhaustion: when energy is already 0 entering this tick, the
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
    logs: exhausted ? [ctx.log("damage", "Running on empty — body's eating itself.", undefined)] : [],
    heatDelta: 0,
    healthDelta: -bleed - (exhausted ? EXHAUSTION_DRAIN : 0),
    energyDelta: -ENERGY_BASE_DRAIN,
    ammoDelta: 0,
    flagsAdded: [],
    flagsRemoved: [],
    movement: "none",
    consumedLoot: false,
    breachedLocked: false,
  };

  // Dispatch. Patrol-style handlers can short-circuit with a full result
  // (pendingChoice + suppressed deltas).
  let early: ActionTickResult | undefined = undefined;
  switch (action) {
    case "move_forward": early = handleMoveForward(ctx, d, bleed) ?? undefined; break;
    case "extract_step": early = handleExtractStep(ctx, d, bleed) ?? undefined; break;
    case "stay": handleStay(ctx, d); break;
    case "loot": handleLootAction(ctx, d); break;
    case "breach_locked": handleBreachLocked(ctx, d); break;
    case "fight": handleFight(ctx, d); break;
    case "flee": handleFlee(ctx, d); break;
  }
  if (early) return early;

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
  };
}

// Consumable effects table. Items not in this map can't be consumed (the
// store action no-ops). Bandage stays bleed-only via applyBandage; nano_clot
// is the panic-pop that does both HP + bleed clear.
//
// Per the medical-ladder design in BACKLOG: cheap antiseptic for top-off,
// med syrette for mid-game, nano-clot for emergencies. Energy items map to
// Sprint K's hunger/thirst loop.
export interface ConsumableEffect {
  hp?: number;
  energy?: number;
  clearBleed?: boolean;
  log?: string;
}

export const CONSUMABLE_EFFECTS: Record<string, ConsumableEffect> = {
  antiseptic_vial: { hp: 10, log: "Patched up. +10 HP." },
  med_syrette: { hp: 30, log: "Med syrette injected. +30 HP." },
  nano_clot: { hp: 60, clearBleed: true, log: "Nano-clot fired. +60 HP, bleed clamped." },
  ration_pack: { energy: 30, log: "Ration down. +30 energy." },
  water_bulb: { energy: 15, log: "Water down. +15 energy." },
  coffee_can: { energy: 25, log: "Coffee. +25 energy." },
  fuel_cell: { energy: 40, log: "Fuel cell tapped. +40 energy." },
  combat_stim: { energy: 30, log: "Combat stim. +30 energy." },
};

export function applyConsumable(
  raid: CurrentRaid,
  uid: string,
  now: number,
  rand: () => number,
): CurrentRaid {
  // Find the item by uid in pockets first, then bag.
  const eq = raid.equipment;
  const pocketIdx = eq.pockets.items.findIndex((p) => p.uid === uid);
  const bagIdx =
    pocketIdx === -1 && eq.bag ? eq.bag.items.findIndex((p) => p.uid === uid) : -1;
  if (pocketIdx === -1 && bagIdx === -1) return raid;
  const placement =
    pocketIdx !== -1 ? eq.pockets.items[pocketIdx] : eq.bag!.items[bagIdx];
  const effect = CONSUMABLE_EFFECTS[placement.itemId];
  if (!effect) return raid;

  const equipment: Equipment =
    pocketIdx !== -1
      ? {
          ...eq,
          pockets: {
            ...eq.pockets,
            items: [
              ...eq.pockets.items.slice(0, pocketIdx),
              ...eq.pockets.items.slice(pocketIdx + 1),
            ],
          },
        }
      : {
          ...eq,
          bag: eq.bag
            ? {
                ...eq.bag,
                items: [
                  ...eq.bag.items.slice(0, bagIdx),
                  ...eq.bag.items.slice(bagIdx + 1),
                ],
              }
            : null,
        };

  let flags = raid.runState.flags;
  if (effect.clearBleed) {
    flags = flags.filter((f) => f !== "bleeding_minor" && f !== "bleeding_major");
  }
  const health = Math.max(
    0,
    Math.min(100, raid.runState.health + (effect.hp ?? 0)),
  );
  const energy = Math.max(
    0,
    Math.min(100, raid.runState.energy + (effect.energy ?? 0)),
  );

  return {
    ...raid,
    equipment,
    runState: { ...raid.runState, health, energy, flags },
    log: [
      ...raid.log,
      makeLogger(now, rand)("system", effect.log ?? "Consumed."),
    ],
  };
}

export function applyBandage(
  raid: CurrentRaid,
  now: number,
  rand: () => number,
): CurrentRaid {
  const hadMinor = raid.runState.flags.includes("bleeding_minor");
  const hadMajor = raid.runState.flags.includes("bleeding_major");
  if (!hadMinor && !hadMajor) return raid;
  // Pull a bandage from pockets first (closer to hand), then bag.
  const eq = raid.equipment;
  const pocketIdx = eq.pockets.items.findIndex((p) => p.itemId === "bandage_pack");
  const bagIdx =
    pocketIdx === -1 && eq.bag
      ? eq.bag.items.findIndex((p) => p.itemId === "bandage_pack")
      : -1;
  if (pocketIdx === -1 && bagIdx === -1) return raid;
  const flags = raid.runState.flags.filter(
    (f) => f !== "bleeding_minor" && f !== "bleeding_major",
  );
  const equipment: Equipment =
    pocketIdx !== -1
      ? {
          ...eq,
          pockets: {
            ...eq.pockets,
            items: [
              ...eq.pockets.items.slice(0, pocketIdx),
              ...eq.pockets.items.slice(pocketIdx + 1),
            ],
          },
        }
      : {
          ...eq,
          bag: eq.bag
            ? {
                ...eq.bag,
                items: [
                  ...eq.bag.items.slice(0, bagIdx),
                  ...eq.bag.items.slice(bagIdx + 1),
                ],
              }
            : null,
        };
  return {
    ...raid,
    equipment,
    runState: { ...raid.runState, flags },
    log: [
      ...raid.log,
      makeLogger(now, rand)(
        "system",
        hadMajor ? "Bandage applied — bleed under control." : "Bandage applied.",
      ),
    ],
  };
}

