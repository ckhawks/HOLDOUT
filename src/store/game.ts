"use client";

import { create } from "zustand";
import type {
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
  PENDING_EXPIRY_MS,
  prunePending,
  pushPending,
  resolveBranch,
  startRaid,
  tickRaid,
  applyBandage,
  makeLog,
  makeRng,
} from "@/lib/engine/raid";
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
  markTileLooted,
  revealFrom,
  stepBackward,
  stepForward,
  stepLateral,
} from "@/lib/engine/map";
import {
  loadGame,
  saveGame,
  clearSave,
  type PersistedState,
} from "@/lib/engine/save";
import { LOCATIONS_BY_ID } from "@/lib/data/locations";

export type PanelId = "hideout" | "stash" | "ops" | "feed" | "settings";

export { PENDING_EXPIRY_MS };

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
  resolveBranch: (choiceId: string) => void;
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
      currentRaid: startRaid(locationId, packDimensions(upgrades), pendingCapacity(upgrades), mapRand),
      operative: { ...operative, state: "raiding" },
      activePanel: "feed",
    });
  },

  doTick: () => {
    const { currentRaid, rngSeed } = get();
    if (!currentRaid || !currentRaid.active) return;
    if (currentRaid.pendingChoice) return; // tick paused while awaiting decision
    const rand = makeRng(rngSeed + currentRaid.log.length);
    const tile = currentRaid.map.tiles[
      currentRaid.operativePos.y * currentRaid.map.width + currentRaid.operativePos.x
    ];
    const t = tickRaid(
      rand,
      currentRaid.locationId,
      currentRaid.runState,
      tile?.type,
      tile?.looted,
      tile?.name,
    );
    let flags: string[] = currentRaid.runState.flags;
    if (t.flagsAdded.length || t.flagsRemoved.length) {
      const set = new Set(flags);
      for (const f of t.flagsAdded) set.add(f);
      for (const f of t.flagsRemoved) set.delete(f);
      flags = Array.from(set);
    }
    // Advance the operative on the map to match the tick's distance change.
    // Use the *previously* committed nextStep so the preview the player saw
    // becomes the actual move. After moving, compute a new nextStep for the
    // following tick.
    let nextPos = currentRaid.operativePos;
    let nextMap = currentRaid.map;
    let nextStep = currentRaid.nextStep;
    const isExtracting = currentRaid.runState.flags.includes("extracting");
    if (t.distanceAdvance > 0 && !isExtracting) {
      nextPos = currentRaid.nextStep
        ? { ...currentRaid.nextStep }
        : stepForward(currentRaid.map, currentRaid.operativePos, rand);
    } else if (t.distanceAdvance < 0 && isExtracting) {
      nextPos = currentRaid.nextStep
        ? { ...currentRaid.nextStep }
        : stepBackward(currentRaid.map, currentRaid.operativePos);
    }
    if (nextPos !== currentRaid.operativePos) {
      nextMap = markTileLooted(nextMap, nextPos.x, nextPos.y);
      nextMap = revealFrom(nextMap, nextPos.x, nextPos.y);
      // Pre-roll the next move now that the operative has settled here.
      nextStep = isExtracting
        ? stepBackward(nextMap, nextPos)
        : stepForward(nextMap, nextPos, rand);
    }
    let raid: CurrentRaid = {
      ...currentRaid,
      log: [...currentRaid.log, t.log],
      pendingChoice: t.pendingChoice,
      operativePos: nextPos,
      map: nextMap,
      nextStep,
      runState: {
        ...currentRaid.runState,
        alertness: Math.max(0, Math.min(100, currentRaid.runState.alertness + t.alertnessDelta)),
        health: Math.max(0, Math.min(100, currentRaid.runState.health + t.healthDelta)),
        energy: Math.max(0, Math.min(100, currentRaid.runState.energy + t.energyDelta)),
        ammo: Math.max(0, currentRaid.runState.ammo + t.ammoDelta),
        depth: currentRaid.runState.depth + t.depthAdvance,
        distanceFromExtract: Math.max(
          0,
          currentRaid.runState.distanceFromExtract + t.distanceAdvance,
        ),
        flags,
      },
    };
    if (t.loot) {
      raid = pushPending(raid, t.loot);
    }

    // Death check: HP at 0 ends the raid as a loss — pack contents lost.
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

    // Extract complete: distance reached 0 while extracting flag is set.
    const extracting = raid.runState.flags.includes("extracting");
    if (extracting && raid.runState.distanceFromExtract <= 0) {
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

    set({ currentRaid: raid });
  },

  resolveBranch: (choiceId) => {
    const { currentRaid, rngSeed } = get();
    if (!currentRaid || !currentRaid.pendingChoice) return;
    const rand = makeRng(rngSeed + currentRaid.log.length + 1);
    const distBefore = currentRaid.runState.distanceFromExtract;
    let { raid } = resolveBranch(currentRaid, choiceId, rand);
    const distDelta = raid.runState.distanceFromExtract - distBefore;
    if (distDelta > 0) {
      // Reposition-style branches (depthAdvance: 0, distanceAdvance > 0) move
      // the operative sideways rather than deeper. Detect that via the chosen
      // option's effects so we route through stepLateral instead of using the
      // cached forward nextStep.
      const choice = currentRaid.pendingChoice?.options.find((o) => o.id === choiceId);
      const isLateral =
        !!choice && (choice.effects?.depthAdvance ?? 1) === 0;
      const nextPos = isLateral
        ? stepLateral(raid.map, raid.operativePos)
        : raid.nextStep
          ? { ...raid.nextStep }
          : stepForward(raid.map, raid.operativePos, rand);
      if (nextPos.x !== raid.operativePos.x || nextPos.y !== raid.operativePos.y) {
        let m = markTileLooted(raid.map, nextPos.x, nextPos.y);
        m = revealFrom(m, nextPos.x, nextPos.y);
        const newNext = stepForward(m, nextPos, rand);
        raid = { ...raid, operativePos: nextPos, map: m, nextStep: newNext };
      }
    }
    if (raid.runState.health <= 0) {
      raid = {
        ...raid,
        log: [...raid.log, makeLog("system", "Vital signs flat. Operative is down.")],
        active: false,
      };
      set({ currentRaid: raid });
      setTimeout(() => get().endRaid(false), 800);
      return;
    }
    set({ currentRaid: raid });
  },

  togglePause: () => {
    const { currentRaid } = get();
    if (!currentRaid || !currentRaid.active) return;
    if (currentRaid.pausedAt) {
      // Resume: shift wall-clock timestamps forward by the pause duration so
      // pending items don't expire and branch timers don't auto-fire.
      const pauseDuration = Date.now() - currentRaid.pausedAt;
      const pending = currentRaid.pending.map((p) => ({
        ...p,
        arrivedAt: p.arrivedAt + pauseDuration,
      }));
      const pendingChoice = currentRaid.pendingChoice
        ? {
            ...currentRaid.pendingChoice,
            startedAt: currentRaid.pendingChoice.startedAt + pauseDuration,
          }
        : null;
      set({
        currentRaid: { ...currentRaid, pausedAt: null, pending, pendingChoice },
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
        // pendingChoice is dropped on recall — branching prompts shouldn't block extract.
        pendingChoice: null,
        nextStep: settledNextStep,
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
    const pendingItem = currentRaid.pending.find((p) => p.uid === uid);
    if (!pendingItem) return false;
    const occ = buildOccupancy(currentRaid.pack, currentRaid.packGrid.width, currentRaid.packGrid.height);
    const cells = shapeFor(pendingItem.itemId, rotation);
    if (!canPlace(cells, x, y, currentRaid.packGrid.width, currentRaid.packGrid.height, occ)) {
      return false;
    }
    const placement: PackPlacement = {
      uid: pendingItem.uid,
      itemId: pendingItem.itemId,
      flavor: pendingItem.flavor,
      x,
      y,
      rotation,
    };
    set({
      currentRaid: {
        ...currentRaid,
        pack: [...currentRaid.pack, placement],
        pending: currentRaid.pending.filter((p) => p.uid !== uid),
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
    set({
      currentRaid: {
        ...currentRaid,
        pending: currentRaid.pending.filter((p) => p.uid !== uid),
      },
    });
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
    const reborn: PendingItem = {
      uid: item.uid,
      itemId: item.itemId,
      flavor: item.flavor,
      arrivedAt: Date.now(),
    };
    const without = { ...currentRaid, pack: currentRaid.pack.filter((p) => p.uid !== uid) };
    set({ currentRaid: pushPending(without, reborn) });
  },

  pruneExpiredPending: () => {
    const { currentRaid } = get();
    if (!currentRaid || !currentRaid.active) return;
    const next = prunePending(currentRaid, Date.now());
    if (next === currentRaid) return;
    set({ currentRaid: next });
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
