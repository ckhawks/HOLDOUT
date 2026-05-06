import { EVENTS, EVENTS_BY_ID } from "@/lib/data/events";
import { pickVocab } from "@/lib/data/vocab";
import { ITEMS, pickCommonItemId, pickRareItemId } from "@/lib/data/items";
import type { EventKind, LogEntry, RaidEventDef } from "@/lib/types";

export function pickEvent(rand: () => number): RaidEventDef {
  const total = EVENTS.reduce((s, e) => s + e.weight, 0);
  let r = rand() * total;
  for (const e of EVENTS) {
    r -= e.weight;
    if (r <= 0) return e;
  }
  return EVENTS[0];
}

export interface RolledEvent {
  kind: EventKind;
  text: string;
  itemId?: string;
  logKind: LogEntry["kind"];
}

export function rollEvent(rand: () => number): RolledEvent {
  const def = pickEvent(rand);
  const tpl = def.templates[Math.floor(rand() * def.templates.length)];

  let itemId: string | undefined;
  if (def.id === "looted_container") itemId = pickCommonItemId(rand);
  else if (def.id === "found_rare") itemId = pickRareItemId(rand);

  const text = tpl
    .replace(/\{location\}/g, pickVocab("locations", rand))
    .replace(/\{brand\}/g, pickVocab("brands", rand))
    .replace(/\{adj\}/g, pickVocab("item_adjectives", rand))
    .replace(/\{npc\}/g, pickVocab("npc_names", rand))
    .replace(/\{condition\}/g, pickVocab("conditions", rand))
    .replace(/\{item\}/g, itemId ? `⟦${ITEMS[itemId].name}⟧` : "something");

  return { kind: def.id, text, itemId, logKind: def.kind };
}

export function getEventDef(id: EventKind): RaidEventDef {
  return EVENTS_BY_ID[id];
}
