"use client";

import { useEffect } from "react";
import { useGame } from "@/store/game";
import { TICK_MAX_MS, TICK_MIN_MS } from "@/lib/engine/raid";

export function useRaidLoop() {
  const raid = useGame((s) => s.currentRaid);
  const doTick = useGame((s) => s.doTick);

  useEffect(() => {
    if (!raid || !raid.active) return;
    const delay = TICK_MIN_MS + Math.floor(Math.random() * (TICK_MAX_MS - TICK_MIN_MS));
    const t = setTimeout(doTick, delay);
    return () => clearTimeout(t);
  }, [raid, doTick]);
}
