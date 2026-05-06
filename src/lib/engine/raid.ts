import type { CurrentRaid, LogEntry, StashItem } from "@/lib/types";
import { rollEvent } from "@/lib/engine/events";

export const TICK_MIN_MS = 5000;
export const TICK_MAX_MS = 15000;

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

export function startRaid(locationId: string): CurrentRaid {
  return {
    locationId,
    startedAt: Date.now(),
    runState: { alertness: 0, health: 100, energy: 100, ammo: 30, depth: 0 },
    log: [
      makeLog("system", `Operative inserted at ${locationId}. Comms green.`),
    ],
    backpack: [],
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
  loot?: StashItem;
  alertnessDelta: number;
  healthDelta: number;
  energyDelta: number;
}

export const ENERGY_BASE_DRAIN = 3;

export function tickRaid(rand: () => number): TickResult {
  const ev = rollEvent(rand);
  let alertnessDelta = 0;
  let healthDelta = 0;
  let energyDelta = -ENERGY_BASE_DRAIN;
  let loot: StashItem | undefined;

  if (ev.kind === "looted_container" || ev.kind === "found_rare") {
    if (ev.itemId) {
      loot = {
        uid: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        itemId: ev.itemId,
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
  };
}
