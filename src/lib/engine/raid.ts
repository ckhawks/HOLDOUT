import type {
  CurrentRaid,
  LogEntry,
  PendingChoice,
  RunState,
  StashItem,
} from "@/lib/types";
import { rollEvent } from "@/lib/engine/events";
import { ITEMS, pickItemForLocation } from "@/lib/data/items";
import { LOCATIONS_BY_ID } from "@/lib/data/locations";
import { generateMap, revealFrom, stepForward } from "@/lib/engine/map";

export const TICK_MIN_MS = 3000;
export const TICK_MAX_MS = 8000;
export const PENDING_EXPIRY_MS = 15000;
export const BRANCH_TIMER_MS = 10000;
export const BLEED_MINOR_DRAIN = 1;
export const BLEED_MAJOR_DRAIN = 4;

// pushPending / prunePending retired in the room-contents pivot. Items now
// land directly in the operative's current MapTile.contents and persist
// across visits. See addToTileContents / removeFromTileContents in map.ts.

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
  packGrid: { width: number; height: number },
  rand: () => number,
): CurrentRaid {
  const baseMap = generateMap(rand, LOCATIONS_BY_ID[locationId]);
  // Entry tile starts visited. It has no loot pool so it's never "looted."
  const entryIdx = baseMap.entry.y * baseMap.width + baseMap.entry.x;
  const tiles = baseMap.tiles.slice();
  tiles[entryIdx] = { ...tiles[entryIdx], visited: true };
  // Reveal entry + its orthogonal neighbors (the operative can see what's
  // immediately around them on insertion).
  const map = revealFrom({ ...baseMap, tiles }, baseMap.entry.x, baseMap.entry.y);
  return {
    locationId,
    startedAt: Date.now(),
    runState: {
      alertness: 0,
      health: 100,
      energy: 100,
      ammo: 30,
      depth: 0,
      distanceFromExtract: 0,
      flags: [],
    },
    log: [
      makeLog("system", `Operative inserted at ${locationId}. Comms green.`),
    ],
    pack: [],
    packGrid,
    active: true,
    pendingChoice: null,
    map,
    operativePos: { x: map.entry.x, y: map.entry.y },
    nextStep: stepForward(map, { x: map.entry.x, y: map.entry.y }, rand),
    pausedAt: null,
    // Initial action: push out of the entry. autoPickAction can refine but
    // entry tile has no loot, so move_forward is the natural start.
    queuedAction: "move_forward",
    actionStartedAt: Date.now(),
  };
}

export function bleedDrain(flags: ReadonlyArray<string>): number {
  let d = 0;
  if (flags.includes("bleeding_minor")) d += BLEED_MINOR_DRAIN;
  if (flags.includes("bleeding_major")) d += BLEED_MAJOR_DRAIN;
  return d;
}

export function makeLog(kind: LogEntry["kind"], text: string, itemId?: string): LogEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    text,
    kind,
    itemId,
  };
}

export function nextTickDelay(rand: () => number): number {
  return TICK_MIN_MS + Math.floor(rand() * (TICK_MAX_MS - TICK_MIN_MS));
}

export const ENERGY_BASE_DRAIN = 3;

// tickRaid (legacy random event tick) and resolveBranch retired in the
// action-driven pivot. The store now drives ticks via tickAction, and
// branching modals are dormant until phase 2 reintroduces forced-choice
// interrupts.

// Build a flavor log line for the operative entering a room. Names the
// specific containers and any loose items on the floor so subsequent Loot
// logs and pickup actions match.
export function entranceLog(tile: import("@/lib/types").MapTile): LogEntry {
  const lootHint = (() => {
    if (tile.lootMax === 0) return "";
    if (tile.lootRemaining === 0) return " Already cleared.";
    if (tile.containers.length === 0) return "";
    return ` ${enumerateContainers(tile.containers)} here.`;
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
  return makeLog(
    "flavor",
    `Stepped into the ${tile.name}.${lootHint}${inRoom}`,
    undefined,
  );
}

// Group same-noun containers into "two crates and a footlocker" form.
function enumerateContainers(containers: ReadonlyArray<string>): string {
  const counts = new Map<string, number>();
  for (const c of containers) counts.set(c, (counts.get(c) ?? 0) + 1);
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
const INTERRUPT_CHANCE = 0.22;
const PATROL_TIMER_MS = 10000;

// A patrol encounter — fired as a forced-choice modal when the operative
// runs into hostiles while pushing forward.
function patrolPendingChoice(): PendingChoice {
  return {
    eventId: "spotted_patrol",
    prompt:
      "Movement up ahead — patrol in the next room. They haven't spotted me yet.",
    defaultId: "hide",
    startedAt: Date.now(),
    timerMs: PATROL_TIMER_MS,
    options: [
      {
        id: "engage",
        label: "Engage",
        description: "Open fire. Loud — and they'll fight back.",
        effects: {
          alertnessDelta: 14,
          ammoDelta: -2,
          flagsAdded: ["combat_engaged"],
        },
      },
      {
        id: "hide",
        label: "Hide",
        description: "Hold here. Quiet.",
        effects: { alertnessDelta: -3, energyDelta: -2 },
        isDefault: true,
      },
      {
        id: "reposition",
        label: "Reposition",
        description: "Slip around them. Lane shift, +1 distance.",
        effects: {
          alertnessDelta: 3,
          energyDelta: -3,
          distanceAdvance: 1,
          depthAdvance: 0,
        },
      },
    ],
  };
}

export interface ActionTickResult {
  logs: LogEntry[];
  // Item to add to the current tile's contents (not pending tray).
  droppedItem?: StashItem;
  alertnessDelta: number;
  healthDelta: number;
  energyDelta: number;
  ammoDelta: number;
  flagsAdded: string[];
  flagsRemoved: string[];
  // How the operative should physically step on the map.
  movement: "none" | "forward" | "lateral" | "backward";
  // True if the action consumed one of the tile's loot containers.
  consumedLoot: boolean;
  // Forced-choice modal raised by this action (e.g. patrol encounter on a
  // move). When set, the store sets pendingChoice and the action that
  // would have been applied is suppressed.
  pendingChoice?: PendingChoice;
}

// Resolve one tick by carrying out the queued action on the current raid.
// Pure: returns the result; the store applies it to state.
export function tickAction(raid: CurrentRaid, rand: () => number): ActionTickResult {
  const action = raid.queuedAction;
  const flags = raid.runState.flags;
  const bleed = bleedDrain(flags);

  let healthDelta = -bleed;
  let alertnessDelta = 0;
  let energyDelta = -ENERGY_BASE_DRAIN;
  let ammoDelta = 0;
  const flagsAdded: string[] = [];
  const flagsRemoved: string[] = [];
  let movement: ActionTickResult["movement"] = "none";
  let droppedItem: StashItem | undefined;
  let consumedLoot = false;
  const logs: LogEntry[] = [];

  // Current tile reference for the Loot action.
  const currentTile =
    raid.map.tiles[raid.operativePos.y * raid.map.width + raid.operativePos.x];

  switch (action) {
    case "move_forward": {
      // Pre-gen patrol encounter: if the destination tile holds a threat,
      // freeze in place and pop the forced-choice modal. The operative has
      // already glanced into adjacent tiles via revealFrom, so the threat
      // is on the visible map before they move.
      const dest = raid.nextStep;
      const destTile = dest
        ? raid.map.tiles[dest.y * raid.map.width + dest.x]
        : undefined;
      if (destTile && destTile.threat) {
        return {
          logs: [
            makeLog("flavor", "Hostiles in the next room. Holding.", undefined),
          ],
          alertnessDelta: 0,
          healthDelta: -bleed,
          energyDelta: 0,
          ammoDelta: 0,
          flagsAdded: [],
          flagsRemoved: [],
          movement: "none",
          consumedLoot: false,
          pendingChoice: patrolPendingChoice(),
        };
      }
      movement = "forward";
      break;
    }
    case "loot": {
      if (!currentTile || currentTile.lootRemaining <= 0) {
        logs.push(makeLog("flavor", "Nothing left worth searching here.", undefined));
        break;
      }
      consumedLoot = true;
      energyDelta -= 1;
      const container = currentTile.containers[0] ?? "container";
      const verb = lootVerb(container, rand);
      const article = /^[aeiou]/i.test(container) ? "an" : "a";
      // Each container has a ~70% chance of yielding an item.
      const yields = rand() < 0.7;
      if (yields) {
        const loc = LOCATIONS_BY_ID[raid.locationId];
        const isRare = rand() < 0.08;
        const itemId = loc
          ? pickItemForLocation(rand, loc, isRare, raid.runState.depth)
          : undefined;
        if (itemId) {
          const item = ITEMS[itemId];
          droppedItem = {
            uid: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            itemId,
          };
          logs.push(
            makeLog(
              "loot",
              `${verb} ${article} ${container}. ⟦${item?.name ?? itemId}⟧ inside.`,
              itemId,
            ),
          );
        } else {
          logs.push(
            makeLog("flavor", `${verb} ${article} ${container}. Empty.`, undefined),
          );
        }
      } else {
        logs.push(
          makeLog("flavor", `${verb} ${article} ${container}. Nothing in it.`, undefined),
        );
      }
      break;
    }
    case "stay": {
      alertnessDelta = -3;
      energyDelta = -2;
      logs.push(makeLog("flavor", "Holding position. Listening.", undefined));
      break;
    }
    case "extract_step": {
      // Same threat check as move_forward: the path back may pass through
      // a tile with a hostile, and the operative still has to deal with it.
      const dest = raid.nextStep;
      const destTile = dest
        ? raid.map.tiles[dest.y * raid.map.width + dest.x]
        : undefined;
      if (destTile && destTile.threat) {
        return {
          logs: [
            makeLog("flavor", "Hostiles between me and extract. Holding.", undefined),
          ],
          alertnessDelta: 0,
          healthDelta: -bleed,
          energyDelta: 0,
          ammoDelta: 0,
          flagsAdded: [],
          flagsRemoved: [],
          movement: "none",
          consumedLoot: false,
          pendingChoice: patrolPendingChoice(),
        };
      }
      movement = "backward";
      // No flat "backtracking" log — too repetitive. The entrance flavor in
      // the store covers re-entry into rooms with loot left or items on the
      // floor.
      break;
    }
    case "fight": {
      // Resolve a round of combat. Three outcomes:
      //   - target_down  (~55%): drop loot into current tile, clear combat
      //   - firefight     (~30%): trade fire — HP/ammo cost, possible bleed
      //   - target_fled  (~15%): no loot, alertness up, clear combat
      const r = rand();
      if (r < 0.55) {
        // target_down — pull a loot drop from the current location.
        const loc = LOCATIONS_BY_ID[raid.locationId];
        const itemId = loc
          ? pickItemForLocation(rand, loc, false, raid.runState.depth)
          : undefined;
        if (itemId) {
          const item = ITEMS[itemId];
          droppedItem = {
            uid: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            itemId,
          };
          logs.push(
            makeLog(
              "combat_resolved",
              `Target down. Looted ⟦${item?.name ?? itemId}⟧ off them.`,
              itemId,
            ),
          );
        } else {
          logs.push(makeLog("combat_resolved", "Target down. Nothing on them.", undefined));
        }
        alertnessDelta += 4;
        ammoDelta = -1;
        flagsRemoved.push("combat_engaged");
      } else if (r < 0.85) {
        healthDelta -= 7;
        ammoDelta = -2;
        alertnessDelta += 5;
        if (rand() < 0.25) flagsAdded.push("bleeding_minor");
        logs.push(makeLog("damage", "Trading shots. Took a glancing hit.", undefined));
      } else {
        alertnessDelta += 8;
        ammoDelta = -1;
        flagsRemoved.push("combat_engaged");
        logs.push(
          makeLog(
            "combat_resolved",
            "Target broke contact and ran. Lost them.",
            undefined,
          ),
        );
      }
      break;
    }
    case "flee": {
      // 60% break-contact, 40% they keep on you.
      if (rand() < 0.6) {
        alertnessDelta += 6;
        flagsRemoved.push("combat_engaged");
        logs.push(
          makeLog(
            "combat_resolved",
            "Broke contact — clear of the threat for now.",
            undefined,
          ),
        );
      } else {
        healthDelta -= 5;
        ammoDelta = -1;
        if (rand() < 0.2) flagsAdded.push("bleeding_minor");
        logs.push(
          makeLog(
            "damage",
            "Couldn't break clean. Took a round on the way out.",
            undefined,
          ),
        );
      }
      break;
    }
  }

  // Interrupt layer: small chance per tick of a hazard. Suppressed during
  // extract and combat — those have their own resolution pools.
  const inSubMode =
    action === "extract_step" || action === "fight" || action === "flee";
  if (!inSubMode && rand() < INTERRUPT_CHANCE) {
    if (rand() < 0.45) {
      // took_damage
      healthDelta -= 8;
      energyDelta -= 2;
      const r = rand();
      if (r < 0.6) flagsAdded.push("bleeding_minor");
      else if (r < 0.85) flagsAdded.push("bleeding_major");
      logs.push(makeLog("damage", "Took fire. Plate held — mostly.", undefined));
    } else {
      // heard_voices flavor
      alertnessDelta += 3;
      logs.push(makeLog("flavor", "Voices through the wall. Muffled.", undefined));
    }
  }

  return {
    logs,
    droppedItem,
    alertnessDelta,
    healthDelta,
    energyDelta,
    ammoDelta,
    flagsAdded,
    flagsRemoved,
    movement,
    consumedLoot,
  };
}

export function applyBandage(raid: CurrentRaid): CurrentRaid {
  const idx = raid.pack.findIndex((p) => p.itemId === "bandage_pack");
  if (idx === -1) return raid;
  const hadMinor = raid.runState.flags.includes("bleeding_minor");
  const hadMajor = raid.runState.flags.includes("bleeding_major");
  if (!hadMinor && !hadMajor) return raid;
  const flags = raid.runState.flags.filter(
    (f) => f !== "bleeding_minor" && f !== "bleeding_major",
  );
  return {
    ...raid,
    pack: [...raid.pack.slice(0, idx), ...raid.pack.slice(idx + 1)],
    runState: { ...raid.runState, flags },
    log: [
      ...raid.log,
      makeLog(
        "system",
        hadMajor ? "Bandage applied — bleed under control." : "Bandage applied.",
      ),
    ],
  };
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, n));
}

function applyFlags(
  current: ReadonlyArray<string>,
  add?: ReadonlyArray<string>,
  remove?: ReadonlyArray<string>,
): string[] {
  const set = new Set(current);
  if (add) for (const f of add) set.add(f);
  if (remove) for (const f of remove) set.delete(f);
  return Array.from(set);
}
