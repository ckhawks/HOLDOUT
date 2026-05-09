import type { EventKind, RaidEventDef, RoomType } from "@/lib/types";

// Per-room-type event weight multipliers. Applied on top of the base weight in
// pickEvent when the operative's current tile has a known type. corridor and
// entry are pass-through (no bias). locked is unreachable so never queried.
export const ROOM_EVENT_BIAS: Record<RoomType, Partial<Record<EventKind, number>>> = {
  entry: {},
  corridor: {},
  storage: {
    looted_container: 1.8,
    found_rare: 1.3,
    spotted_patrol: 0.6,
  },
  office: {
    locked_door: 1.6,
    looted_container: 1.2,
    found_rare: 1.4,
    heard_voices: 1.4,
  },
  mechanical: {
    took_damage: 1.6,
    locked_door: 1.4,
    looted_container: 0.9,
  },
  gantry: {
    spotted_patrol: 1.8,
    took_damage: 1.4,
    looted_container: 0.6,
  },
  locked: {},
};

export const EVENTS: RaidEventDef[] = [
  {
    id: "looted_container",
    weight: 35,
    kind: "loot",
    templates: [
      "Pried open a {brand} crate. {item} inside, {adj}.",
      "Cracked a locker — {item}. {adj}.",
      "Tipped a footlocker. Got a {item} ({adj}).",
      "{adj} {item} on a shelf in the {location}.",
      "Pulled a {item} from a {brand} duffel. {adj}.",
      "Found a {item} in the {location}. {adj}.",
    ],
    rollLoot: "common",
    // Looting happens in place — operative isn't pushing deeper this tick.
    depthAdvance: 0,
    distanceAdvance: 0,
  },
  {
    id: "spotted_patrol",
    weight: 14,
    kind: "choice",
    templates: [
      "{npc} sweeping the {location}. They haven't seen me yet.",
      "{npc} two corridors over. {condition}. Decision?",
      "Patrol moving through the {location}. Need to call it.",
    ],
    branches: [
      {
        id: "hide",
        label: "Hide",
        description: "Wait it out. Quiet but slow.",
        effects: {
          alertnessDelta: -3,
          energyDelta: -2,
          depthAdvance: 0,
          distanceAdvance: 0,
        },
        isDefault: true,
      },
      {
        id: "engage",
        label: "Engage",
        description: "Open fire. Loud — and they'll fight back.",
        // No loot here. Combat resolves over 1+ follow-up ticks; loot drops on
        // target_down. flagsAdded sets the exclusive combat pool.
        effects: {
          alertnessDelta: 14,
          ammoDelta: -3,
          flagsAdded: ["combat_engaged"],
          depthAdvance: 0,
          distanceAdvance: 0,
        },
      },
      {
        id: "reposition",
        label: "Reposition",
        description: "Slip around them. Costs distance to extract.",
        effects: {
          alertnessDelta: 4,
          energyDelta: -4,
          distanceAdvance: 1,
          depthAdvance: 0,
        },
      },
    ],
  },
  {
    id: "found_rare",
    weight: 6,
    kind: "loot",
    templates: [
      "Wedged behind a panel — {item}. {adj}.",
      "Deep cache. {item} — not corp-issue.",
      "Under the {location} flooring: {item}, {adj}.",
      "Hidden in a {brand} maintenance hatch — {item}. {adj}.",
      "Tucked behind a {brand} junction box — {item}. {adj}.",
    ],
    preconditions: (s) => s.depth >= 3,
    rollLoot: "rare",
  },
  {
    id: "took_damage",
    weight: 10,
    kind: "damage",
    templates: [
      "Took fire from the {location}. Glanced off the plate.",
      "Snagged a tripwire. Cut on the leg.",
      "Slipped on debris in the {location}. Limping.",
      "Frag round near-miss. Shrapnel in the side.",
      "Caught a ricochet. Plate held.",
    ],
    passiveEffects: { healthDelta: -10, energyDelta: -4 },
    // Not every hit causes a bleed. ~40% no bleed, ~42% minor, ~18% major.
    postconditions: (rand) => {
      const r = rand();
      if (r < 0.4) return [];
      if (r < 0.82) return ["bleeding_minor"];
      return ["bleeding_major"];
    },
  },
  {
    id: "locked_door",
    weight: 8,
    kind: "choice",
    templates: [
      "Locked door at the {location}. {brand} keypad.",
      "Sealed bulkhead. Looks like a {brand} unit.",
    ],
    branches: [
      {
        id: "pick",
        label: "Pick",
        description: "Quiet but slow.",
        effects: { energyDelta: -8, alertnessDelta: 1, rollLoot: "common" },
        isDefault: true,
      },
      {
        id: "blast",
        label: "Blast",
        description: "Fast, loud, draws attention.",
        effects: { alertnessDelta: 15, ammoDelta: -2, rollLoot: "rare" },
      },
      {
        id: "skip",
        label: "Skip",
        description: "Walk past. No loot, no cost.",
        effects: { depthAdvance: 0, distanceAdvance: 0 },
      },
    ],
  },
  {
    id: "heard_voices",
    weight: 12,
    kind: "flavor",
    templates: [
      "Voices through the wall — too muffled to read.",
      "Static on a discarded radio. Someone's still using this freq.",
      "Footsteps and chatter. Two corridors out.",
      "{condition}. Can hear breathing on the other side.",
    ],
    passiveEffects: { alertnessDelta: 3 },
    // Stopping to listen is lateral — no deeper, no closer to extract change.
    depthAdvance: 0,
    distanceAdvance: 0,
  },

  // ---------- Combat resolution pool (exclusive while combat_engaged) ----------
  {
    id: "target_down",
    weight: 55,
    kind: "combat_resolved",
    templates: [
      "Target down. Looted {item} off them.",
      "Eliminated. Pulled {item} before the alarm.",
      "Threat neutralized. {item} recovered.",
    ],
    preconditions: (s) => s.flags.includes("combat_engaged"),
    exclusive: true,
    rollLoot: "common",
    removeFlags: ["combat_engaged"],
    passiveEffects: { alertnessDelta: 4 },
    depthAdvance: 0,
    distanceAdvance: 0,
  },
  {
    id: "firefight_continues",
    weight: 30,
    kind: "damage",
    templates: [
      "Trading shots in the {location}.",
      "Pinned. Returning fire.",
      "They moved. Pushed forward, kept on them.",
    ],
    preconditions: (s) => s.flags.includes("combat_engaged"),
    exclusive: true,
    passiveEffects: { healthDelta: -6, ammoDelta: -2, alertnessDelta: 5 },
    // Sustained fire occasionally cuts: ~25% minor bleed, no major from this event.
    postconditions: (rand) => (rand() < 0.25 ? ["bleeding_minor"] : []),
    depthAdvance: 0,
    distanceAdvance: 0,
  },
  {
    id: "target_fled",
    weight: 15,
    kind: "combat_resolved",
    templates: [
      "Target broke contact and ran. Lost them.",
      "They slipped into the {location}. No clean shot.",
    ],
    preconditions: (s) => s.flags.includes("combat_engaged"),
    exclusive: true,
    removeFlags: ["combat_engaged"],
    passiveEffects: { alertnessDelta: 8, ammoDelta: -1 },
    depthAdvance: 0,
    distanceAdvance: 0,
  },

  // ---------- Extract pool (exclusive while extracting flag is set) ----------
  // Each extract event decrements distance toward exfil. Mostly clean traversal
  // with occasional skirmishes and a chance of clipping a stray bit of loot.
  {
    id: "extract_clear",
    weight: 50,
    kind: "flavor",
    templates: [
      "Pushing toward extract. {location} clear.",
      "Backtracking through the {location}. Quiet so far.",
      "Cutting a fast path. Past a {brand} junction.",
    ],
    preconditions: (s) => s.flags.includes("extracting"),
    exclusive: true,
    distanceAdvance: -1,
    depthAdvance: 0,
  },
  {
    id: "extract_skirmish",
    weight: 18,
    kind: "damage",
    templates: [
      "Stray fire on the way out. Clipped me.",
      "{npc} cut me off — broke through but took a hit.",
      "Caught a round retreating. Plate held, mostly.",
    ],
    preconditions: (s) => s.flags.includes("extracting"),
    exclusive: true,
    passiveEffects: { healthDelta: -8, ammoDelta: -1, alertnessDelta: 6 },
    distanceAdvance: -1,
    depthAdvance: 0,
    postconditions: (rand) => (rand() < 0.35 ? ["bleeding_minor"] : []),
  },
  {
    id: "extract_corner_loot",
    weight: 8,
    kind: "loot",
    templates: [
      "Snatched a {item} on the way past — {adj}.",
      "Crate spilled in the {location}. Grabbed a {item}.",
    ],
    // No loot grabs in the last 3 events — operative is focused on the door.
    preconditions: (s) =>
      s.flags.includes("extracting") && s.distanceFromExtract > 3,
    exclusive: true,
    rollLoot: "common",
    distanceAdvance: -1,
    depthAdvance: 0,
  },
];

export const EVENTS_BY_ID = Object.fromEntries(EVENTS.map((e) => [e.id, e]));
