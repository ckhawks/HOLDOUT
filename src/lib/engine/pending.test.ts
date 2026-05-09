import { describe, expect, it } from "vitest";
import { PENDING_EXPIRY_MS, prunePending, pushPending } from "./raid";
import type { CurrentRaid, PendingItem } from "@/lib/types";

function makeRaid(over: Partial<CurrentRaid> = {}): CurrentRaid {
  return {
    locationId: "warehouse",
    startedAt: 0,
    runState: {
      alertness: 0,
      health: 100,
      energy: 100,
      ammo: 30,
      depth: 0,
      distanceFromExtract: 0,
      flags: [],
    },
    log: [],
    pack: [],
    pending: [],
    packGrid: { width: 4, height: 4 },
    pendingCapacity: 3,
    active: true,
    ...over,
  };
}

function pending(uid: string, itemId: string, arrivedAt: number): PendingItem {
  return { uid, itemId, arrivedAt };
}

describe("pushPending", () => {
  it("adds the item when under capacity, no log", () => {
    const r = pushPending(makeRaid(), pending("a", "scrap_metal", 0));
    expect(r.pending).toHaveLength(1);
    expect(r.log).toHaveLength(0);
  });

  it("fits exactly up to capacity without dropping", () => {
    let r = makeRaid({ pendingCapacity: 3 });
    r = pushPending(r, pending("a", "scrap_metal", 0));
    r = pushPending(r, pending("b", "scrap_metal", 1));
    r = pushPending(r, pending("c", "scrap_metal", 2));
    expect(r.pending).toHaveLength(3);
    expect(r.log).toHaveLength(0);
  });

  it("drops the oldest (FIFO) and logs when over capacity", () => {
    let r = makeRaid({ pendingCapacity: 2 });
    r = pushPending(r, pending("a", "scrap_metal", 0));
    r = pushPending(r, pending("b", "rusted_bolt", 1));
    r = pushPending(r, pending("c", "copper_wire", 2));
    expect(r.pending.map((p) => p.uid)).toEqual(["b", "c"]);
    expect(r.log).toHaveLength(1);
    expect(r.log[0].kind).toBe("system");
    expect(r.log[0].text).toMatch(/Pending tray full/);
    // Item name from the *dropped* item should appear in ⟦…⟧.
    expect(r.log[0].text).toContain("⟦Scrap Metal⟧");
  });

  it("uses the raw itemId in the log if the item is unknown", () => {
    let r = makeRaid({ pendingCapacity: 1 });
    r = pushPending(r, pending("a", "ghost_item", 0));
    r = pushPending(r, pending("b", "scrap_metal", 1));
    expect(r.log[0].text).toContain("⟦ghost_item⟧");
  });
});

describe("prunePending", () => {
  it("returns the same raid object if nothing has expired", () => {
    const r = makeRaid({ pending: [pending("a", "scrap_metal", 0)] });
    const out = prunePending(r, PENDING_EXPIRY_MS - 1);
    expect(out).toBe(r);
  });

  it("removes items whose age >= PENDING_EXPIRY_MS and logs each", () => {
    const r = makeRaid({
      pending: [
        pending("old", "scrap_metal", 0),
        pending("new", "rusted_bolt", PENDING_EXPIRY_MS - 100),
      ],
    });
    const out = prunePending(r, PENDING_EXPIRY_MS + 50);
    expect(out.pending.map((p) => p.uid)).toEqual(["new"]);
    expect(out.log).toHaveLength(1);
    expect(out.log[0].text).toMatch(/Pending expired/);
    expect(out.log[0].text).toContain("⟦Scrap Metal⟧");
  });

  it("expires every item at once if all are old enough", () => {
    const r = makeRaid({
      pending: [
        pending("a", "scrap_metal", 0),
        pending("b", "rusted_bolt", 0),
        pending("c", "copper_wire", 0),
      ],
    });
    const out = prunePending(r, PENDING_EXPIRY_MS);
    expect(out.pending).toHaveLength(0);
    expect(out.log).toHaveLength(3);
  });

  it("does not mutate the input raid object", () => {
    const r = makeRaid({ pending: [pending("a", "scrap_metal", 0)] });
    const before = JSON.stringify(r);
    prunePending(r, PENDING_EXPIRY_MS + 1);
    expect(JSON.stringify(r)).toBe(before);
  });
});
