"use client";

import { useEffect, useState } from "react";
import { ChevronRight, LogOut, Pause, Play } from "lucide-react";
import { useGame } from "@/store/game";
import { ACTION_TIMER_MS } from "@/lib/engine/raid";
import { ACTIONS } from "@/lib/engine/actions";
import { cn } from "@/lib/utils";
import type { ActionId } from "@/lib/types";

export function NextActionCard() {
  const raid = useGame((s) => s.currentRaid);
  const overrideAction = useGame((s) => s.overrideAction);
  const togglePause = useGame((s) => s.togglePause);
  const recall = useGame((s) => s.recall);
  const cancelRecall = useGame((s) => s.cancelRecall);
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
      ? ["extract_step", "loot", "stay"]
      : ["move_forward", "loot", "stay"];

  return (
    <aside className="flex w-56 shrink-0 flex-col border-l border-border/60 bg-card/30 px-3 py-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Next action
        </span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
            {seconds}s
          </span>
          <button
            type="button"
            onClick={togglePause}
            title={paused ? "Resume" : "Pause"}
            className={cn(
              "flex size-5 cursor-pointer items-center justify-center rounded-sm transition-colors",
              paused
                ? "text-emerald-300 hover:bg-emerald-500/20"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {paused ? <Play className="size-3" /> : <Pause className="size-3" />}
          </button>
        </div>
      </div>
      <div className="mt-1 h-1 bg-border/40">
        <div
          className="h-full bg-foreground/80"
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
                "flex w-full items-start gap-2 rounded-sm border px-2.5 py-1.5 text-left transition-colors",
                isQueued &&
                  "border-border/60 bg-emerald-400/10 text-foreground",
                !isQueued &&
                  eligible &&
                  "cursor-pointer border-border/60 bg-background/30 text-foreground/80 hover:border-foreground/40 hover:bg-muted",
                !isQueued &&
                  !eligible &&
                  "cursor-not-allowed border-border/30 bg-background/20 text-muted-foreground/40",
              )}
            >
              <ChevronRight
                className={cn(
                  "mt-0.5 size-3 shrink-0",
                  isQueued ? "text-emerald-400" : "text-transparent",
                )}
              />
              <div className="flex flex-col gap-0.5">
                <span className="text-[12px] font-medium leading-tight">{a.label}</span>
                <span className="text-[10px] font-normal leading-tight text-muted-foreground opacity-70">
                  {a.description}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={isExtracting ? cancelRecall : recall}
        className={cn(
          "mt-3 flex cursor-pointer items-center justify-center gap-2 border-t border-border/60 pt-3 font-mono text-[10px] uppercase tracking-widest transition-colors",
          isExtracting
            ? "text-emerald-300 hover:text-emerald-200"
            : "text-red-400/80 hover:text-red-300",
        )}
      >
        <LogOut className="size-3" />
        {isExtracting ? "Cancel recall" : "Recall to extract"}
      </button>
    </aside>
  );
}
