import { describe, expect, it } from "vitest";
import type { ModuleState, ResearchState, StashItem } from "@/lib/types";
import { researchStatus, startResearch, tickResearch } from "./research";
import { CRAFT_RECIPES } from "@/lib/data/recipes";

function mockStash(items: Array<{ itemId: string; count: number; pinned?: boolean }>): StashItem[] {
  const out: StashItem[] = [];
  let n = 0;
  for (const { itemId, count, pinned } of items) {
    for (let i = 0; i < count; i++) {
      out.push({ uid: `u-${itemId}-${n++}`, itemId, pinned });
    }
  }
  return out;
}

function freshResearch(): ResearchState {
  return { unlockedRecipes: [], active: null };
}

const builtL1: ModuleState = { built: true, tier: 1 };

describe("research engine", () => {
  it("rejects when bench not built", () => {
    const r = startResearch("craft_combat_stim", freshResearch(), [], { built: false, tier: 0 });
    expect("error" in r && r.error).toBe("not_built");
  });

  it("rejects unknown recipe ids", () => {
    const r = startResearch("craft_does_not_exist", freshResearch(), [], builtL1);
    expect("error" in r && r.error).toBe("no_recipe");
  });

  it("rejects recipes that have no research cost", () => {
    // bandage_pack is unlockedByDefault and has no .research field
    const r = startResearch("craft_bandage_pack", freshResearch(), [], builtL1);
    expect("error" in r && r.error).toBe("no_research_cost");
  });

  it("rejects when another research is already active", () => {
    const research: ResearchState = {
      unlockedRecipes: [],
      active: { recipeId: "craft_med_syrette", ticksRemaining: 10 },
    };
    const r = startResearch("craft_combat_stim", research, [], builtL1);
    expect("error" in r && r.error).toBe("already_active");
  });

  it("rejects when inputs are missing", () => {
    const r = startResearch("craft_combat_stim", freshResearch(), [], builtL1);
    expect("error" in r && r.error).toBe("missing_inputs");
  });

  it("consumes docs + components and parks the recipe on active", () => {
    const recipe = CRAFT_RECIPES["craft_combat_stim"];
    const stash = mockStash([
      { itemId: "redacted_dossier", count: 1 },
      { itemId: "synthate", count: 2 },
      { itemId: "botanical", count: 2 },
      { itemId: "scrap_metal", count: 5 }, // unrelated, should survive
    ]);
    const r = startResearch("craft_combat_stim", freshResearch(), stash, builtL1);
    if ("error" in r) throw new Error("expected success");
    expect(r.research.active).toEqual({
      recipeId: "craft_combat_stim",
      ticksRemaining: recipe.research!.tileTicks,
    });
    const counts: Record<string, number> = {};
    for (const si of r.stash) counts[si.itemId] = (counts[si.itemId] ?? 0) + 1;
    expect(counts.redacted_dossier).toBeUndefined();
    expect(counts.synthate).toBeUndefined();
    expect(counts.botanical).toBeUndefined();
    expect(counts.scrap_metal).toBe(5);
  });

  it("tickResearch is a no-op when nothing is active", () => {
    const r = tickResearch(freshResearch());
    expect(r.research.active).toBeNull();
    expect(r.completed).toBeNull();
  });

  it("tickResearch decrements ticksRemaining", () => {
    const research: ResearchState = {
      unlockedRecipes: [],
      active: { recipeId: "craft_combat_stim", ticksRemaining: 3 },
    };
    const r = tickResearch(research);
    expect(r.research.active?.ticksRemaining).toBe(2);
    expect(r.completed).toBeNull();
  });

  it("tickResearch unlocks the recipe when ticks hit zero", () => {
    const research: ResearchState = {
      unlockedRecipes: [],
      active: { recipeId: "craft_combat_stim", ticksRemaining: 1 },
    };
    const r = tickResearch(research);
    expect(r.research.active).toBeNull();
    expect(r.research.unlockedRecipes).toContain("craft_combat_stim");
    expect(r.completed).toBe("craft_combat_stim");
  });

  it("researchStatus reports ready when inputs satisfied and no active", () => {
    const stash = mockStash([
      { itemId: "redacted_dossier", count: 1 },
      { itemId: "synthate", count: 2 },
      { itemId: "botanical", count: 2 },
    ]);
    const status = researchStatus(
      "craft_combat_stim",
      freshResearch(),
      stash,
      { vessels: { steel: 0, copper: 0, titanium: 0, chromite: 0, voidsteel: 0 } },
    );
    expect(status.kind).toBe("ready");
  });

  it("researchStatus reports unlocked when recipe already in list", () => {
    const research: ResearchState = { unlockedRecipes: ["craft_combat_stim"], active: null };
    const status = researchStatus(
      "craft_combat_stim",
      research,
      [],
      { vessels: { steel: 0, copper: 0, titanium: 0, chromite: 0, voidsteel: 0 } },
    );
    expect(status.kind).toBe("unlocked");
  });
});
