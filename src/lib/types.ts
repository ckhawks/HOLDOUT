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
  distanceFromExtract: number;
  flags: string[];
}

export type LogKind =
  | "flavor"
  | "loot"
  | "damage"
  | "system"
  | "choice"
  | "choice_result"
  | "combat_resolved";

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
  | "heard_voices"
  | "target_down"
  | "firefight_continues"
  | "target_fled"
  | "extract_clear"
  | "extract_skirmish"
  | "extract_corner_loot";

export interface BranchEffects {
  alertnessDelta?: number;
  healthDelta?: number;
  energyDelta?: number;
  ammoDelta?: number;
  depthAdvance?: number;
  distanceAdvance?: number;
  flagsAdded?: string[];
  flagsRemoved?: string[];
  rollLoot?: "common" | "rare";
}

export interface BranchOption {
  id: string;
  label: string;
  description?: string;
  effects?: BranchEffects;
  isDefault?: boolean;
}

export interface PassiveEffects {
  alertnessDelta?: number;
  healthDelta?: number;
  energyDelta?: number;
  ammoDelta?: number;
}

export interface RaidEventDef {
  id: EventKind;
  weight: number;
  kind: LogKind;
  templates: string[];
  preconditions?: (state: RunState) => boolean;
  postconditions?: string[] | ((rand: () => number) => string[]);
  removeFlags?: string[];
  exclusive?: boolean;
  passiveEffects?: PassiveEffects;
  rollLoot?: "common" | "rare";
  depthAdvance?: number;
  distanceAdvance?: number;
  branches?: BranchOption[];
  branchTimerMs?: number;
}

export interface PendingChoice {
  eventId: EventKind;
  prompt: string;
  options: BranchOption[];
  defaultId: string;
  startedAt: number;
  timerMs: number;
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
  pendingChoice: PendingChoice | null;
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
