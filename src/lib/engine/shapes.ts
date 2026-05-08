import type { Cell, PackPlacement, Rotation, ShapeCells } from "@/lib/types";
import { ITEMS } from "@/lib/data/items";

export function rotateCells(cells: ShapeCells, rotation: Rotation): ShapeCells {
  let result: Cell[] = cells.map(([x, y]) => [x, y] as Cell);
  for (let i = 0; i < rotation; i++) {
    result = result.map(([x, y]) => [-y, x] as Cell);
  }
  let minX = Infinity;
  let minY = Infinity;
  for (const [x, y] of result) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
  }
  return result.map(([x, y]) => [x - minX, y - minY] as Cell);
}

export function shapeBounds(cells: ShapeCells): { w: number; h: number } {
  let maxX = 0;
  let maxY = 0;
  for (const [x, y] of cells) {
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { w: maxX + 1, h: maxY + 1 };
}

export function shapeFor(itemId: string, rotation: Rotation = 0): ShapeCells {
  const base = ITEMS[itemId]?.shape ?? [[0, 0]];
  return rotateCells(base, rotation);
}

export function buildOccupancy(
  placements: ReadonlyArray<PackPlacement>,
  gridW: number,
  gridH: number,
  ignoreUid?: string,
): boolean[][] {
  const grid: boolean[][] = Array.from({ length: gridH }, () => Array(gridW).fill(false));
  for (const p of placements) {
    if (p.uid === ignoreUid) continue;
    const cells = shapeFor(p.itemId, p.rotation);
    for (const [dx, dy] of cells) {
      const x = p.x + dx;
      const y = p.y + dy;
      if (y >= 0 && y < gridH && x >= 0 && x < gridW) grid[y][x] = true;
    }
  }
  return grid;
}

export function canPlace(
  cells: ShapeCells,
  ox: number,
  oy: number,
  gridW: number,
  gridH: number,
  occupied: ReadonlyArray<ReadonlyArray<boolean>>,
): boolean {
  for (const [dx, dy] of cells) {
    const x = ox + dx;
    const y = oy + dy;
    if (x < 0 || y < 0 || x >= gridW || y >= gridH) return false;
    if (occupied[y][x]) return false;
  }
  return true;
}

export function findFirstFit(
  itemId: string,
  gridW: number,
  gridH: number,
  occupied: ReadonlyArray<ReadonlyArray<boolean>>,
): { x: number; y: number; rotation: Rotation } | null {
  for (const rot of [0, 1, 2, 3] as Rotation[]) {
    const cells = shapeFor(itemId, rot);
    const { w, h } = shapeBounds(cells);
    for (let y = 0; y <= gridH - h; y++) {
      for (let x = 0; x <= gridW - w; x++) {
        if (canPlace(cells, x, y, gridW, gridH, occupied)) {
          return { x, y, rotation: rot };
        }
      }
    }
  }
  return null;
}
