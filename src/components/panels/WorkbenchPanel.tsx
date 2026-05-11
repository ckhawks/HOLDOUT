"use client";

import { useMemo } from "react";
import { ArrowLeft, FlaskConical, Hammer, Shirt } from "lucide-react";
import { useGame } from "@/store/game";
import { PanelHeader } from "./PanelHeader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ITEMS } from "@/lib/data/items";
import { CRAFT_RECIPES, type CraftRecipe } from "@/lib/data/recipes";
import { tierDotFor } from "@/lib/itemDisplay";
import { renderCategoryIcon } from "@/lib/itemIcon";
import { inputSatisfactions } from "@/lib/engine/workbench";
import { CostList } from "@/components/hideout/UpgradeCostDisplay";
import { NotBuiltStub } from "./NotBuiltStub";
import { toast } from "@/lib/toast";
import type { MetalId, UpgradeCost } from "@/lib/types";

type Category = "apparel" | "medical";

function categoryOf(recipe: CraftRecipe): Category {
  const out = ITEMS[recipe.output.itemId];
  if (out?.category === "apparel") return "apparel";
  return "medical";
}

export function WorkbenchPanel() {
  const built = useGame((s) => s.construction.modules.workbench.built);
  const tier = useGame((s) => s.construction.modules.workbench.tier);
  const stash = useGame((s) => s.stash);
  const foundry = useGame((s) => s.construction.foundry);
  const unlocked = useGame((s) => s.construction.research.unlockedRecipes);
  const log = useGame((s) => s.construction.log.workbench);
  const craft = useGame((s) => s.craftRecipe);
  const setPanel = useGame((s) => s.setPanel);

  const recipes = useMemo(() => {
    if (!built) return [];
    return Object.values(CRAFT_RECIPES).filter((r) => {
      const isUnlocked = r.unlockedByDefault || unlocked.includes(r.id);
      return isUnlocked && r.minWorkbenchTier <= tier;
    });
  }, [built, unlocked, tier]);

  if (!built) return <NotBuiltStub name="Workbench" />;

  const t = tier as 1 | 2 | 3;

  const apparelRecipes = recipes.filter((r) => categoryOf(r) === "apparel");
  const medRecipes = recipes.filter((r) => categoryOf(r) === "medical");

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <PanelHeader title="Workbench" subtitle={`Tier ${t} · ${recipes.length} recipe${recipes.length === 1 ? "" : "s"} available`} />
      <div className="flex min-h-0 flex-1 gap-4 px-6 py-4">
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
          <Button variant="outline" size="sm" onClick={() => setPanel("hideout")} className="self-start rounded-sm">
            <ArrowLeft className="size-3.5" />
            Back to hideout
          </Button>

          {recipes.length === 0 && (
            <div className="rounded-sm border border-dashed border-border/60 bg-card/30 p-6 text-sm text-muted-foreground">
              No recipes available at this tier. Research locked recipes at the Research Bench.
            </div>
          )}

          {apparelRecipes.length > 0 && (
            <RecipeSection
              icon={<Shirt className="size-3.5" />}
              title="Apparel"
              recipes={apparelRecipes}
              stash={stash}
              foundry={foundry}
              onCraft={craft}
            />
          )}
          {medRecipes.length > 0 && (
            <RecipeSection
              icon={<FlaskConical className="size-3.5" />}
              title="Medical"
              recipes={medRecipes}
              stash={stash}
              foundry={foundry}
              onCraft={craft}
            />
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

// Recipe inputs use a different shape than UpgradeCost; coerce to the
// shared {cash, items, metals} so CostList renders the same checklist
// it does on the hideout cards. Cash is always 0 for crafting.
function recipeCost(recipe: CraftRecipe): UpgradeCost {
  const items: Array<{ id: string; count: number }> = [];
  const metals: Array<{ id: MetalId; count: number }> = [];
  for (const inp of recipe.inputs) {
    if (inp.type === "item") items.push({ id: inp.id as string, count: inp.count });
    else metals.push({ id: inp.id as MetalId, count: inp.count });
  }
  return { cash: 0, items, metals };
}

function RecipeSection({
  icon,
  title,
  recipes,
  stash,
  foundry,
  onCraft,
}: {
  icon: React.ReactNode;
  title: string;
  recipes: CraftRecipe[];
  stash: Parameters<typeof inputSatisfactions>[1];
  foundry: Parameters<typeof inputSatisfactions>[2];
  onCraft: (id: string) => { ok: boolean; reason?: string };
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {icon}
        {title}
      </div>
      <div className="grid grid-cols-1 gap-3 2xl:grid-cols-2">
        {recipes.map((r) => {
          const out = ITEMS[r.output.itemId];
          if (!out) return null;
          const sats = inputSatisfactions(r, stash, foundry);
          const canMake = sats.every((s) => s.satisfied);
          const cost = recipeCost(r);
          const affordances = {
            items: sats
              .filter((s) => s.type === "item")
              .map((s) => ({ id: s.id as string, need: s.count, have: s.have })),
            metals: sats
              .filter((s) => s.type === "metal")
              .map((s) => ({ id: s.id as MetalId, need: s.count, have: s.have })),
          };
          return (
            <div key={r.id} className="flex h-full flex-col gap-2 rounded-sm border border-border bg-card/40 p-4 text-sm">
              <div className="flex items-center gap-2">
                {renderCategoryIcon(r.output.itemId, "size-4 shrink-0")}
                <span className="font-mono text-xs uppercase tracking-widest text-foreground">
                  {out.name}
                </span>
                {/* Rarity dot mirrors the cost-row treatment so the player
                    can tell at a glance what tier the output rolls at. */}
                <span
                  className={cn("inline-block size-1.5 shrink-0 rounded-full", tierDotFor(r.output.itemId))}
                  aria-hidden
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const result = onCraft(r.id);
                    if (!result.ok) toast(`Can't craft: ${result.reason ?? "unknown"}`);
                  }}
                  disabled={!canMake}
                  className="ml-auto rounded-sm"
                >
                  <Hammer className="size-3.5" />
                  Craft
                </Button>
              </div>
              <div className="mt-auto flex flex-col gap-3 border-t border-border/50 pt-3">
                <CostList cost={cost} affordances={affordances} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
