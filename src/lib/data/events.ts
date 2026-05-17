import type { EventKind, RaidEventDef, RoomType } from "@/lib/types";

// Bare-noun phrasings substituted into {location} based on the operative's
// current tile type. Multiple synonyms per type for flavor. Templates supply
// articles ("in the {location}") so entries here are bare nouns.
export const ROOM_NAMES: Record<RoomType, string[]> = {
  entry: ["entry", "access point"],
  corridor: ["corridor", "hall", "passage"],
  storage: ["storage bay", "supply locker", "loading bay", "old break room"],
  office: ["office", "workstation", "console room", "shift office"],
  mechanical: ["boiler room", "maintenance bay", "mech room", "service tunnel"],
  gantry: ["gantry", "collapsed catwalk", "rusted stairwell"],
  locked: ["sealed room"],
};

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
      "{npc} two corridors over. {condition}.",
      "Patrol moving through the {location}. Need to call it.",
    ],
    branches: [
      {
        id: "hide",
        label: "Hide",
        description: "Wait it out. Quiet but slow.",
        effects: {
          heatDelta: -3,
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
        // Combat-revamp Slice 1: store-side resolution. The Engage outcome
        // initializes currentRaid.combat from the target tile's enemySpawn
        // when this choice resolves (see store/slices/raid.ts). The legacy
        // `combat_engaged` flag is gone.
        effects: {
          heatDelta: 14,
          ammoDelta: -3,
          depthAdvance: 0,
          distanceAdvance: 0,
        },
      },
      {
        id: "reposition",
        label: "Reposition",
        description: "Slip around them. Costs distance to extract.",
        effects: {
          heatDelta: 4,
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
      "Snagged a tripwire. Cut on the leg.",
      "Slipped on debris in the {location}. Twisted ankle.",
      "Walked into a low pipe in the dark. Head ringing.",
      "Caught a jagged edge. Bleeding.",
      "Old wiring shorted as I passed. Burn on the arm.",
      "Floor gave under me in the {location}. Came down hard.",
      "Stepped on something sharp. Through the boot sole.",
    ],
    passiveEffects: { healthDelta: -8, energyDelta: -4 },
    // Environmental hazards bleed less often than gunfire — ~55% no bleed,
    // ~35% minor (cuts), ~10% major (deep gash).
    postconditions: (rand) => {
      const r = rand();
      if (r < 0.55) return [];
      if (r < 0.9) return ["bleeding_minor"];
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
        effects: { energyDelta: -8, heatDelta: 1, rollLoot: "common" },
        isDefault: true,
      },
      {
        id: "blast",
        label: "Blast",
        description: "Fast, loud, draws attention.",
        effects: { heatDelta: 15, ammoDelta: -2, rollLoot: "rare" },
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
    passiveEffects: { heatDelta: 3 },
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
    passiveEffects: { heatDelta: 4 },
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
    passiveEffects: { healthDelta: -6, ammoDelta: -2, heatDelta: 5 },
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
    passiveEffects: { heatDelta: 8, ammoDelta: -1 },
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
      "Pushing toward extract. The {location} is clear.",
      "Backtracking through the {location}. Quiet so far.",
      "Cutting a fast path back through the {location}.",
      "Past the {location}. Still no contact.",
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
    passiveEffects: { healthDelta: -8, ammoDelta: -1, heatDelta: 6 },
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
