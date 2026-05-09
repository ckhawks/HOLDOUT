"use client";

import { create } from "zustand";
import type {
  ActionId,
  CurrentRaid,
  Hideout,
  LogEntry,
  Operative,
  PackPlacement,
  PendingItem,
  Rotation,
  StashItem,
  Unlocks,
  Upgrades,
} from "@/lib/types";
import {
  ACTION_TIMER_MS,
  entranceLog,
  startRaid,
  tickAction,
  applyBandage,
  makeLog,
  makeRng,
} from "@/lib/engine/raid";
import { autoPickAction } from "@/lib/engine/actions";
import { ITEMS } from "@/lib/data/items";
import {
  backpackCapacity,
  backpackUpgradeCost,
  packDimensions,
  pendingCapacity,
  stashCapacity,
  stashUpgradeCost,
} from "@/lib/engine/upgrades";
import {
  buildOccupancy,
  canPlace,
  shapeFor,
} from "@/lib/engine/shapes";
import {
  addToTileContents,
  consumeLootFromTile,
  markTileVisited,
  removeFromTileContents,
  revealFrom,
  stepBackward,
  stepForward,
  tileAt,
} from "@/lib/engine/map";
import {
  loadGame,
  saveGame,
  clearSave,
  type PersistedState,
} from "@/lib/engine/save";
import { LOCATIONS_BY_ID } from "@/lib/data/locations";

export type PanelId = "hideout" | "stash" | "ops" | "feed" | "manual" | "settings";

export interface RaidOutcome {
  type: "death" | "extracted";
  recoveredCount: number;
  locationId: string;
}

interface GameState {
  cash: number;
  stash: StashItem[];
  operative: Operative;
  hideout: Hideout;
  unlocks: Unlocks;
  upgrades: Upgrades;
  currentRaid: CurrentRaid | null;
  activePanel: PanelId;
  rngSeed: number;
  hydrated: boolean;
  raidOutcome: RaidOutcome | null;

  setPanel: (p: PanelId) => void;
  beginRaid: (locationId: string) => void;
  doTick: () => void;
  overrideAction: (action: ActionId) => void;
  useBandage: () => void;
  togglePause: () => void;
  recall: () => void;
  endRaid: (extracted: boolean) => void;
  dismissRaidOutcome: () => void;
  placeFromPending: (uid: string, x: number, y: number, rotation: Rotation) => boolean;
  movePackItem: (uid: string, x: number, y: number, rotation: Rotation) => boolean;
  unplacePackItem: (uid: string) => void;
  trashFromPending: (uid: string) => void;
  trashFromPack: (uid: string) => void;
  pruneExpiredPending: () => void;
  sellItem: (uid: string) => void;
  sellAllJunk: () => void;
  buyBackpackUpgrade: () => void;
  buyStashUpgrade: () => void;
  resetGame: () => void;
  hydrate: () => void;
}

function initialOperative(): Operative {
  return {
    name: "OP-01 / VESPER",
    state: "idle",
    injuryDebuff: false,
    skills: { sneak: 1, shoot: 1, scrounge: 1 },
  };
}

function buildHideout(upgrades: Upgrades): Hideout {
  return {
    modules: {
      stash: { unlocked: true, capacity: stashCapacity(upgrades) },
      backpack: { unlocked: true, capacity: backpackCapacity(upgrades) },
      workbench: { unlocked: false },
      medbay: { unlocked: false },
    },
  };
}

const initialUpgrades: Upgrades = { backpackLevel: 0, stashLevel: 0 };

export const useGame = create<GameState>((set, get) => ({
  cash: 0,
  stash: [],
  operative: initialOperative(),
  hideout: buildHideout(initialUpgrades),
  unlocks: { workbench: false, medbay: false, biolab: false },
  upgrades: initialUpgrades,
  currentRaid: null,
  activePanel: "ops",
  rngSeed: Math.floor(Math.random() * 0xffffffff),
  hydrated: false,
  raidOutcome: null,

  setPanel: (p) => set({ activePanel: p }),

  beginRaid: (locationId) => {
    const { operative, upgrades, unlocks, stash, rngSeed } = get();
    if (operative.state !== "idle") return;
    const loc = LOCATIONS_BY_ID[locationId];
    if (!loc) return;
    let nextStash = stash;
    if (loc.unlock) {
      if (loc.unlock.type === "permanent") {
        if (!unlocks[loc.id as keyof Unlocks]) return;
      } else {
        const idx = stash.findIndex((s) => s.itemId === loc.unlock!.itemId);
        if (idx === -1) return;
        nextStash = [...stash.slice(0, idx), ...stash.slice(idx + 1)];
      }
    }
    // Map gen RNG is seeded off rngSeed + raid start so each raid's map differs.
    const mapRand = makeRng(rngSeed + Date.now());
    set({
      stash: nextStash,
      currentRaid: startRaid(locationId, packDimensions(upgrades), mapRand),
      operative: { ...operative, state: "raiding" },
      activePanel: "feed",
    });
  },

  doTick: () => {
    const { currentRaid, rngSeed } = get();
    if (!currentRaid || !currentRaid.active) return;
    if (currentRaid.pendingChoice) return;
    if (currentRaid.pausedAt) return;

    const rand = makeRng(rngSeed + currentRaid.log.length);
    const t = tickAction(currentRaid, rand);

    // Apply movement based on action's intent.
    const isExtracting = currentRaid.runState.flags.includes("extracting");
    let nextPos = currentRaid.operativePos;
    let nextMap = currentRaid.map;
    let nextStep = currentRaid.nextStep;
    if (t.movement === "forward" && !isExtracting) {
      nextPos = currentRaid.nextStep
        ? { ...currentRaid.nextStep }
        : stepForward(currentRaid.map, currentRaid.operativePos, rand);
    } else if (t.movement === "backward" && isExtracting) {
      nextPos = currentRaid.nextStep
        ? { ...currentRaid.nextStep }
        : stepBackward(currentRaid.map, currentRaid.operativePos);
    }
    let entrance: LogEntry | null = null;
    if (nextPos !== currentRaid.operativePos) {
      const arrivedTile = tileAt(nextMap, nextPos.x, nextPos.y);
      const wasFirstVisit = arrivedTile && !arrivedTile.visited;
      nextMap = markTileVisited(nextMap, nextPos.x, nextPos.y);
      nextMap = revealFrom(nextMap, nextPos.x, nextPos.y);
      nextStep = isExtracting
        ? stepBackward(nextMap, nextPos)
        : stepForward(nextMap, nextPos, rand);
      // Entrance flavor log on first arrival to a room (skip the entry tile
      // and skip extract steps to reduce log noise).
      const arrivedTileNow = tileAt(nextMap, nextPos.x, nextPos.y);
      if (wasFirstVisit && arrivedTileNow && arrivedTileNow.type !== "entry" && !isExtracting) {
        entrance = entranceLog(arrivedTileNow);
      }
    }
    if (t.consumedLoot) {
      nextMap = consumeLootFromTile(nextMap, currentRaid.operativePos.x, currentRaid.operativePos.y);
    }
    if (t.droppedItem) {
      nextMap = addToTileContents(
        nextMap,
        currentRaid.operativePos.x,
        currentRaid.operativePos.y,
        t.droppedItem,
      );
    }

    let flags: string[] = currentRaid.runState.flags;
    if (t.flagsAdded.length || t.flagsRemoved.length) {
      const set = new Set(flags);
      for (const f of t.flagsAdded) set.add(f);
      for (const f of t.flagsRemoved) set.delete(f);
      flags = Array.from(set);
    }

    const advancedDepth =
      t.movement === "forward" ? 1 : t.movement === "lateral" ? 0 : 0;
    const advancedDistance =
      t.movement === "forward" || t.movement === "lateral"
        ? 1
        : t.movement === "backward"
          ? -1
          : 0;

    const allLogs = entrance ? [...t.logs, entrance] : t.logs;
    let raid: CurrentRaid = {
      ...currentRaid,
      log: [...currentRaid.log, ...allLogs],
      operativePos: nextPos,
      map: nextMap,
      nextStep,
      runState: {
        ...currentRaid.runState,
        alertness: Math.max(0, Math.min(100, currentRaid.runState.alertness + t.alertnessDelta)),
        health: Math.max(0, Math.min(100, currentRaid.runState.health + t.healthDelta)),
        energy: Math.max(0, Math.min(100, currentRaid.runState.energy + t.energyDelta)),
        ammo: Math.max(0, currentRaid.runState.ammo + t.ammoDelta),
        depth: currentRaid.runState.depth + advancedDepth,
        distanceFromExtract: Math.max(
          0,
          currentRaid.runState.distanceFromExtract + advancedDistance,
        ),
        flags,
      },
    };

    // Death check.
    if (raid.runState.health <= 0) {
      raid = {
        ...raid,
        log: [
          ...raid.log,
          makeLog("system", "Vital signs flat. Operative is down."),
        ],
        active: false,
      };
      set({ currentRaid: raid });
      setTimeout(() => get().endRaid(false), 800);
      return;
    }

    // Extract complete.
    const stillExtracting = raid.runState.flags.includes("extracting");
    if (stillExtracting && raid.runState.distanceFromExtract <= 0) {
      raid = {
        ...raid,
        log: [
          ...raid.log,
          makeLog("system", "At the extract point. Pulling out."),
        ],
        active: false,
      };
      set({ currentRaid: raid });
      setTimeout(() => get().endRaid(true), 600);
      return;
    }

    // Auto-pick the next action and reset the action timer.
    const queuedAction = autoPickAction(raid);
    raid = {
      ...raid,
      queuedAction,
      actionStartedAt: Date.now(),
    };
    set({ currentRaid: raid });
  },

  overrideAction: (action) => {
    const { currentRaid } = get();
    if (!currentRaid || !currentRaid.active) return;
    set({ currentRaid: { ...currentRaid, queuedAction: action } });
  },

  togglePause: () => {
    const { currentRaid } = get();
    if (!currentRaid || !currentRaid.active) return;
    if (currentRaid.pausedAt) {
      // Resume: shift the action timer forward by the pause duration so the
      // remaining budget is preserved. Room contents don't expire so there's
      // no longer anything else to shift.
      const pauseDuration = Date.now() - currentRaid.pausedAt;
      set({
        currentRaid: {
          ...currentRaid,
          pausedAt: null,
          actionStartedAt: currentRaid.actionStartedAt + pauseDuration,
        },
      });
    } else {
      set({ currentRaid: { ...currentRaid, pausedAt: Date.now() } });
    }
  },

  useBandage: () => {
    const { currentRaid } = get();
    if (!currentRaid || !currentRaid.active) return;
    const next = applyBandage(currentRaid);
    if (next === currentRaid) return;
    set({ currentRaid: next });
  },

  recall: () => {
    const { currentRaid, operative } = get();
    if (!currentRaid || !currentRaid.active) return;
    if (currentRaid.runState.flags.includes("extracting")) return;
    const log: LogEntry = makeLog(
      "system",
      `RECALL acknowledged. Backtracking to extract — about ${currentRaid.runState.distanceFromExtract} rooms away.`,
    );
    const flags = Array.from(new Set([...currentRaid.runState.flags, "extracting"]));
    // Switch the preview to the extract direction immediately.
    const nextStep = stepBackward(currentRaid.map, currentRaid.operativePos);
    const settledNextStep =
      nextStep.x === currentRaid.operativePos.x &&
      nextStep.y === currentRaid.operativePos.y
        ? null
        : nextStep;
    set({
      currentRaid: {
        ...currentRaid,
        log: [...currentRaid.log, log],
        runState: { ...currentRaid.runState, flags },
        pendingChoice: null,
        nextStep: settledNextStep,
        queuedAction: "extract_step",
        actionStartedAt: Date.now(),
      },
      operative: { ...operative, state: "extracting" },
    });
    // If already at extract (distance 0), finish immediately.
    if (currentRaid.runState.distanceFromExtract <= 0) {
      setTimeout(() => get().endRaid(true), 600);
    }
  },

  endRaid: (extracted) => {
    const { currentRaid, stash, hideout, operative, unlocks } = get();
    if (!currentRaid) return;
    const cap = hideout.modules.stash.capacity ?? 0;
    let nextStash = stash;
    let nextUnlocks = unlocks;
    if (extracted) {
      const recovered: StashItem[] = currentRaid.pack.map((p) => ({
        uid: p.uid,
        itemId: p.itemId,
        flavor: p.flavor,
      }));
      nextStash = [...stash, ...recovered].slice(-cap);
      if (recovered.some((i) => i.itemId === "workbench_schematic")) {
        nextUnlocks = { ...nextUnlocks, workbench: true };
      }
      if (recovered.some((i) => i.itemId === "biolab_coords")) {
        nextUnlocks = { ...nextUnlocks, biolab: true };
      }
    }
    // Death loses pack contents, returns operative injured.
    set({
      currentRaid: null,
      stash: nextStash,
      unlocks: nextUnlocks,
      operative: extracted
        ? { ...operative, state: "idle", injuryDebuff: false }
        : { ...operative, state: "idle", injuryDebuff: true },
      // Only the death outcome forces a modal — extracts roll straight into the
      // stash without an extra click.
      raidOutcome: extracted
        ? null
        : {
            type: "death",
            recoveredCount: 0,
            locationId: currentRaid.locationId,
          },
    });
  },

  dismissRaidOutcome: () => {
    set({ raidOutcome: null });
  },

  placeFromPending: (uid, x, y, rotation) => {
    const { currentRaid } = get();
    if (!currentRaid) return false;
    const tile = tileAt(currentRaid.map, currentRaid.operativePos.x, currentRaid.operativePos.y);
    const item = tile?.contents.find((c) => c.uid === uid);
    if (!item) return false;
    const occ = buildOccupancy(currentRaid.pack, currentRaid.packGrid.width, currentRaid.packGrid.height);
    const cells = shapeFor(item.itemId, rotation);
    if (!canPlace(cells, x, y, currentRaid.packGrid.width, currentRaid.packGrid.height, occ)) {
      return false;
    }
    const placement: PackPlacement = {
      uid: item.uid,
      itemId: item.itemId,
      flavor: item.flavor,
      x,
      y,
      rotation,
    };
    const { map: nextMap } = removeFromTileContents(
      currentRaid.map,
      currentRaid.operativePos.x,
      currentRaid.operativePos.y,
      uid,
    );
    set({
      currentRaid: {
        ...currentRaid,
        map: nextMap,
        pack: [...currentRaid.pack, placement],
      },
    });
    return true;
  },

  movePackItem: (uid, x, y, rotation) => {
    const { currentRaid } = get();
    if (!currentRaid) return false;
    const target = currentRaid.pack.find((p) => p.uid === uid);
    if (!target) return false;
    const occ = buildOccupancy(currentRaid.pack, currentRaid.packGrid.width, currentRaid.packGrid.height, uid);
    const cells = shapeFor(target.itemId, rotation);
    if (!canPlace(cells, x, y, currentRaid.packGrid.width, currentRaid.packGrid.height, occ)) {
      return false;
    }
    set({
      currentRaid: {
        ...currentRaid,
        pack: currentRaid.pack.map((p) => (p.uid === uid ? { ...p, x, y, rotation } : p)),
      },
    });
    return true;
  },

  trashFromPending: (uid) => {
    const { currentRaid } = get();
    if (!currentRaid) return;
    const { map: nextMap } = removeFromTileContents(
      currentRaid.map,
      currentRaid.operativePos.x,
      currentRaid.operativePos.y,
      uid,
    );
    set({ currentRaid: { ...currentRaid, map: nextMap } });
  },

  trashFromPack: (uid) => {
    const { currentRaid } = get();
    if (!currentRaid) return;
    set({
      currentRaid: {
        ...currentRaid,
        pack: currentRaid.pack.filter((p) => p.uid !== uid),
      },
    });
  },

  unplacePackItem: (uid) => {
    const { currentRaid } = get();
    if (!currentRaid) return;
    const item = currentRaid.pack.find((p) => p.uid === uid);
    if (!item) return;
    const dropped: StashItem = {
      uid: item.uid,
      itemId: item.itemId,
      flavor: item.flavor,
    };
    const nextMap = addToTileContents(
      currentRaid.map,
      currentRaid.operativePos.x,
      currentRaid.operativePos.y,
      dropped,
    );
    set({
      currentRaid: {
        ...currentRaid,
        pack: currentRaid.pack.filter((p) => p.uid !== uid),
        map: nextMap,
      },
    });
  },

  pruneExpiredPending: () => {
    // No-op now — items don't expire under the room-contents model. Kept on
    // the interface so PackTetris's interval doesn't choke; can be removed
    // once the tetris UI is fully migrated.
  },

  sellItem: (uid) => {
    const { stash, cash } = get();
    const idx = stash.findIndex((i) => i.uid === uid);
    if (idx === -1) return;
    const value = ITEMS[stash[idx].itemId]?.sellValue ?? 0;
    if (value <= 0) return;
    const next = [...stash];
    next.splice(idx, 1);
    set({ stash: next, cash: cash + value });
  },

  sellAllJunk: () => {
    const { stash, cash } = get();
    let earned = 0;
    const keep: StashItem[] = [];
    for (const si of stash) {
      const item = ITEMS[si.itemId];
      if (item && item.tier === "common" && item.sellValue > 0) {
        earned += item.sellValue;
      } else {
        keep.push(si);
      }
    }
    if (earned === 0) return;
    set({ stash: keep, cash: cash + earned });
  },

  buyBackpackUpgrade: () => {
    const { cash, upgrades, hideout } = get();
    const cost = backpackUpgradeCost(upgrades);
    if (cash < cost) return;
    const next: Upgrades = { ...upgrades, backpackLevel: upgrades.backpackLevel + 1 };
    set({
      cash: cash - cost,
      upgrades: next,
      hideout: {
        ...hideout,
        modules: {
          ...hideout.modules,
          backpack: { ...hideout.modules.backpack, capacity: backpackCapacity(next) },
        },
      },
    });
  },

  buyStashUpgrade: () => {
    const { cash, upgrades, hideout } = get();
    const cost = stashUpgradeCost(upgrades);
    if (cash < cost) return;
    const next: Upgrades = { ...upgrades, stashLevel: upgrades.stashLevel + 1 };
    set({
      cash: cash - cost,
      upgrades: next,
      hideout: {
        ...hideout,
        modules: {
          ...hideout.modules,
          stash: { ...hideout.modules.stash, capacity: stashCapacity(next) },
        },
      },
    });
  },

  resetGame: () => {
    clearSave();
    set({
      cash: 0,
      stash: [],
      operative: initialOperative(),
      hideout: buildHideout(initialUpgrades),
      unlocks: { workbench: false, medbay: false, biolab: false },
      upgrades: initialUpgrades,
      currentRaid: null,
      activePanel: "ops",
      rngSeed: Math.floor(Math.random() * 0xffffffff),
      raidOutcome: null,
    });
  },

  hydrate: () => {
    if (get().hydrated) return;
    const loaded = loadGame();
    if (loaded) {
      set({
        cash: loaded.cash,
        stash: loaded.stash,
        operative: loaded.operative,
        hideout: loaded.hideout,
        unlocks: loaded.unlocks,
        upgrades: loaded.upgrades,
        currentRaid: loaded.currentRaid,
        hydrated: true,
      });
    } else {
      set({ hydrated: true });
    }
  },
}));

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function schedulePersist(s: PersistedState) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveGame(s), 400);
}

if (typeof window !== "undefined") {
  useGame.subscribe((state, prev) => {
    if (!state.hydrated) return;
    if (
      state.cash === prev.cash &&
      state.stash === prev.stash &&
      state.operative === prev.operative &&
      state.hideout === prev.hideout &&
      state.unlocks === prev.unlocks &&
      state.upgrades === prev.upgrades &&
      state.currentRaid === prev.currentRaid
    ) {
      return;
    }
    schedulePersist({
      cash: state.cash,
      stash: state.stash,
      operative: state.operative,
      hideout: state.hideout,
      unlocks: state.unlocks,
      upgrades: state.upgrades,
      currentRaid: state.currentRaid,
    });
  });
}
