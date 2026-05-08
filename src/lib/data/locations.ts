import type { Location } from "@/lib/types";

export const LOCATIONS: Location[] = [
  {
    id: "warehouse",
    name: "Warehouse",
    description:
      "Abandoned logistics hub on the city edge. Low patrol density. Common scrap, occasional uncommon finds.",
    tier: 1,
    difficulty: "low",
    categoryWeights: {
      mechanical: 5,
      consumables: 3,
      electronics: 2,
      military: 1,
      valuables: 1,
      intel: 1,
    },
  },
  {
    id: "subway",
    name: "Subway",
    description:
      "Flooded transit tunnels under the old downtown grid. Damp, dark, and full of forgotten stashes. Higher chance of medical and fuel finds. Rare intel surfaces from old maintenance lockers.",
    tier: 2,
    difficulty: "mid",
    categoryWeights: {
      chems: 4,
      consumables: 4,
      mechanical: 3,
      intel: 2,
      valuables: 1,
      electronics: 1,
    },
  },
  {
    id: "drone_graveyard",
    name: "Drone Graveyard",
    description:
      "Auto-salvage yard where retired security drones are stripped for parts. Heavy on mechanical and electronics. Occasional military surplus. Datacenter keycards sometimes turn up here.",
    tier: 2,
    difficulty: "mid",
    categoryWeights: {
      mechanical: 5,
      electronics: 4,
      military: 2,
      intel: 2,
      consumables: 1,
    },
  },
  {
    id: "datacenter",
    name: "Datacenter",
    description:
      "Server farm half-melted by a coolant fire, still glowing with residual heat. Dense electronics and intel finds. Requires a Datacenter Keycard, consumed on entry.",
    tier: 3,
    difficulty: "high",
    categoryWeights: {
      electronics: 6,
      intel: 5,
      mechanical: 1,
      valuables: 1,
      experimental: 1,
    },
    unlock: {
      type: "consumable",
      itemId: "datacenter_keycard",
      label: "Datacenter Keycard",
    },
  },
  {
    id: "biolab",
    name: "Biolab",
    description:
      "Triton-Saxon R&D site, abandoned mid-experiment. The chems are unstable, the schematics are valuable. Coordinates required to find it; once located, stays unlocked.",
    tier: 3,
    difficulty: "high",
    categoryWeights: {
      chems: 5,
      experimental: 4,
      electronics: 3,
      intel: 2,
      mechanical: 1,
    },
    unlock: {
      type: "permanent",
      itemId: "biolab_coords",
      label: "Biolab Coordinates",
    },
  },
];

export const LOCATIONS_BY_ID = Object.fromEntries(LOCATIONS.map((l) => [l.id, l]));
