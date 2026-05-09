import { EVENTS, EVENTS_BY_ID } from "@/lib/data/events";
import { pickVocab } from "@/lib/data/vocab";
import { ITEMS, pickCommonItemId, pickItemForLocation, pickRareItemId } from "@/lib/data/items";
import { LOCATIONS_BY_ID } from "@/lib/data/locations";
import type { EventKind, LogEntry, RaidEventDef, RunState } from "@/lib/types";

export function pickEvent(
  rand: () => number,
  state?: RunState,
  events: ReadonlyArray<RaidEventDef> = EVENTS,
): RaidEventDef {
  const pool = state
    ? events.filter((e) => !e.preconditions || e.preconditions(state))
    : events;
  const eligible = pool.length > 0 ? pool : events;
  const total = eligible.reduce((s, e) => s + e.weight, 0);
  let r = rand() * total;
  for (const e of eligible) {
    r -= e.weight;
    if (r <= 0) return e;
  }
  return eligible[0];
}

export interface RolledEvent {
  kind: EventKind;
  text: string;
  itemId?: string;
  logKind: LogEntry["kind"];
  postconditions?: string[];
  depthAdvance: number;
  distanceAdvance: number;
}

export function rollEvent(
  rand: () => number,
  locationId?: string,
  state?: RunState,
): RolledEvent {
  const def = pickEvent(rand, state);
  const tpl = def.templates[Math.floor(rand() * def.templates.length)];
  const location = locationId ? LOCATIONS_BY_ID[locationId] : undefined;

  const depth = state?.depth ?? 0;
  let itemId: string | undefined;
  if (def.id === "looted_container") {
    itemId = location ? pickItemForLocation(rand, location, false, depth) : pickCommonItemId(rand, depth);
  } else if (def.id === "found_rare") {
    itemId = location ? pickItemForLocation(rand, location, true, depth) : pickRareItemId(rand);
  }

  const text = tpl
    .replace(/\{location\}/g, pickVocab("locations", rand))
    .replace(/\{brand\}/g, pickVocab("brands", rand))
    .replace(/\{adj\}/g, pickVocab("item_adjectives", rand))
    .replace(/\{npc\}/g, pickVocab("npc_names", rand))
    .replace(/\{condition\}/g, pickVocab("conditions", rand))
    .replace(/\{item\}/g, itemId ? `⟦${ITEMS[itemId].name}⟧` : "something");

  return {
    kind: def.id,
    text,
    itemId,
    logKind: def.kind,
    postconditions: def.postconditions,
    depthAdvance: def.depthAdvance ?? 1,
    distanceAdvance: def.distanceAdvance ?? 1,
  };
}

export function getEventDef(id: EventKind): RaidEventDef {
  return EVENTS_BY_ID[id];
}
