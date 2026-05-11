import type {
  FoundryState,
  ModuleState,
  ResearchState,
  StashItem,
} from "@/lib/types";
import { CRAFT_RECIPES, type CraftRecipe } from "@/lib/data/recipes";

// Pure research engine. startResearch consumes the docs + components cost
// and parks the recipeId on `active`. tickResearch decrements the counter;
// when it hits zero, the recipeId moves into `unlockedRecipes`. The raid
// tick calls tickResearch on each successful move_forward / extract_step.

export type StartResearchError =
  | { error: "not_built" }
  | { error: "tier_too_low"; required: 1 | 2 }
  | { error: "no_recipe" }
  | { error: "no_research_cost" }
  | { error: "already_unlocked" }
  | { error: "already_active" }
  | { error: "missing_inputs"; missing: Array<{ id: string; need: number; have: number }> };

export interface StartResearchResult {
  research: ResearchState;
  stash: StashItem[];
}

export function startResearch(
  recipeId: string,
  research: ResearchState,
  stash: StashItem[],
  module: ModuleState,
): StartResearchResult | StartResearchError {
  if (!module.built) return { error: "not_built" };
  const recipe: CraftRecipe | undefined = CRAFT_RECIPES[recipeId];
  if (!recipe) return { error: "no_recipe" };
  if (!recipe.research) return { error: "no_research_cost" };
  if (research.unlockedRecipes.includes(recipeId)) return { error: "already_unlocked" };
  if (research.active) return { error: "already_active" };

  const itemCounts: Record<string, number> = {};
  for (const si of stash) {
    if (si.pinned) continue;
    itemCounts[si.itemId] = (itemCounts[si.itemId] ?? 0) + 1;
  }
  const required: Array<{ id: string; count: number }> = [
    ...recipe.research.docs,
    ...recipe.research.components,
  ];
  const missing: Array<{ id: string; need: number; have: number }> = [];
  for (const req of required) {
    const have = itemCounts[req.id] ?? 0;
    if (have < req.count) missing.push({ id: req.id, need: req.count, have });
  }
  if (missing.length > 0) return { error: "missing_inputs", missing };

  const nextStash = [...stash];
  for (const req of required) {
    let remaining = req.count;
    for (let i = 0; i < nextStash.length && remaining > 0; i++) {
      const si = nextStash[i];
      if (si.pinned || si.itemId !== req.id) continue;
      nextStash.splice(i, 1);
      i -= 1;
      remaining -= 1;
    }
  }
  return {
    research: {
      ...research,
      active: { recipeId, ticksRemaining: recipe.research.tileTicks },
    },
    stash: nextStash,
  };
}

// Called once per qualifying raid tick (move_forward / extract_step). When
// the active research finishes, returns the completed recipeId so the raid
// log can announce it. Pure; safe to call when active is null.
export function tickResearch(
  research: ResearchState,
): { research: ResearchState; completed: string | null } {
  if (!research.active) return { research, completed: null };
  const remaining = research.active.ticksRemaining - 1;
  if (remaining > 0) {
    return {
      research: {
        ...research,
        active: { ...research.active, ticksRemaining: remaining },
      },
      completed: null,
    };
  }
  const completed = research.active.recipeId;
  return {
    research: {
      unlockedRecipes: [...research.unlockedRecipes, completed],
      active: null,
    },
    completed,
  };
}

// Eligibility for a panel-side preview: is this recipe researchable now,
// already unlocked, or blocked?
export function researchStatus(
  recipeId: string,
  research: ResearchState,
  stash: StashItem[],
  foundry: FoundryState,
):
  | { kind: "unlocked" }
  | { kind: "active"; ticksRemaining: number }
  | { kind: "blocked"; reason: "no_research_cost" | "another_active" | "missing_inputs" }
  | { kind: "ready" } {
  // foundry param reserved for future metal-cost research; included now to
  // match canCraft's signature.
  void foundry;
  const recipe = CRAFT_RECIPES[recipeId];
  if (!recipe) return { kind: "blocked", reason: "no_research_cost" };
  if (research.unlockedRecipes.includes(recipeId)) return { kind: "unlocked" };
  if (research.active?.recipeId === recipeId) {
    return { kind: "active", ticksRemaining: research.active.ticksRemaining };
  }
  if (research.active) return { kind: "blocked", reason: "another_active" };
  if (!recipe.research) return { kind: "blocked", reason: "no_research_cost" };
  const itemCounts: Record<string, number> = {};
  for (const si of stash) {
    if (si.pinned) continue;
    itemCounts[si.itemId] = (itemCounts[si.itemId] ?? 0) + 1;
  }
  for (const req of [...recipe.research.docs, ...recipe.research.components]) {
    if ((itemCounts[req.id] ?? 0) < req.count) {
      return { kind: "blocked", reason: "missing_inputs" };
    }
  }
  return { kind: "ready" };
}
