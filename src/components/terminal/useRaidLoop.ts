"use client";

import { useEffect } from "react";
import { useGame } from "@/store/game";
import { ACTION_TIMER_MS } from "@/lib/engine/raid";
import { playSfx } from "@/lib/sfx";

// The raid loop fires the queued action when the action timer elapses. The
// timer's start is stored on the raid (actionStartedAt) so it survives pause
// and component re-mounts. Each render computes the remaining time and
// schedules a single timeout.
export function useRaidLoop() {
  const raid = useGame((s) => s.currentRaid);
  const doTick = useGame((s) => s.doTick);

  useEffect(() => {
    if (!raid || !raid.active) return;
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
  }, [raid, doTick]);
}
