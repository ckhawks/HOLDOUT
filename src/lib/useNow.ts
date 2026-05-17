"use client";

import { useSyncExternalStore } from "react";

// Subscribe-based wall-clock hook. Components reading `useNow()` re-render at
// the chosen tick rate. Date.now() lives inside getSnapshot, which the React
// Compiler ESLint plugin treats as a sanctioned escape hatch for external
// mutable state — so we avoid the "Cannot call impure function during render"
// flag without resorting to setState-in-effect timer hacks.
//
// One global interval drives all subscribers, so mounting many useNow consumers
// doesn't multiply timers.
const TICK_MS = 100;

const subscribers = new Set<() => void>();
let intervalId: ReturnType<typeof setInterval> | null = null;
// Cached wall-clock snapshot. Must change ONLY when subscribers are
// notified — calling Date.now() inline in getSnapshot would return a
// new value on every render pass and trip React's "getSnapshot should
// be cached" infinite-loop warning under useSyncExternalStore.
let cachedNow = typeof Date !== "undefined" ? Date.now() : 0;

function subscribe(callback: () => void): () => void {
  subscribers.add(callback);
  if (intervalId === null) {
    intervalId = setInterval(() => {
      cachedNow = Date.now();
      for (const s of subscribers) s();
    }, TICK_MS);
  }
  return () => {
    subscribers.delete(callback);
    if (subscribers.size === 0 && intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
}

const getSnapshot = (): number => cachedNow;
const getServerSnapshot = (): number => 0;

export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
