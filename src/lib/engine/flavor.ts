// Pure formatting/flavor helpers for raid logs. Extracted from raid.ts as
// part of the ARCH_REVIEW #4 decompose. No state, no side effects — these
// build strings and a single LogEntry from tile + RNG inputs.

import type { LogEntry, MapTile } from "@/lib/types";
import { ITEMS } from "@/lib/data/items";
import { makeLogger } from "./logging";

// Build a flavor log line for the operative entering a room. Names the
// specific containers and any loose items on the floor so subsequent Loot
// logs and pickup actions match.
export function entranceLog(
  tile: MapTile,
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
  const word = NUMBER_WORDS[n] ?? `${n}`;
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
export function lootVerb(container: string, rand: () => number): string {
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
