export type ItemTier = "common" | "uncommon" | "rare" | "experimental";

export interface Item {
  id: string;
  name: string;
  tier: ItemTier;
  sellValue: number;
  weight: number;
}

export interface StashItem {
  uid: string;
  itemId: string;
  flavor?: string;
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

export interface Location {
  id: string;
  name: string;
  description: string;
  tier: number;
  eventWeights?: Partial<Record<EventKind, number>>;
}

export interface CurrentRaid {
  locationId: string;
  startedAt: number;
  runState: RunState;
  log: LogEntry[];
  backpack: StashItem[];
  active: boolean;
}

export interface Unlocks {
  workbench: boolean;
  medbay: boolean;
}

export interface Upgrades {
  backpackLevel: number;
  stashLevel: number;
}
