export type Rand = () => number;

export function makeRand(seed?: number): Rand {
  if (seed === undefined) return Math.random;
  // mulberry32
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rand: Rand, arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

export function pickWeighted<T>(rand: Rand, entries: readonly [T, number][]): T {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [item, w] of entries) {
    r -= w;
    if (r <= 0) return item;
  }
  return entries[entries.length - 1][0];
}

// Roll uniformly in [-variance, +variance], then bias by quality (0..1).
// For non-inverted stats, higher quality pushes value up.
// For inverted stats (recoil, weight), higher quality pushes value down.
export function rollVariance(
  rand: Rand,
  base: number,
  variance: number,
  quality: number,
  inverted: boolean
): number {
  const noise = (rand() * 2 - 1) * variance;
  const bias = quality * variance * 0.6;
  const value = base + noise + (inverted ? -bias : bias);
  return value;
}

export function uid(rand: Rand): string {
  // 8-char base36 id
  return Math.floor(rand() * 0xffffffff).toString(36).padStart(7, "0").slice(0, 8);
}
