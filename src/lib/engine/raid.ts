import type {
  CurrentRaid,
  LogEntry,
  PendingItem,
  PendingChoice,
  RunState,
} from "@/lib/types";
import { rollEvent } from "@/lib/engine/events";
import { ITEMS, pickItemForLocation } from "@/lib/data/items";
import { LOCATIONS_BY_ID } from "@/lib/data/locations";

export const TICK_MIN_MS = 3000;
export const TICK_MAX_MS = 8000;
export const PENDING_EXPIRY_MS = 15000;
export const BRANCH_TIMER_MS = 10000;
export const BLEED_MINOR_DRAIN = 1;
export const BLEED_MAJOR_DRAIN = 4;

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
    pendingChoice: null,
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

export interface TickResult {
  log: LogEntry;
  loot?: PendingItem;
  alertnessDelta: number;
  healthDelta: number;
  energyDelta: number;
  ammoDelta: number;
  depthAdvance: number;
  distanceAdvance: number;
  flagsAdded: string[];
  flagsRemoved: string[];
  pendingChoice: PendingChoice | null;
}

export const ENERGY_BASE_DRAIN = 3;

export function tickRaid(
  rand: () => number,
  locationId?: string,
  state?: RunState,
): TickResult {
  const ev = rollEvent(rand, locationId, state);
  const flags = state?.flags ?? [];
  const bleed = bleedDrain(flags);

  // Branching event: emit a prompt log + pendingChoice. No stat deltas yet —
  // those are applied at resolve time. Tick advance is also deferred so depth
  // doesn't move until the player decides.
  if (ev.branches && ev.branches.length > 0) {
    const def = ev.branches.find((b) => b.isDefault) ?? ev.branches[0];
    return {
      log: makeLog("choice", ev.text, ev.itemId),
      alertnessDelta: 0,
      healthDelta: -bleed,
      energyDelta: 0,
      ammoDelta: 0,
      depthAdvance: 0,
      distanceAdvance: 0,
      flagsAdded: [],
      flagsRemoved: [],
      pendingChoice: {
        eventId: ev.kind,
        prompt: ev.text,
        options: ev.branches,
        defaultId: def.id,
        startedAt: Date.now(),
        timerMs: ev.branchTimerMs ?? BRANCH_TIMER_MS,
      },
    };
  }

  const fx = ev.passiveEffects ?? {};
  const alertnessDelta = fx.alertnessDelta ?? 0;
  const healthDelta = (fx.healthDelta ?? 0) - bleed;
  const energyDelta = -ENERGY_BASE_DRAIN + (fx.energyDelta ?? 0);
  const ammoDelta = fx.ammoDelta ?? 0;

  let loot: PendingItem | undefined;
  if (ev.itemId) {
    loot = {
      uid: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      itemId: ev.itemId,
      arrivedAt: Date.now(),
    };
  }

  return {
    log: makeLog(ev.logKind, ev.text, ev.itemId),
    loot,
    alertnessDelta,
    healthDelta,
    energyDelta,
    ammoDelta,
    depthAdvance: ev.depthAdvance,
    distanceAdvance: ev.distanceAdvance,
    flagsAdded: ev.postconditions ?? [],
    flagsRemoved: ev.removeFlags ?? [],
    pendingChoice: null,
  };
}

export interface ResolveResult {
  raid: CurrentRaid;
  loot?: PendingItem;
}

export function resolveBranch(
  raid: CurrentRaid,
  choiceId: string,
  rand: () => number,
): ResolveResult {
  if (!raid.pendingChoice) return { raid };
  const choice =
    raid.pendingChoice.options.find((o) => o.id === choiceId) ??
    raid.pendingChoice.options.find((o) => o.id === raid.pendingChoice!.defaultId) ??
    raid.pendingChoice.options[0];
  const fx = choice.effects ?? {};

  const rs = raid.runState;
  const nextFlags = applyFlags(rs.flags, fx.flagsAdded, fx.flagsRemoved);

  const nextRunState: RunState = {
    ...rs,
    alertness: clamp(rs.alertness + (fx.alertnessDelta ?? 0)),
    health: clamp(rs.health + (fx.healthDelta ?? 0)),
    energy: clamp(rs.energy + (fx.energyDelta ?? 0)),
    ammo: Math.max(0, rs.ammo + (fx.ammoDelta ?? 0)),
    depth: rs.depth + (fx.depthAdvance ?? 1),
    distanceFromExtract: Math.max(0, rs.distanceFromExtract + (fx.distanceAdvance ?? 1)),
    flags: nextFlags,
  };

  let loot: PendingItem | undefined;
  if (fx.rollLoot) {
    const loc = LOCATIONS_BY_ID[raid.locationId];
    const isRare = fx.rollLoot === "rare";
    const itemId = loc
      ? pickItemForLocation(rand, loc, isRare, nextRunState.depth)
      : undefined;
    if (itemId) {
      loot = {
        uid: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        itemId,
        arrivedAt: Date.now(),
      };
    }
  }

  const choiceLog = makeLog("choice_result", choice.label, undefined);
  let next: CurrentRaid = {
    ...raid,
    runState: nextRunState,
    pendingChoice: null,
    log: [...raid.log, choiceLog],
  };
  if (loot) {
    next = pushPending(next, loot);
    const item = ITEMS[loot.itemId];
    if (item) {
      next = {
        ...next,
        log: [
          ...next.log,
          makeLog("loot", `Picked up ⟦${item.name}⟧.`, loot.itemId),
        ],
      };
    }
  }
  return { raid: next, loot };
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
