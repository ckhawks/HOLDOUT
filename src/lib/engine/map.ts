import type { Location, MapTile, RaidMap, RoomType, StashItem } from "@/lib/types";
import { ROOM_NAMES } from "@/lib/data/events";

// Coordinate convention matches the visual: x grows rightward (depth from
// entry), y grows downward (lane). The map is a horizontal strip — entry on
// the left, deep on the right.
//
//   forward  = right = x + 1
//   backward = left  = x - 1   (toward entry / extract)
//   up       = y - 1           (lane shift toward the top row)
//   down     = y + 1           (lane shift toward the bottom row)
export const MAP_WIDTH = 12; // depth (number of columns)
export const MAP_HEIGHT = 5; // lanes (number of rows)
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

function pickName(rand: () => number, type: RoomType): string {
  const pool = ROOM_NAMES[type];
  if (!pool || pool.length === 0) return type;
  return pool[Math.floor(rand() * pool.length)];
}

// Loot potential per room type — number of "containers" the operative can
// Loot in this room. Each Loot action consumes one (with a chance of an item
// drop). Storage rooms have the most; gantries / corridors have the least.
function pickLootPotential(rand: () => number, type: RoomType): number {
  switch (type) {
    case "storage":
      return 2 + Math.floor(rand() * 3); // 2-4
    case "office":
      return 1 + Math.floor(rand() * 3); // 1-3
    case "mechanical":
      return 1 + Math.floor(rand() * 3); // 1-3
    case "corridor":
      return Math.floor(rand() * 2); // 0-1
    case "gantry":
      return Math.floor(rand() * 2); // 0-1
    case "entry":
    case "locked":
    default:
      return 0;
  }
}

function pickWeighted<T extends string>(
  rand: () => number,
  weights: Partial<Record<T, number>>,
): T {
  const entries = Object.entries(weights) as Array<[T, number]>;
  const total = entries.reduce((s, [, w]) => s + (w ?? 0), 0);
  if (total <= 0) {
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
  // Entry is the leftmost column at any lane — keeps insertion points varied.
  const entry = { x: 0, y: Math.floor(rand() * height) };
  const weights: Partial<Record<RoomType, number>> =
    location?.roomTypeWeights ?? DEFAULT_ROOM_WEIGHTS;

  const tiles: MapTile[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x === entry.x && y === entry.y) {
        tiles.push({
          x,
          y,
          type: "entry",
          name: pickName(rand, "entry"),
          blocked: false,
          visited: false,
          lootRemaining: 0,
          lootMax: 0,
          contents: [],
          seen: false,
        });
        continue;
      }
      // Tile directly forward from entry should never be blocked — guarantees
      // the operative can step out of the entry cell.
      const adjacentToEntry = x === entry.x + 1 && y === entry.y;
      const blocked = !adjacentToEntry && rand() < BLOCKED_TILE_RATIO;
      const type: RoomType = blocked ? "locked" : pickWeighted(rand, weights);
      const lootMax = blocked ? 0 : pickLootPotential(rand, type);
      tiles.push({
        x,
        y,
        type,
        name: pickName(rand, type),
        blocked,
        visited: false,
        lootRemaining: lootMax,
        lootMax,
        contents: [],
        seen: false,
      });
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

// Pick the next tile when pushing deeper. Prefers forward (right; x + 1)
// with a ~25% chance to drift up or down a lane for path variety. Falls back
// to a lane shift when right is blocked, or stays in place if cornered. The
// drift is non-deterministic, which is why CurrentRaid.nextStep is computed
// once at the end of the *previous* tick and stored — preview = actual move.
export function stepForward(
  map: RaidMap,
  pos: { x: number; y: number },
  rand: () => number,
): { x: number; y: number } {
  const fwd = { x: pos.x + 1, y: pos.y };
  const fwdOk = isWalkable(map, fwd.x, fwd.y);
  if (fwdOk && rand() < 0.25) {
    const dir = rand() < 0.5 ? -1 : 1;
    const lane = { x: pos.x, y: pos.y + dir };
    if (isWalkable(map, lane.x, lane.y)) return lane;
  }
  if (fwdOk) return fwd;
  // Forward is blocked: try a lane shift, prefer the side closer to map mid-lane.
  const mid = Math.floor(map.height / 2);
  const order = pos.y < mid ? [1, -1] : [-1, 1];
  for (const dir of order) {
    const lane = { x: pos.x, y: pos.y + dir };
    if (isWalkable(map, lane.x, lane.y)) return lane;
  }
  return pos;
}

// Pick an up/down lane shift for branches like Reposition where the
// operative "slips around" rather than pushing deeper. Prefers the lane
// direction (up or down) that increases manhattan distance from entry;
// falls back to the other lane; returns the same tile if both are blocked.
export function stepLateral(
  map: RaidMap,
  pos: { x: number; y: number },
): { x: number; y: number } {
  // Move AWAY from entry.y. If already on entry.y, default to +1.
  const dir = pos.y >= map.entry.y ? 1 : -1;
  const out = { x: pos.x, y: pos.y + dir };
  if (isWalkable(map, out.x, out.y)) return out;
  const back = { x: pos.x, y: pos.y - dir };
  if (isWalkable(map, back.x, back.y)) return back;
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

// Mark a tile as visited (operative has been here). Drives the map's
// "trodden" treatment.
export function markTileVisited(
  map: RaidMap,
  x: number,
  y: number,
): RaidMap {
  const idx = y * map.width + x;
  const t = map.tiles[idx];
  if (!t || t.visited) return map;
  const tiles = map.tiles.slice();
  tiles[idx] = { ...t, visited: true };
  return { ...map, tiles };
}

// Decrement lootRemaining on the tile (one container searched). Returns the
// same ref if nothing changed.
export function consumeLootFromTile(
  map: RaidMap,
  x: number,
  y: number,
): RaidMap {
  const idx = y * map.width + x;
  const t = map.tiles[idx];
  if (!t || t.lootRemaining <= 0) return map;
  const tiles = map.tiles.slice();
  tiles[idx] = { ...t, lootRemaining: t.lootRemaining - 1 };
  return { ...map, tiles };
}

// Add an item to a tile's contents. Used when loot drops or when the player
// drops an item from the pack into the current room.
export function addToTileContents(
  map: RaidMap,
  x: number,
  y: number,
  item: StashItem,
): RaidMap {
  const idx = y * map.width + x;
  const t = map.tiles[idx];
  if (!t) return map;
  const tiles = map.tiles.slice();
  tiles[idx] = { ...t, contents: [...t.contents, item] };
  return { ...map, tiles };
}

// Remove an item by uid from a tile's contents.
export function removeFromTileContents(
  map: RaidMap,
  x: number,
  y: number,
  uid: string,
): { map: RaidMap; item?: StashItem } {
  const idx = y * map.width + x;
  const t = map.tiles[idx];
  if (!t) return { map };
  const itemIdx = t.contents.findIndex((c) => c.uid === uid);
  if (itemIdx === -1) return { map };
  const item = t.contents[itemIdx];
  const tiles = map.tiles.slice();
  tiles[idx] = {
    ...t,
    contents: [...t.contents.slice(0, itemIdx), ...t.contents.slice(itemIdx + 1)],
  };
  return { map: { ...map, tiles }, item };
}

// Reveal a tile and its 4 orthogonal neighbors. Used to expand fog of war
// as the operative moves. Returns a new RaidMap if anything changed.
export function revealFrom(
  map: RaidMap,
  x: number,
  y: number,
): RaidMap {
  const targets: Array<[number, number]> = [
    [x, y],
    [x + 1, y],
    [x - 1, y],
    [x, y + 1],
    [x, y - 1],
  ];
  let tiles: MapTile[] | null = null;
  for (const [tx, ty] of targets) {
    if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) continue;
    const idx = ty * map.width + tx;
    const t = (tiles ?? map.tiles)[idx];
    if (t.seen) continue;
    if (!tiles) tiles = map.tiles.slice();
    tiles[idx] = { ...t, seen: true };
  }
  return tiles ? { ...map, tiles } : map;
}
