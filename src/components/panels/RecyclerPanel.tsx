"use client";

import { useMemo } from "react";
import { ArrowLeft, Recycle, ChevronUp } from "lucide-react";
import { useGame } from "@/store/game";
import { PanelHeader } from "./PanelHeader";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";
import { ITEMS } from "@/lib/data/items";
import { RECYCLE_RECIPES } from "@/lib/data/recycle";
import { MODULE_DEFS, MODULE_BUILD_COSTS, MODULE_TIER_COSTS } from "@/lib/data/modules";
import { tierColorFor } from "@/lib/itemDisplay";
import { renderCategoryIcon } from "@/lib/itemIcon";
import { toast } from "@/lib/toast";
import type { UpgradeCost } from "@/lib/types";

function CostLine({ cost }: { cost: UpgradeCost }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      <span className="font-mono">¤{cost.cash.toLocaleString()}</span>
      {(cost.items ?? []).map((req) => (
        <span key={req.id} className="text-muted-foreground">
          {req.count}× <span className={tierColorFor(req.id)}>{ITEMS[req.id]?.name ?? req.id}</span>
        </span>
      ))}
      {(cost.metals ?? []).map((req) => (
        <span key={req.id} className="text-muted-foreground">
          {req.count} {req.id}
        </span>
      ))}
    </div>
  );
}

function UnbuiltView() {
  const setPanel = useGame((s) => s.setPanel);
  const build = useGame((s) => s.buildModule);
  const cost = MODULE_BUILD_COSTS.recycler;
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <PanelHeader title="Recycler" subtitle="Not built yet." />
      <div className="flex-1 px-6 py-6">
        <Button variant="outline" size="sm" onClick={() => setPanel("hideout")} className="mb-6 rounded-sm">
          <ArrowLeft className="size-3.5" />
          Back to hideout
        </Button>
        <div className="max-w-md space-y-4 rounded-sm border border-border bg-card/40 p-5">
          <div className="flex items-center gap-2">
            <Recycle className="size-5" />
            <span className="font-mono text-sm uppercase tracking-widest">Recycler · Build</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Decompose junk into base components. Tier 1 handles common items;
            upgrades extend recipe coverage and yield rates.
          </div>
          <div>
            <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              build cost
            </div>
            <CostLine cost={cost} />
          </div>
          <Button
            onClick={() => {
              const r = build("recycler");
              if (!r.ok) {
                toast(
                  r.reason === "missing_items" ? "Missing required parts." :
                  r.reason === "missing_metals" ? "Foundry has insufficient metal." :
                  r.reason === "missing_cash" ? "Not enough cash." :
                  "Cannot build right now.",
                );
              } else {
                toast("Recycler built.");
              }
            }}
            className="w-full"
          >
            Build Recycler
          </Button>
        </div>
      </div>
    </section>
  );
}

interface ScrapRow {
  itemId: string;
  count: number;
  minTier: 1 | 2 | 3;
  eligible: boolean;
}

export function RecyclerPanel() {
  const built = useGame((s) => s.construction.modules.recycler.built);
  const tier = useGame((s) => s.construction.modules.recycler.tier);
  const stash = useGame((s) => s.stash);
  const log = useGame((s) => s.construction.log.recycler);
  const cash = useGame((s) => s.cash);
  const recycleOne = useGame((s) => s.recycleStashItem);
  const recycleStack = useGame((s) => s.recycleStackByItemId);
  const upgrade = useGame((s) => s.upgradeModule);
  const setPanel = useGame((s) => s.setPanel);

  // Group non-pinned stash items by itemId and filter to ones with recipes.
  const rows = useMemo<ScrapRow[]>(() => {
    if (!built) return [];
    const counts: Record<string, number> = {};
    for (const si of stash) {
      if (si.pinned) continue;
      counts[si.itemId] = (counts[si.itemId] ?? 0) + 1;
    }
    const result: ScrapRow[] = [];
    for (const [itemId, count] of Object.entries(counts)) {
      const recipe = RECYCLE_RECIPES[itemId];
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

  if (!built) return <UnbuiltView />;

  const t = tier as 1 | 2 | 3;
  const nextTier = t < (MODULE_DEFS.recycler.maxTier as 3) ? ((t + 1) as 2 | 3) : null;
  const upgradeCost = nextTier ? MODULE_TIER_COSTS[`recycler:${nextTier}`] : null;
  const bulkAvailable = t >= 2;

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <PanelHeader
        title="Recycler"
        subtitle={`Tier ${t} · ${bulkAvailable ? "bulk-scrap enabled" : "click to scrap one at a time"}`}
      />
      <div className="flex min-h-0 flex-1 gap-4 px-6 py-4">
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <Button variant="outline" size="sm" onClick={() => setPanel("hideout")} className="self-start rounded-sm">
            <ArrowLeft className="size-3.5" />
            Back to hideout
          </Button>

          {rows.length === 0 ? (
            <div className="rounded-sm border border-dashed border-border/60 bg-card/30 p-6 text-sm text-muted-foreground">
              Nothing in stash has a recycle recipe. Bring back combat knives, bandages, electronics, or food.
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto rounded-sm border border-border bg-card/40">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card/95 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2 text-right">In stash</th>
                    <th className="px-3 py-2 text-right">Outputs</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const item = ITEMS[row.itemId];
                    const recipe = RECYCLE_RECIPES[row.itemId];
                    if (!item || !recipe) return null;
                    const outputs = recipe.outputs.map((o) => {
                      const name = ITEMS[o.id]?.name ?? o.id;
                      const pct = Math.round(Math.min(1, o.chance + (t === 1 ? 0 : t === 2 ? 0.15 : 0.3)) * 100);
                      return `${name} ${pct}%`;
                    }).join(" · ");
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
                        <td className="px-3 py-2 text-[11px] text-muted-foreground">{outputs}</td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!row.eligible}
                              onClick={() => {
                                // Recycle one (oldest non-pinned of this itemId).
                                const target = stash.find((s) => !s.pinned && s.itemId === row.itemId);
                                if (!target) return;
                                const r = recycleOne(target.uid);
                                if (!r.ok) toast("Couldn't recycle that.");
                              }}
                              className="rounded-sm"
                            >
                              Scrap 1
                            </Button>
                            {bulkAvailable && row.count > 1 && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={!row.eligible}
                                onClick={() => {
                                  const r = recycleStack(row.itemId);
                                  if (!r.ok) toast("Couldn't recycle that stack.");
                                }}
                                className="rounded-sm"
                              >
                                Scrap all ({row.count})
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
          {nextTier && upgradeCost && (
            <div className="rounded-sm border border-border bg-card/40 p-3">
              <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                <ChevronUp className="size-3.5" />
                Upgrade · tier {nextTier}
              </div>
              <CostLine cost={upgradeCost} />
              <Tooltip
                text={
                  nextTier === 2
                    ? "L2: +15% to every yield chance, plus bulk-scrap an entire stack with one button."
                    : "L3: +30% to every yield chance, plus 20% chance per output to roll a doubled stack."
                }
              >
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const r = upgrade("recycler");
                    if (!r.ok) {
                      toast(
                        r.reason === "missing_items" ? "Missing required parts." :
                        r.reason === "missing_metals" ? "Foundry has insufficient metal." :
                        r.reason === "missing_cash" ? "Not enough cash." :
                        "Cannot upgrade right now.",
                      );
                    }
                  }}
                  disabled={cash < upgradeCost.cash}
                  className="mt-3 w-full rounded-sm"
                >
                  Upgrade
                </Button>
              </Tooltip>
            </div>
          )}

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
