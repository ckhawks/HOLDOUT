import type {
  BagState,
  Equipment,
  EquipSlot,
  KitSlot,
  PackPlacement,
  PocketsState,
  Rotation,
  SlotItem,
  StashItem,
} from "@/lib/types";
import { ITEMS } from "@/lib/data/items";
import { buildOccupancy, canPlace, shapeFor } from "@/lib/engine/shapes";

// Pure functions over Equipment. Used by the store + StashPanel for kit
// rearrange, equip/unequip, and first-fit auto-placement. Engine-side per
// CLAUDE.md's "all game logic in lib/engine/" rule — store stays glue.

// Place a free item into a kit grid at (x, y). Returns next Equipment if it
// fits, null otherwise. Does NOT remove the item from its source — caller is
// responsible for that.
export function placeIntoSlot(
  eq: Equipment,
  slot: KitSlot,
  src: { uid: string; itemId: string; flavor?: string },
  x: number,
  y: number,
  rotation: Rotation,
): Equipment | null {
  if (slot === "bag" && !eq.bag) return null;
  const target = slot === "pockets" ? eq.pockets : (eq.bag as BagState);
  const occ = buildOccupancy(target.items, target.grid.width, target.grid.height);
  const cells = shapeFor(src.itemId, rotation);
  if (!canPlace(cells, x, y, target.grid.width, target.grid.height, occ)) return null;
  const placement: PackPlacement = {
    uid: src.uid,
    itemId: src.itemId,
    flavor: src.flavor,
    x,
    y,
    rotation,
  };
  if (slot === "pockets") {
    return {
      ...eq,
      pockets: { ...eq.pockets, items: [...eq.pockets.items, placement] },
    };
  }
  return {
    ...eq,
    bag: { ...(eq.bag as BagState), items: [...(eq.bag as BagState).items, placement] },
  };
}

// Move an existing kit item to a new position (possibly in a different kit
// slot — pockets ↔ bag rearrange goes through here too). Returns null if
// the destination doesn't accept the new placement.
export function moveBetweenSlots(
  eq: Equipment,
  uid: string,
  destSlot: KitSlot,
  x: number,
  y: number,
  rotation: Rotation,
): Equipment | null {
  if (destSlot === "bag" && !eq.bag) return null;
  const inPockets = eq.pockets.items.find((p) => p.uid === uid);
  const inBag = eq.bag?.items.find((p) => p.uid === uid);
  const item = inPockets ?? inBag;
  if (!item) return null;
  const target = destSlot === "pockets" ? eq.pockets : (eq.bag as BagState);
  const sameSlot = (inPockets && destSlot === "pockets") || (inBag && destSlot === "bag");
  // Same-slot move: ignore self in occupancy so an overlapping reposition works.
  const occ = buildOccupancy(
    target.items,
    target.grid.width,
    target.grid.height,
    sameSlot ? uid : undefined,
  );
  const cells = shapeFor(item.itemId, rotation);
  if (!canPlace(cells, x, y, target.grid.width, target.grid.height, occ)) return null;
  const next: Equipment = {
    ...eq,
    pockets: inPockets
      ? { ...eq.pockets, items: eq.pockets.items.filter((p) => p.uid !== uid) }
      : eq.pockets,
    bag:
      eq.bag && inBag
        ? { ...eq.bag, items: eq.bag.items.filter((p) => p.uid !== uid) }
        : eq.bag,
  };
  const placement: PackPlacement = { ...item, x, y, rotation };
  if (destSlot === "pockets") {
    return { ...next, pockets: { ...next.pockets, items: [...next.pockets.items, placement] } };
  }
  return {
    ...next,
    bag: { ...(next.bag as BagState), items: [...(next.bag as BagState).items, placement] },
  };
}

// Pull an item out of pockets-or-bag without placing it anywhere. Returns
// the new Equipment plus the removed PackPlacement so the caller can route
// it to floor / stash / trash.
export function removeFromKit(
  eq: Equipment,
  uid: string,
): { next: Equipment; item: PackPlacement } | null {
  const inPockets = eq.pockets.items.find((p) => p.uid === uid);
  if (inPockets) {
    return {
      item: inPockets,
      next: {
        ...eq,
        pockets: { ...eq.pockets, items: eq.pockets.items.filter((p) => p.uid !== uid) },
      },
    };
  }
  const inBag = eq.bag?.items.find((p) => p.uid === uid);
  if (inBag && eq.bag) {
    return {
      item: inBag,
      next: {
        ...eq,
        bag: { ...eq.bag, items: eq.bag.items.filter((p) => p.uid !== uid) },
      },
    };
  }
  return null;
}

// Equip an item into its declared slot. Refuses if the slot is occupied
// (caller must unequip first) or the item isn't equippable. For bags, the
// bag arrives empty — bags are inert items pre-equip.
export function equipItem(
  eq: Equipment,
  src: { uid: string; itemId: string; flavor?: string },
): Equipment | null {
  const def = ITEMS[src.itemId];
  if (!def?.slot) return null;
  if (def.slot === "bag") {
    if (eq.bag) return null;
    if (!def.bagGrid) return null;
    const bag: BagState = {
      slot: { uid: src.uid, itemId: src.itemId, flavor: src.flavor },
      grid: { width: def.bagGrid.width, height: def.bagGrid.height },
      items: [],
    };
    return { ...eq, bag };
  }
  if (eq[def.slot]) return null;
  const slotItem: SlotItem = { uid: src.uid, itemId: src.itemId, flavor: src.flavor };
  return { ...eq, [def.slot]: slotItem };
}

// Unequip a slot to a SlotItem-shaped record the caller can route to stash
// or floor. Refuses if slot is empty, or (for bag) the bag has contents.
export function unequipItem(
  eq: Equipment,
  slot: EquipSlot,
): { next: Equipment; removed: SlotItem } | null {
  if (slot === "bag") {
    if (!eq.bag) return null;
    if (eq.bag.items.length > 0) return null;
    return { next: { ...eq, bag: null }, removed: eq.bag.slot };
  }
  const cur = eq[slot];
  if (!cur) return null;
  return { next: { ...eq, [slot]: null }, removed: cur };
}

// First-fit placement search across pockets, then bag. Returns the slot +
// position + rotation that the item fits at, or null if it won't fit
// anywhere with any rotation. Used by ctrl+click and "→ kit" buttons.
export function findFit(
  eq: Equipment,
  item: StashItem,
): { slot: KitSlot; x: number; y: number; rotation: Rotation } | null {
  const tryGrid = (
    grid: PocketsState | BagState,
    slot: KitSlot,
  ): { slot: KitSlot; x: number; y: number; rotation: Rotation } | null => {
    for (let r = 0; r < 4; r++) {
      const rotation = r as Rotation;
      const cells = shapeFor(item.itemId, rotation);
      const occ = buildOccupancy(grid.items, grid.grid.width, grid.grid.height);
      for (let y = 0; y < grid.grid.height; y++) {
        for (let x = 0; x < grid.grid.width; x++) {
          if (canPlace(cells, x, y, grid.grid.width, grid.grid.height, occ)) {
            return { slot, x, y, rotation };
          }
        }
      }
    }
    return null;
  };
  return tryGrid(eq.pockets, "pockets") ?? (eq.bag ? tryGrid(eq.bag, "bag") : null);
}
