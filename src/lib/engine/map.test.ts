import { describe, expect, it } from "vitest";
import { makeRng } from "./raid";
import {
  BLOCKED_TILE_RATIO,
  MAP_HEIGHT,
  MAP_WIDTH,
  distanceToEntry,
  generateMap,
  isWalkable,
  markTileLooted,
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

  it("places entry at bottom-middle", () => {
    const m = generateMap(makeRng(1));
    expect(m.entry).toEqual({
      x: Math.floor(MAP_WIDTH / 2),
      y: MAP_HEIGHT - 1,
    });
    expect(tileAt(m, m.entry.x, m.entry.y)?.type).toBe("entry");
  });

  it("never blocks the entry tile or the tile directly above it", () => {
    for (let seed = 1; seed < 50; seed++) {
      const m = generateMap(makeRng(seed));
      expect(tileAt(m, m.entry.x, m.entry.y)?.blocked).toBe(false);
      expect(tileAt(m, m.entry.x, m.entry.y - 1)?.blocked).toBe(false);
    }
  });

  it("is deterministic for the same seed", () => {
    const a = generateMap(makeRng(42));
    const b = generateMap(makeRng(42));
    expect(a.tiles.map((t) => t.type)).toEqual(b.tiles.map((t) => t.type));
    expect(a.tiles.map((t) => t.blocked)).toEqual(b.tiles.map((t) => t.blocked));
  });

  it("blocks a roughly BLOCKED_TILE_RATIO share of tiles (loose bound)", () => {
    // Aggregate over many seeds to smooth variance.
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
    // office should be the dominant non-blocked type. Loose bound.
    expect(officeCount / nonEntryCount).toBeGreaterThan(0.2);
  });
});

describe("distanceToEntry", () => {
  it("returns 0 for the entry tile itself", () => {
    const m = generateMap(makeRng(1));
    expect(distanceToEntry(m, m.entry.x, m.entry.y)).toBe(0);
  });

  it("returns 1 for the tile directly above entry (always walkable)", () => {
    const m = generateMap(makeRng(1));
    expect(distanceToEntry(m, m.entry.x, m.entry.y - 1)).toBe(1);
  });

  it("returns null for a blocked tile", () => {
    // Build a map by seed-search until we find a blocked tile.
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
  it("from entry, the next step is one row up (always walkable by construction)", () => {
    const m = generateMap(makeRng(1));
    const next = stepForward(m, m.entry, makeRng(1));
    expect(next.y).toBe(m.entry.y - 1);
    expect(Math.abs(next.x - m.entry.x)).toBeLessThanOrEqual(0); // first step from entry can drift only if up walkable + roll < 0.25
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

  it("monotonically gets deeper or stays put — never moves down (toward entry)", () => {
    for (let seed = 1; seed < 50; seed++) {
      const m = generateMap(makeRng(seed));
      let pos = { ...m.entry };
      for (let i = 0; i < 15; i++) {
        const prev = pos;
        pos = stepForward(m, pos, makeRng(seed * 11 + i));
        // y should not increase (going down = toward entry)
        expect(pos.y).toBeLessThanOrEqual(prev.y);
      }
    }
  });
});

describe("stepBackward", () => {
  it("from a deep position, distance to entry strictly decreases or stays at 0", () => {
    const m = generateMap(makeRng(5));
    // Walk forward 5 steps then trace back.
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
    expect(prevDist).toBe(0); // arrived at entry
  });

  it("at entry, stepBackward stays at entry", () => {
    const m = generateMap(makeRng(2));
    expect(stepBackward(m, m.entry)).toEqual(m.entry);
  });
});

describe("markTileLooted", () => {
  it("flags the named tile and returns a new map ref", () => {
    const m = generateMap(makeRng(1));
    const next = markTileLooted(m, 1, 1);
    expect(next).not.toBe(m);
    expect(next.tiles[1 * m.width + 1].looted).toBe(true);
  });

  it("returns the same map ref when the tile is already looted", () => {
    const m = generateMap(makeRng(1));
    const once = markTileLooted(m, 1, 1);
    const twice = markTileLooted(once, 1, 1);
    expect(twice).toBe(once);
  });
});
