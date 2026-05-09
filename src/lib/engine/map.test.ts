import { describe, expect, it } from "vitest";
import { makeRng } from "./raid";
import {
  BLOCKED_TILE_RATIO,
  MAP_HEIGHT,
  MAP_WIDTH,
  consumeLootFromTile,
  distanceToEntry,
  generateMap,
  isWalkable,
  revealFrom,
  stepBackward,
  stepForward,
  tileAt,
} from "./map";
import { LOCATIONS_BY_ID } from "@/lib/data/locations";

describe("generateMap", () => {
  it("produces a grid of the requested dimensions", () => {
    const m = generateMap(makeRng(1));
    expect(m.width).toBe(MAP_WIDTH);
    expect(m.height).toBe(MAP_HEIGHT);
    expect(m.tiles).toHaveLength(MAP_WIDTH * MAP_HEIGHT);
  });

  it("places entry on the leftmost column at one of the lanes", () => {
    const m = generateMap(makeRng(1));
    expect(m.entry.x).toBe(0);
    expect(m.entry.y).toBeGreaterThanOrEqual(0);
    expect(m.entry.y).toBeLessThan(MAP_HEIGHT);
    expect(tileAt(m, m.entry.x, m.entry.y)?.type).toBe("entry");
  });

  it("entry y varies across seeds", () => {
    const ys = new Set<number>();
    for (let seed = 1; seed < 100; seed++) {
      ys.add(generateMap(makeRng(seed)).entry.y);
    }
    expect(ys.size).toBeGreaterThan(2);
  });

  it("never blocks the entry tile or the tile directly to its right", () => {
    for (let seed = 1; seed < 50; seed++) {
      const m = generateMap(makeRng(seed));
      expect(tileAt(m, m.entry.x, m.entry.y)?.blocked).toBe(false);
      expect(tileAt(m, m.entry.x + 1, m.entry.y)?.blocked).toBe(false);
    }
  });

  it("is deterministic for the same seed", () => {
    const a = generateMap(makeRng(42));
    const b = generateMap(makeRng(42));
    expect(a.tiles.map((t) => t.type)).toEqual(b.tiles.map((t) => t.type));
    expect(a.tiles.map((t) => t.blocked)).toEqual(b.tiles.map((t) => t.blocked));
  });

  it("blocks a roughly BLOCKED_TILE_RATIO share of tiles (loose bound)", () => {
    let total = 0;
    let blocked = 0;
    for (let seed = 1; seed < 200; seed++) {
      const m = generateMap(makeRng(seed));
      for (const t of m.tiles) {
        if (t.type === "entry") continue;
        total++;
        if (t.blocked) blocked++;
      }
    }
    const ratio = blocked / total;
    expect(ratio).toBeGreaterThan(BLOCKED_TILE_RATIO * 0.5);
    expect(ratio).toBeLessThan(BLOCKED_TILE_RATIO * 1.7);
  });

  it("respects location roomTypeWeights — Datacenter favors office", () => {
    const dc = LOCATIONS_BY_ID["datacenter"];
    expect(dc.roomTypeWeights?.office).toBeGreaterThan(0);
    let officeCount = 0;
    let nonEntryCount = 0;
    for (let seed = 1; seed < 50; seed++) {
      const m = generateMap(makeRng(seed), dc);
      for (const t of m.tiles) {
        if (t.type === "entry") continue;
        nonEntryCount++;
        if (t.type === "office") officeCount++;
      }
    }
    expect(officeCount / nonEntryCount).toBeGreaterThan(0.2);
  });
});

describe("distanceToEntry", () => {
  it("returns 0 for the entry tile itself", () => {
    const m = generateMap(makeRng(1));
    expect(distanceToEntry(m, m.entry.x, m.entry.y)).toBe(0);
  });

  it("returns 1 for the tile directly right of entry (always walkable)", () => {
    const m = generateMap(makeRng(1));
    expect(distanceToEntry(m, m.entry.x + 1, m.entry.y)).toBe(1);
  });

  it("returns null for a blocked tile", () => {
    for (let seed = 1; seed < 100; seed++) {
      const m = generateMap(makeRng(seed));
      const blocked = m.tiles.find((t) => t.blocked);
      if (blocked) {
        expect(distanceToEntry(m, blocked.x, blocked.y)).toBeNull();
        return;
      }
    }
    throw new Error("no blocked tile found across 100 seeds — increase BLOCKED_TILE_RATIO?");
  });

  it("isWalkable matches blocked status", () => {
    const m = generateMap(makeRng(7));
    for (const t of m.tiles) {
      expect(isWalkable(m, t.x, t.y)).toBe(!t.blocked);
    }
  });
});

describe("stepForward", () => {
  it("from entry, the next step is one column to the right (always walkable by construction)", () => {
    const m = generateMap(makeRng(1));
    const next = stepForward(m, m.entry, makeRng(1));
    expect(next.x).toBe(m.entry.x + 1);
    expect(next.y).toBe(m.entry.y);
  });

  it("never lands on a blocked tile", () => {
    for (let seed = 1; seed < 50; seed++) {
      const m = generateMap(makeRng(seed));
      let pos = { ...m.entry };
      for (let i = 0; i < 20; i++) {
        pos = stepForward(m, pos, makeRng(seed + i));
        expect(isWalkable(m, pos.x, pos.y)).toBe(true);
      }
    }
  });

  it("monotonically pushes right or stays put — never moves left (back toward entry)", () => {
    for (let seed = 1; seed < 50; seed++) {
      const m = generateMap(makeRng(seed));
      let pos = { ...m.entry };
      for (let i = 0; i < 15; i++) {
        const prev = pos;
        pos = stepForward(m, pos, makeRng(seed * 11 + i));
        // x should not decrease (going left = toward entry)
        expect(pos.x).toBeGreaterThanOrEqual(prev.x);
      }
    }
  });
});

describe("stepBackward", () => {
  it("from a deep position, distance to entry strictly decreases or stays at 0", () => {
    const m = generateMap(makeRng(5));
    let pos = { ...m.entry };
    for (let i = 0; i < 5; i++) pos = stepForward(m, pos, makeRng(i + 1));
    const startDist = distanceToEntry(m, pos.x, pos.y) ?? 0;
    let prevDist = startDist;
    for (let i = 0; i < startDist + 2; i++) {
      pos = stepBackward(m, pos);
      const d = distanceToEntry(m, pos.x, pos.y) ?? 0;
      expect(d).toBeLessThanOrEqual(prevDist);
      prevDist = d;
    }
    expect(prevDist).toBe(0);
  });

  it("at entry, stepBackward stays at entry", () => {
    const m = generateMap(makeRng(2));
    expect(stepBackward(m, m.entry)).toEqual(m.entry);
  });
});

describe("revealFrom", () => {
  it("starts with all tiles unseen", () => {
    const m = generateMap(makeRng(1));
    expect(m.tiles.every((t) => !t.seen)).toBe(true);
  });

  it("marks the target tile and its 4 orthogonal neighbors as seen", () => {
    const m = generateMap(makeRng(1));
    const cx = 5;
    const cy = 2;
    const next = revealFrom(m, cx, cy);
    expect(tileAt(next, cx, cy)?.seen).toBe(true);
    expect(tileAt(next, cx + 1, cy)?.seen).toBe(true);
    expect(tileAt(next, cx - 1, cy)?.seen).toBe(true);
    expect(tileAt(next, cx, cy + 1)?.seen).toBe(true);
    expect(tileAt(next, cx, cy - 1)?.seen).toBe(true);
    expect(tileAt(next, cx + 1, cy + 1)?.seen).toBe(false);
  });

  it("returns the same map ref when nothing changes", () => {
    let m = generateMap(makeRng(1));
    m = revealFrom(m, 5, 2);
    const same = revealFrom(m, 5, 2);
    expect(same).toBe(m);
  });

  it("clips at map edges (no out-of-bounds)", () => {
    const m = generateMap(makeRng(1));
    const corner = revealFrom(m, 0, 0);
    expect(tileAt(corner, 0, 0)?.seen).toBe(true);
    expect(tileAt(corner, 1, 0)?.seen).toBe(true);
    expect(tileAt(corner, 0, 1)?.seen).toBe(true);
  });
});

describe("threat placement", () => {
  it("does not place threats on the entry tile or the always-walkable forward-of-entry tile", () => {
    for (let seed = 1; seed < 200; seed++) {
      const m = generateMap(makeRng(seed));
      expect(tileAt(m, m.entry.x, m.entry.y)?.threat).toBe(false);
      expect(tileAt(m, m.entry.x + 1, m.entry.y)?.threat).toBe(false);
    }
  });

  it("does not place threats on blocked tiles", () => {
    for (let seed = 1; seed < 50; seed++) {
      const m = generateMap(makeRng(seed));
      for (const t of m.tiles) {
        if (t.blocked) expect(t.threat).toBe(false);
      }
    }
  });

  it("places at least one threat on most maps (loose check across seeds)", () => {
    let mapsWithThreats = 0;
    for (let seed = 1; seed < 100; seed++) {
      const m = generateMap(makeRng(seed));
      if (m.tiles.some((t) => t.threat)) mapsWithThreats++;
    }
    // 0.1 ratio over ~50 eligible tiles → expect threats on ~99%+ of maps.
    expect(mapsWithThreats).toBeGreaterThan(85);
  });
});

describe("consumeLootFromTile", () => {
  it("decrements lootRemaining, pops the front container, returns a new ref", () => {
    const m = generateMap(makeRng(1));
    const target = m.tiles.find((t) => t.lootRemaining > 0);
    if (!target) return;
    const before = target.lootRemaining;
    const headBefore = target.containers[0];
    const { map: next, container } = consumeLootFromTile(m, target.x, target.y);
    expect(next).not.toBe(m);
    expect(container).toBe(headBefore);
    const after = next.tiles[target.y * m.width + target.x];
    expect(after.lootRemaining).toBe(before - 1);
    expect(after.containers.length).toBe(target.containers.length - 1);
  });

  it("returns the same map ref when lootRemaining is 0", () => {
    const m = generateMap(makeRng(1));
    const target = m.tiles.find((t) => t.lootRemaining === 0)!;
    const { map: next, container } = consumeLootFromTile(m, target.x, target.y);
    expect(next).toBe(m);
    expect(container).toBeUndefined();
  });
});
