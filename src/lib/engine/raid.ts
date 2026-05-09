import type { CurrentRaid, LogEntry, PendingItem, RunState } from "@/lib/types";
import { rollEvent } from "@/lib/engine/events";
import { ITEMS } from "@/lib/data/items";

export const TICK_MIN_MS = 3000;
export const TICK_MAX_MS = 8000;
export const PENDING_EXPIRY_MS = 15000;

export function pushPending(raid: CurrentRaid, loot: PendingItem): CurrentRaid {
  const pending = [...raid.pending, loot];
  if (pending.length <= raid.pendingCapacity) {
    return { ...raid, pending };
  }
  const dropped = pending.shift()!;
  const dropName = ITEMS[dropped.itemId]?.name ?? dropped.itemId;
  return {
    ...raid,
    pending,
    log: [
      ...raid.log,
      makeLog("system", `Pending tray full — dropped ⟦${dropName}⟧.`, dropped.itemId),
    ],
  };
}

export function prunePending(raid: CurrentRaid, now: number): CurrentRaid {
  const survivors: PendingItem[] = [];
  const expired: PendingItem[] = [];
  for (const p of raid.pending) {
    if (now - p.arrivedAt >= PENDING_EXPIRY_MS) expired.push(p);
    else survivors.push(p);
  }
  if (expired.length === 0) return raid;
  const newLogs = expired.map((p) => {
    const name = ITEMS[p.itemId]?.name ?? p.itemId;
    return makeLog("system", `Pending expired — dropped ⟦${name}⟧.`, p.itemId);
  });
  return { ...raid, pending: survivors, log: [...raid.log, ...newLogs] };
}

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
  pendingCapacity: number,
): CurrentRaid {
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
    pending: [],
    packGrid,
    pendingCapacity,
    active: true,
  };
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

export interface TickResult {
  log: LogEntry;
  loot?: PendingItem;
  alertnessDelta: number;
  healthDelta: number;
  energyDelta: number;
  depthAdvance: number;
  distanceAdvance: number;
  flagsAdded: string[];
}

export const ENERGY_BASE_DRAIN = 3;

export function tickRaid(
  rand: () => number,
  locationId?: string,
  state?: RunState,
): TickResult {
  const ev = rollEvent(rand, locationId, state);
  let alertnessDelta = 0;
  let healthDelta = 0;
  let energyDelta = -ENERGY_BASE_DRAIN;
  let loot: PendingItem | undefined;

  if (ev.kind === "looted_container" || ev.kind === "found_rare") {
    if (ev.itemId) {
      loot = {
        uid: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        itemId: ev.itemId,
        arrivedAt: Date.now(),
      };
    }
  }
  if (ev.kind === "spotted_patrol") {
    alertnessDelta = 8;
    energyDelta -= 2;
  }
  if (ev.kind === "took_damage") {
    healthDelta = -10;
    energyDelta -= 4;
  }
  if (ev.kind === "heard_voices") alertnessDelta = 3;
  if (ev.kind === "locked_door") energyDelta -= 1;

  return {
    log: makeLog(ev.logKind, ev.text, ev.itemId),
    loot,
    alertnessDelta,
    healthDelta,
    energyDelta,
    depthAdvance: ev.depthAdvance,
    distanceAdvance: ev.distanceAdvance,
    flagsAdded: ev.postconditions ?? [],
  };
}
