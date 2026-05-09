import { EVENTS, EVENTS_BY_ID, ROOM_EVENT_BIAS, ROOM_NAMES } from "@/lib/data/events";
import { pickVocab } from "@/lib/data/vocab";
import { ITEMS, pickCommonItemId, pickItemForLocation, pickRareItemId } from "@/lib/data/items";
import { LOCATIONS_BY_ID } from "@/lib/data/locations";
import type {
  EventKind,
  LogEntry,
  RaidEventDef,
  RoomType,
  RunState,
} from "@/lib/types";

export function pickEvent(
  rand: () => number,
  state?: RunState,
  events: ReadonlyArray<RaidEventDef> = EVENTS,
  roomType?: RoomType,
  roomLooted?: boolean,
): RaidEventDef {
  const pool = state
    ? events.filter((e) => !e.preconditions || e.preconditions(state))
    : events;
  const eligible = pool.length > 0 ? pool : events;
  // Exclusive events (e.g. combat resolution while combat_engaged is set)
  // shadow everything else when any are eligible.
  const exclusive = eligible.filter((e) => e.exclusive);
  const final = exclusive.length > 0 ? exclusive : eligible;
  // Room-type bias only applies when there's no exclusive pool active
  // (combat/extract aren't room-driven).
  let bias: Partial<Record<EventKind, number>> | undefined;
  if (roomType && exclusive.length === 0) {
    bias = { ...ROOM_EVENT_BIAS[roomType] };
    if (roomLooted) {
      bias.looted_container = (bias.looted_container ?? 1) * 0.35;
      bias.found_rare = (bias.found_rare ?? 1) * 0.5;
    }
  }
  const weighted = final.map((e) => ({
    e,
    w: e.weight * (bias?.[e.id] ?? 1),
  }));
  const total = weighted.reduce((s, x) => s + x.w, 0);
  let r = rand() * total;
  for (const x of weighted) {
    r -= x.w;
    if (r <= 0) return x.e;
  }
  return weighted[weighted.length - 1].e;
}

export interface RolledEvent {
  kind: EventKind;
  text: string;
  itemId?: string;
  logKind: LogEntry["kind"];
  postconditions?: string[];
  removeFlags?: string[];
  passiveEffects?: RaidEventDef["passiveEffects"];
  depthAdvance: number;
  distanceAdvance: number;
  branches?: RaidEventDef["branches"];
  branchTimerMs?: number;
}

export function rollEvent(
  rand: () => number,
  locationId?: string,
  state?: RunState,
  roomType?: RoomType,
  roomLooted?: boolean,
  roomName?: string,
): RolledEvent {
  const def = pickEvent(rand, state, EVENTS, roomType, roomLooted);
  const tpl = def.templates[Math.floor(rand() * def.templates.length)];
  const location = locationId ? LOCATIONS_BY_ID[locationId] : undefined;

  const depth = state?.depth ?? 0;
  let itemId: string | undefined;
  if (def.rollLoot) {
    const isRare = def.rollLoot === "rare";
    itemId = location
      ? pickItemForLocation(rand, location, isRare, depth)
      : isRare
        ? pickRareItemId(rand)
        : pickCommonItemId(rand, depth);
  }

  // Prefer the operative's *specific* room name (fixed per tile at map gen)
  // so the event log says the same thing the map tooltip says. Fall back to
  // type-pool or vocab if no per-tile name is available.
  let locationName: string;
  if (roomName) {
    locationName = roomName;
  } else if (roomType && ROOM_NAMES[roomType]?.length) {
    const pool = ROOM_NAMES[roomType];
    locationName = pool[Math.floor(rand() * pool.length)];
  } else {
    locationName = pickVocab("locations", rand);
  }
  const raw = tpl
    .replace(/\{location\}/g, locationName)
    .replace(/\{brand\}/g, pickVocab("brands", rand))
    .replace(/\{adj\}/g, pickVocab("item_adjectives", rand))
    .replace(/\{npc\}/g, pickVocab("npc_names", rand))
    .replace(/\{condition\}/g, pickVocab("conditions", rand))
    .replace(/\{item\}/g, itemId ? `⟦${ITEMS[itemId].name}⟧` : "something");
  const text = capitalizeSentences(raw);

  const postconditions =
    typeof def.postconditions === "function"
      ? def.postconditions(rand)
      : def.postconditions;

  return {
    kind: def.id,
    text,
    itemId,
    logKind: def.kind,
    postconditions,
    removeFlags: def.removeFlags,
    passiveEffects: def.passiveEffects,
    depthAdvance: def.depthAdvance ?? 1,
    distanceAdvance: def.distanceAdvance ?? 1,
    branches: def.branches,
    branchTimerMs: def.branchTimerMs,
  };
}

export function getEventDef(id: EventKind): RaidEventDef {
  return EVENTS_BY_ID[id];
}

// Capitalize the first letter of the string AND the first letter after every
// sentence terminator (. ! ?) followed by whitespace. Items wrapped in ⟦…⟧ are
// already correct-case (item names) so we don't touch the marker contents.
export function capitalizeSentences(s: string): string {
  return s.replace(/(^|[.!?]\s+)([a-z⟦])/g, (_m, lead, ch) => {
    if (ch === "⟦") return lead + ch;
    return lead + ch.toUpperCase();
  });
}
