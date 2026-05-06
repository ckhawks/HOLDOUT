import type { Location } from "@/lib/types";

export const LOCATIONS: Location[] = [
  {
    id: "warehouse",
    name: "Decommissioned Warehouse",
    description: "Abandoned logistics hub on the city edge. Low patrol density. Common scrap, occasional uncommon finds.",
    tier: 1,
  },
];

export const LOCATIONS_BY_ID = Object.fromEntries(LOCATIONS.map((l) => [l.id, l]));
