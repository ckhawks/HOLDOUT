import type { RaidEventDef } from "@/lib/types";

export const EVENTS: RaidEventDef[] = [
  {
    id: "looted_container",
    weight: 35,
    kind: "loot",
    templates: [
      "Pried open a {brand} crate in the {location}. {item} inside, {adj}.",
      "Cracked a locker. {item}, {adj}. Bagged.",
      "Tipped over a footlocker — {item} ({adj}). Pocketed.",
    ],
  },
  {
    id: "spotted_patrol",
    weight: 18,
    kind: "flavor",
    templates: [
      "Spotted {npc} sweeping the {location}. Holding position.",
      "{npc} just passed the {location}. {condition}.",
      "Movement: {npc}, two corridors over.",
    ],
  },
  {
    id: "found_rare",
    weight: 6,
    kind: "loot",
    templates: [
      "Wedged behind a panel — {item}. {adj}.",
      "In a deep cache: {item}. Not corp-issue.",
      "Under the {location} flooring — {item}, {adj}.",
    ],
  },
  {
    id: "took_damage",
    weight: 10,
    kind: "damage",
    templates: [
      "Took fire from the {location}. Glanced off the plate.",
      "Snagged a tripwire. Cut on the leg.",
      "Slipped on debris in the {location}. Limping.",
    ],
  },
  {
    id: "locked_door",
    weight: 12,
    kind: "flavor",
    templates: [
      "Locked door at the {location}. {brand} keypad.",
      "Sealed bulkhead. Looks like a {brand} unit.",
    ],
  },
  {
    id: "heard_voices",
    weight: 19,
    kind: "flavor",
    templates: [
      "Voices through the wall — too muffled to read.",
      "{condition}. Can hear breathing on the other side.",
      "Static on a discarded radio. Someone's still using this freq.",
    ],
  },
];

export const EVENTS_BY_ID = Object.fromEntries(EVENTS.map((e) => [e.id, e]));
