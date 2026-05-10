"use client";

import { create } from "zustand";
import type {
  ActionId,
  CurrentRaid,
  Equipment,
  EquipSlot,
  Hideout,
  KitSlot,
  LogEntry,
  Operative,
  PackPlacement,
  Rotation,
  ShopState,
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
import { refreshShop } from "@/lib/engine/shop";
import {
  pocketsDimensions,
  stashCapacity,
  stashUpgradeCost,
} from "@/lib/engine/upgrades";
import {
  equipItem,
  moveBetweenSlots,
  placeIntoSlot,
  removeFromKit,
  unequipItem,
} from "@/lib/engine/equipment";
import {
  addToTileContents,
  clearTileThreat,
  consumeLockedFromTile,
  consumeLootFromTile,
  markTileVisited,
  pathToEntry,
  removeFromTileContents,
  revealFrom,
  stepBackward,
  stepForward,
  stepLateral,
  tileAt,
} from "@/lib/engine/map";
import {
  loadGame,
  saveGame,
  clearSave,
  type PersistedState,
} from "@/lib/engine/save";
import { LOCATIONS_BY_ID } from "@/lib/data/locations";

export type PanelId = "hideout" | "stash" | "ops" | "feed" | "shop" | "manual" | "settings";

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
  shop: ShopState;
  activePanel: PanelId;
  rngSeed: number;
  hydrated: boolean;
  raidOutcome: RaidOutcome | null;

  setPanel: (p: PanelId) => void;
  beginRaid: (locationId: string) => void;
  doTick: () => void;
  overrideAction: (action: ActionId) => void;
  resolvePendingChoice: (choiceId: string) => void;
  useBandage: () => void;
  togglePause: () => void;
  skipActionTimer: () => void;
  recall: () => void;
  cancelRecall: () => void;
  endRaid: (extracted: boolean) => void;
  dismissRaidOutcome: () => void;
  // Kit / equipment actions. Operate on currentRaid.equipment during a raid;
  // on operative.equipment when idle (loadout pre-raid, unload post-extract).
  pickupFromFloor: (uid: string, slot: KitSlot, x: number, y: number, rotation: Rotation) => boolean;
  dropToFloor: (uid: string) => void;
  trashFromFloor: (uid: string) => void;
  trashFromKit: (uid: string) => void;
  moveKitItem: (uid: string, slot: KitSlot, x: number, y: number, rotation: Rotation) => boolean;
  kitFromStash: (uid: string, slot: KitSlot, x: number, y: number, rotation: Rotation) => boolean;
  stashFromKit: (uid: string) => boolean;
  // Equip/unequip the four slots (bag/weapon/armor/helmet). Source/dest
  // is stash when idle and tile floor when in raid. The drag UI picks the
  // right action based on context.
  equipFromStash: (uid: string) => boolean;
  unequipToStash: (slot: EquipSlot) => boolean;
  equipFromFloor: (uid: string) => boolean;
  unequipToFloor: (slot: EquipSlot) => boolean;
  emptyKitToStash: () => void;
  sellItem: (uid: string) => void;
  sellAllJunk: () => void;
  buyOffer: (offerId: string) => boolean;
  buyStashUpgrade: () => void;
  resetGame: () => void;
  hydrate: () => void;
}

// KitSlot is now defined in @/lib/types — re-export so existing imports
// `import { KitSlot } from "@/store/game"` keep working.
export type { KitSlot };

function initialEquipment(upgrades: Upgrades): Equipment {
  return {
    pockets: { grid: pocketsDimensions(upgrades), items: [] },
    bag: null,
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

export const useGame = create<GameState>((set, get) => ({
  cash: 0,
  stash: [],
  operative: initialOperative(initialUpgrades),
  hideout: buildHideout(initialUpgrades),
  unlocks: { workbench: false, medbay: false, biolab: false },
  upgrades: initialUpgrades,
  currentRaid: null,
  shop: { offers: [], lastRefreshAt: 0 },
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
    // Operative carries their equipment INTO the raid. Pockets grid reflects
    // current pocketsLevel — re-derived here so a level bought between raids
    // takes effect on the next launch.
    const equipment: Equipment = {
      ...operative.equipment,
      pockets: {
        grid: pocketsDimensions(upgrades),
        items: operative.equipment.pockets.items,
      },
    };
    set({
      stash: nextStash,
      currentRaid: startRaid(locationId, equipment, mapRand, Date.now()),
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
    const tickNow = Date.now();
    const t = tickAction(currentRaid, rand, tickNow);

    // If the action raised a forced-choice (e.g. patrol encounter), set
    // pendingChoice on the raid and bail. The action's other effects already
    // came in suppressed.
    if (t.pendingChoice) {
      set({
        currentRaid: {
          ...currentRaid,
          log: [...currentRaid.log, ...t.logs],
          pendingChoice: t.pendingChoice,
        },
      });
      return;
    }

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
      // Entrance flavor: always log first visits during raid; during extract,
      // only log re-entries that have something interesting (unsearched loot
      // or items on the floor) to avoid spam.
      const arrivedTileNow = tileAt(nextMap, nextPos.x, nextPos.y);
      if (arrivedTileNow && arrivedTileNow.type !== "entry") {
        const hasInterest =
          arrivedTileNow.lootRemaining > 0 ||
          arrivedTileNow.contents.length > 0;
        if (!isExtracting && wasFirstVisit) {
          entrance = entranceLog(arrivedTileNow, tickNow, rand);
        } else if (isExtracting && hasInterest) {
          entrance = entranceLog(arrivedTileNow, tickNow, rand);
        }
      }
    }
    if (t.consumedLoot) {
      const { map: afterConsume } = consumeLootFromTile(
        nextMap,
        currentRaid.operativePos.x,
        currentRaid.operativePos.y,
      );
      nextMap = afterConsume;
    }
    if (t.breachedLocked) {
      const { map: afterBreach } = consumeLockedFromTile(
        nextMap,
        currentRaid.operativePos.x,
        currentRaid.operativePos.y,
      );
      nextMap = afterBreach;
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

    const advancedDepth = t.movement === "forward" ? 1 : 0;

    // distanceFromExtract is derived from the actual path back to entry, not
    // a separate counter that can drift from the operative's real position.
    const path = pathToEntry(nextMap, nextPos.x, nextPos.y);
    const distanceFromExtract = Math.max(0, path.length - 1);

    const allLogs = entrance ? [...t.logs, entrance] : t.logs;
    let raid: CurrentRaid = {
      ...currentRaid,
      log: [...currentRaid.log, ...allLogs],
      operativePos: nextPos,
      map: nextMap,
      nextStep,
      runState: {
        ...currentRaid.runState,
        heat: Math.max(0, Math.min(100, currentRaid.runState.heat + t.heatDelta)),
        health: Math.max(0, Math.min(100, currentRaid.runState.health + t.healthDelta)),
        energy: Math.max(0, Math.min(100, currentRaid.runState.energy + t.energyDelta)),
        ammo: Math.max(0, currentRaid.runState.ammo + t.ammoDelta),
        depth: currentRaid.runState.depth + advancedDepth,
        distanceFromExtract,
        flags,
      },
    };

    // Death check. Schedule end via pendingEnd state — useRaidLoop owns the
    // timer so the store doesn't need to chain a setTimeout here.
    if (raid.runState.health <= 0) {
      raid = {
        ...raid,
        log: [
          ...raid.log,
          makeLog("system", "Vital signs flat. Operative is down.", undefined, tickNow, rand),
        ],
        active: false,
        pendingEnd: { at: tickNow + 800, success: false },
      };
      set({ currentRaid: raid });
      return;
    }

    // Extract complete: operative actually standing on the entry tile.
    const stillExtracting = raid.runState.flags.includes("extracting");
    const atEntry =
      raid.operativePos.x === raid.map.entry.x &&
      raid.operativePos.y === raid.map.entry.y;
    if (stillExtracting && atEntry) {
      raid = {
        ...raid,
        log: [
          ...raid.log,
          makeLog("system", "At the extract point. Pulling out.", undefined, tickNow, rand),
        ],
        active: false,
        pendingEnd: { at: tickNow + 600, success: true },
      };
      set({ currentRaid: raid });
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

  resolvePendingChoice: (choiceId) => {
    const { currentRaid } = get();
    if (!currentRaid || !currentRaid.pendingChoice) return;
    const choice =
      currentRaid.pendingChoice.options.find((o) => o.id === choiceId) ??
      currentRaid.pendingChoice.options.find(
        (o) => o.id === currentRaid.pendingChoice!.defaultId,
      ) ??
      currentRaid.pendingChoice.options[0];
    const fx = choice.effects ?? {};
    const rs = currentRaid.runState;

    // Build the next flag set from this choice.
    const flagSet = new Set(rs.flags);
    for (const f of fx.flagsAdded ?? []) flagSet.add(f);
    for (const f of fx.flagsRemoved ?? []) flagSet.delete(f);
    const flags = Array.from(flagSet);

    // Spatial movement based on the choice and the situation.
    let nextMap = currentRaid.map;
    let nextPos = currentRaid.operativePos;
    let nextStep = currentRaid.nextStep;
    let depthChange = fx.depthAdvance ?? 0;
    let distanceChange = fx.distanceAdvance ?? 0;
    const movingForwardForCombat = !!fx.flagsAdded?.includes("combat_engaged");
    if (movingForwardForCombat) {
      // Engage-into-patrol: commit the move into the threat tile, clear the
      // threat (operative is now in the room with the target). distance
      // advances by 1 to match the move.
      const fwd = currentRaid.nextStep
        ? { ...currentRaid.nextStep }
        : stepForward(nextMap, currentRaid.operativePos, makeRng(Date.now()));
      if (
        fwd.x !== currentRaid.operativePos.x ||
        fwd.y !== currentRaid.operativePos.y
      ) {
        nextPos = fwd;
        nextMap = markTileVisited(nextMap, fwd.x, fwd.y);
        nextMap = clearTileThreat(nextMap, fwd.x, fwd.y);
        nextMap = revealFrom(nextMap, fwd.x, fwd.y);
        nextStep = stepForward(nextMap, fwd, makeRng(Date.now()));
        depthChange = 1;
        distanceChange = 1;
      }
    } else if (distanceChange > 0 && depthChange === 0) {
      // Reposition-style: lateral lane shift away from entry's lane.
      const lateral = stepLateral(nextMap, currentRaid.operativePos);
      if (
        lateral.x !== currentRaid.operativePos.x ||
        lateral.y !== currentRaid.operativePos.y
      ) {
        nextPos = lateral;
        nextMap = markTileVisited(nextMap, lateral.x, lateral.y);
        nextMap = revealFrom(nextMap, lateral.x, lateral.y);
        nextStep = stepForward(nextMap, lateral, makeRng(Date.now()));
      } else {
        distanceChange = 0;
      }
    }

    const choiceLogs: LogEntry[] = [
      makeLog("choice_result", choice.label, undefined, Date.now(), Math.random),
    ];
    let raid: CurrentRaid = {
      ...currentRaid,
      log: [...currentRaid.log, ...choiceLogs],
      pendingChoice: null,
      operativePos: nextPos,
      map: nextMap,
      nextStep,
      runState: {
        ...rs,
        heat: Math.max(0, Math.min(100, rs.heat + (fx.heatDelta ?? 0))),
        health: Math.max(0, Math.min(100, rs.health + (fx.healthDelta ?? 0))),
        energy: Math.max(0, Math.min(100, rs.energy + (fx.energyDelta ?? 0))),
        ammo: Math.max(0, rs.ammo + (fx.ammoDelta ?? 0)),
        depth: rs.depth + depthChange,
        distanceFromExtract: Math.max(
          0,
          pathToEntry(nextMap, nextPos.x, nextPos.y).length - 1,
        ),
        flags,
      },
    };

    // Auto-pick the next action and reset the timer.
    raid = {
      ...raid,
      queuedAction: autoPickAction(raid),
      actionStartedAt: Date.now(),
    };
    set({ currentRaid: raid });
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

  skipActionTimer: () => {
    const { currentRaid } = get();
    if (!currentRaid || !currentRaid.active) return;
    if (currentRaid.pausedAt) return;
    if (currentRaid.pendingChoice) return;
    // Shift actionStartedAt back so the timer reads as fully elapsed; the
    // raid loop effect re-fires with remaining=0 and ticks immediately.
    set({
      currentRaid: {
        ...currentRaid,
        actionStartedAt: Date.now() - ACTION_TIMER_MS,
      },
    });
  },

  useBandage: () => {
    const { currentRaid } = get();
    if (!currentRaid || !currentRaid.active) return;
    const next = applyBandage(currentRaid, Date.now(), Math.random);
    if (next === currentRaid) return;
    set({ currentRaid: next });
  },

  cancelRecall: () => {
    const { currentRaid, operative } = get();
    if (!currentRaid || !currentRaid.active) return;
    if (!currentRaid.runState.flags.includes("extracting")) return;
    const flags = currentRaid.runState.flags.filter((f) => f !== "extracting");
    const log = makeLog("system", "Recall canceled. Resuming raid.", undefined, Date.now(), Math.random);
    // Re-pick a non-extract next step from current pos (forward).
    const nextStep = stepForward(currentRaid.map, currentRaid.operativePos, makeRng(Date.now()));
    set({
      currentRaid: {
        ...currentRaid,
        log: [...currentRaid.log, log],
        runState: { ...currentRaid.runState, flags },
        nextStep,
        queuedAction: "move_forward",
        actionStartedAt: Date.now(),
      },
      operative: { ...operative, state: "raiding" },
    });
  },

  recall: () => {
    const { currentRaid, operative } = get();
    if (!currentRaid || !currentRaid.active) return;
    if (currentRaid.runState.flags.includes("extracting")) return;
    const log: LogEntry = makeLog(
      "system",
      `RECALL acknowledged. Backtracking to extract — about ${currentRaid.runState.distanceFromExtract} rooms away.`,
      undefined,
      Date.now(),
      Math.random,
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
    const { currentRaid, operative, unlocks } = get();
    if (!currentRaid) return;
    let nextOperative: Operative;
    let nextUnlocks = unlocks;
    if (extracted) {
      // Equipment stays on the operative — items are NOT auto-stashed. Player
      // unloads manually from the Stash panel's Kit subview (or Empty kit).
      const eq = currentRaid.equipment;
      const allItems = [
        ...eq.pockets.items,
        ...(eq.bag?.items ?? []),
      ];
      if (allItems.some((i) => i.itemId === "workbench_schematic")) {
        nextUnlocks = { ...nextUnlocks, workbench: true };
      }
      if (allItems.some((i) => i.itemId === "biolab_coords")) {
        nextUnlocks = { ...nextUnlocks, biolab: true };
      }
      nextOperative = {
        ...operative,
        state: "idle",
        injuryDebuff: false,
        equipment: eq,
      };
    } else {
      // Death: lose all kit contents, strip equipped bag/weapon/armor/helmet.
      // Pockets grid persists (it's an upgrade level, not loot).
      nextOperative = {
        ...operative,
        state: "idle",
        injuryDebuff: true,
        equipment: {
          pockets: {
            grid: operative.equipment.pockets.grid,
            items: [],
          },
          bag: null,
          weapon: null,
          armor: null,
          helmet: null,
        },
      };
    }
    // Marketplace restocks every time the operative comes home.
    const { rngSeed } = get();
    const shop = refreshShop(makeRng(rngSeed + Date.now()), Date.now());
    set({
      currentRaid: null,
      unlocks: nextUnlocks,
      operative: nextOperative,
      shop,
      // Only death forces a modal — extracts go straight back to the terminal.
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

  pickupFromFloor: (uid, slot, x, y, rotation) => {
    const { currentRaid } = get();
    if (!currentRaid) return false;
    const tile = tileAt(currentRaid.map, currentRaid.operativePos.x, currentRaid.operativePos.y);
    const item = tile?.contents.find((c) => c.uid === uid);
    if (!item) return false;
    const placed = placeIntoSlot(currentRaid.equipment, slot, item, x, y, rotation);
    if (!placed) return false;
    const { map: nextMap } = removeFromTileContents(
      currentRaid.map,
      currentRaid.operativePos.x,
      currentRaid.operativePos.y,
      uid,
    );
    set({ currentRaid: { ...currentRaid, map: nextMap, equipment: placed } });
    return true;
  },

  moveKitItem: (uid, slot, x, y, rotation) => {
    const { currentRaid, operative } = get();
    const eq = currentRaid?.equipment ?? operative.equipment;
    const moved = moveBetweenSlots(eq, uid, slot, x, y, rotation);
    if (!moved) return false;
    if (currentRaid) {
      set({ currentRaid: { ...currentRaid, equipment: moved } });
    } else {
      set({ operative: { ...operative, equipment: moved } });
    }
    return true;
  },

  dropToFloor: (uid) => {
    const { currentRaid } = get();
    if (!currentRaid) return;
    const removed = removeFromKit(currentRaid.equipment, uid);
    if (!removed) return;
    const dropped: StashItem = {
      uid: removed.item.uid,
      itemId: removed.item.itemId,
      flavor: removed.item.flavor,
    };
    const nextMap = addToTileContents(
      currentRaid.map,
      currentRaid.operativePos.x,
      currentRaid.operativePos.y,
      dropped,
    );
    set({ currentRaid: { ...currentRaid, equipment: removed.next, map: nextMap } });
  },

  trashFromFloor: (uid) => {
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

  trashFromKit: (uid) => {
    const { currentRaid, operative } = get();
    const eq = currentRaid?.equipment ?? operative.equipment;
    const removed = removeFromKit(eq, uid);
    if (!removed) return;
    if (currentRaid) {
      set({ currentRaid: { ...currentRaid, equipment: removed.next } });
    } else {
      set({ operative: { ...operative, equipment: removed.next } });
    }
  },

  kitFromStash: (uid, slot, x, y, rotation) => {
    const { currentRaid, operative, stash } = get();
    if (currentRaid) return false; // pre-raid only
    const idx = stash.findIndex((s) => s.uid === uid);
    if (idx === -1) return false;
    const item = stash[idx];
    const placed = placeIntoSlot(operative.equipment, slot, item, x, y, rotation);
    if (!placed) return false;
    const nextStash = [...stash.slice(0, idx), ...stash.slice(idx + 1)];
    set({ stash: nextStash, operative: { ...operative, equipment: placed } });
    return true;
  },

  stashFromKit: (uid) => {
    const { currentRaid, operative, stash, hideout } = get();
    if (currentRaid) return false; // pre-raid / post-extract only
    const cap = hideout.modules.stash.capacity ?? Infinity;
    if (stash.length >= cap) return false;
    const removed = removeFromKit(operative.equipment, uid);
    if (!removed) return false;
    const stashItem: StashItem = {
      uid: removed.item.uid,
      itemId: removed.item.itemId,
      flavor: removed.item.flavor,
    };
    set({
      stash: [...stash, stashItem],
      operative: { ...operative, equipment: removed.next },
    });
    return true;
  },

  equipFromStash: (uid) => {
    const { currentRaid, operative, stash } = get();
    if (currentRaid) return false;
    const idx = stash.findIndex((s) => s.uid === uid);
    if (idx === -1) return false;
    const equipped = equipItem(operative.equipment, stash[idx]);
    if (!equipped) return false;
    set({
      stash: [...stash.slice(0, idx), ...stash.slice(idx + 1)],
      operative: { ...operative, equipment: equipped },
    });
    return true;
  },

  unequipToStash: (slot) => {
    const { currentRaid, operative, stash, hideout } = get();
    if (currentRaid) return false;
    const result = unequipItem(operative.equipment, slot);
    if (!result) return false;
    const cap = hideout.modules.stash.capacity ?? Infinity;
    if (stash.length >= cap) return false;
    const stashItem: StashItem = {
      uid: result.removed.uid,
      itemId: result.removed.itemId,
      flavor: result.removed.flavor,
    };
    set({
      stash: [...stash, stashItem],
      operative: { ...operative, equipment: result.next },
    });
    return true;
  },

  equipFromFloor: (uid) => {
    const { currentRaid } = get();
    if (!currentRaid) return false;
    const tile = tileAt(currentRaid.map, currentRaid.operativePos.x, currentRaid.operativePos.y);
    const item = tile?.contents.find((c) => c.uid === uid);
    if (!item) return false;
    const equipped = equipItem(currentRaid.equipment, item);
    if (!equipped) return false;
    const { map: nextMap } = removeFromTileContents(
      currentRaid.map,
      currentRaid.operativePos.x,
      currentRaid.operativePos.y,
      uid,
    );
    set({ currentRaid: { ...currentRaid, map: nextMap, equipment: equipped } });
    return true;
  },

  unequipToFloor: (slot) => {
    const { currentRaid } = get();
    if (!currentRaid) return false;
    const result = unequipItem(currentRaid.equipment, slot);
    if (!result) return false;
    const dropped: StashItem = {
      uid: result.removed.uid,
      itemId: result.removed.itemId,
      flavor: result.removed.flavor,
    };
    const nextMap = addToTileContents(
      currentRaid.map,
      currentRaid.operativePos.x,
      currentRaid.operativePos.y,
      dropped,
    );
    set({ currentRaid: { ...currentRaid, equipment: result.next, map: nextMap } });
    return true;
  },

  emptyKitToStash: () => {
    const { currentRaid, operative, stash, hideout } = get();
    if (currentRaid) return; // idle only
    const cap = hideout.modules.stash.capacity ?? Infinity;
    const nextStash = [...stash];
    let pockets = operative.equipment.pockets;
    let bag = operative.equipment.bag;
    // Drain pockets first, then bag. Stop on capacity — don't silently lose.
    const drain = (items: PackPlacement[]) => {
      const remaining: PackPlacement[] = [];
      for (const p of items) {
        if (nextStash.length >= cap) {
          remaining.push(p);
          continue;
        }
        nextStash.push({ uid: p.uid, itemId: p.itemId, flavor: p.flavor });
      }
      return remaining;
    };
    pockets = { ...pockets, items: drain(pockets.items) };
    if (bag) bag = { ...bag, items: drain(bag.items) };
    set({
      stash: nextStash,
      operative: { ...operative, equipment: { ...operative.equipment, pockets, bag } },
    });
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

  buyOffer: (offerId) => {
    const { shop, cash, stash, hideout } = get();
    const idx = shop.offers.findIndex((o) => o.offerId === offerId);
    if (idx === -1) return false;
    const offer = shop.offers[idx];
    if (offer.stock <= 0) return false;
    if (cash < offer.price) return false;
    const cap = hideout.modules.stash.capacity ?? Infinity;
    if (stash.length >= cap) return false;
    const newItem: StashItem = {
      uid: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      itemId: offer.itemId,
    };
    const nextStock = offer.stock - 1;
    const nextOffers = nextStock <= 0
      ? [...shop.offers.slice(0, idx), ...shop.offers.slice(idx + 1)]
      : shop.offers.map((o) => (o.offerId === offerId ? { ...o, stock: nextStock } : o));
    set({
      cash: cash - offer.price,
      stash: [...stash, newItem],
      shop: { ...shop, offers: nextOffers },
    });
    return true;
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
      operative: initialOperative(initialUpgrades),
      hideout: buildHideout(initialUpgrades),
      unlocks: { workbench: false, medbay: false, biolab: false },
      upgrades: initialUpgrades,
      currentRaid: null,
      shop: refreshShop(makeRng(Math.floor(Math.random() * 0xffffffff)), Date.now()),
      activePanel: "ops",
      rngSeed: Math.floor(Math.random() * 0xffffffff),
      raidOutcome: null,
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
        // If a raid is in progress, return the player to the comms feed
        // (HMR / page reload otherwise drops them on the Ops panel).
        activePanel: loaded.currentRaid ? "feed" : get().activePanel,
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
      state.shop === prev.shop
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
    });
  });
}
