"use client";

import { create } from "zustand";
import type {
  ConstructionState,
  Equipment,
  Hideout,
  KitSlot,
  Operative,
  ShopState,
  StashItem,
  Unlocks,
  Upgrades,
} from "@/lib/types";
import { makeRng } from "@/lib/engine/raid";
import { refreshShop } from "@/lib/engine/shop";
import { pocketsDimensions, stashCapacity } from "@/lib/engine/upgrades";
import { createKitSlice, type KitSlice } from "./slices/kit";
import { createEconomySlice, type EconomySlice } from "./slices/economy";
import { createRaidSlice, type RaidSlice } from "./slices/raid";
import { createConstructionSlice, type ConstructionSlice } from "./slices/construction";
import {
  defaultConstructionState,
  loadGame,
  saveGame,
  clearSave,
  type PersistedState,
} from "@/lib/engine/save";

export type PanelId = "hideout" | "stash" | "ops" | "feed" | "shop" | "manual" | "data" | "settings" | "recycler" | "foundry";

// After-raid report. Built once in endRaid() — captures the diff between
// startingEquipment and final equipment plus the per-tick counters the slice
// accumulated during the raid. The modal renders directly off this.
export interface RaidReportItem {
  uid: string;
  itemId: string;
  // Sell value at the moment the report was built. Snapshotted so a future
  // item-data change doesn't retroactively shift the report numbers.
  sellValue: number;
}

export interface RaidOutcome {
  type: "death" | "extracted";
  locationId: string;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  // Loot diff. itemsKept = present at end AND start (carried back). itemsLost
  // = in start, missing at end. itemsLooted = present at end but not in start
  // (newly acquired). On death everything starting + everything looted is in
  // itemsLost since the kit gets stripped.
  itemsKept: RaidReportItem[];
  itemsLost: RaidReportItem[];
  itemsLooted: RaidReportItem[];
  startingValue: number;
  endingValue: number;
  // Vitals snapshot at end + accumulators.
  finalHealth: number;
  finalEnergy: number;
  damageTaken: number;
  energySpent: number;
  heatPeak: number;
  // Combat counters.
  combatTargetsDown: number;
  combatTargetsFled: number;
  combatBrokeContact: number;
  combatTradedShots: number;
  // Decisions made via interrupt modals.
  choicesMade: Array<{ eventId: string; optionId: string; label: string }>;
  // Consumables used, collapsed by itemId with a count.
  consumablesUsed: Array<{ itemId: string; count: number }>;
  // Map exploration.
  tilesVisited: number;
  totalTiles: number;
}

// State + non-slice actions. Slice interfaces (KitSlice, etc.) are merged in
// via interface extension so the Zustand store sees one combined shape.
export interface GameState extends KitSlice, EconomySlice, RaidSlice, ConstructionSlice {
  cash: number;
  stash: StashItem[];
  operative: Operative;
  hideout: Hideout;
  unlocks: Unlocks;
  upgrades: Upgrades;
  shop: ShopState;
  construction: ConstructionState;
  activePanel: PanelId;
  rngSeed: number;
  hydrated: boolean;
  // When on, the Data panel becomes visible in the sidebar and debug-only
  // controls (shop reset, future debug actions) appear in their host panels.
  // Persisted in the save so it survives reloads.
  debugMode: boolean;

  setPanel: (p: PanelId) => void;
  resetGame: () => void;
  hydrate: () => void;
  setDebugMode: (on: boolean) => void;
}

// KitSlot is now defined in @/lib/types — re-export so existing imports
// `import { KitSlot } from "@/store/game"` keep working.
export type { KitSlot };

function initialEquipment(upgrades: Upgrades): Equipment {
  return {
    pockets: { grid: pocketsDimensions(upgrades), items: [] },
    bag: null,
    rig: null,
    weapon: null,
    armor: null,
    helmet: null,
  };
}

function initialOperative(upgrades: Upgrades): Operative {
  return {
    name: "OP-01 / VESPER",
    state: "idle",
    injuryDebuff: false,
    skills: { sneak: 1, shoot: 1, scrounge: 1 },
    equipment: initialEquipment(upgrades),
    health: 100,
    energy: 100,
    ammo: 30,
  };
}

function buildHideout(upgrades: Upgrades): Hideout {
  const dim = pocketsDimensions(upgrades);
  return {
    modules: {
      stash: { unlocked: true, capacity: stashCapacity(upgrades) },
      pockets: { unlocked: true, capacity: dim.width * dim.height },
      workbench: { unlocked: false },
      medbay: { unlocked: false },
      loadout: { unlocked: true },
    },
  };
}

const initialUpgrades: Upgrades = { pocketsLevel: 0, stashLevel: 0 };

export const useGame = create<GameState>((set, get, store) => ({
  cash: 0,
  stash: [],
  operative: initialOperative(initialUpgrades),
  hideout: buildHideout(initialUpgrades),
  unlocks: { workbench: false, medbay: false, biolab: false },
  upgrades: initialUpgrades,
  shop: { offers: [], lastRefreshAt: 0 },
  construction: defaultConstructionState(),
  activePanel: "ops",
  rngSeed: Math.floor(Math.random() * 0xffffffff),
  hydrated: false,
  debugMode: false,

  setPanel: (p) => set({ activePanel: p }),
  setDebugMode: (on) => {
    // If the player is currently on the Data panel and flips debug off,
    // bounce them back to Settings so they aren't stranded on a hidden tab.
    const { activePanel } = get();
    set({
      debugMode: on,
      ...(on || activePanel !== "data" ? {} : { activePanel: "settings" as PanelId }),
    });
  },

  ...createRaidSlice(set, get, store),
  ...createKitSlice(set, get, store),
  ...createEconomySlice(set, get, store),
  ...createConstructionSlice(set, get, store),

  resetGame: () => {
    clearSave();
    set({
      cash: 0,
      stash: [],
      operative: initialOperative(initialUpgrades),
      hideout: buildHideout(initialUpgrades),
      unlocks: { workbench: false, medbay: false, biolab: false },
      upgrades: initialUpgrades,
      currentRaid: null,
      shop: refreshShop(makeRng(Math.floor(Math.random() * 0xffffffff)), Date.now()),
      construction: defaultConstructionState(),
      activePanel: "ops",
      rngSeed: Math.floor(Math.random() * 0xffffffff),
      raidOutcome: null,
      debugMode: false,
    });
  },

  hydrate: () => {
    if (get().hydrated) return;
    const loaded = loadGame();
    if (loaded) {
      // First-load shop population: if the migrated save has no offers (or
      // the field is somehow absent), seed some so the panel isn't empty.
      const seed = Math.floor(Math.random() * 0xffffffff);
      const loadedShop = loaded.shop ?? { offers: [], lastRefreshAt: 0 };
      const shop = loadedShop.offers.length === 0
        ? refreshShop(makeRng(seed), Date.now())
        : loadedShop;
      set({
        cash: loaded.cash,
        stash: loaded.stash,
        operative: loaded.operative,
        hideout: loaded.hideout,
        unlocks: loaded.unlocks,
        upgrades: loaded.upgrades,
        currentRaid: loaded.currentRaid,
        shop,
        construction: loaded.construction ?? defaultConstructionState(),
        // If a raid is in progress, return the player to the comms feed
        // (HMR / page reload otherwise drops them on the Ops panel).
        activePanel: loaded.currentRaid ? "feed" : get().activePanel,
        debugMode: !!loaded.debugMode,
        hydrated: true,
      });
    } else {
      // Fresh game — populate shop immediately so player has something to buy.
      const seed = Math.floor(Math.random() * 0xffffffff);
      set({ hydrated: true, shop: refreshShop(makeRng(seed), Date.now()) });
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
      state.currentRaid === prev.currentRaid &&
      state.shop === prev.shop &&
      state.debugMode === prev.debugMode &&
      state.construction === prev.construction
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
      shop: state.shop,
      debugMode: state.debugMode,
      construction: state.construction,
    });
  });
}
