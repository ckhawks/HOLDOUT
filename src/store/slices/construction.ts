import type { StateCreator } from "zustand";
import type {
  ConstructionLogEntry,
  ConstructionState,
  ModuleId,
  StashItem,
} from "@/lib/types";
import {
  canAfford as canAffordCost,
  moduleBuildCost,
  moduleTierUpCost,
  payCost,
} from "@/lib/engine/hideout";
import { describeProduced, recycleItem } from "@/lib/engine/recycle";
import {
  describeSmelt,
  metalSellValue,
  smeltItem,
  withdrawMetal,
} from "@/lib/engine/foundry";
import { RECYCLE_RECIPES } from "@/lib/data/recycle";
import { SMELT_RECIPES, METAL_DISPLAY_NAME } from "@/lib/data/smelt";
import { ITEMS } from "@/lib/data/items";
import { MODULE_DEFS } from "@/lib/data/modules";
import type { MetalId } from "@/lib/types";
import { rollValueMod } from "./economy";
import type { GameState } from "../game";

// Construction slice. Owns build/tier-up of hideout modules and per-module
// actions (recycler today; foundry/workbench/research in later stages).
// All game logic delegates to engine/recycle.ts and engine/hideout.ts;
// this file is just routing + log appends + Date.now/Math.random injection.

const LOG_CAP = 20;

type LogChannel = keyof ConstructionState["log"];

function appendLog(
  log: ConstructionState["log"],
  channel: LogChannel,
  text: string,
  now: number,
): ConstructionState["log"] {
  const entry: ConstructionLogEntry = {
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: now,
    text,
  };
  const next = [entry, ...log[channel]].slice(0, LOG_CAP);
  return { ...log, [channel]: next };
}

export interface BuildResult {
  ok: boolean;
  reason?: "missing_cash" | "missing_items" | "missing_metals" | "not_buildable" | "already_built";
}

export interface ConstructionSlice {
  // Module lifecycle
  buildModule: (id: ModuleId) => BuildResult;
  upgradeModule: (id: ModuleId) => BuildResult;
  // Recycler — one item or a stack of N
  recycleStashItem: (uid: string) => { ok: boolean; reason?: "not_found" | "no_recipe" | "tier_too_low" | "not_built" };
  recycleStackByItemId: (itemId: string, count?: number) => { ok: boolean; recycled: number };
  // Foundry
  smeltStashItem: (uid: string) => { ok: boolean; reason?: "not_found" | "no_recipe" | "tier_too_low" | "not_built" };
  smeltStackByItemId: (itemId: string, count?: number) => { ok: boolean; smelted: number };
  sellMetal: (metal: MetalId, amount: number) => { ok: boolean; cash: number };
}

export const createConstructionSlice: StateCreator<GameState, [], [], ConstructionSlice> = (set, get) => ({
  buildModule: (id) => {
    const { cash, stash, construction } = get();
    const mod = construction.modules[id];
    if (mod.built) return { ok: false, reason: "already_built" };
    const cost = moduleBuildCost(id);
    if (!cost) return { ok: false, reason: "not_buildable" };
    const afford = canAffordCost(cost, { cash, stash, foundry: construction.foundry });
    if (!afford.ok) return { ok: false, reason: afford.failure.reason };
    const paid = payCost(cost, { cash, stash, foundry: construction.foundry });
    const now = Date.now();
    const channel: LogChannel | null =
      id === "recycler" ? "recycler" :
      id === "foundry" ? "foundry" :
      id === "workbench" ? "workbench" :
      id === "research_bench" ? "research" : null;
    let log = construction.log;
    if (channel) log = appendLog(log, channel, `Built ${MODULE_DEFS[id].name}`, now);
    set({
      cash: paid.cash,
      stash: paid.stash,
      construction: {
        ...construction,
        modules: { ...construction.modules, [id]: { built: true, tier: 1 } },
        foundry: paid.foundry,
        log,
      },
    });
    return { ok: true };
  },

  upgradeModule: (id) => {
    const { cash, stash, construction } = get();
    const mod = construction.modules[id];
    if (!mod.built) return { ok: false, reason: "not_buildable" };
    const next = mod.tier + 1;
    if (next > MODULE_DEFS[id].maxTier) return { ok: false, reason: "not_buildable" };
    const cost = moduleTierUpCost(id, next);
    if (!cost) return { ok: false, reason: "not_buildable" };
    const afford = canAffordCost(cost, { cash, stash, foundry: construction.foundry });
    if (!afford.ok) return { ok: false, reason: afford.failure.reason };
    const paid = payCost(cost, { cash, stash, foundry: construction.foundry });
    const now = Date.now();
    const channel: LogChannel | null =
      id === "recycler" ? "recycler" :
      id === "foundry" ? "foundry" :
      id === "workbench" ? "workbench" :
      id === "research_bench" ? "research" : null;
    let log = construction.log;
    if (channel) log = appendLog(log, channel, `${MODULE_DEFS[id].name} → tier ${next}`, now);
    set({
      cash: paid.cash,
      stash: paid.stash,
      construction: {
        ...construction,
        modules: { ...construction.modules, [id]: { built: true, tier: next } },
        foundry: paid.foundry,
        log,
      },
    });
    return { ok: true };
  },

  recycleStashItem: (uid) => {
    const { stash, construction } = get();
    const mod = construction.modules.recycler;
    if (!mod.built) return { ok: false, reason: "not_built" };
    const tier = mod.tier as 1 | 2 | 3;
    const idx = stash.findIndex((s) => s.uid === uid);
    if (idx === -1) return { ok: false, reason: "not_found" };
    const si = stash[idx];
    if (si.pinned) return { ok: false, reason: "not_found" };
    const recipe = RECYCLE_RECIPES[si.itemId];
    if (!recipe) return { ok: false, reason: "no_recipe" };
    const r = recycleItem(si, tier, Math.random);
    if ("error" in r) {
      return { ok: false, reason: r.error };
    }
    const now = Date.now();
    const nextStash = [...stash];
    nextStash.splice(idx, 1);
    for (const p of r.produced) {
      for (let i = 0; i < p.count; i++) {
        nextStash.push({
          uid: `${now}-${Math.random().toString(36).slice(2, 8)}-${i}`,
          itemId: p.id,
          acquiredAt: now,
          valueMod: rollValueMod(Math.random),
        });
      }
    }
    const inputName = ITEMS[si.itemId]?.name ?? si.itemId;
    const log = appendLog(
      construction.log,
      "recycler",
      `Scrapped ${inputName} → ${describeProduced(r.produced)}`,
      now,
    );
    set({ stash: nextStash, construction: { ...construction, log } });
    return { ok: true };
  },

  smeltStashItem: (uid) => {
    const { stash, construction } = get();
    const mod = construction.modules.foundry;
    if (!mod.built) return { ok: false, reason: "not_built" };
    const idx = stash.findIndex((s) => s.uid === uid);
    if (idx === -1) return { ok: false, reason: "not_found" };
    const si = stash[idx];
    if (si.pinned) return { ok: false, reason: "not_found" };
    if (!SMELT_RECIPES[si.itemId]) return { ok: false, reason: "no_recipe" };
    const r = smeltItem(si, construction.foundry, mod);
    if ("error" in r) {
      return { ok: false, reason: r.error === "not_built" ? "not_built" : r.error };
    }
    const nextStash = [...stash];
    nextStash.splice(idx, 1);
    const now = Date.now();
    const inputName = ITEMS[si.itemId]?.name ?? si.itemId;
    const log = appendLog(
      construction.log,
      "foundry",
      `Smelted ${inputName} → ${describeSmelt(r.result)}`,
      now,
    );
    set({
      stash: nextStash,
      construction: { ...construction, foundry: r.foundry, log },
    });
    return { ok: true };
  },

  smeltStackByItemId: (itemId, count) => {
    const { stash, construction } = get();
    const mod = construction.modules.foundry;
    if (!mod.built) return { ok: false, smelted: 0 };
    if (mod.tier < 2) return { ok: false, smelted: 0 }; // bulk gated to L2+
    const recipe = SMELT_RECIPES[itemId];
    if (!recipe) return { ok: false, smelted: 0 };
    const tier = mod.tier as 1 | 2 | 3;
    if ((recipe.minTier ?? 1) > tier) return { ok: false, smelted: 0 };

    const candidates = stash.filter((s) => !s.pinned && s.itemId === itemId);
    const take = count != null ? Math.min(count, candidates.length) : candidates.length;
    if (take === 0) return { ok: false, smelted: 0 };

    let foundry = construction.foundry;
    const consumedUids = new Set<string>();
    const totalAdded: Partial<Record<MetalId, number>> = {};
    const totalWasted: Partial<Record<MetalId, number>> = {};
    for (let i = 0; i < take; i++) {
      const c = candidates[i];
      const r = smeltItem(c, foundry, mod);
      if ("error" in r) break;
      foundry = r.foundry;
      consumedUids.add(c.uid);
      for (const [m, n] of Object.entries(r.result.added) as Array<[MetalId, number]>) {
        totalAdded[m] = (totalAdded[m] ?? 0) + n;
      }
      for (const [m, n] of Object.entries(r.result.wasted) as Array<[MetalId, number]>) {
        totalWasted[m] = (totalWasted[m] ?? 0) + n;
      }
    }
    if (consumedUids.size === 0) return { ok: false, smelted: 0 };
    const nextStash = stash.filter((s) => !consumedUids.has(s.uid));
    const now = Date.now();
    const inputName = ITEMS[itemId]?.name ?? itemId;
    const text = describeSmelt({ consumedUid: "_", added: totalAdded, wasted: totalWasted });
    const log = appendLog(
      construction.log,
      "foundry",
      `Smelted ${consumedUids.size}× ${inputName} → ${text}`,
      now,
    );
    set({
      stash: nextStash,
      construction: { ...construction, foundry, log },
    });
    return { ok: true, smelted: consumedUids.size };
  },

  sellMetal: (metal, amount) => {
    const { cash, construction } = get();
    const mod = construction.modules.foundry;
    if (!mod.built) return { ok: false, cash };
    if (amount <= 0) return { ok: false, cash };
    const r = withdrawMetal(construction.foundry, metal, amount);
    if (r.withdrawn === 0) return { ok: false, cash };
    const earned = metalSellValue(metal, r.withdrawn);
    const nextCash = cash + earned;
    const now = Date.now();
    const log = appendLog(
      construction.log,
      "foundry",
      `Sold ${r.withdrawn} ${METAL_DISPLAY_NAME[metal]} → ¤${earned}`,
      now,
    );
    set({
      cash: nextCash,
      construction: { ...construction, foundry: r.foundry, log },
    });
    return { ok: true, cash: nextCash };
  },

  recycleStackByItemId: (itemId, count) => {
    const { stash, construction } = get();
    const mod = construction.modules.recycler;
    if (!mod.built) return { ok: false, recycled: 0 };
    if (mod.tier < 2) return { ok: false, recycled: 0 }; // bulk gated to L2+
    const tier = mod.tier as 1 | 2 | 3;
    const recipe = RECYCLE_RECIPES[itemId];
    if (!recipe) return { ok: false, recycled: 0 };
    if ((recipe.minTier ?? 1) > tier) return { ok: false, recycled: 0 };

    // Collect candidate uids (non-pinned, matching itemId) up to `count`.
    const candidates: StashItem[] = [];
    for (const si of stash) {
      if (si.pinned) continue;
      if (si.itemId !== itemId) continue;
      candidates.push(si);
      if (count != null && candidates.length >= count) break;
    }
    if (candidates.length === 0) return { ok: false, recycled: 0 };

    const consumedUids = new Set(candidates.map((c) => c.uid));
    const now = Date.now();
    const producedTotal: Record<string, number> = {};
    for (const c of candidates) {
      const r = recycleItem(c, tier, Math.random);
      if ("error" in r) continue;
      for (const p of r.produced) {
        producedTotal[p.id] = (producedTotal[p.id] ?? 0) + p.count;
      }
    }

    const nextStash = stash.filter((s) => !consumedUids.has(s.uid));
    let idx = 0;
    for (const [id, total] of Object.entries(producedTotal)) {
      for (let i = 0; i < total; i++) {
        nextStash.push({
          uid: `${now}-${Math.random().toString(36).slice(2, 6)}-${idx++}`,
          itemId: id,
          acquiredAt: now,
          valueMod: rollValueMod(Math.random),
        });
      }
    }

    const inputName = ITEMS[itemId]?.name ?? itemId;
    const producedList = Object.entries(producedTotal).map(([id, n]) => ({ id, count: n }));
    const log = appendLog(
      construction.log,
      "recycler",
      `Scrapped ${candidates.length}× ${inputName} → ${describeProduced(producedList)}`,
      now,
    );
    set({ stash: nextStash, construction: { ...construction, log } });
    return { ok: true, recycled: candidates.length };
  },
});
