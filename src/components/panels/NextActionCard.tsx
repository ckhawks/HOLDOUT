"use client";

import { useEffect, useState } from "react";
import { useGame } from "@/store/game";
import { ACTION_TIMER_MS } from "@/lib/engine/raid";
import { ACTIONS } from "@/lib/engine/actions";
import { cn } from "@/lib/utils";
import type { ActionId } from "@/lib/types";

export function NextActionCard() {
  const raid = useGame((s) => s.currentRaid);
  const overrideAction = useGame((s) => s.overrideAction);
  const paused = !!raid?.pausedAt;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!raid?.active || paused) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [raid?.active, paused]);

  if (!raid) return null;
  const queued = raid.queuedAction;
  const elapsed = paused ? raid.pausedAt! - raid.actionStartedAt : now - raid.actionStartedAt;
  const remaining = Math.max(0, ACTION_TIMER_MS - elapsed);
  const pct = Math.max(0, Math.min(1, 1 - elapsed / ACTION_TIMER_MS));
  const seconds = Math.ceil(remaining / 1000);

  // Stable order, never hidden — ineligible rows just disable.
  const inCombat = raid.runState.flags.includes("combat_engaged");
  const isExtracting = raid.runState.flags.includes("extracting");
  const order: ActionId[] = inCombat
    ? ["fight", "flee"]
    : isExtracting
      ? ["extract_step", "stay"]
      : ["move_forward", "loot", "stay"];

  return (
    <div className="border-t border-border/60 bg-card/30 px-6 py-3">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Next action
        </span>
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
          {seconds}s
        </span>
      </div>
      <div className="mt-1 h-1 bg-border/40">
        <div
          className="h-full bg-amber-400/60"
          style={{ width: `${pct * 100}%`, transition: "width 100ms linear" }}
        />
      </div>
      <div className="mt-2 flex flex-col gap-1">
        {order.map((id) => {
          const a = ACTIONS[id];
          const eligible = a.isEligible(raid);
          const isQueued = id === queued;
          return (
            <button
              key={id}
              type="button"
              disabled={!eligible || isQueued}
              onClick={() => overrideAction(id)}
              className={cn(
                "flex w-full items-center justify-between rounded-sm border px-2.5 py-1.5 text-left transition-colors",
                isQueued &&
                  "border-amber-400/70 bg-amber-500/15 text-amber-100",
                !isQueued &&
                  eligible &&
                  "cursor-pointer border-border/60 bg-background/40 text-foreground hover:border-foreground/40 hover:bg-muted",
                !isQueued &&
                  !eligible &&
                  "cursor-not-allowed border-border/30 bg-background/20 text-muted-foreground/40",
              )}
            >
              <span className="font-medium">{a.label}</span>
              <span
                className={cn(
                  "text-[11px] font-normal opacity-80",
                  isQueued ? "text-amber-200" : "text-muted-foreground",
                )}
              >
                {a.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
