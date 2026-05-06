import type {
  CurrentRaid,
  Hideout,
  Operative,
  StashItem,
  Unlocks,
  Upgrades,
} from "@/lib/types";

const SAVE_KEY = "holdout:save";
export const SCHEMA_VERSION = 2;

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
  // v1 had no upgrades field
  if (saved.schemaVersion < 2) {
    const s = saved.state as PersistedState;
    if (!s.upgrades) {
      s.upgrades = { backpackLevel: 0, stashLevel: 0 };
    }
    return { ...saved, schemaVersion: SCHEMA_VERSION, state: s };
  }
  return saved;
}

export function clearSave(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SAVE_KEY);
}
