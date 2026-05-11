import type { StateCreator } from "zustand";
import type {
  EquipSlot,
  KitSlot,
  PackPlacement,
  Rotation,
  StashItem,
} from "@/lib/types";
import {
  equipItem,
  iterKitItems,
  moveBetweenSlots,
  placeIntoSlot,
  removeFromKit,
  unequipItem,
} from "@/lib/engine/equipment";
import { applyConsumableToOperative } from "@/lib/engine/consumables";
import {
  addToTileContents,
  removeFromTileContents,
  tileAt,
} from "@/lib/engine/map";
import { ITEMS } from "@/lib/data/items";
import { isJunk } from "./economy";
import type { GameState } from "../game";

// Kit / equipment slice. All actions are thin wrappers over the pure
// engine/equipment.ts helpers — this slice's job is just routing between
// "in raid" (currentRaid.equipment + tile floor) and "idle" (operative.equipment
// + stash) state containers.
//
// The optional `sectionId` parameter on bag-targeting actions picks which
// sub-grid inside a multi-section bag (Tarkov rig). Undefined falls back to
// the bag's first section so single-section bags don't have to thread it.
export interface KitSlice {
  pickupFromFloor: (
    uid: string,
    slot: KitSlot,
    x: number,
    y: number,
    rotation: Rotation,
    sectionId?: string,
  ) => boolean;
  dropToFloor: (uid: string) => void;
  trashFromFloor: (uid: string) => void;
  trashFromKit: (uid: string) => void;
  moveKitItem: (
    uid: string,
    slot: KitSlot,
    x: number,
    y: number,
    rotation: Rotation,
    sectionId?: string,
  ) => boolean;
  kitFromStash: (
    uid: string,
    slot: KitSlot,
    x: number,
    y: number,
    rotation: Rotation,
    sectionId?: string,
  ) => boolean;
  stashFromKit: (uid: string) => boolean;
  equipFromStash: (uid: string) => boolean;
  unequipToStash: (slot: EquipSlot) => boolean;
  equipFromFloor: (uid: string) => boolean;
  unequipToFloor: (slot: EquipSlot) => boolean;
  emptyKitToStash: () => void;
  // Move only the junk items (no slot, not consumable) from pockets+bag into
  // stash. Useful pre-redeploy to clear loot without dropping equipped/utility
  // items. Stops on capacity, just like emptyKitToStash.
  emptyJunkToStash: () => void;
  // Apply a consumable (by uid, found anywhere in pockets / bag / stash) to
  // the operative's persisted vitals. Idle-only — in-raid use goes through
  // useConsumable on the raid slice. Returns true if the item was consumed.
  useConsumableOnOperative: (uid: string) => boolean;
}

export const createKitSlice: StateCreator<GameState, [], [], KitSlice> = (set, get) => ({
  pickupFromFloor: (uid, slot, x, y, rotation, sectionId) => {
    const { currentRaid } = get();
    if (!currentRaid) return false;
    const tile = tileAt(currentRaid.map, currentRaid.operativePos.x, currentRaid.operativePos.y);
    const item = tile?.contents.find((c) => c.uid === uid);
    if (!item) return false;
    const placed = placeIntoSlot(currentRaid.equipment, slot, item, x, y, rotation, sectionId);
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

  moveKitItem: (uid, slot, x, y, rotation, sectionId) => {
    const { currentRaid, operative } = get();
    const eq = currentRaid?.equipment ?? operative.equipment;
    const moved = moveBetweenSlots(eq, uid, slot, x, y, rotation, sectionId);
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

  kitFromStash: (uid, slot, x, y, rotation, sectionId) => {
    const { currentRaid, operative, stash } = get();
    if (currentRaid) return false; // pre-raid only
    const idx = stash.findIndex((s) => s.uid === uid);
    if (idx === -1) return false;
    const item = stash[idx];
    const placed = placeIntoSlot(operative.equipment, slot, item, x, y, rotation, sectionId);
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
      acquiredAt: Date.now(),
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
      acquiredAt: Date.now(),
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

  useConsumableOnOperative: (uid) => {
    const { currentRaid, operative, stash } = get();
    if (currentRaid) return false;
    const result = applyConsumableToOperative(operative, stash, uid);
    if (!result.consumed) return false;
    set({ operative: result.operative, stash: result.stash });
    return true;
  },

  emptyKitToStash: () => {
    const { currentRaid, operative, stash, hideout } = get();
    if (currentRaid) return; // idle only
    const cap = hideout.modules.stash.capacity ?? Infinity;
    const nextStash = [...stash];
    const now = Date.now();
    // Snapshot every uid in kit first (pockets, then bag sections, then
    // rig sections), then drain via removeFromKit. We snapshot upfront
    // because the equipment object mutates each iteration and a live
    // generator would be invalidated. removeFromKit handles the section
    // routing so we don't repeat that walk here. Stops at stash capacity
    // — leftover items stay where they are rather than disappearing.
    const allUids = Array.from(iterKitItems(operative.equipment), (p) => p.uid);
    let eq = operative.equipment;
    for (const uid of allUids) {
      if (nextStash.length >= cap) break;
      const r = removeFromKit(eq, uid);
      if (!r) continue;
      eq = r.next;
      nextStash.push({
        uid: r.item.uid,
        itemId: r.item.itemId,
        flavor: r.item.flavor,
        acquiredAt: now,
      });
    }
    set({
      stash: nextStash,
      operative: { ...operative, equipment: eq },
    });
  },

  emptyJunkToStash: () => {
    const { currentRaid, operative, stash, hideout } = get();
    if (currentRaid) return;
    const cap = hideout.modules.stash.capacity ?? Infinity;
    const nextStash = [...stash];
    const now = Date.now();
    const junkUids: PackPlacement[] = [];
    for (const p of iterKitItems(operative.equipment)) {
      if (isJunk(ITEMS[p.itemId])) junkUids.push(p);
    }
    let eq = operative.equipment;
    for (const p of junkUids) {
      if (nextStash.length >= cap) break;
      const r = removeFromKit(eq, p.uid);
      if (!r) continue;
      eq = r.next;
      nextStash.push({
        uid: r.item.uid,
        itemId: r.item.itemId,
        flavor: r.item.flavor,
        acquiredAt: now,
      });
    }
    set({
      stash: nextStash,
      operative: { ...operative, equipment: eq },
    });
  },
});
