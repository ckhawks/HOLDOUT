"use client";

import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useGame } from "@/store/game";
import { PanelHeader } from "./PanelHeader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ITEMS } from "@/lib/data/items";
import {
  METAL_DISPLAY_NAME,
  METAL_SELL_PRICE,
  SMELT_RECIPES,
} from "@/lib/data/smelt";
import { tierColorFor } from "@/lib/itemDisplay";
import { renderCategoryIcon } from "@/lib/itemIcon";
import { vesselCapacity } from "@/lib/engine/foundry";
import { NotBuiltStub } from "./NotBuiltStub";
import { toast } from "@/lib/toast";
import type { MetalId } from "@/lib/types";

const METAL_ORDER: MetalId[] = ["steel", "copper", "titanium", "chromite", "voidsteel"];

interface SmeltRow {
  itemId: string;
  count: number;
  minTier: 1 | 2 | 3;
  eligible: boolean;
}

export function FoundryPanel() {
  const built = useGame((s) => s.construction.modules.foundry.built);
  const tier = useGame((s) => s.construction.modules.foundry.tier);
  const vessels = useGame((s) => s.construction.foundry.vessels);
  const stash = useGame((s) => s.stash);
  const log = useGame((s) => s.construction.log.foundry);
  const smeltOne = useGame((s) => s.smeltStashItem);
  const smeltStack = useGame((s) => s.smeltStackByItemId);
  const sellMetal = useGame((s) => s.sellMetal);
  const setPanel = useGame((s) => s.setPanel);

  const [sellAmounts, setSellAmounts] = useState<Partial<Record<MetalId, string>>>({});

  const rows = useMemo<SmeltRow[]>(() => {
    if (!built) return [];
    const counts: Record<string, number> = {};
    for (const si of stash) {
      if (si.pinned) continue;
      counts[si.itemId] = (counts[si.itemId] ?? 0) + 1;
    }
    const result: SmeltRow[] = [];
    for (const [itemId, count] of Object.entries(counts)) {
      const recipe = SMELT_RECIPES[itemId];
      if (!recipe) continue;
      const minTier = (recipe.minTier ?? 1) as 1 | 2 | 3;
      result.push({ itemId, count, minTier, eligible: minTier <= tier });
    }
    result.sort((a, b) => {
      if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
      return (ITEMS[a.itemId]?.name ?? "").localeCompare(ITEMS[b.itemId]?.name ?? "");
    });
    return result;
  }, [built, stash, tier]);

  if (!built) return <NotBuiltStub name="Foundry" />;

  const t = tier as 1 | 2 | 3;
  const bulkAvailable = t >= 2;

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <PanelHeader
        title="Foundry"
        subtitle={`Tier ${t} · ${bulkAvailable ? "bulk-smelt enabled" : "smelt one at a time"}`}
      />
      <div className="flex min-h-0 flex-1 gap-4 px-6 py-4">
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <Button variant="outline" size="sm" onClick={() => setPanel("hideout")} className="self-start rounded-sm">
            <ArrowLeft className="size-3.5" />
            Back to hideout
          </Button>

          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-5">
            {METAL_ORDER.map((m) => {
              const stored = vessels[m] ?? 0;
              const cap = vesselCapacity(m, t);
              const pct = cap > 0 ? Math.min(1, stored / cap) : 0;
              const locked = cap === 0;
              const amountInput = sellAmounts[m] ?? "";
              const parsed = Math.max(0, Math.floor(Number(amountInput) || 0));
              const sellable = Math.min(parsed, stored);
              const earnings = Math.round(sellable * METAL_SELL_PRICE[m]);
              return (
                <div
                  key={m}
                  className={cn(
                    "flex flex-col gap-1.5 rounded-sm border bg-card/40 p-2.5",
                    locked ? "border-dashed border-border/50 opacity-60" : "border-border",
                  )}
                >
                  <div className="flex items-baseline justify-between">
                    <span className="font-mono text-[11px] uppercase tracking-widest">{METAL_DISPLAY_NAME[m]}</span>
                    <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                      {stored} / {cap || "—"}
                    </span>
                  </div>
                  <div className="h-1 bg-border/40">
                    <div className="h-full bg-amber-400/70" style={{ width: `${pct * 100}%` }} />
                  </div>
                  <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                    ¤{METAL_SELL_PRICE[m]}/unit
                  </div>
                  {!locked && (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={stored}
                        value={amountInput}
                        onChange={(e) => setSellAmounts((s) => ({ ...s, [m]: e.target.value }))}
                        placeholder="amount"
                        className="h-7 w-full rounded-sm border border-border bg-background px-2 font-mono text-[11px]"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={sellable === 0}
                        onClick={() => {
                          const r = sellMetal(m, sellable);
                          if (!r.ok) toast("Nothing to sell.");
                          else setSellAmounts((s) => ({ ...s, [m]: "" }));
                        }}
                        className="rounded-sm whitespace-nowrap"
                        title={sellable > 0 ? `Sell ${sellable} → ¤${earnings}` : undefined}
                      >
                        Sell
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {rows.length === 0 ? (
            <div className="rounded-sm border border-dashed border-border/60 bg-card/30 p-6 text-sm text-muted-foreground">
              Nothing in stash is smeltable. Bring back scrap, copper wire, pistons, or weapons.
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto rounded-sm border border-border bg-card/40">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card/95 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2 text-right">In stash</th>
                    <th className="px-3 py-2 text-right">Yields</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const item = ITEMS[row.itemId];
                    const recipe = SMELT_RECIPES[row.itemId];
                    if (!item || !recipe) return null;
                    const yields = recipe.outputs
                      .map((o) => `+${o.amount} ${METAL_DISPLAY_NAME[o.metal]}`)
                      .join(" · ");
                    return (
                      <tr key={row.itemId} className={cn("border-t border-border/40", !row.eligible && "opacity-50")}>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            {renderCategoryIcon(row.itemId, "size-3.5")}
                            <span className={tierColorFor(row.itemId)}>{item.name}</span>
                            {!row.eligible && (
                              <span className="font-mono text-[9px] uppercase tracking-widest text-amber-400/80">
                                needs L{row.minTier}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{row.count}</td>
                        <td className="px-3 py-2 text-[11px] text-muted-foreground">{yields}</td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!row.eligible}
                              onClick={() => {
                                const target = stash.find((s) => !s.pinned && s.itemId === row.itemId);
                                if (!target) return;
                                const r = smeltOne(target.uid);
                                if (!r.ok) toast("Couldn't smelt that.");
                              }}
                              className="rounded-sm"
                            >
                              Smelt 1
                            </Button>
                            {bulkAvailable && row.count > 1 && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={!row.eligible}
                                onClick={() => {
                                  const r = smeltStack(row.itemId);
                                  if (!r.ok) toast("Couldn't smelt that stack.");
                                }}
                                className="rounded-sm"
                              >
                                Smelt all ({row.count})
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <aside className="flex w-64 shrink-0 flex-col gap-3">
          <div className="flex min-h-0 flex-1 flex-col rounded-sm border border-border bg-card/40 p-3">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Recent activity
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto text-[11px] text-muted-foreground">
              {log.length === 0 ? (
                <div className="opacity-60">no activity yet</div>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {log.map((e) => (
                    <li key={e.id}>{e.text}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
