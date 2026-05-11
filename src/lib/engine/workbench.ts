import type {
  FoundryState,
  MetalId,
  ModuleState,
  StashItem,
} from "@/lib/types";
import type { CraftRecipe, RecipeInput } from "@/lib/data/recipes";
import { ITEMS } from "@/lib/data/items";

// Pure workbench engine. Validates that a recipe's inputs are present in
// stash + foundry vessels and consumes them atomically when crafting.

export type CraftFailure =
  | { ok: false; reason: "not_built" }
  | { ok: false; reason: "tier_too_low"; required: 1 | 2 | 3 }
  | { ok: false; reason: "locked" }
  | { ok: false; reason: "missing_items"; missing: Array<{ id: string; need: number; have: number }> }
  | { ok: false; reason: "missing_metals"; missing: Array<{ id: MetalId; need: number; have: number }> };

export type CraftCheck = { ok: true } | CraftFailure;

export function canCraft(
  recipe: CraftRecipe,
  stash: StashItem[],
  foundry: FoundryState,
  module: ModuleState,
  unlockedRecipes: ReadonlyArray<string>,
): CraftCheck {
  if (!module.built) return { ok: false, reason: "not_built" };
  const tier = module.tier as 1 | 2 | 3;
  if (recipe.minWorkbenchTier > tier) {
    return { ok: false, reason: "tier_too_low", required: recipe.minWorkbenchTier };
  }
  const unlocked = recipe.unlockedByDefault || unlockedRecipes.includes(recipe.id);
  if (!unlocked) return { ok: false, reason: "locked" };

  const itemCounts: Record<string, number> = {};
  for (const si of stash) {
    if (si.pinned) continue;
    itemCounts[si.itemId] = (itemCounts[si.itemId] ?? 0) + 1;
  }
  const missingItems: Array<{ id: string; need: number; have: number }> = [];
  const missingMetals: Array<{ id: MetalId; need: number; have: number }> = [];
  for (const inp of recipe.inputs) {
    if (inp.type === "item") {
      const have = itemCounts[inp.id] ?? 0;
      if (have < inp.count) missingItems.push({ id: inp.id, need: inp.count, have });
    } else {
      const have = foundry.vessels[inp.id as MetalId] ?? 0;
      if (have < inp.count) missingMetals.push({ id: inp.id as MetalId, need: inp.count, have });
    }
  }
  if (missingItems.length > 0) return { ok: false, reason: "missing_items", missing: missingItems };
  if (missingMetals.length > 0) return { ok: false, reason: "missing_metals", missing: missingMetals };
  return { ok: true };
}

export interface CraftSuccess {
  stash: StashItem[];
  foundry: FoundryState;
  produced: StashItem;
}

export function craft(
  recipe: CraftRecipe,
  stash: StashItem[],
  foundry: FoundryState,
  module: ModuleState,
  unlockedRecipes: ReadonlyArray<string>,
  now: number,
  rand: () => number,
): CraftSuccess | CraftFailure {
  const check = canCraft(recipe, stash, foundry, module, unlockedRecipes);
  if (!check.ok) return check;

  // Consume inputs. Items: oldest-first non-pinned. Metals: decrement vessel.
  const nextStash = [...stash];
  for (const inp of recipe.inputs) {
    if (inp.type !== "item") continue;
    let remaining = inp.count;
    for (let i = 0; i < nextStash.length && remaining > 0; i++) {
      const si = nextStash[i];
      if (si.pinned || si.itemId !== inp.id) continue;
      nextStash.splice(i, 1);
      i -= 1;
      remaining -= 1;
    }
  }
  const vessels = { ...foundry.vessels };
  for (const inp of recipe.inputs) {
    if (inp.type !== "metal") continue;
    vessels[inp.id as MetalId] = (vessels[inp.id as MetalId] ?? 0) - inp.count;
  }

  // Mint output. Mirrors economy/raid loot acquisition: uid stamped, valueMod
  // rolled by caller via the rand we receive.
  const valueMod = 0.85 + rand() * 0.3;
  const produced: StashItem = {
    uid: `${now}-${Math.floor(rand() * 0xffffffff).toString(36)}`,
    itemId: recipe.output.itemId,
    acquiredAt: now,
    valueMod,
  };
  nextStash.push(produced);

  return { stash: nextStash, foundry: { vessels }, produced };
}

// One-liner for the craft log.
export function describeCraft(recipe: CraftRecipe): string {
  const out = ITEMS[recipe.output.itemId]?.name ?? recipe.output.itemId;
  return `Crafted ${out}`;
}

// Used by panels to fan out "needed/have" badges across inputs even when
// canCraft returns ok.
export interface InputSatisfaction extends RecipeInput {
  have: number;
  satisfied: boolean;
}

export function inputSatisfactions(
  recipe: CraftRecipe,
  stash: StashItem[],
  foundry: FoundryState,
): InputSatisfaction[] {
  const itemCounts: Record<string, number> = {};
  for (const si of stash) {
    if (si.pinned) continue;
    itemCounts[si.itemId] = (itemCounts[si.itemId] ?? 0) + 1;
  }
  return recipe.inputs.map((inp) => {
    const have =
      inp.type === "item"
        ? itemCounts[inp.id] ?? 0
        : foundry.vessels[inp.id as MetalId] ?? 0;
    return { ...inp, have, satisfied: have >= inp.count };
  });
}
