import type { Location, MapTile, RaidMap, RoomType } from "@/lib/types";

export const MAP_WIDTH = 5;
export const MAP_HEIGHT = 12;
export const BLOCKED_TILE_RATIO = 0.12;

const DEFAULT_ROOM_WEIGHTS: Record<RoomType, number> = {
  corridor: 5,
  storage: 3,
  office: 2,
  mechanical: 2,
  gantry: 1,
  locked: 1,
  entry: 0,
};

function pickWeighted<T extends string>(
  rand: () => number,
  weights: Partial<Record<T, number>>,
): T {
  const entries = Object.entries(weights) as Array<[T, number]>;
  const total = entries.reduce((s, [, w]) => s + (w ?? 0), 0);
  if (total <= 0) {
    // Fall back to first non-zero key, or first key.
    const fallback = entries.find(([, w]) => (w ?? 0) > 0)?.[0] ?? entries[0][0];
    return fallback;
  }
  let r = rand() * total;
  for (const [k, w] of entries) {
    r -= w ?? 0;
    if (r <= 0) return k;
  }
  return entries[entries.length - 1][0];
}

export function generateMap(
  rand: () => number,
  location?: Location,
  width: number = MAP_WIDTH,
  height: number = MAP_HEIGHT,
): RaidMap {
  const entry = { x: Math.floor(width / 2), y: height - 1 };
  const weights: Partial<Record<RoomType, number>> =
    location?.roomTypeWeights ?? DEFAULT_ROOM_WEIGHTS;

  const tiles: MapTile[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x === entry.x && y === entry.y) {
        tiles.push({ x, y, type: "entry", blocked: false, looted: false });
        continue;
      }
      // Tile directly above entry should never be blocked — guarantees the
      // operative can step out of the entry cell.
      const adjacentToEntry = x === entry.x && y === entry.y - 1;
      const blocked = !adjacentToEntry && rand() < BLOCKED_TILE_RATIO;
      const type: RoomType = blocked ? "locked" : pickWeighted(rand, weights);
      tiles.push({ x, y, type, blocked, looted: false });
    }
  }
  return { width, height, tiles, entry };
}

export function tileAt(map: RaidMap, x: number, y: number): MapTile | undefined {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return undefined;
  return map.tiles[y * map.width + x];
}

export function isWalkable(map: RaidMap, x: number, y: number): boolean {
  const t = tileAt(map, x, y);
  return !!t && !t.blocked;
}

// Manhattan-distance BFS from (x,y) to entry, walking only non-blocked tiles.
// Returns the path length, or null if unreachable.
export function distanceToEntry(
  map: RaidMap,
  x: number,
  y: number,
): number | null {
  if (!isWalkable(map, x, y)) return null;
  if (x === map.entry.x && y === map.entry.y) return 0;
  const seen = new Set<string>();
  const key = (px: number, py: number) => `${px},${py}`;
  const queue: Array<{ x: number; y: number; d: number }> = [
    { x, y, d: 0 },
  ];
  seen.add(key(x, y));
  while (queue.length > 0) {
    const cur = queue.shift()!;
    const moves = [
      [cur.x + 1, cur.y],
      [cur.x - 1, cur.y],
      [cur.x, cur.y + 1],
      [cur.x, cur.y - 1],
    ];
    for (const [nx, ny] of moves) {
      if (seen.has(key(nx, ny))) continue;
      if (!isWalkable(map, nx, ny)) continue;
      const nd = cur.d + 1;
      if (nx === map.entry.x && ny === map.entry.y) return nd;
      seen.add(key(nx, ny));
      queue.push({ x: nx, y: ny, d: nd });
    }
  }
  return null;
}

// Pick the next tile when pushing deeper. Prefers "up" (decreasing y) with a
// chance to drift laterally for variety. Falls back to a lateral step if the
// way up is blocked, or stays in place if cornered.
export function stepForward(
  map: RaidMap,
  pos: { x: number; y: number },
  rand: () => number,
): { x: number; y: number } {
  const up = { x: pos.x, y: pos.y - 1 };
  const upOk = isWalkable(map, up.x, up.y);
  // ~25% drift sideways even when up is open, for some path variety.
  if (upOk && rand() < 0.25) {
    const dir = rand() < 0.5 ? -1 : 1;
    const lat = { x: pos.x + dir, y: pos.y };
    if (isWalkable(map, lat.x, lat.y)) return lat;
  }
  if (upOk) return up;
  // Up is blocked: try lateral, prefer the side closer to map center.
  const center = Math.floor(map.width / 2);
  const order = pos.x < center ? [1, -1] : [-1, 1];
  for (const dir of order) {
    const lat = { x: pos.x + dir, y: pos.y };
    if (isWalkable(map, lat.x, lat.y)) return lat;
  }
  return pos;
}

// Pick the next tile when extracting. Steps to the orthogonal neighbor with
// the smallest distanceToEntry — straightforward greedy on a BFS field.
export function stepBackward(
  map: RaidMap,
  pos: { x: number; y: number },
): { x: number; y: number } {
  const here = distanceToEntry(map, pos.x, pos.y) ?? Infinity;
  if (here === 0) return pos;
  let best = pos;
  let bestDist = here;
  const moves = [
    [pos.x, pos.y + 1],
    [pos.x, pos.y - 1],
    [pos.x + 1, pos.y],
    [pos.x - 1, pos.y],
  ];
  for (const [nx, ny] of moves) {
    if (!isWalkable(map, nx, ny)) continue;
    const d = distanceToEntry(map, nx, ny);
    if (d !== null && d < bestDist) {
      best = { x: nx, y: ny };
      bestDist = d;
    }
  }
  return best;
}

// Mark a tile as looted/cleared (visited memory). Returns a new RaidMap if
// the tile state changed, otherwise the same reference.
export function markTileLooted(
  map: RaidMap,
  x: number,
  y: number,
): RaidMap {
  const idx = y * map.width + x;
  const t = map.tiles[idx];
  if (!t || t.looted) return map;
  const tiles = map.tiles.slice();
  tiles[idx] = { ...t, looted: true };
  return { ...map, tiles };
}
