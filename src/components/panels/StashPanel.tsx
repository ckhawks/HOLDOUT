"use client";

import { useGame } from "@/store/game";
import { ITEMS } from "@/lib/data/items";
import { PanelHeader } from "./PanelHeader";
import { cn } from "@/lib/utils";
import { TIER_COLOR } from "@/lib/itemDisplay";
import { Button } from "@/components/ui/button";
import { Coins } from "lucide-react";

export function StashPanel() {
  const stash = useGame((s) => s.stash);
  const cap = useGame((s) => s.hideout.modules.stash.capacity ?? 0);
  const sellItem = useGame((s) => s.sellItem);
  const sellAllJunk = useGame((s) => s.sellAllJunk);

  const junkValue = stash.reduce((sum, si) => {
    const item = ITEMS[si.itemId];
    if (!item) return sum;
    if (item.tier === "common" && item.sellValue > 0) return sum + item.sellValue;
    return sum;
  }, 0);

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <PanelHeader
        title="Stash"
        subtitle={`${stash.length} of ${cap} slots used`}
        right={
          junkValue > 0 ? (
            <Button variant="outline" size="sm" onClick={sellAllJunk} className="rounded-sm">
              <Coins className="size-3.5" />
              Sell junk · ¤{junkValue.toLocaleString()}
            </Button>
          ) : undefined
        }
      />
      <div className="flex-1 overflow-y-auto px-6 py-4 text-sm">
        {stash.length === 0 ? (
          <div className="flex h-full items-center justify-center font-mono text-xs uppercase tracking-widest text-muted-foreground">
            stash empty · run a raid
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-1 md:grid-cols-2 lg:grid-cols-3">
            {stash.map((si) => {
              const item = ITEMS[si.itemId];
              if (!item) return null;
              const sellable = item.sellValue > 0;
              return (
                <div
                  key={si.uid}
                  title={`${item.tier}${sellable ? ` · sells for ¤${item.sellValue}` : " · cannot be sold"}`}
                  className="group flex items-center justify-between gap-2 rounded-sm border border-border/60 bg-card/40 px-3 py-2"
                >
                  <span className={cn("min-w-0 truncate text-sm font-semibold", TIER_COLOR[item.tier])}>
                    {item.name}
                  </span>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground tabular-nums">
                      ¤{item.sellValue}
                    </span>
                    {sellable && (
                      <button
                        onClick={() => sellItem(si.uid)}
                        className="cursor-pointer rounded-sm border border-transparent px-2 py-0.5 text-xs text-muted-foreground transition hover:border-border hover:text-foreground"
                      >
                        sell
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
