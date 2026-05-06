"use client";

import { create } from "zustand";
import type {
  CurrentRaid,
  Hideout,
  LogEntry,
  Operative,
  StashItem,
  Unlocks,
  Upgrades,
} from "@/lib/types";
import { startRaid, tickRaid, makeLog, makeRng } from "@/lib/engine/raid";
import { ITEMS } from "@/lib/data/items";
import {
  backpackCapacity,
  backpackUpgradeCost,
  stashCapacity,
  stashUpgradeCost,
} from "@/lib/engine/upgrades";
import {
  loadGame,
  saveGame,
  clearSave,
  type PersistedState,
} from "@/lib/engine/save";

export type PanelId = "hideout" | "stash" | "ops" | "feed" | "settings";

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

  setPanel: (p: PanelId) => void;
  beginRaid: (locationId: string) => void;
  doTick: () => void;
  recall: () => void;
  endRaid: (extracted: boolean) => void;
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

function pushBackpack(raid: CurrentRaid, capacity: number, loot: StashItem): CurrentRaid {
  const bp = [...raid.backpack, loot];
  if (bp.length <= capacity) return { ...raid, backpack: bp };
  // Drop the lowest-value item if over capacity (oldest wins on ties)
  let worstIdx = 0;
  let worstValue = Number.POSITIVE_INFINITY;
  for (let i = 0; i < bp.length; i++) {
    const v = ITEMS[bp[i].itemId]?.sellValue ?? 0;
    if (v < worstValue) {
      worstValue = v;
      worstIdx = i;
    }
  }
  bp.splice(worstIdx, 1);
  return { ...raid, backpack: bp };
}

export const useGame = create<GameState>((set, get) => ({
  cash: 0,
  stash: [],
  operative: initialOperative(),
  hideout: buildHideout(initialUpgrades),
  unlocks: { workbench: false, medbay: false },
  upgrades: initialUpgrades,
  currentRaid: null,
  activePanel: "ops",
  rngSeed: Math.floor(Math.random() * 0xffffffff),
  hydrated: false,

  setPanel: (p) => set({ activePanel: p }),

  beginRaid: (locationId) => {
    const { operative } = get();
    if (operative.state !== "idle") return;
    set({
      currentRaid: startRaid(locationId),
      operative: { ...operative, state: "raiding" },
      activePanel: "feed",
    });
  },

  doTick: () => {
    const { currentRaid, hideout, rngSeed } = get();
    if (!currentRaid || !currentRaid.active) return;
    const rand = makeRng(rngSeed + currentRaid.log.length);
    const t = tickRaid(rand);
    let raid: CurrentRaid = {
      ...currentRaid,
      log: [...currentRaid.log, t.log],
      runState: {
        ...currentRaid.runState,
        alertness: Math.max(0, Math.min(100, currentRaid.runState.alertness + t.alertnessDelta)),
        health: Math.max(0, Math.min(100, currentRaid.runState.health + t.healthDelta)),
        energy: Math.max(0, Math.min(100, currentRaid.runState.energy + t.energyDelta)),
        depth: currentRaid.runState.depth + 1,
      },
    };
    if (t.loot) {
      raid = pushBackpack(raid, hideout.modules.backpack.capacity ?? 0, t.loot);
    }
    set({ currentRaid: raid });
  },

  recall: () => {
    const { currentRaid } = get();
    if (!currentRaid || !currentRaid.active) return;
    const log: LogEntry = makeLog("system", "RECALL acknowledged. Operative moving to extract.");
    set({
      currentRaid: { ...currentRaid, log: [...currentRaid.log, log] },
    });
    setTimeout(() => get().endRaid(true), 800);
  },

  endRaid: (extracted) => {
    const { currentRaid, stash, hideout, operative, unlocks } = get();
    if (!currentRaid) return;
    const cap = hideout.modules.stash.capacity ?? 0;
    let nextStash = stash;
    let nextUnlocks = unlocks;
    if (extracted) {
      nextStash = [...stash, ...currentRaid.backpack].slice(-cap);
      if (currentRaid.backpack.some((i) => i.itemId === "workbench_schematic")) {
        nextUnlocks = { ...unlocks, workbench: true };
      }
    }
    set({
      currentRaid: null,
      stash: nextStash,
      unlocks: nextUnlocks,
      operative: { ...operative, state: "idle" },
    });
  },

  sellItem: (uid) => {
    const { stash, cash } = get();
    const idx = stash.findIndex((i) => i.uid === uid);
    if (idx === -1) return;
    const value = ITEMS[stash[idx].itemId]?.sellValue ?? 0;
    if (value <= 0) return; // experimental quest items don't sell
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
      unlocks: { workbench: false, medbay: false },
      upgrades: initialUpgrades,
      currentRaid: null,
      activePanel: "ops",
      rngSeed: Math.floor(Math.random() * 0xffffffff),
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

// Persistence: debounced save on relevant slice changes.
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
