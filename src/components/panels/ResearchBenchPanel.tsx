"use client";

import { useMemo } from "react";
import { ArrowLeft, FlaskConical } from "lucide-react";
import { useGame } from "@/store/game";
import { PanelHeader } from "./PanelHeader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ITEMS } from "@/lib/data/items";
import { CRAFT_RECIPES, type CraftRecipe } from "@/lib/data/recipes";
import { tierColorFor } from "@/lib/itemDisplay";
import { renderCategoryIcon } from "@/lib/itemIcon";
import { researchStatus } from "@/lib/engine/research";
import { NotBuiltStub } from "./NotBuiltStub";
import { toast } from "@/lib/toast";

export function ResearchBenchPanel() {
  const built = useGame((s) => s.construction.modules.research_bench.built);
  const tier = useGame((s) => s.construction.modules.research_bench.tier);
  const stash = useGame((s) => s.stash);
  const foundry = useGame((s) => s.construction.foundry);
  const research = useGame((s) => s.construction.research);
  const log = useGame((s) => s.construction.log.research);
  const start = useGame((s) => s.startResearch);
  const setPanel = useGame((s) => s.setPanel);

  const lockedRecipes = useMemo(() => {
    return Object.values(CRAFT_RECIPES).filter(
      (r) => r.research && !research.unlockedRecipes.includes(r.id),
    );
  }, [research.unlockedRecipes]);

  if (!built) return <NotBuiltStub name="Research Bench" />;

  const t = tier as 1 | 2;

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
