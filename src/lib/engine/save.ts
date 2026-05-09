import type {
  CurrentRaid,
  Hideout,
  Operative,
  StashItem,
  Unlocks,
  Upgrades,
} from "@/lib/types";

const SAVE_KEY = "holdout:save";
export const SCHEMA_VERSION = 5;

export interface PersistedState {
  cash: number;
  stash: StashItem[];
  operative: Operative;
  hideout: Hideout;
  unlocks: Unlocks;
  upgrades: Upgrades;
  currentRaid: CurrentRaid | null;
}

export interface SavedGame {
  schemaVersion: number;
  timestamp: number;
  state: PersistedState;
}

export function saveGame(state: PersistedState): void {
  if (typeof window === "undefined") return;
  const payload: SavedGame = {
    schemaVersion: SCHEMA_VERSION,
    timestamp: Date.now(),
    state,
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  } catch {
    // quota / serialization errors — silently drop
  }
}

export function loadGame(): PersistedState | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SavedGame;
    const migrated = migrateSave(parsed);
    return migrated.state;
  } catch {
    return null;
  }
}

export function migrateSave(saved: SavedGame): SavedGame {
  const s = saved.state as PersistedState;
  // v1 had no upgrades field
  if (saved.schemaVersion < 2) {
    if (!s.upgrades) {
      s.upgrades = { backpackLevel: 0, stashLevel: 0 };
    }
  }
  // v3: pack tetris — old in-progress raid format is incompatible. Drop it.
  if (saved.schemaVersion < 3) {
    s.currentRaid = null;
  }
  // v4: locations + unlocks added biolab.
  if (saved.schemaVersion < 4) {
    if (s.unlocks && typeof (s.unlocks as { biolab?: boolean }).biolab !== "boolean") {
      s.unlocks = { ...s.unlocks, biolab: false };
    }
  }
  // v5: engine spine — RunState gains flags + distanceFromExtract.
  if (saved.schemaVersion < 5) {
    if (s.currentRaid?.runState) {
      const rs = s.currentRaid.runState as RunStateV5;
      if (!Array.isArray(rs.flags)) rs.flags = [];
      if (typeof rs.distanceFromExtract !== "number") {
        rs.distanceFromExtract = rs.depth ?? 0;
      }
    }
  }
  return { ...saved, schemaVersion: SCHEMA_VERSION, state: s };
}

interface RunStateV5 {
  flags?: string[];
  distanceFromExtract?: number;
  depth?: number;
}

export function clearSave(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SAVE_KEY);
}
