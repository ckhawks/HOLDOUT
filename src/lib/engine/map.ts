import type { Location, LockedContainer, MapTile, RaidMap, RoomType, StashItem } from "@/lib/types";
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
export const THREAT_TILE_RATIO = 0.1;
// Don't seed threats in the first MIN_THREAT_DEPTH columns — gives the player
// breathing room to spot hostiles before they're forced into one.
const MIN_THREAT_DEPTH = 2;

// Per-location difficulty multiplier. Scales THREAT_TILE_RATIO (i.e. how
// dangerous the map is). Does NOT scale blockers — those are a layout-feel
// choice per location (a Datacenter feels denser than a Warehouse regardless
// of how dangerous it is), so each location sets blockedTileRatio explicitly.
export const DIFFICULTY_MULTIPLIER: Record<"low" | "mid" | "high", number> = {
  low: 0.7,
  mid: 1.0,
  high: 1.4,
};

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

// Per-room-type container pool. Picked at map gen time and stored on the
// tile so entrance flavor and Loot logs reference the same nouns.
const CONTAINER_POOL: Record<RoomType, string[]> = {
  storage: ["crate", "footlocker", "locker", "shelf", "duffel"],
  office: ["desk", "filing cabinet", "drawer", "monitor cluster"],
  mechanical: ["tool chest", "junction box", "spare parts bin", "panel"],
  corridor: ["duffel", "crate", "shelf"],
  gantry: ["supply crate", "tool chest"],
  entry: [],
  locked: [],
};

function pickContainers(
  rand: () => number,
  type: RoomType,
  count: number,
): string[] {
  const pool = CONTAINER_POOL[type];
  if (!pool || pool.length === 0 || count <= 0) return [];
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(pool[Math.floor(rand() * pool.length)]);
  }
  return out;
}

// Per-room-type locked container pool. These are *separate* from regular
// containers — they go into MapTile.lockedContainers and require a Force /
// Blast action to crack. Different name flavor too: a wall safe is more
// interesting than a "locked locker."
const LOCKED_CONTAINER_POOL: Record<RoomType, Array<{ name: string; keyType: LockedContainer["keyType"] }>> = {
  storage: [
    { name: "padlocked footlocker", keyType: "key" },
    { name: "wall safe", keyType: "keycard" },
    { name: "secure crate", keyType: "key" },
  ],
  office: [
    { name: "wall safe", keyType: "keycard" },
    { name: "executive lockbox", keyType: "key" },
    { name: "ID-locked drawer", keyType: "id_badge" },
  ],
  mechanical: [
    { name: "secured junction box", keyType: "keycard" },
    { name: "armored panel", keyType: "key" },
  ],
  corridor: [
    { name: "padlocked crate", keyType: "key" },
  ],
  gantry: [
    { name: "padlocked supply crate", keyType: "key" },
  ],
  entry: [],
  locked: [],
};

// Chance a non-blocked, non-entry tile gets a locked container; if any, 0–1
// of them per tile (kept low to make finds feel meaningful).
const LOCKED_CONTAINER_TILE_RATIO = 0.18;

function pickLockedContainers(
  rand: () => number,
  type: RoomType,
): LockedContainer[] {
  const pool = LOCKED_CONTAINER_POOL[type];
  if (!pool || pool.length === 0) return [];
  if (rand() >= LOCKED_CONTAINER_TILE_RATIO) return [];
  const pick = pool[Math.floor(rand() * pool.length)];
  return [{ name: pick.name, keyType: pick.keyType }];
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

// Chance the guaranteed forward-corridor drifts a lane between adjacent
// columns. ~35% gives a corridor that wiggles enough to feel organic but
// still always lands at the rightmost column.
const CORRIDOR_DRIFT_CHANCE = 0.35;

// Carve a random-walk lane from entry to the rightmost column. These tiles
// are immune to the per-tile blocker roll, so there is always at least one
// reachable path from entry to the deepest column. Returned as a set of
// `${x},${y}` keys for cheap membership checks.
function carveCorridor(
  rand: () => number,
  entryX: number,
  entryY: number,
  width: number,
  height: number,
): Set<string> {
  const key = (x: number, y: number) => `${x},${y}`;
  const out = new Set<string>();
  let cy = entryY;
  out.add(key(entryX, cy));
  for (let cx = entryX + 1; cx < width; cx++) {
    if (rand() < CORRIDOR_DRIFT_CHANCE) {
      const drift = rand() < 0.5 ? -1 : 1;
      const ny = cy + drift;
      if (ny >= 0 && ny < height) cy = ny;
    }
    out.add(key(cx, cy));
  }
  return out;
}

// BFS from entry through non-blocked tiles, returning the set of reachable
// `${x},${y}` keys. Any non-blocked tile not in this set is in an isolated
// pocket and gets converted to a blocker so the rendered map matches reality.
function reachableFromEntry(
  tiles: MapTile[],
  width: number,
  height: number,
  entryX: number,
  entryY: number,
): Set<string> {
  const key = (x: number, y: number) => `${x},${y}`;
  const reached = new Set<string>();
  const queue: Array<{ x: number; y: number }> = [{ x: entryX, y: entryY }];
  reached.add(key(entryX, entryY));
  while (queue.length > 0) {
    const { x, y } = queue.shift()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const k = key(nx, ny);
      if (reached.has(k)) continue;
      const t = tiles[ny * width + nx];
      if (t.blocked) continue;
      reached.add(k);
      queue.push({ x: nx, y: ny });
    }
  }
  return reached;
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

  // Guaranteed corridor from entry to the rightmost column. Tiles on the
  // corridor are immune to the per-tile blocker roll — gen never produces a
  // map where forward progress is impossible.
  const corridor = carveCorridor(rand, entry.x, entry.y, width, height);
  const onCorridor = (x: number, y: number) => corridor.has(`${x},${y}`);

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
          containers: [],
          lockedContainers: [],
          contents: [],
          seen: false,
          threat: false,
        });
        continue;
      }
      // Tile directly forward from entry should never be blocked — guarantees
      // the operative can step out of the entry cell. Corridor tiles are also
      // protected from the blocker roll for guaranteed entry-to-deepest-column
      // connectivity.
      const adjacentToEntry = x === entry.x + 1 && y === entry.y;
      const protectedTile = adjacentToEntry || onCorridor(x, y);
      const mult = location ? DIFFICULTY_MULTIPLIER[location.difficulty] : 1;
      const blockRatio = location?.blockedTileRatio ?? BLOCKED_TILE_RATIO;
      const blocked = !protectedTile && rand() < blockRatio;
      const type: RoomType = blocked ? "locked" : pickWeighted(rand, weights);
      const lootMax = blocked ? 0 : pickLootPotential(rand, type);
      // Only sprinkle threats past the breathing-room columns and never on
      // blocked tiles or the always-walkable forward-of-entry tile.
      const threatEligible =
        !blocked && !adjacentToEntry && x >= MIN_THREAT_DEPTH;
      const threat = threatEligible && rand() < THREAT_TILE_RATIO * mult;
      tiles.push({
        x,
        y,
        type,
        name: pickName(rand, type),
        blocked,
        visited: false,
        lootRemaining: lootMax,
        lootMax,
        containers: pickContainers(rand, type, lootMax),
        lockedContainers: blocked ? [] : pickLockedContainers(rand, type),
        contents: [],
        seen: false,
        threat,
      });
    }
  }

  // Connectivity pass: any non-blocked tile not reachable from entry is in an
  // isolated pocket. Block it so the rendered map matches reality (no `???`
  // tiles dangling behind walls the operative can never breach).
  const reached = reachableFromEntry(tiles, width, height, entry.x, entry.y);
  for (const t of tiles) {
    if (t.type === "entry") continue;
    if (t.blocked) continue;
    if (reached.has(`${t.x},${t.y}`)) continue;
    t.blocked = true;
    t.lootRemaining = 0;
    t.lootMax = 0;
    t.containers = [];
    t.lockedContainers = [];
    t.threat = false;
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
    // Only drift into a lane whose own forward is walkable. Otherwise the
    // next tick's fallback ("forward is blocked → step into a lane with an
    // open forward") will pull the operative right back, producing a 2-tile
    // oscillation between the original lane and the dead-end drift lane.
    if (
      isWalkable(map, lane.x, lane.y) &&
      isWalkable(map, lane.x + 1, lane.y)
    ) {
      return lane;
    }
  }
  if (fwdOk) return fwd;
  // Forward is blocked. Prefer the lane whose own forward (x+1) is also
  // walkable — otherwise the operative bounces between two adjacent lanes
  // when both have a wall to their right.
  const lanes = [
    { x: pos.x, y: pos.y - 1 },
    { x: pos.x, y: pos.y + 1 },
  ].filter((c) => isWalkable(map, c.x, c.y));
  if (lanes.length === 0) return pos;
  // Sort: lanes with an open forward come first; tie-break toward map mid-lane.
  const mid = Math.floor(map.height / 2);
  lanes.sort((a, b) => {
    const aFwd = isWalkable(map, a.x + 1, a.y) ? 1 : 0;
    const bFwd = isWalkable(map, b.x + 1, b.y) ? 1 : 0;
    if (aFwd !== bFwd) return bFwd - aFwd;
    return Math.abs(a.y - mid) - Math.abs(b.y - mid);
  });
  return lanes[0];
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

// BFS path from (x, y) to entry, walking only non-blocked tiles. Returns
// the ordered list of tiles starting at the source and ending at entry, or
// an empty array if unreachable. Used to draw the extract path overlay.
export function pathToEntry(
  map: RaidMap,
  x: number,
  y: number,
): Array<{ x: number; y: number }> {
  if (!isWalkable(map, x, y)) return [];
  const key = (px: number, py: number) => `${px},${py}`;
  const start = key(x, y);
  const goal = key(map.entry.x, map.entry.y);
  if (start === goal) return [{ x, y }];
  const parents = new Map<string, string>();
  const seen = new Set<string>([start]);
  const queue: Array<{ x: number; y: number }> = [{ x, y }];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    const moves = [
      { x: cur.x + 1, y: cur.y },
      { x: cur.x - 1, y: cur.y },
      { x: cur.x, y: cur.y + 1 },
      { x: cur.x, y: cur.y - 1 },
    ];
    for (const next of moves) {
      const k = key(next.x, next.y);
      if (seen.has(k)) continue;
      if (!isWalkable(map, next.x, next.y)) continue;
      seen.add(k);
      parents.set(k, key(cur.x, cur.y));
      if (k === goal) {
        // Reconstruct path from goal back to source.
        const path: Array<{ x: number; y: number }> = [next];
        let cursor = key(cur.x, cur.y);
        while (cursor !== start) {
          const [px, py] = cursor.split(",").map(Number);
          path.push({ x: px, y: py });
          cursor = parents.get(cursor)!;
        }
        path.push({ x, y });
        return path.reverse();
      }
      queue.push(next);
    }
  }
  return [];
}

// Pick the next tile when extracting. Single source of truth for backward
// navigation: returns path[1] from pathToEntry so the operative's actual
// next step always matches the path-line overlay drawn on the map.
export function stepBackward(
  map: RaidMap,
  pos: { x: number; y: number },
): { x: number; y: number } {
  if (pos.x === map.entry.x && pos.y === map.entry.y) return pos;
  const path = pathToEntry(map, pos.x, pos.y);
  if (path.length < 2) return pos;
  return path[1];
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

// Decrement lootRemaining and pop the next container name off the queue.
// Returns the new map plus the popped name (or undefined if empty).
export function consumeLootFromTile(
  map: RaidMap,
  x: number,
  y: number,
): { map: RaidMap; container?: string } {
  const idx = y * map.width + x;
  const t = map.tiles[idx];
  if (!t || t.lootRemaining <= 0) return { map };
  const [head, ...rest] = t.containers;
  const tiles = map.tiles.slice();
  tiles[idx] = {
    ...t,
    lootRemaining: t.lootRemaining - 1,
    containers: rest,
  };
  return { map: { ...map, tiles }, container: head };
}

// Pop the front locked container off a tile after a Force/Blast resolves.
export function consumeLockedFromTile(
  map: RaidMap,
  x: number,
  y: number,
): { map: RaidMap; locked?: LockedContainer } {
  const idx = y * map.width + x;
  const t = map.tiles[idx];
  if (!t || t.lockedContainers.length === 0) return { map };
  const [head, ...rest] = t.lockedContainers;
  const tiles = map.tiles.slice();
  tiles[idx] = { ...t, lockedContainers: rest };
  return { map: { ...map, tiles }, locked: head };
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

// Clear the threat flag from a tile (target neutralized or fled).
export function clearTileThreat(
  map: RaidMap,
  x: number,
  y: number,
): RaidMap {
  const idx = y * map.width + x;
  const t = map.tiles[idx];
  if (!t || !t.threat) return map;
  const tiles = map.tiles.slice();
  tiles[idx] = { ...t, threat: false };
  return { ...map, tiles };
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
