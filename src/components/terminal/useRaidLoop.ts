"use client";

import { useEffect } from "react";
import { useGame } from "@/store/game";
import { TICK_MAX_MS, TICK_MIN_MS } from "@/lib/engine/raid";
import { playSfx } from "@/lib/sfx";

export function useRaidLoop() {
  const raid = useGame((s) => s.currentRaid);
  const doTick = useGame((s) => s.doTick);

  useEffect(() => {
    if (!raid || !raid.active) return;
    if (raid.pendingChoice) return; // paused awaiting player decision
    if (raid.pausedAt) return; // explicit player pause
    const delay = TICK_MIN_MS + Math.floor(Math.random() * (TICK_MAX_MS - TICK_MIN_MS));
    const t = setTimeout(() => {
      doTick();
      const latest = useGame.getState().currentRaid?.log.at(-1);
      playSfx(latest?.kind === "damage" ? "error" : "tick");
    }, delay);
    return () => clearTimeout(t);
  }, [raid, doTick]);
}
