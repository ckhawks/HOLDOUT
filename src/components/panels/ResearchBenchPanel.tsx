"use client";

import { useMemo } from "react";
import { ArrowLeft, ChevronUp, FlaskConical, Microscope } from "lucide-react";
import { useGame } from "@/store/game";
import { PanelHeader } from "./PanelHeader";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";
import { ITEMS } from "@/lib/data/items";
import { CRAFT_RECIPES, type CraftRecipe } from "@/lib/data/recipes";
import { MODULE_BUILD_COSTS, MODULE_DEFS, MODULE_TIER_COSTS } from "@/lib/data/modules";
import { tierColorFor } from "@/lib/itemDisplay";
import { renderCategoryIcon } from "@/lib/itemIcon";
import { researchStatus } from "@/lib/engine/research";
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
    </div>
  );
}

function UnbuiltView() {
  const setPanel = useGame((s) => s.setPanel);
  const build = useGame((s) => s.buildModule);
  const cost = MODULE_BUILD_COSTS.research_bench;
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <PanelHeader title="Research Bench" subtitle="Not built yet." />
      <div className="flex-1 px-6 py-6">
        <Button variant="outline" size="sm" onClick={() => setPanel("hideout")} className="mb-6 rounded-sm">
          <ArrowLeft className="size-3.5" />
          Back to hideout
        </Button>
        <div className="max-w-md space-y-4 rounded-sm border border-border bg-card/40 p-5">
          <div className="flex items-center gap-2">
            <Microscope className="size-5" />
            <span className="font-mono text-sm uppercase tracking-widest">Research Bench · Build</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Unlock locked craft recipes by spending intel docs + components.
            Research progresses while the operative moves through raid tiles.
          </div>
          <div>
            <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              build cost
            </div>
            <CostLine cost={cost} />
          </div>
          <Button
            onClick={() => {
              const r = build("research_bench");
              if (!r.ok) {
                toast(
                  r.reason === "missing_items" ? "Missing required parts." :
                  r.reason === "missing_cash" ? "Not enough cash." :
                  "Cannot build right now.",
                );
              } else {
                toast("Research Bench built.");
              }
            }}
            className="w-full"
          >
            Build Research Bench
          </Button>
        </div>
      </div>
    </section>
  );
}

export function ResearchBenchPanel() {
  const built = useGame((s) => s.construction.modules.research_bench.built);
  const tier = useGame((s) => s.construction.modules.research_bench.tier);
  const stash = useGame((s) => s.stash);
  const foundry = useGame((s) => s.construction.foundry);
  const research = useGame((s) => s.construction.research);
  const log = useGame((s) => s.construction.log.research);
  const cash = useGame((s) => s.cash);
  const start = useGame((s) => s.startResearch);
  const upgrade = useGame((s) => s.upgradeModule);
  const setPanel = useGame((s) => s.setPanel);

  const lockedRecipes = useMemo(() => {
    return Object.values(CRAFT_RECIPES).filter(
      (r) => r.research && !research.unlockedRecipes.includes(r.id),
    );
  }, [research.unlockedRecipes]);

  if (!built) return <UnbuiltView />;

  const t = tier as 1 | 2;
  const nextTier = t < (MODULE_DEFS.research_bench.maxTier as 2) ? 2 : null;
  const upgradeCost = nextTier ? MODULE_TIER_COSTS[`research_bench:${nextTier}`] : null;

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <PanelHeader
        title="Research Bench"
        subtitle={
          research.active
            ? `Active: ${ITEMS[CRAFT_RECIPES[research.active.recipeId]?.output.itemId ?? ""]?.name ?? research.active.recipeId} · ${research.active.ticksRemaining} tiles remaining`
            : `Tier ${t} · ${lockedRecipes.length} locked recipe${lockedRecipes.length === 1 ? "" : "s"}`
        }
      />
      <div className="flex min-h-0 flex-1 gap-4 px-6 py-4">
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
          <Button variant="outline" size="sm" onClick={() => setPanel("hideout")} className="self-start rounded-sm">
            <ArrowLeft className="size-3.5" />
            Back to hideout
          </Button>

          {lockedRecipes.length === 0 ? (
            <div className="rounded-sm border border-dashed border-border/60 bg-card/30 p-6 text-sm text-muted-foreground">
              All researchable recipes are unlocked.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
              {lockedRecipes.map((r) => (
                <ResearchCard key={r.id} recipe={r} stash={stash} foundry={foundry} research={research} onStart={start} />
              ))}
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
              <Tooltip text="L2: stub for future research queue / acceleration.">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const r = upgrade("research_bench");
                    if (!r.ok) {
                      toast(
                        r.reason === "missing_items" ? "Missing required parts." :
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

function ResearchCard({
  recipe,
  stash,
  foundry,
  research,
  onStart,
}: {
  recipe: CraftRecipe;
  stash: Parameters<typeof researchStatus>[2];
  foundry: Parameters<typeof researchStatus>[3];
  research: Parameters<typeof researchStatus>[1];
  onStart: (id: string) => { ok: boolean; reason?: string };
}) {
  const out = ITEMS[recipe.output.itemId];
  const status = researchStatus(recipe.id, research, stash, foundry);
  const cost = recipe.research!;
  if (!out) return null;

  return (
    <div className="flex flex-col gap-2 rounded-sm border border-border bg-card/40 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {renderCategoryIcon(recipe.output.itemId, "size-3.5")}
          <span className={cn("font-medium", tierColorFor(recipe.output.itemId))}>{out.name}</span>
        </div>
        <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
          {cost.tileTicks} tiles
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
        <FlaskConical className="size-3" />
        {cost.docs.map((d) => (
          <span key={`d-${d.id}`}>{d.count}× <span className={tierColorFor(d.id)}>{ITEMS[d.id]?.name ?? d.id}</span></span>
        ))}
        {cost.components.map((c) => (
          <span key={`c-${c.id}`}>+ {c.count}× <span className={tierColorFor(c.id)}>{ITEMS[c.id]?.name ?? c.id}</span></span>
        ))}
      </div>
      {status.kind === "active" ? (
        <div className="rounded-sm bg-amber-400/15 px-2 py-1 text-center font-mono text-[10px] uppercase tracking-widest text-amber-200">
          researching · {status.ticksRemaining} tiles left
        </div>
      ) : status.kind === "ready" ? (
        <Button size="sm" onClick={() => {
          const r = onStart(recipe.id);
          if (!r.ok) toast(`Can't start: ${r.reason ?? "unknown"}`);
        }} className="rounded-sm">
          Start research
        </Button>
      ) : (
        <Button size="sm" disabled className="rounded-sm">
          {status.kind === "blocked" && status.reason === "another_active"
            ? "Another research is active"
            : status.kind === "blocked" && status.reason === "missing_inputs"
              ? "Missing inputs"
              : "Unavailable"}
        </Button>
      )}
    </div>
  );
}
