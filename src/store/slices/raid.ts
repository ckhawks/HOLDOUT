import type { StateCreator } from "zustand";
import type {
  ActionId,
  CurrentRaid,
  Equipment,
  LogEntry,
  Operative,
  Unlocks,
} from "@/lib/types";
import {
  ACTION_TIMER_MS,
  makeRng,
  startRaid,
  tickAction,
} from "@/lib/engine/raid";
import {
  applyBandage,
  applyConsumable,
  applyConsumableFromFloor,
} from "@/lib/engine/consumables";
import { removeFromKit } from "@/lib/engine/equipment";
import { entranceLog } from "@/lib/engine/flavor";
import { makeLog } from "@/lib/engine/logging";
import { autoPickAction } from "@/lib/engine/actions";
import { tickResearch } from "@/lib/engine/research";
import { CRAFT_RECIPES } from "@/lib/data/recipes";
import { refreshShop } from "@/lib/engine/shop";
import { pocketsDimensions } from "@/lib/engine/upgrades";
import {
  addToTileContents,
  clearTileThreat,
  consumeLockedFromTile,
  consumeLootFromTile,
  markTileVisited,
  pathToEntry,
  revealFrom,
  stepBackward,
  stepForward,
  stepLateral,
  tileAt,
} from "@/lib/engine/map";
import { LOCATIONS_BY_ID } from "@/lib/data/locations";
import { ITEMS } from "@/lib/data/items";
import type { GameState, RaidOutcome, RaidReportItem } from "../game";

// Raid lifecycle slice. Owns currentRaid + raidOutcome state and every action
// that mutates a raid in flight: begin, tick, override, choice resolution,
// bandage/consumable, pause, skip, recall, cancel, end. Also handles the
// post-end shop refresh + operative-state cleanup.
export interface RaidSlice {
  currentRaid: CurrentRaid | null;
  raidOutcome: RaidOutcome | null;
  beginRaid: (locationId: string) => void;
  doTick: () => void;
  overrideAction: (action: ActionId) => void;
  overrideNextStep: (target: { x: number; y: number }) => void;
  resolvePendingChoice: (choiceId: string) => void;
  useBandage: () => void;
  useConsumable: (uid: string) => void;
  useConsumableFromFloor: (uid: string) => void;
  togglePause: () => void;
  skipActionTimer: () => void;
  recall: () => void;
  cancelRecall: () => void;
  endRaid: (extracted: boolean) => void;
  dismissRaidOutcome: () => void;
}

export const createRaidSlice: StateCreator<GameState, [], [], RaidSlice> = (set, get) => ({
  currentRaid: null,
  raidOutcome: null,

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
      currentRaid: startRaid(
        locationId,
        equipment,
        { health: operative.health, energy: operative.energy, ammo: operative.ammo },
        mapRand,
        Date.now(),
      ),
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
    let nextEquipment = currentRaid.equipment;
    if (t.consumedKeyUid) {
      const removed = removeFromKit(nextEquipment, t.consumedKeyUid);
      if (removed) nextEquipment = removed.next;
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
      const flagSet = new Set(flags);
      for (const f of t.flagsAdded) flagSet.add(f);
      for (const f of t.flagsRemoved) flagSet.delete(f);
      flags = Array.from(flagSet);
    }

    const advancedDepth = t.movement === "forward" ? 1 : 0;

    // distanceFromExtract is derived from the actual path back to entry, not
    // a separate counter that can drift from the operative's real position.
    const path = pathToEntry(nextMap, nextPos.x, nextPos.y);
    const distanceFromExtract = Math.max(0, path.length - 1);

    const allLogs = entrance ? [...t.logs, entrance] : t.logs;
    const nextHeat = Math.max(0, Math.min(100, currentRaid.runState.heat + t.heatDelta));
    const tally: typeof currentRaid.tally = {
      ...currentRaid.tally,
      damageTaken: currentRaid.tally.damageTaken + Math.max(0, -t.healthDelta),
      energySpent: currentRaid.tally.energySpent + Math.max(0, -t.energyDelta),
      heatPeak: Math.max(currentRaid.tally.heatPeak, nextHeat),
      combatTargetsDown:
        currentRaid.tally.combatTargetsDown + (t.combatOutcome === "target_down" ? 1 : 0),
      combatTargetsFled:
        currentRaid.tally.combatTargetsFled + (t.combatOutcome === "target_fled" ? 1 : 0),
      combatBrokeContact:
        currentRaid.tally.combatBrokeContact + (t.combatOutcome === "broke_contact" ? 1 : 0),
      combatTradedShots:
        currentRaid.tally.combatTradedShots + (t.combatOutcome === "trade_shots" ? 1 : 0),
    };
    let raid: CurrentRaid = {
      ...currentRaid,
      log: [...currentRaid.log, ...allLogs],
      operativePos: nextPos,
      map: nextMap,
      equipment: nextEquipment,
      nextStep,
      tally,
      runState: {
        ...currentRaid.runState,
        heat: nextHeat,
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

    // Extract complete: the operative just fired the `extract_now` action on
    // the entry tile. Arriving at the entry tile no longer ends the raid by
    // itself — the player (or auto-picker, when `extracting` is set) has to
    // commit to leaving.
    if (t.extractedNow) {
      raid = {
        ...raid,
        active: false,
        pendingEnd: { at: tickNow + 600, success: true },
      };
      set({ currentRaid: raid });
      return;
    }

    // Research tick: if an operative-tile-move happened this tick AND the
    // research bench has something active, decrement its tile counter.
    // Driven off real movement so `stay` / `loot` / `fight` don't progress
    // research (spec §7.4).
    const construction = get().construction;
    let nextConstruction = construction;
    if (nextPos !== currentRaid.operativePos && construction.modules.research_bench.built && construction.research.active) {
      const r = tickResearch(construction.research);
      nextConstruction = { ...construction, research: r.research };
      if (r.completed) {
        const recipe = CRAFT_RECIPES[r.completed];
        const outName = recipe ? (ITEMS[recipe.output.itemId]?.name ?? recipe.output.itemId) : r.completed;
        raid = {
          ...raid,
          log: [
            ...raid.log,
            makeLog("system", `Research complete: ${outName}. Recipe unlocked at workbench.`, undefined, tickNow, rand),
          ],
        };
        const logEntry = {
          id: `${tickNow}-${Math.random().toString(36).slice(2, 8)}`,
          timestamp: tickNow,
          text: `Research complete: ${outName}`,
        };
        nextConstruction = {
          ...nextConstruction,
          log: {
            ...nextConstruction.log,
            research: [logEntry, ...nextConstruction.log.research].slice(0, 20),
          },
        };
      }
    }

    // Auto-pick the next action and reset the action timer.
    const queuedAction = autoPickAction(raid);
    raid = {
      ...raid,
      queuedAction,
      actionStartedAt: Date.now(),
    };
    set({
      currentRaid: raid,
      ...(nextConstruction !== construction ? { construction: nextConstruction } : {}),
    });
  },

  overrideAction: (action) => {
    const { currentRaid } = get();
    if (!currentRaid || !currentRaid.active) return;
    set({ currentRaid: { ...currentRaid, queuedAction: action } });
  },

  // One-shot movement override. Player clicks an adjacent tile on the map;
  // we redirect the operative there next tick. Also swaps the queued action
  // to move_forward so "click tile to go there" works regardless of what
  // was queued (loot / stay / breach). Disabled during pendingChoice and
  // sub-modes (combat / extracting) where movement isn't the player's call.
  overrideNextStep: (target) => {
    const { currentRaid } = get();
    if (!currentRaid || !currentRaid.active) return;
    if (currentRaid.pendingChoice) return;
    const flags = currentRaid.runState.flags;
    if (flags.includes("extracting") || flags.includes("combat_engaged")) return;
    // Must be exactly one orthogonal step from the operative.
    const { x: ox, y: oy } = currentRaid.operativePos;
    if (Math.abs(target.x - ox) + Math.abs(target.y - oy) !== 1) return;
    const { map } = currentRaid;
    if (
      target.x < 0 ||
      target.x >= map.width ||
      target.y < 0 ||
      target.y >= map.height
    )
      return;
    const tile = map.tiles[target.y * map.width + target.x];
    if (tile.blocked) return;
    set({
      currentRaid: {
        ...currentRaid,
        queuedAction: "move_forward",
        nextStep: { x: target.x, y: target.y },
      },
    });
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
    const choiceHeat = Math.max(0, Math.min(100, rs.heat + (fx.heatDelta ?? 0)));
    const tally: typeof currentRaid.tally = {
      ...currentRaid.tally,
      damageTaken: currentRaid.tally.damageTaken + Math.max(0, -(fx.healthDelta ?? 0)),
      energySpent: currentRaid.tally.energySpent + Math.max(0, -(fx.energyDelta ?? 0)),
      heatPeak: Math.max(currentRaid.tally.heatPeak, choiceHeat),
      choicesMade: [
        ...currentRaid.tally.choicesMade,
        {
          eventId: currentRaid.pendingChoice.eventId,
          optionId: choice.id,
          label: choice.label,
        },
      ],
    };
    let raid: CurrentRaid = {
      ...currentRaid,
      log: [...currentRaid.log, ...choiceLogs],
      pendingChoice: null,
      operativePos: nextPos,
      map: nextMap,
      nextStep,
      tally,
      runState: {
        ...rs,
        heat: choiceHeat,
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
    set({
      currentRaid: {
        ...next,
        tally: {
          ...next.tally,
          consumablesUsed: [...next.tally.consumablesUsed, { itemId: "bandage_pack" }],
        },
      },
    });
  },

  useConsumable: (uid) => {
    const { currentRaid } = get();
    if (!currentRaid || !currentRaid.active) return;
    // Capture itemId before applyConsumable so we can record what was used.
    const eq = currentRaid.equipment;
    const placement =
      eq.pockets.items.find((p) => p.uid === uid) ??
      eq.bag?.sections.flatMap((s) => s.items).find((p) => p.uid === uid);
    const itemId = placement?.itemId;
    const next = applyConsumable(currentRaid, uid, Date.now(), Math.random);
    if (next === currentRaid) return;
    set({
      currentRaid: itemId
        ? {
            ...next,
            tally: {
              ...next.tally,
              consumablesUsed: [...next.tally.consumablesUsed, { itemId }],
            },
          }
        : next,
    });
  },

  useConsumableFromFloor: (uid) => {
    const { currentRaid } = get();
    if (!currentRaid || !currentRaid.active) return;
    const { x, y } = currentRaid.operativePos;
    const tile = currentRaid.map.tiles[y * currentRaid.map.width + x];
    const itemId = tile?.contents.find((c) => c.uid === uid)?.itemId;
    const next = applyConsumableFromFloor(currentRaid, uid, Date.now(), Math.random);
    if (next === currentRaid) return;
    set({
      currentRaid: itemId
        ? {
            ...next,
            tally: {
              ...next.tally,
              consumablesUsed: [...next.tally.consumablesUsed, { itemId }],
            },
          }
        : next,
    });
  },

  cancelRecall: () => {
    const { currentRaid, operative } = get();
    if (!currentRaid || !currentRaid.active) return;
    if (!currentRaid.runState.flags.includes("extracting")) return;
    const flags = currentRaid.runState.flags.filter((f) => f !== "extracting");
    const log = makeLog(
      "system",
      "Recall canceled. Resuming raid.",
      undefined,
      Date.now(),
      Math.random,
    );
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
    const report = buildRaidReport(currentRaid, extracted, Date.now());
    let nextOperative: Operative;
    let nextUnlocks = unlocks;
    if (extracted) {
      // Equipment stays on the operative — items are NOT auto-stashed. Player
      // unloads manually from the Stash panel's Kit subview (or Empty kit).
      const eq = currentRaid.equipment;
      const allItems = [
        ...eq.pockets.items,
        ...(eq.bag?.sections.flatMap((s) => s.items) ?? []),
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
        // Persist final vitals so the next raid starts where this one ended.
        // Player can drag consumables from kit/stash onto the vitals strip
        // to top up before re-deploying.
        health: currentRaid.runState.health,
        energy: currentRaid.runState.energy,
        ammo: currentRaid.runState.ammo,
      };
    } else {
      // Death: lose all kit contents, strip equipped bag/weapon/armor/helmet.
      // Pockets grid persists (it's an upgrade level, not loot). Vitals snap
      // to a half-reset (50/50/0) so the operative is wounded but not stuck.
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
          rig: null,
          weapon: null,
          armor: null,
          helmet: null,
        },
        health: 50,
        energy: 50,
        ammo: 0,
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
      raidOutcome: report,
    });
  },

  dismissRaidOutcome: () => {
    // After the report, drop the player into the stash — that's where the
    // immediate work is (sort loot, sell junk, re-kit) and where they were
    // navigating to manually before.
    set({ raidOutcome: null, activePanel: "stash" });
  },
});

// Build the after-raid report from the raid's startingEquipment snapshot,
// final equipment, and tally counters. On death the kit is treated as fully
// lost — itemsKept/itemsLooted are empty and everything visible at start +
// every item picked up sits in itemsLost.
function buildRaidReport(
  raid: CurrentRaid,
  extracted: boolean,
  endedAt: number,
): RaidOutcome {
  const startItems = flattenEquipment(raid.startingEquipment);
  const endItems = extracted ? flattenEquipment(raid.equipment) : [];
  const startUids = new Set(startItems.map((i) => i.uid));
  const endUids = new Set(endItems.map((i) => i.uid));

  const itemsKept = endItems.filter((i) => startUids.has(i.uid)).map(toReportItem);
  const itemsLooted = endItems.filter((i) => !startUids.has(i.uid)).map(toReportItem);
  const itemsLost = extracted
    ? startItems.filter((i) => !endUids.has(i.uid)).map(toReportItem)
    : // On death: starting kit + everything picked up during the raid is gone.
      [...startItems, ...flattenEquipment(raid.equipment).filter((i) => !startUids.has(i.uid))]
        .map(toReportItem);

  const startingValue = startItems.reduce((s, i) => s + effectiveValue(i), 0);
  const endingValue = endItems.reduce((s, i) => s + effectiveValue(i), 0);

  // Collapse consumablesUsed by itemId.
  const consumableCounts = new Map<string, number>();
  for (const c of raid.tally.consumablesUsed) {
    consumableCounts.set(c.itemId, (consumableCounts.get(c.itemId) ?? 0) + 1);
  }

  const totalTiles = raid.map.tiles.filter((t) => !t.blocked).length;
  const tilesVisited = raid.map.tiles.filter((t) => t.visited).length;

  return {
    type: extracted ? "extracted" : "death",
    locationId: raid.locationId,
    startedAt: raid.startedAt,
    endedAt,
    durationMs: endedAt - raid.startedAt,
    itemsKept,
    itemsLost,
    itemsLooted,
    startingValue,
    endingValue,
    finalHealth: raid.runState.health,
    finalEnergy: raid.runState.energy,
    damageTaken: raid.tally.damageTaken,
    energySpent: raid.tally.energySpent,
    heatPeak: raid.tally.heatPeak,
    combatTargetsDown: raid.tally.combatTargetsDown,
    combatTargetsFled: raid.tally.combatTargetsFled,
    combatBrokeContact: raid.tally.combatBrokeContact,
    combatTradedShots: raid.tally.combatTradedShots,
    choicesMade: raid.tally.choicesMade.map((c) => ({
      eventId: c.eventId,
      optionId: c.optionId,
      label: c.label,
    })),
    consumablesUsed: Array.from(consumableCounts.entries()).map(([itemId, count]) => ({
      itemId,
      count,
    })),
    tilesVisited,
    totalTiles,
  };
}

function flattenEquipment(eq: import("@/lib/types").Equipment) {
  const out = eq.pockets.items.map((i) => ({ uid: i.uid, itemId: i.itemId, valueMod: i.valueMod }));
  if (eq.bag) {
    for (const s of eq.bag.sections) {
      for (const i of s.items) out.push({ uid: i.uid, itemId: i.itemId, valueMod: i.valueMod });
    }
  }
  return out;
}

function toReportItem(i: { uid: string; itemId: string; valueMod?: number }): RaidReportItem {
  return { uid: i.uid, itemId: i.itemId, sellValue: effectiveValue(i) };
}

function effectiveValue(i: { itemId: string; valueMod?: number }): number {
  const base = ITEMS[i.itemId]?.sellValue ?? 0;
  return Math.round(base * (i.valueMod ?? 1));
}
