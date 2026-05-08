export type ItemTier = "common" | "uncommon" | "rare" | "experimental";

export type ItemCategory =
  | "mechanical"
  | "electronics"
  | "chems"
  | "consumables"
  | "valuables"
  | "intel"
  | "military"
  | "experimental";

export type Cell = readonly [number, number];
export type ShapeCells = ReadonlyArray<Cell>;
export type Rotation = 0 | 1 | 2 | 3;

export interface Item {
  id: string;
  name: string;
  tier: ItemTier;
  category: ItemCategory;
  sellValue: number;
  weight: number;
  shape: ShapeCells;
}

export interface StashItem {
  uid: string;
  itemId: string;
  flavor?: string;
}

export interface PackPlacement extends StashItem {
  x: number;
  y: number;
  rotation: Rotation;
}

export interface PendingItem extends StashItem {
  arrivedAt: number;
}

export interface RunState {
  alertness: number;
  health: number;
  energy: number;
  ammo: number;
  depth: number;
}

export type LogKind = "flavor" | "loot" | "damage" | "system" | "choice";

export interface LogEntry {
  id: string;
  timestamp: number;
  text: string;
  kind: LogKind;
  itemId?: string;
}

export type OperativeState =
  | "idle"
  | "raiding"
  | "extracting"
  | "injured";

export interface Operative {
  name: string;
  state: OperativeState;
  injuryDebuff: boolean;
  skills: { sneak: number; shoot: number; scrounge: number };
}

export interface HideoutModule {
  unlocked: boolean;
  capacity?: number;
}

export interface Hideout {
  modules: {
    stash: HideoutModule;
    backpack: HideoutModule;
    workbench: HideoutModule;
    medbay: HideoutModule;
  };
}

export type EventKind =
  | "looted_container"
  | "spotted_patrol"
  | "found_rare"
  | "took_damage"
  | "locked_door"
  | "heard_voices";

export interface RaidEventDef {
  id: EventKind;
  weight: number;
  kind: LogKind;
  templates: string[];
}

export interface LocationUnlock {
  type: "permanent" | "consumable";
  itemId: string;
  label: string;
}

export interface Location {
  id: string;
  name: string;
  description: string;
  tier: number;
  difficulty: "low" | "mid" | "high";
  categoryWeights?: Partial<Record<ItemCategory, number>>;
  eventWeights?: Partial<Record<EventKind, number>>;
  unlock?: LocationUnlock;
}

export interface CurrentRaid {
  locationId: string;
  startedAt: number;
  runState: RunState;
  log: LogEntry[];
  pack: PackPlacement[];
  pending: PendingItem[];
  packGrid: { width: number; height: number };
  pendingCapacity: number;
  active: boolean;
}

export interface Unlocks {
  workbench: boolean;
  medbay: boolean;
  biolab: boolean;
}

export interface Upgrades {
  backpackLevel: number;
  stashLevel: number;
}
