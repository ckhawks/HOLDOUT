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
  moveBetweenSlots,
  placeIntoSlot,
  removeFromKit,
  unequipItem,
} from "@/lib/engine/equipment";
import {
  addToTileContents,
  removeFromTileContents,
  tileAt,
} from "@/lib/engine/map";
import type { GameState } from "../game";

// Kit / equipment slice. All actions are thin wrappers over the pure
// engine/equipment.ts helpers — this slice's job is just routing between
// "in raid" (currentRaid.equipment + tile floor) and "idle" (operative.equipment
// + stash) state containers.
export interface KitSlice {
  pickupFromFloor: (uid: string, slot: KitSlot, x: number, y: number, rotation: Rotation) => boolean;
  dropToFloor: (uid: string) => void;
  trashFromFloor: (uid: string) => void;
  trashFromKit: (uid: string) => void;
  moveKitItem: (uid: string, slot: KitSlot, x: number, y: number, rotation: Rotation) => boolean;
  kitFromStash: (uid: string, slot: KitSlot, x: number, y: number, rotation: Rotation) => boolean;
  stashFromKit: (uid: string) => boolean;
  equipFromStash: (uid: string) => boolean;
  unequipToStash: (slot: EquipSlot) => boolean;
  equipFromFloor: (uid: string) => boolean;
  unequipToFloor: (slot: EquipSlot) => boolean;
  emptyKitToStash: () => void;
}

export const createKitSlice: StateCreator<GameState, [], [], KitSlice> = (set, get) => ({
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

  emptyKitToStash: () => {
    const { currentRaid, operative, stash, hideout } = get();
    if (currentRaid) return; // idle only
    const cap = hideout.modules.stash.capacity ?? Infinity;
    const nextStash = [...stash];
    const now = Date.now();
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
        nextStash.push({ uid: p.uid, itemId: p.itemId, flavor: p.flavor, acquiredAt: now });
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
});
