import type {
  BagSection,
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
//
// Two container slots share the BagState shape: `bag` (back) and `rig`
// (chest). Each carries one or more independent sections (Tarkov-rig
// style: e.g. a 2×3 admin pocket + a 6×2 main pouch). The `sectionId`
// parameter on container-targeting calls picks which sub-grid; passing
// undefined defaults to the container's first section so single-section
// containers can be addressed without boilerplate.

// KitSlots that resolve to a BagState container (i.e. anything that's not
// pockets). Kept narrow so adding a new container slot in the future is a
// one-line change here. The two helpers below (containerFor / withContainer)
// are the one place that knows the bag-vs-rig field mapping; the rest of
// the engine just deals in `(slot, sectionId)` pairs. Add a third container
// slot? Update the union, the helpers, and the iteration arrays in
// findInKit / findFit / iterKitItems / iterContainers — that's it.
type ContainerSlot = Exclude<KitSlot, "pockets">;

function isContainerSlot(slot: KitSlot): slot is ContainerSlot {
  return slot === "bag" || slot === "rig";
}

// Read the BagState in a given container slot. Returns null if no
// container is equipped in that slot.
function containerFor(eq: Equipment, slot: ContainerSlot): BagState | null {
  return slot === "bag" ? eq.bag : eq.rig;
}

// Functional setter — returns a new Equipment with `slot` swapped to
// `next`. Used so callers don't have to spread `{ ...eq, bag: ... }` vs
// `{ ...eq, rig: ... }` themselves.
function withContainer(eq: Equipment, slot: ContainerSlot, next: BagState | null): Equipment {
  return slot === "bag" ? { ...eq, bag: next } : { ...eq, rig: next };
}

function bagSection(bag: BagState, sectionId?: string): BagSection | null {
  if (bag.sections.length === 0) return null;
  if (sectionId === undefined) return bag.sections[0];
  return bag.sections.find((s) => s.id === sectionId) ?? null;
}

function replaceSection(bag: BagState, next: BagSection): BagState {
  return {
    ...bag,
    sections: bag.sections.map((s) => (s.id === next.id ? next : s)),
  };
}

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
  sectionId?: string,
): Equipment | null {
  const placement: PackPlacement = {
    uid: src.uid,
    itemId: src.itemId,
    flavor: src.flavor,
    x,
    y,
    rotation,
  };
  if (slot === "pockets") {
    const grid = eq.pockets.grid;
    const occ = buildOccupancy(eq.pockets.items, grid.width, grid.height);
    const cells = shapeFor(src.itemId, rotation);
    if (!canPlace(cells, x, y, grid.width, grid.height, occ)) return null;
    return {
      ...eq,
      pockets: { ...eq.pockets, items: [...eq.pockets.items, placement] },
    };
  }
  const container = containerFor(eq, slot);
  if (!container) return null;
  const section = bagSection(container, sectionId);
  if (!section) return null;
  const occ = buildOccupancy(section.items, section.grid.width, section.grid.height);
  const cells = shapeFor(src.itemId, rotation);
  if (!canPlace(cells, x, y, section.grid.width, section.grid.height, occ)) return null;
  const nextSection: BagSection = { ...section, items: [...section.items, placement] };
  return withContainer(eq, slot, replaceSection(container, nextSection));
}

// Locate where an item currently lives in equipment. Returns the placement
// plus enough address info to remove + replace it. Used by moveBetweenSlots
// and removeFromKit so the search logic only lives once.
type KitLocation =
  | { kind: "pockets"; placement: PackPlacement }
  | { kind: ContainerSlot; sectionId: string; placement: PackPlacement };

export function findInKit(eq: Equipment, uid: string): KitLocation | null {
  const inPockets = eq.pockets.items.find((p) => p.uid === uid);
  if (inPockets) return { kind: "pockets", placement: inPockets };
  for (const slot of ["bag", "rig"] as const) {
    const container = containerFor(eq, slot);
    if (!container) continue;
    for (const s of container.sections) {
      const hit = s.items.find((p) => p.uid === uid);
      if (hit) return { kind: slot, sectionId: s.id, placement: hit };
    }
  }
  return null;
}

function removeAt(eq: Equipment, loc: KitLocation): Equipment {
  if (loc.kind === "pockets") {
    return {
      ...eq,
      pockets: {
        ...eq.pockets,
        items: eq.pockets.items.filter((p) => p.uid !== loc.placement.uid),
      },
    };
  }
  const container = containerFor(eq, loc.kind);
  if (!container) return eq;
  const section = bagSection(container, loc.sectionId);
  if (!section) return eq;
  const next: BagSection = {
    ...section,
    items: section.items.filter((p) => p.uid !== loc.placement.uid),
  };
  return withContainer(eq, loc.kind, replaceSection(container, next));
}

// Move an existing kit item to a new position (possibly in a different kit
// slot or section). Returns null if the destination doesn't accept the new
// placement.
export function moveBetweenSlots(
  eq: Equipment,
  uid: string,
  destSlot: KitSlot,
  x: number,
  y: number,
  rotation: Rotation,
  destSectionId?: string,
): Equipment | null {
  const loc = findInKit(eq, uid);
  if (!loc) return null;

  if (destSlot === "pockets") {
    const isSameTarget = loc.kind === "pockets";
    const ignoreUid = isSameTarget ? uid : undefined;
    const placement: PackPlacement = { ...loc.placement, x, y, rotation };
    const cells = shapeFor(loc.placement.itemId, rotation);
    const occ = buildOccupancy(
      eq.pockets.items,
      eq.pockets.grid.width,
      eq.pockets.grid.height,
      ignoreUid,
    );
    if (!canPlace(cells, x, y, eq.pockets.grid.width, eq.pockets.grid.height, occ)) {
      return null;
    }
    const removed = removeAt(eq, loc);
    return {
      ...removed,
      pockets: { ...removed.pockets, items: [...removed.pockets.items, placement] },
    };
  }

  // Destination is a container slot.
  const container = containerFor(eq, destSlot);
  if (!container) return null;
  // "Same target" means the move's destination is the exact section the
  // item already lives in. When that's true we have to ignore the item's
  // own footprint while computing occupancy — otherwise an in-place nudge
  // (e.g. drag-rotating onto your own cells) would always read as blocked.
  // The destSectionId-undefined branch handles "default to first section"
  // callers: same-target is true only if the item happens to be in that
  // first section already.
  const isSameTarget =
    loc.kind === destSlot &&
    (destSectionId === undefined
      ? container.sections[0]?.id === loc.sectionId
      : destSectionId === loc.sectionId);
  const ignoreUid = isSameTarget ? uid : undefined;
  const section = bagSection(container, destSectionId);
  if (!section) return null;
  const cells = shapeFor(loc.placement.itemId, rotation);
  const occ = buildOccupancy(
    section.items,
    section.grid.width,
    section.grid.height,
    ignoreUid,
  );
  if (!canPlace(cells, x, y, section.grid.width, section.grid.height, occ)) return null;

  const removed = removeAt(eq, loc);
  // Re-fetch the destination container/section from the post-removal
  // equipment. Same-target moves shrink the destination's items array as a
  // side effect of removing the source — if we kept the pre-removal
  // reference we'd splat the new placement on top of a stale snapshot and
  // resurrect the old position.
  const destContainer = containerFor(removed, destSlot);
  if (!destContainer) return null;
  const destSection = bagSection(destContainer, destSectionId);
  if (!destSection) return null;
  const placement: PackPlacement = { ...loc.placement, x, y, rotation };
  const nextDest: BagSection = { ...destSection, items: [...destSection.items, placement] };
  return withContainer(removed, destSlot, replaceSection(destContainer, nextDest));
}

// Pull an item out of pockets-or-container without placing it anywhere.
// Returns the new Equipment plus the removed PackPlacement so the caller
// can route it to floor / stash / trash.
export function removeFromKit(
  eq: Equipment,
  uid: string,
): { next: Equipment; item: PackPlacement } | null {
  const loc = findInKit(eq, uid);
  if (!loc) return null;
  return { next: removeAt(eq, loc), item: loc.placement };
}

// Equip an item into its declared slot. Refuses if the slot is occupied
// (caller must unequip first) or the item isn't equippable. For bag/rig,
// the container arrives with one empty section per BagSectionDef.
export function equipItem(
  eq: Equipment,
  src: { uid: string; itemId: string; flavor?: string },
): Equipment | null {
  const def = ITEMS[src.itemId];
  if (!def?.slot) return null;
  if (def.slot === "bag" || def.slot === "rig") {
    if (containerFor(eq, def.slot) !== null) return null;
    if (!def.bagSections || def.bagSections.length === 0) return null;
    const container: BagState = {
      slot: { uid: src.uid, itemId: src.itemId, flavor: src.flavor },
      sections: def.bagSections.map((s) => ({
        id: s.id,
        label: s.label,
        grid: { width: s.width, height: s.height },
        items: [],
      })),
    };
    return withContainer(eq, def.slot, container);
  }
  if (eq[def.slot]) return null;
  const slotItem: SlotItem = { uid: src.uid, itemId: src.itemId, flavor: src.flavor };
  return { ...eq, [def.slot]: slotItem };
}

// Unequip a slot to a SlotItem-shaped record the caller can route to stash
// or floor. Refuses if slot is empty, or (for bag/rig) any section has
// contents.
export function unequipItem(
  eq: Equipment,
  slot: EquipSlot,
): { next: Equipment; removed: SlotItem } | null {
  if (slot === "bag" || slot === "rig") {
    const container = containerFor(eq, slot);
    if (!container) return null;
    if (container.sections.some((s) => s.items.length > 0)) return null;
    return { next: withContainer(eq, slot, null), removed: container.slot };
  }
  const cur = eq[slot];
  if (!cur) return null;
  return { next: { ...eq, [slot]: null }, removed: cur };
}

// First-fit placement search. Walks pockets, then each container's
// sections in declared order — so the player gets predictable behavior:
// "pockets fill first, then bag, then rig", and within each container
// the section order matches the item def's section ordering. Returns
// the slot + (sectionId for containers) + position + rotation, or null
// if the item won't fit anywhere with any rotation.
export interface FitResult {
  slot: KitSlot;
  sectionId?: string;
  x: number;
  y: number;
  rotation: Rotation;
}

export function findFit(eq: Equipment, item: StashItem): FitResult | null {
  const tryGrid = (
    items: ReadonlyArray<PackPlacement>,
    grid: { width: number; height: number },
  ): { x: number; y: number; rotation: Rotation } | null => {
    for (let r = 0; r < 4; r++) {
      const rotation = r as Rotation;
      const cells = shapeFor(item.itemId, rotation);
      const occ = buildOccupancy(items, grid.width, grid.height);
      for (let y = 0; y < grid.height; y++) {
        for (let x = 0; x < grid.width; x++) {
          if (canPlace(cells, x, y, grid.width, grid.height, occ)) {
            return { x, y, rotation };
          }
        }
      }
    }
    return null;
  };
  const inPockets = tryGrid(eq.pockets.items, eq.pockets.grid);
  if (inPockets) return { slot: "pockets", ...inPockets };
  for (const slot of ["bag", "rig"] as const) {
    const container = containerFor(eq, slot);
    if (!container) continue;
    for (const s of container.sections) {
      const hit = tryGrid(s.items, s.grid);
      if (hit) return { slot, sectionId: s.id, ...hit };
    }
  }
  return null;
}

// Convenience: enumerate every PackPlacement currently in equipment, in a
// stable order (pockets first, then bag sections, then rig sections).
export function* iterKitItems(eq: Equipment): Generator<PackPlacement> {
  for (const p of eq.pockets.items) yield p;
  for (const slot of ["bag", "rig"] as const) {
    const container = containerFor(eq, slot);
    if (!container) continue;
    for (const s of container.sections) {
      for (const p of s.items) yield p;
    }
  }
}

// Convenience: total number of items across pockets + all containers.
export function kitItemCount(eq: Equipment): number {
  let n = eq.pockets.items.length;
  for (const slot of ["bag", "rig"] as const) {
    const container = containerFor(eq, slot);
    if (!container) continue;
    for (const s of container.sections) n += s.items.length;
  }
  return n;
}

// Convenience: total cell capacity across pockets + all containers.
export function kitCellCapacity(eq: Equipment): number {
  let n = eq.pockets.grid.width * eq.pockets.grid.height;
  for (const slot of ["bag", "rig"] as const) {
    const container = containerFor(eq, slot);
    if (!container) continue;
    for (const s of container.sections) n += s.grid.width * s.grid.height;
  }
  return n;
}

// Iterate every (slot, container) pair the operative is currently wearing.
// Useful for UI and tests that want a uniform walk over both bag and rig.
export function* iterContainers(
  eq: Equipment,
): Generator<{ slot: ContainerSlot; container: BagState }> {
  for (const slot of ["bag", "rig"] as const) {
    const container = containerFor(eq, slot);
    if (container) yield { slot, container };
  }
}

// Re-export to satisfy imports that previously referenced PocketsState here.
export type { PocketsState, BagState };

// Internal helper exported for the small set of call sites that need to
// branch on KitSlot before threading through engine fns (drag-target
// resolution, kit slice routing). Most callers should not need this.
export { isContainerSlot };
