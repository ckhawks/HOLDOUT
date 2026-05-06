"use client";

import { useEffect, useRef } from "react";
import { useGame } from "@/store/game";
import { ITEMS } from "@/lib/data/items";
import { Button } from "@/components/ui/button";
import { PanelHeader } from "./PanelHeader";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { splitItemText, tierColorFor } from "@/lib/itemDisplay";

export function FeedPanel() {
  const raid = useGame((s) => s.currentRaid);
  const recall = useGame((s) => s.recall);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [raid?.log.length]);

  if (!raid) {
    return (
      <section className="flex min-h-0 flex-1 flex-col">
        <PanelHeader title="Comms Feed" subtitle="No active raid. Dispatch from Ops to begin." />
        <div className="flex flex-1 items-center justify-center font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          channel idle · waiting for handler
        </div>
      </section>
    );
  }

  const rs = raid.runState;

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <PanelHeader
        title="Comms Feed"
        subtitle={`Channel open · ${raid.locationId} · depth ${rs.depth}`}
        right={
          <Button
            variant="destructive"
            onClick={recall}
            className="rounded-sm"
          >
            Recall
            <LogOut className="size-4" />
          </Button>
        }
      />
      <div className="grid grid-cols-3 gap-3 border-b border-border/60 px-6 py-3 font-mono text-[11px] uppercase tracking-widest">
        <Stat label="Health" value={rs.health} tone={rs.health < 40 ? "warn" : "ok"} />
        <Stat label="Energy" value={rs.energy} tone={rs.energy < 30 ? "warn" : "ok"} />
        <Stat label="Alertness" value={rs.alertness} tone={rs.alertness > 60 ? "warn" : "ok"} />
      </div>
      <div className="flex min-h-0 flex-1">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-6 py-4 text-sm">
        {raid.log.map((entry, idx) => {
          const distFromEnd = raid.log.length - 1 - idx;
          const opacity = Math.max(0.25, 1 - distFromEnd * 0.05);
          return (
          <div
            key={entry.id}
            className="flex items-center gap-3 py-1.5 transition-opacity"
            style={{ opacity }}
          >
            <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
              {new Date(entry.timestamp).toLocaleTimeString([], { hour12: false })}
            </span>
            <span
              className={cn(
                "shrink-0 font-mono uppercase tracking-widest text-[10px] w-16",
                entry.kind === "loot" && "text-emerald-400/80",
                entry.kind === "damage" && "text-red-400/80",
                entry.kind === "system" && "text-foreground",
                entry.kind === "flavor" && "text-muted-foreground",
                entry.kind === "choice" && "text-amber-400/80",
              )}
            >
              {entry.kind}
            </span>
            <span className="text-foreground/90 leading-relaxed">
              {splitItemText(entry.text).parts.map((p, i) =>
                p.isItem ? (
                  <span
                    key={i}
                    className={cn(
                      "font-semibold",
                      tierColorFor(entry.itemId),
                    )}
                  >
                    {p.text}
                  </span>
                ) : (
                  <span key={i}>{p.text}</span>
                ),
              )}
            </span>
          </div>
          );
        })}
        <div
          key={`incoming-${raid.log.length}`}
          className="flex items-center gap-3 py-1.5 opacity-70"
        >
          <span className="shrink-0 font-mono text-xs text-muted-foreground/50 tabular-nums">
            --:--:--
          </span>
          <span className="inline-flex w-16 shrink-0 items-center gap-0.5 font-mono text-base leading-none text-muted-foreground/70">
            <span className="tick-pulse-dot">·</span>
            <span className="tick-pulse-dot" style={{ animationDelay: "0.2s" }}>·</span>
            <span className="tick-pulse-dot" style={{ animationDelay: "0.4s" }}>·</span>
          </span>
          <span className="flex-1">
            <span className="block h-px w-full overflow-hidden bg-border/40">
              <span className="tick-progress-bar block h-full bg-foreground/40" />
            </span>
          </span>
        </div>
      </div>
      <aside className="flex w-60 shrink-0 flex-col border-l border-border/60">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          <span>Pack</span>
          <span className="tabular-nums text-foreground">{raid.backpack.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {raid.backpack.length === 0 ? (
            <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground/70">
              empty
            </div>
          ) : (
            <ul className="flex flex-col gap-1">
              {raid.backpack.map((bi) => (
                <li
                  key={bi.uid}
                  className={cn(
                    "rounded-sm border border-border bg-card/40 px-2 py-1.5 text-xs font-semibold",
                    tierColorFor(bi.itemId),
                  )}
                >
                  {ITEMS[bi.itemId]?.name ?? bi.itemId}
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
      </div>
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: "ok" | "warn" }) {
  return (
    <div className="flex flex-col">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("text-foreground", tone === "warn" && "text-amber-400")}>{value}</span>
    </div>
  );
}
