// RNG- and clock-driven log/uid helpers. Extracted from raid.ts so flavor and
// consumables can build LogEntry values without circularly depending on the
// raid module. Engine purity rule: callers must thread `now` and `rand` —
// these never read `Date.now()` or `Math.random()` directly.

import type { LogEntry } from "@/lib/types";

export function makeUid(now: number, rand: () => number): string {
  return `${now.toString(36)}-${rand().toString(36).slice(2, 8)}`;
}

export function makeLog(
  kind: LogEntry["kind"],
  text: string,
  itemId: string | undefined,
  now: number,
  rand: () => number,
): LogEntry {
  return { id: makeUid(now, rand), timestamp: now, text, kind, itemId };
}

// Closure factory to keep internal call sites short: `const log = makeLogger(now, rand)`
// then `log("flavor", "...")` instead of repeating now/rand at every call.
export function makeLogger(
  now: number,
  rand: () => number,
): (kind: LogEntry["kind"], text: string, itemId?: string) => LogEntry {
  return (kind, text, itemId) => makeLog(kind, text, itemId, now, rand);
}
