"use client";

import { useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { useGame } from "@/store/game";
import { PanelHeader } from "./PanelHeader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ITEMS } from "@/lib/data/items";
import { RECYCLE_RECIPES } from "@/lib/data/recycle";
import { tierColorFor } from "@/lib/itemDisplay";
import { renderCategoryIcon } from "@/lib/itemIcon";
import { NotBuiltStub } from "./NotBuiltStub";
import { toast } from "@/lib/toast";

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
  const recycleOne = useGame((s) => s.recycleStashItem);
  const recycleStack = useGame((s) => s.recycleStackByItemId);
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

  if (!built) return <NotBuiltStub name="Recycler" />;

  const t = tier as 1 | 2 | 3;
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
