import type {
  CurrentRaid,
  Hideout,
  Operative,
  StashItem,
  Unlocks,
  Upgrades,
} from "@/lib/types";

const SAVE_KEY = "holdout:save";
export const SCHEMA_VERSION = 19;

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
  // v1 had no upgrades field. Field was named `backpackLevel` until v19;
  // backfill with that name so the v19 rename branch picks it up correctly.
  if (saved.schemaVersion < 2) {
    if (!s.upgrades) {
      (s as unknown as { upgrades: { backpackLevel: number; stashLevel: number } }).upgrades = {
        backpackLevel: 0,
        stashLevel: 0,
      };
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
  // v14: tile gains threat. Backfill false on legacy tiles so existing in-
  // progress raids don't suddenly have hostiles materialize. New raids get
  // threats placed during generateMap.
  if (saved.schemaVersion < 14) {
    const cr = s.currentRaid;
    if (cr?.map?.tiles) {
      cr.map = {
        ...cr.map,
        tiles: cr.map.tiles.map((t) => {
          const tile = t as unknown as { threat?: boolean };
          return tile.threat === undefined ? { ...t, threat: false } : t;
        }),
      };
    }
  }
  // v15: tile gains containers (per-tile container vocabulary). Drop in-
  // progress raids since lootRemaining and containers must agree.
  if (saved.schemaVersion < 15) {
    s.currentRaid = null;
  }
  // v16: container shape changed from string[] to {name, locked}[]. Drop
  // in-progress raids — old shape is incompatible.
  if (saved.schemaVersion < 16) {
    s.currentRaid = null;
  }
  // v17: locked containers split into a separate lockedContainers array;
  // containers reverted to string[]. Drop in-progress raids — both fields
  // changed shape.
  if (saved.schemaVersion < 17) {
    s.currentRaid = null;
  }
  // v18: RunState.alertness renamed to RunState.heat. If currentRaid carries
  // the old field, copy it over. (Saves with no in-progress raid don't need
  // anything.)
  if (saved.schemaVersion < 18) {
    const cr = s.currentRaid;
    if (cr?.runState) {
      const rs = cr.runState as unknown as { alertness?: number; heat?: number };
      if (typeof rs.heat !== "number" && typeof rs.alertness === "number") {
        rs.heat = rs.alertness;
        delete rs.alertness;
      }
    }
  }
  // v19: kit/equipment pivot. CurrentRaid drops `pack`/`packGrid` and gains
  // `equipment`. Operative gains `equipment`. Upgrades.backpackLevel renamed
  // to pocketsLevel. The in-raid format is incompatible — drop in-progress
  // raids. Backfill operative.equipment with bare pockets (no bag/armor/etc).
  if (saved.schemaVersion < 19) {
    s.currentRaid = null;
    if (s.upgrades) {
      const up = s.upgrades as unknown as { backpackLevel?: number; pocketsLevel?: number; stashLevel: number };
      if (typeof up.pocketsLevel !== "number") {
        up.pocketsLevel = up.backpackLevel ?? 0;
        delete up.backpackLevel;
      }
    }
    if (s.operative) {
      const op = s.operative as unknown as { equipment?: unknown };
      if (!op.equipment) {
        op.equipment = {
          pockets: { grid: { width: 4, height: 4 }, items: [] },
          bag: null,
          weapon: null,
          armor: null,
          helmet: null,
        };
      }
    }
    // Hideout shape changed: backpack module is now "pockets". Rebuilt by
    // store on hydrate, but to be safe drop the field here.
    if (s.hideout?.modules) {
      const mods = s.hideout.modules as unknown as { backpack?: unknown; pockets?: unknown };
      if (mods.backpack && !mods.pockets) {
        mods.pockets = mods.backpack;
        delete mods.backpack;
      }
    }
  }
  // Defensive shape check, version-independent: a save can end up with the
  // new schema version but old container data if HMR + auto-save raced
  // during dev. If any tile has containers that aren't strings, or is
  // missing lockedContainers, drop the raid.
  if (s.currentRaid?.map?.tiles) {
    const bad = s.currentRaid.map.tiles.some((t) => {
      if (!Array.isArray(t.lockedContainers)) return true;
      return t.containers?.some((c: unknown) => typeof c !== "string");
    });
    if (bad) s.currentRaid = null;
  }
  // If we dropped the raid for any reason but the operative state is still
  // "raiding" or "extracting", force it back to idle so the UI doesn't get
  // stuck showing "deployed" with no raid to render.
  if (
    !s.currentRaid &&
    s.operative &&
    (s.operative.state === "raiding" || s.operative.state === "extracting")
  ) {
    s.operative = { ...s.operative, state: "idle" };
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
