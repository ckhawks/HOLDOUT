import { describe, expect, it } from "vitest";
import {
  buildOccupancy,
  canPlace,
  findFirstFit,
  rotateCells,
  shapeBounds,
  shapeFor,
} from "./shapes";
import type { Cell, PackPlacement, ShapeCells } from "@/lib/types";

const HORIZ2: ShapeCells = [
  [0, 0],
  [1, 0],
];
const L3: ShapeCells = [
  [0, 0],
  [0, 1],
  [1, 1],
];
const J4: ShapeCells = [
  [0, 0],
  [0, 1],
  [1, 1],
  [2, 1],
];
const SQUARE2: ShapeCells = [
  [0, 0],
  [1, 0],
  [0, 1],
  [1, 1],
];

function sortCells(cells: ShapeCells): Cell[] {
  return [...cells].sort((a, b) => (a[0] - b[0]) || (a[1] - b[1])) as Cell[];
}

describe("rotateCells", () => {
  it("rotation 0 is the identity (modulo normalization)", () => {
    expect(sortCells(rotateCells(L3, 0))).toEqual(sortCells(L3));
  });

  it("rotates 90° clockwise and re-anchors to non-negative coords", () => {
    const r1 = rotateCells(HORIZ2, 1);
    // every cell must have x>=0 and y>=0
    for (const [x, y] of r1) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
    }
    // 2-wide horizontal becomes 2-tall vertical
    const b = shapeBounds(r1);
    expect(b).toEqual({ w: 1, h: 2 });
  });

  it("4 rotations return to the original shape", () => {
    expect(sortCells(rotateCells(J4, 4 as 0))).toEqual(sortCells(J4));
  });

  it("preserves the cell count", () => {
    for (const rot of [0, 1, 2, 3] as const) {
      expect(rotateCells(J4, rot).length).toBe(J4.length);
    }
  });

  it("a square is rotation-invariant under bounds", () => {
    for (const rot of [0, 1, 2, 3] as const) {
      expect(shapeBounds(rotateCells(SQUARE2, rot))).toEqual({ w: 2, h: 2 });
    }
  });
});

describe("shapeBounds", () => {
  it("returns w and h based on max coord + 1", () => {
    expect(shapeBounds([[0, 0]])).toEqual({ w: 1, h: 1 });
    expect(shapeBounds(HORIZ2)).toEqual({ w: 2, h: 1 });
    expect(shapeBounds(J4)).toEqual({ w: 3, h: 2 });
  });
});

describe("shapeFor", () => {
  it("falls back to a 1x1 cell for unknown item ids", () => {
    expect(shapeFor("does_not_exist", 0)).toEqual([[0, 0]]);
  });
});

describe("canPlace", () => {
  const empty4x4: boolean[][] = Array.from({ length: 4 }, () => Array(4).fill(false));

  it("accepts a placement entirely inside the grid", () => {
    expect(canPlace(HORIZ2, 0, 0, 4, 4, empty4x4)).toBe(true);
    expect(canPlace(HORIZ2, 2, 3, 4, 4, empty4x4)).toBe(true);
  });

  it("rejects when any cell falls off the right edge", () => {
    expect(canPlace(HORIZ2, 3, 0, 4, 4, empty4x4)).toBe(false);
  });

  it("rejects when any cell falls off the bottom edge", () => {
    expect(canPlace(L3, 0, 3, 4, 4, empty4x4)).toBe(false);
  });

  it("rejects negative origins", () => {
    expect(canPlace(HORIZ2, -1, 0, 4, 4, empty4x4)).toBe(false);
    expect(canPlace(HORIZ2, 0, -1, 4, 4, empty4x4)).toBe(false);
  });

  it("rejects overlap with an occupied cell", () => {
    const occ: boolean[][] = Array.from({ length: 4 }, () => Array(4).fill(false));
    occ[0][1] = true;
    expect(canPlace(HORIZ2, 0, 0, 4, 4, occ)).toBe(false);
  });

  it("ignores irrelevant occupied cells", () => {
    const occ: boolean[][] = Array.from({ length: 4 }, () => Array(4).fill(false));
    occ[3][3] = true;
    expect(canPlace(HORIZ2, 0, 0, 4, 4, occ)).toBe(true);
  });
});

describe("buildOccupancy", () => {
  it("marks every cell of every placement as occupied", () => {
    // Use real items via shapeFor — pick scrap_metal (S.one) so we know the shape.
    const placements: PackPlacement[] = [
      { uid: "a", itemId: "scrap_metal", x: 0, y: 0, rotation: 0 },
      { uid: "b", itemId: "scrap_metal", x: 2, y: 1, rotation: 0 },
    ];
    const occ = buildOccupancy(placements, 4, 4);
    expect(occ[0][0]).toBe(true);
    expect(occ[1][2]).toBe(true);
    expect(occ[3][3]).toBe(false);
  });

  it("ignoreUid skips that placement", () => {
    const placements: PackPlacement[] = [
      { uid: "keep", itemId: "scrap_metal", x: 0, y: 0, rotation: 0 },
      { uid: "skip", itemId: "scrap_metal", x: 1, y: 0, rotation: 0 },
    ];
    const occ = buildOccupancy(placements, 4, 4, "skip");
    expect(occ[0][0]).toBe(true);
    expect(occ[0][1]).toBe(false);
  });

  it("clips cells that fall outside the grid silently", () => {
    // scrap_metal at (5, 5) on a 4x4 grid — every cell is out of bounds, no throw.
    const placements: PackPlacement[] = [
      { uid: "x", itemId: "scrap_metal", x: 5, y: 5, rotation: 0 },
    ];
    const occ = buildOccupancy(placements, 4, 4);
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) expect(occ[y][x]).toBe(false);
    }
  });
});

describe("findFirstFit", () => {
  it("returns the top-left fit on an empty grid", () => {
    const empty: boolean[][] = Array.from({ length: 4 }, () => Array(4).fill(false));
    const fit = findFirstFit("scrap_metal", 4, 4, empty);
    expect(fit).toEqual({ x: 0, y: 0, rotation: 0 });
  });

  it("returns null when no rotation fits", () => {
    const full: boolean[][] = Array.from({ length: 4 }, () => Array(4).fill(true));
    expect(findFirstFit("scrap_metal", 4, 4, full)).toBeNull();
  });

  it("tries other rotations when rotation 0 doesn't fit", () => {
    // 1x4 grid: a horizontal-3 shape only fits rotated to vertical
    const empty: boolean[][] = Array.from({ length: 4 }, () => Array(1).fill(false));
    const fit = findFirstFit("hydraulic_piston", 1, 4, empty);
    expect(fit).not.toBeNull();
    expect(fit!.rotation === 1 || fit!.rotation === 3).toBe(true);
  });
});
