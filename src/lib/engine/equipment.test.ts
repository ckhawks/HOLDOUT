import { describe, expect, it } from "vitest";
import {
  equipItem,
  findFit,
  moveBetweenSlots,
  placeIntoSlot,
  removeFromKit,
  unequipItem,
} from "./equipment";
import type { BagState, Equipment, PackPlacement, PocketsState } from "@/lib/types";

// Test fixtures: bare 4x4 pockets, no bag, no equip slots.
function makePockets(items: PackPlacement[] = []): PocketsState {
  return { grid: { width: 4, height: 4 }, items };
}

function makeBag(width = 4, height = 4, items: PackPlacement[] = []): BagState {
  return {
    slot: { uid: "bag-uid", itemId: "canvas_satchel" },
    sections: [{ id: "main", label: "Main", grid: { width, height }, items }],
  };
}

// Multi-section bag fixture for split-section tests. Two named sections so
// callers can target each independently with sectionId. Section ids match
// the data-driven definition for `modular_pack`.
function makeMultiBag(): BagState {
  return {
    slot: { uid: "bag-uid", itemId: "modular_pack" },
    sections: [
      { id: "main", label: "Main", grid: { width: 4, height: 4 }, items: [] },
      { id: "side", label: "Side", grid: { width: 2, height: 3 }, items: [] },
    ],
  };
}

function makeEq(overrides: Partial<Equipment> = {}): Equipment {
  return {
    pockets: makePockets(),
    bag: null,
    rig: null,
    weapon: null,
    armor: null,
    helmet: null,
    ...overrides,
  };
}

const BANDAGE = (uid: string): PackPlacement => ({
  uid,
  itemId: "bandage_pack",
  x: 0,
  y: 0,
  rotation: 0,
});

describe("placeIntoSlot", () => {
  it("places a 1x1 item into empty pockets", () => {
    const next = placeIntoSlot(makeEq(), "pockets", { uid: "u1", itemId: "bandage_pack" }, 0, 0, 0);
    expect(next?.pockets.items).toHaveLength(1);
    expect(next?.pockets.items[0]).toMatchObject({ uid: "u1", x: 0, y: 0 });
  });

  it("returns null when target cell is occupied", () => {
    const eq = makeEq({ pockets: makePockets([BANDAGE("existing")]) });
    const next = placeIntoSlot(eq, "pockets", { uid: "new", itemId: "bandage_pack" }, 0, 0, 0);
    expect(next).toBeNull();
  });

  it("returns null when placing into bag slot but no bag is equipped", () => {
    const next = placeIntoSlot(makeEq(), "bag", { uid: "u1", itemId: "bandage_pack" }, 0, 0, 0);
    expect(next).toBeNull();
  });

  it("places into bag when bag is equipped", () => {
    const eq = makeEq({ bag: makeBag() });
    const next = placeIntoSlot(eq, "bag", { uid: "u1", itemId: "bandage_pack" }, 1, 1, 0);
    expect(next?.bag?.sections[0].items).toHaveLength(1);
    expect(next?.bag?.sections[0].items[0]).toMatchObject({ uid: "u1", x: 1, y: 1 });
    expect(next?.pockets.items).toHaveLength(0);
  });

  it("multi-section bag: placement targets the requested section", () => {
    const eq = makeEq({ bag: makeMultiBag() });
    const intoSide = placeIntoSlot(
      eq,
      "bag",
      { uid: "u1", itemId: "bandage_pack" },
      0,
      0,
      0,
      "side",
    );
    expect(intoSide?.bag?.sections.find((s) => s.id === "side")?.items).toHaveLength(1);
    expect(intoSide?.bag?.sections.find((s) => s.id === "main")?.items).toHaveLength(0);
  });

  it("multi-section bag: rejects placement into a missing section", () => {
    const eq = makeEq({ bag: makeMultiBag() });
    const next = placeIntoSlot(
      eq,
      "bag",
      { uid: "u1", itemId: "bandage_pack" },
      0,
      0,
      0,
      "no-such-section",
    );
    expect(next).toBeNull();
  });

  it("returns null when out of grid bounds", () => {
    const next = placeIntoSlot(makeEq(), "pockets", { uid: "u1", itemId: "bandage_pack" }, 5, 5, 0);
    expect(next).toBeNull();
  });
});

describe("moveBetweenSlots", () => {
  it("moves an item within pockets to a new position", () => {
    const eq = makeEq({ pockets: makePockets([BANDAGE("u1")]) });
    const next = moveBetweenSlots(eq, "u1", "pockets", 2, 2, 0);
    expect(next?.pockets.items).toHaveLength(1);
    expect(next?.pockets.items[0]).toMatchObject({ uid: "u1", x: 2, y: 2 });
  });

  it("self-overlap is allowed (same-slot move ignores self in occupancy)", () => {
    // An item at (0,0) being "moved" to (0,0) — sanity-check the same-slot
    // exclusion in buildOccupancy doesn't block the trivial case.
    const eq = makeEq({ pockets: makePockets([BANDAGE("u1")]) });
    const next = moveBetweenSlots(eq, "u1", "pockets", 0, 0, 0);
    expect(next?.pockets.items[0]).toMatchObject({ uid: "u1", x: 0, y: 0 });
  });

  it("moves an item from pockets to bag", () => {
    const eq = makeEq({
      pockets: makePockets([BANDAGE("u1")]),
      bag: makeBag(),
    });
    const next = moveBetweenSlots(eq, "u1", "bag", 1, 1, 0);
    expect(next?.pockets.items).toHaveLength(0);
    expect(next?.bag?.sections[0].items).toHaveLength(1);
    expect(next?.bag?.sections[0].items[0]).toMatchObject({ uid: "u1", x: 1, y: 1 });
  });

  it("moves an item between sections of the same bag", () => {
    // Seed an item into "side", move it to "main".
    const seeded = placeIntoSlot(
      makeEq({ bag: makeMultiBag() }),
      "bag",
      { uid: "u1", itemId: "bandage_pack" },
      0,
      0,
      0,
      "side",
    )!;
    const moved = moveBetweenSlots(seeded, "u1", "bag", 0, 0, 0, "main");
    expect(moved?.bag?.sections.find((s) => s.id === "side")?.items).toHaveLength(0);
    expect(moved?.bag?.sections.find((s) => s.id === "main")?.items).toHaveLength(1);
  });

  it("returns null when uid doesn't exist anywhere in equipment", () => {
    const next = moveBetweenSlots(makeEq(), "nope", "pockets", 0, 0, 0);
    expect(next).toBeNull();
  });

  it("returns null when destination is occupied by a different item", () => {
    const eq = makeEq({
      pockets: makePockets([BANDAGE("u1"), { ...BANDAGE("u2"), x: 1, y: 0 }]),
    });
    const next = moveBetweenSlots(eq, "u1", "pockets", 1, 0, 0);
    expect(next).toBeNull();
  });
});

describe("removeFromKit", () => {
  it("removes from pockets and returns the item", () => {
    const eq = makeEq({ pockets: makePockets([BANDAGE("u1")]) });
    const result = removeFromKit(eq, "u1");
    expect(result?.next.pockets.items).toHaveLength(0);
    expect(result?.item).toMatchObject({ uid: "u1", itemId: "bandage_pack" });
  });

  it("removes from bag when item is in bag", () => {
    const eq = makeEq({ bag: makeBag(4, 4, [BANDAGE("u1")]) });
    const result = removeFromKit(eq, "u1");
    expect(result?.next.bag?.sections[0].items).toHaveLength(0);
    expect(result?.item.uid).toBe("u1");
  });

  it("returns null for unknown uid", () => {
    expect(removeFromKit(makeEq(), "nope")).toBeNull();
  });
});

describe("equipItem", () => {
  it("equips a bag from a free item", () => {
    const next = equipItem(makeEq(), { uid: "bag1", itemId: "canvas_satchel" });
    expect(next?.bag).not.toBeNull();
    expect(next?.bag?.slot.itemId).toBe("canvas_satchel");
    expect(next?.bag?.sections).toHaveLength(1);
    expect(next?.bag?.sections[0].grid).toEqual({ width: 4, height: 2 });
    expect(next?.bag?.sections[0].items).toHaveLength(0);
  });

  it("equipping a multi-section bag initializes one section per def", () => {
    const next = equipItem(makeEq(), { uid: "bag1", itemId: "modular_pack" });
    expect(next?.bag?.sections.map((s) => s.id)).toEqual(["main", "side"]);
    expect(next?.bag?.sections.every((s) => s.items.length === 0)).toBe(true);
  });

  it("equipping a chest rig fills the rig slot, not the bag slot", () => {
    const next = equipItem(makeEq(), { uid: "rig1", itemId: "combat_rig" });
    expect(next?.rig).not.toBeNull();
    expect(next?.bag).toBeNull();
    expect(next?.rig?.sections.map((s) => s.id)).toEqual(["main", "admin"]);
  });

  it("rig and bag can be worn at the same time", () => {
    const withBag = equipItem(makeEq(), { uid: "bag1", itemId: "canvas_satchel" })!;
    const withBoth = equipItem(withBag, { uid: "rig1", itemId: "light_rig" });
    expect(withBoth?.bag).not.toBeNull();
    expect(withBoth?.rig).not.toBeNull();
  });

  it("refuses to equip a bag if one is already equipped", () => {
    const eq = makeEq({ bag: makeBag() });
    expect(equipItem(eq, { uid: "bag2", itemId: "canvas_satchel" })).toBeNull();
  });

  it("returns null for non-equippable items (no `slot` field)", () => {
    expect(equipItem(makeEq(), { uid: "u1", itemId: "bandage_pack" })).toBeNull();
  });
});

describe("unequipItem", () => {
  it("unequips an empty bag", () => {
    const eq = makeEq({ bag: makeBag() });
    const result = unequipItem(eq, "bag");
    expect(result?.next.bag).toBeNull();
    expect(result?.removed.itemId).toBe("canvas_satchel");
  });

  it("refuses to unequip a bag that has contents", () => {
    const eq = makeEq({ bag: makeBag(4, 4, [BANDAGE("u1")]) });
    expect(unequipItem(eq, "bag")).toBeNull();
  });

  it("refuses to unequip a multi-section bag if any section has contents", () => {
    const eq = makeEq({
      bag: {
        slot: { uid: "bag-uid", itemId: "modular_pack" },
        sections: [
          { id: "main", grid: { width: 4, height: 4 }, items: [BANDAGE("u1")] },
          { id: "side", grid: { width: 2, height: 3 }, items: [] },
        ],
      },
    });
    expect(unequipItem(eq, "bag")).toBeNull();
  });

  it("returns null when slot is empty", () => {
    expect(unequipItem(makeEq(), "bag")).toBeNull();
  });
});

describe("findFit (auto-placement)", () => {
  const stashItem = { uid: "u1", itemId: "bandage_pack" } as const;

  it("finds a slot in empty pockets", () => {
    const fit = findFit(makeEq(), stashItem);
    expect(fit).toMatchObject({ slot: "pockets", x: 0, y: 0 });
  });

  it("falls through to bag when pockets is full", () => {
    // Fill all 16 cells with 1x1 items.
    const items: PackPlacement[] = [];
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        items.push({ uid: `fill-${x}-${y}`, itemId: "bandage_pack", x, y, rotation: 0 });
      }
    }
    const eq = makeEq({ pockets: makePockets(items), bag: makeBag() });
    const fit = findFit(eq, stashItem);
    expect(fit?.slot).toBe("bag");
    expect(fit?.sectionId).toBe("main");
  });

  it("multi-section: walks sections in order and returns the first fit", () => {
    // Fill pockets so the search has to fall through into the bag.
    const fill: PackPlacement[] = [];
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        fill.push({ uid: `f-${x}-${y}`, itemId: "bandage_pack", x, y, rotation: 0 });
      }
    }
    const eq = makeEq({ pockets: makePockets(fill), bag: makeMultiBag() });
    const fit = findFit(eq, stashItem);
    expect(fit?.slot).toBe("bag");
    // Both sections empty — first section ("main") wins.
    expect(fit?.sectionId).toBe("main");
  });

  it("falls through to rig when pockets and bag are full", () => {
    // Fill pockets and a single-section bag; the rig should catch the item.
    const fill: PackPlacement[] = [];
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        fill.push({ uid: `p-${x}-${y}`, itemId: "bandage_pack", x, y, rotation: 0 });
      }
    }
    const bagFill: PackPlacement[] = [];
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 4; x++) {
        bagFill.push({ uid: `b-${x}-${y}`, itemId: "bandage_pack", x, y, rotation: 0 });
      }
    }
    const eq = makeEq({
      pockets: makePockets(fill),
      bag: makeBag(4, 2, bagFill),
      rig: equipItem(makeEq(), { uid: "rig1", itemId: "light_rig" })!.rig,
    });
    const fit = findFit(eq, stashItem);
    expect(fit?.slot).toBe("rig");
  });

  it("returns null when pockets is full and no bag is equipped", () => {
    const items: PackPlacement[] = [];
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        items.push({ uid: `fill-${x}-${y}`, itemId: "bandage_pack", x, y, rotation: 0 });
      }
    }
    const eq = makeEq({ pockets: makePockets(items) });
    expect(findFit(eq, stashItem)).toBeNull();
  });
});
