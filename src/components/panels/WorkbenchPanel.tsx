"use client";

import { useMemo } from "react";
import { ArrowLeft, ChevronUp, Hammer, FlaskConical, Shirt } from "lucide-react";
import { useGame } from "@/store/game";
import { PanelHeader } from "./PanelHeader";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";
import { ITEMS } from "@/lib/data/items";
import { CRAFT_RECIPES, type CraftRecipe } from "@/lib/data/recipes";
import { METAL_DISPLAY_NAME } from "@/lib/data/smelt";
import { MODULE_BUILD_COSTS, MODULE_DEFS, MODULE_TIER_COSTS } from "@/lib/data/modules";
import { tierColorFor } from "@/lib/itemDisplay";
import { renderCategoryIcon } from "@/lib/itemIcon";
import { inputSatisfactions } from "@/lib/engine/workbench";
import { toast } from "@/lib/toast";
import type { MetalId, UpgradeCost } from "@/lib/types";

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
          {req.count} {METAL_DISPLAY_NAME[req.id as MetalId] ?? req.id}
        </span>
      ))}
    </div>
  );
}

function UnbuiltView() {
  const setPanel = useGame((s) => s.setPanel);
  const build = useGame((s) => s.buildModule);
  const cost = MODULE_BUILD_COSTS.workbench;
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <PanelHeader title="Workbench" subtitle="Not built yet." />
      <div className="flex-1 px-6 py-6">
        <Button variant="outline" size="sm" onClick={() => setPanel("hideout")} className="mb-6 rounded-sm">
          <ArrowLeft className="size-3.5" />
          Back to hideout
        </Button>
        <div className="max-w-md space-y-4 rounded-sm border border-border bg-card/40 p-5">
          <div className="flex items-center gap-2">
            <Hammer className="size-5" />
            <span className="font-mono text-sm uppercase tracking-widest">Workbench · Build</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Craft apparel and medical items from components + foundry metals.
            Requires a Schematic: Workbench (find one on a raid).
          </div>
          <div>
            <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              build cost
            </div>
            <CostLine cost={cost} />
          </div>
          <Button
            onClick={() => {
              const r = build("workbench");
              if (!r.ok) {
                toast(
                  r.reason === "missing_items" ? "Missing required parts (including the schematic)." :
                  r.reason === "missing_metals" ? "Foundry has insufficient metal." :
                  r.reason === "missing_cash" ? "Not enough cash." :
                  "Cannot build right now.",
                );
              } else {
                toast("Workbench built.");
              }
            }}
            className="w-full"
          >
            Build Workbench
          </Button>
        </div>
      </div>
    </section>
  );
}

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
  const cash = useGame((s) => s.cash);
  const craft = useGame((s) => s.craftRecipe);
  const upgrade = useGame((s) => s.upgradeModule);
  const setPanel = useGame((s) => s.setPanel);

  const recipes = useMemo(() => {
    if (!built) return [];
    return Object.values(CRAFT_RECIPES).filter((r) => {
      const isUnlocked = r.unlockedByDefault || unlocked.includes(r.id);
      return isUnlocked && r.minWorkbenchTier <= tier;
    });
  }, [built, unlocked, tier]);

  if (!built) return <UnbuiltView />;

  const t = tier as 1 | 2 | 3;
  const nextTier = t < (MODULE_DEFS.workbench.maxTier as 3) ? ((t + 1) as 2 | 3) : null;
  const upgradeCost = nextTier ? MODULE_TIER_COSTS[`workbench:${nextTier}`] : null;

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
                    ? "L2: tier-2 recipes (Tactical Pack, Combat Stim, etc.) become craftable."
                    : "L3: tier-3 recipes (Raider Rucksack, Nano-Clot) become craftable."
                }
              >
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const r = upgrade("workbench");
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
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        {recipes.map((r) => {
          const out = ITEMS[r.output.itemId];
          if (!out) return null;
          const sats = inputSatisfactions(r, stash, foundry);
          const canMake = sats.every((s) => s.satisfied);
          return (
            <div key={r.id} className="flex flex-col gap-2 rounded-sm border border-border bg-card/40 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {renderCategoryIcon(r.output.itemId, "size-3.5")}
                  <span className={cn("font-medium", tierColorFor(r.output.itemId))}>{out.name}</span>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                  T{r.minWorkbenchTier}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
                {sats.map((s, i) => {
                  const label =
                    s.type === "metal"
                      ? METAL_DISPLAY_NAME[s.id as MetalId] ?? String(s.id)
                      : ITEMS[s.id as string]?.name ?? String(s.id);
                  return (
                    <span
                      key={i}
                      className={cn("tabular-nums", s.satisfied ? "text-foreground/85" : "text-red-300")}
                    >
                      {s.have}/{s.count} {label}
                    </span>
                  );
                })}
              </div>
              <Button
                size="sm"
                onClick={() => {
                  const result = onCraft(r.id);
                  if (!result.ok) toast(`Can't craft: ${result.reason ?? "unknown"}`);
                }}
                disabled={!canMake}
                className="rounded-sm"
              >
                Craft
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
