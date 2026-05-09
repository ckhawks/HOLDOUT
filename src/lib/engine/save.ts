import type {
  CurrentRaid,
  Hideout,
  Operative,
  StashItem,
  Unlocks,
  Upgrades,
} from "@/lib/types";

const SAVE_KEY = "holdout:save";
export const SCHEMA_VERSION = 13;

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
  // v6: branching events — CurrentRaid gains pendingChoice.
  // Don't try to preserve a mid-raid pending decision across sessions; it
  // would reference event defs that may have changed. Clear it; the next
  // tick will roll a fresh event.
  if (saved.schemaVersion < 6) {
    if (s.currentRaid && !("pendingChoice" in s.currentRaid)) {
      (s.currentRaid as { pendingChoice: null }).pendingChoice = null;
    }
  }
  // v7: spatial map — CurrentRaid gains map + operativePos. The old in-
  // progress raid has no map; rather than synthesize one, drop the raid.
  if (saved.schemaVersion < 7) {
    if (s.currentRaid && !("map" in s.currentRaid)) {
      s.currentRaid = null;
    }
  }
  // v8: explicit pause — CurrentRaid gains pausedAt. Old raids resume running.
  if (saved.schemaVersion < 8) {
    if (s.currentRaid && !("pausedAt" in s.currentRaid)) {
      (s.currentRaid as { pausedAt: number | null }).pausedAt = null;
    }
  }
  // v9: map fog of war — MapTile gains `seen`. Backfill seen=true on existing
  // tiles so resumed raids don't suddenly black out the whole map.
  if (saved.schemaVersion < 9) {
    const cr = s.currentRaid;
    if (cr?.map?.tiles) {
      cr.map = {
        ...cr.map,
        tiles: cr.map.tiles.map((t) => {
          const tile = t as unknown as { seen?: boolean };
          return tile.seen === undefined ? { ...t, seen: true } : t;
        }),
      };
    }
  }
  // v10: per-tile fixed room names. Backfill name=type so old tiles still
  // render something readable; new tiles get proper names from the pool.
  if (saved.schemaVersion < 10) {
    const cr = s.currentRaid;
    if (cr?.map?.tiles) {
      cr.map = {
        ...cr.map,
        tiles: cr.map.tiles.map((t) => {
          const tile = t as unknown as { name?: string; type: string };
          return tile.name === undefined ? { ...t, name: tile.type } : t;
        }),
      };
    }
  }
  // v11: cached nextStep on CurrentRaid. Default to null on legacy raids;
  // doTick will fall back to fresh stepForward/stepBackward when nextStep
  // is null.
  if (saved.schemaVersion < 11) {
    const cr = s.currentRaid;
    if (cr && !("nextStep" in cr)) {
      (cr as { nextStep: null }).nextStep = null;
    }
  }
  // v12: rotated map coords (x = depth, y = lane) and swapped MAP_WIDTH/
  // MAP_HEIGHT. Old map data has the old orientation; rather than transpose
  // it (and potentially break BFS / position consistency), drop the in-
  // progress raid. Stash, cash, hideout state survive untouched.
  if (saved.schemaVersion < 12) {
    s.currentRaid = null;
  }
  // v13: tile gains visited; CurrentRaid gains queuedAction + actionStartedAt
  // (action-driven tick replaces random event tick). Drop in-progress raids
  // since their tile.looted means "visited" under the old semantics; safer to
  // restart than to interpret.
  if (saved.schemaVersion < 13) {
    s.currentRaid = null;
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
