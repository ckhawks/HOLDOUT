"use client";

import { useEffect } from "react";
import { useGame } from "@/store/game";
import { ACTION_TIMER_MS } from "@/lib/engine/raid";
import { playSfx } from "@/lib/sfx";

// The raid loop owns ALL raid-related timers:
//   1. While active — fire doTick when the action timer elapses. Timer start
//      is stored on the raid (actionStartedAt) so it survives pause and
//      component re-mounts.
//   2. When the raid hits a terminal state (death / extract) — the engine
//      sets raid.pendingEnd = { at, success }. We observe and call endRaid
//      at `at` so the player has time to read the final log line.
//
// Storing schedule data on raid state (not store-local setTimeout chains)
// keeps the engine pure and the timing observable from a single place.
export function useRaidLoop() {
  const raid = useGame((s) => s.currentRaid);
  const doTick = useGame((s) => s.doTick);
  const endRaid = useGame((s) => s.endRaid);

  useEffect(() => {
    if (!raid) return;

    // Terminal phase: schedule endRaid at pendingEnd.at and bail (no tick).
    if (raid.pendingEnd) {
      const remaining = Math.max(0, raid.pendingEnd.at - Date.now());
      const success = raid.pendingEnd.success;
      const t = setTimeout(() => endRaid(success), remaining);
      return () => clearTimeout(t);
    }

    if (!raid.active) return;
    if (raid.pendingChoice) return;
    if (raid.pausedAt) return;

    const elapsed = Date.now() - raid.actionStartedAt;
    const remaining = Math.max(0, ACTION_TIMER_MS - elapsed);
    const t = setTimeout(() => {
      doTick();
      const latest = useGame.getState().currentRaid?.log.at(-1);
      playSfx(latest?.kind === "damage" ? "error" : "tick");
    }, remaining);
    return () => clearTimeout(t);
  }, [raid, doTick, endRaid]);
}
