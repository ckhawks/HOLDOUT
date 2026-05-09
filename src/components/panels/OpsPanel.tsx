"use client";

import { useState } from "react";
import { LOCATIONS } from "@/lib/data/locations";
import { useGame } from "@/store/game";
import { Button } from "@/components/ui/button";
import { PanelHeader } from "./PanelHeader";
import { ArrowRight, Backpack, Lock, Shirt, Skull } from "lucide-react";
import { ITEMS } from "@/lib/data/items";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";
import type { Location, StashItem, Unlocks } from "@/lib/types";

interface AccessState {
  accessible: boolean;
  reason?: string;
}

function checkAccess(loc: Location, unlocks: Unlocks, stash: StashItem[]): AccessState {
  if (!loc.unlock) return { accessible: true };
  if (loc.unlock.type === "permanent") {
    const flag = (unlocks as unknown as Record<string, boolean>)[loc.id];
    return flag
      ? { accessible: true }
      : { accessible: false, reason: "needs-permanent" };
  }
  const has = stash.some((s) => s.itemId === loc.unlock!.itemId);
  return has
    ? { accessible: true }
    : { accessible: false, reason: "needs-consumable" };
}

function unlockMessage(
  unlock: NonNullable<Location["unlock"]>,
  accessible: boolean,
): React.ReactNode {
  const item = <strong className="font-semibold">{unlock.label}</strong>;
  if (accessible) {
    return unlock.type === "consumable" ? (
      <span>{item} present · consumed on entry</span>
    ) : (
      <span>{item} located · access permanent</span>
    );
  }
  return unlock.type === "consumable" ? (
    <span>Requires a {item} in stash (consumed on entry).</span>
  ) : (
    <span>Locate the {item} on a raid first.</span>
  );
}

const DIFFICULTY_LABEL: Record<Location["difficulty"], string> = {
  low: "LOW",
  mid: "MID",
  high: "HIGH",
};

const DIFFICULTY_COLOR: Record<Location["difficulty"], string> = {
  low: "text-emerald-400/80 border-emerald-500/40 bg-emerald-950/30",
  mid: "text-amber-400/80 border-amber-500/40 bg-amber-950/30",
  high: "text-red-400/80 border-red-500/40 bg-red-950/30",
};

export function OpsPanel() {
  const [loc, setLoc] = useState(LOCATIONS[0].id);
  const beginRaid = useGame((s) => s.beginRaid);
  const op = useGame((s) => s.operative);
  const raid = useGame((s) => s.currentRaid);
  const unlocks = useGame((s) => s.unlocks);
  const stash = useGame((s) => s.stash);

  const location = LOCATIONS.find((l) => l.id === loc) ?? LOCATIONS[0];
  const access = checkAccess(location, unlocks, stash);
  const operativeBusy = op.state !== "idle" || !!raid;
  const sendDisabled = operativeBusy || !access.accessible;

  const eq = op.equipment;
  const pUsed = eq.pockets.items.length;
  const pTotal = eq.pockets.grid.width * eq.pockets.grid.height;
  const bUsed = eq.bag?.items.length ?? 0;
  const bTotal = eq.bag ? eq.bag.grid.width * eq.bag.grid.height : 0;
  const kitValue =
    eq.pockets.items.reduce((s, p) => s + (ITEMS[p.itemId]?.sellValue ?? 0), 0) +
    (eq.bag?.items.reduce((s, p) => s + (ITEMS[p.itemId]?.sellValue ?? 0), 0) ?? 0);

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <PanelHeader
        title="Ops Console"
        subtitle="Dispatch operative to a target location."
      />
      <div className="flex flex-1 flex-col gap-6 px-6 py-6 text-sm">
        <div className="space-y-2">
          <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Target Location
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {LOCATIONS.map((l) => {
              const a = checkAccess(l, unlocks, stash);
              const selected = l.id === loc;
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setLoc(l.id)}
                  disabled={operativeBusy}
                  className={cn(
                    "group flex min-h-64 cursor-pointer flex-col gap-2 rounded-sm border bg-card/40 p-3 text-left transition-all",
                    "hover:border-foreground/40 hover:bg-card/70",
                    "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-border disabled:hover:bg-card/40",
                    selected
                      ? "border-foreground/70 bg-card/80 ring-1 ring-foreground/30"
                      : "border-border/60",
                    !a.accessible && "opacity-70",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {!a.accessible && <Lock className="size-3 shrink-0 text-amber-400/80" />}
                      <span className="text-sm font-semibold text-foreground">
                        {l.name}
                      </span>
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest",
                        DIFFICULTY_COLOR[l.difficulty],
                      )}
                    >
                      {l.difficulty === "high" && <Skull className="size-3" />}
                      {DIFFICULTY_LABEL[l.difficulty]}
                    </span>
                  </div>
                  <div className="text-xs leading-relaxed text-muted-foreground">
                    {l.description}
                  </div>
                  {l.unlock && (
                    <div
                      className={cn(
                        "mt-auto flex items-start gap-1.5 rounded-sm border px-2 py-1.5 text-[11px] leading-snug",
                        a.accessible
                          ? "border-emerald-700/40 bg-emerald-950/20 text-emerald-300/80"
                          : "border-amber-700/40 bg-amber-950/20 text-amber-200/80",
                      )}
                    >
                      <Lock className="size-3 shrink-0 translate-y-[1px]" />
                      {unlockMessage(l.unlock, a.accessible)}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            disabled={sendDisabled}
            onClick={() => beginRaid(loc)}
            className="rounded-sm"
          >
            {operativeBusy
              ? "Operative deployed"
              : !access.accessible
                ? "Locked"
                : `Send to ${location.name}`}
            {!operativeBusy && !access.accessible ? (
              <Lock className="size-4" />
            ) : (
              <ArrowRight className="size-4" />
            )}
          </Button>
          {!operativeBusy && (
            <Tooltip text="Pockets · Bag · Kit value (manage in Stash)">
              <span className="inline-flex items-center gap-2 rounded-sm border border-border/60 bg-card/30 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                <Shirt className="size-3" />
                <span className="tabular-nums text-foreground/80">{pUsed}/{pTotal}</span>
                <span className="opacity-50">·</span>
                <Backpack className="size-3" />
                {eq.bag ? (
                  <span className="tabular-nums text-foreground/80">{bUsed}/{bTotal}</span>
                ) : (
                  <span className="opacity-60">none</span>
                )}
                <span className="opacity-50">·</span>
                <span className="tabular-nums text-foreground/80">¤{kitValue.toLocaleString()}</span>
              </span>
            </Tooltip>
          )}
        </div>
      </div>
    </section>
  );
}
