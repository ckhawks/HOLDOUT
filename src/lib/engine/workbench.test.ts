import { describe, expect, it } from "vitest";
import type { FoundryState, ModuleState, StashItem } from "@/lib/types";
import { canCraft, craft, inputSatisfactions } from "./workbench";
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

function freshFoundry(overrides: Partial<FoundryState["vessels"]> = {}): FoundryState {
  return {
    vessels: { steel: 0, copper: 0, titanium: 0, chromite: 0, voidsteel: 0, ...overrides },
  };
}

function builtAt(tier: 1 | 2 | 3): ModuleState {
  return { built: true, tier };
}

describe("workbench engine", () => {
  it("rejects crafting when workbench is not built", () => {
    const recipe = CRAFT_RECIPES["craft_bandage_pack"];
    const r = canCraft(recipe, [], freshFoundry(), { built: false, tier: 0 }, []);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("not_built");
  });

  it("rejects crafting above the workbench tier", () => {
    const recipe = CRAFT_RECIPES["craft_tactical_pack"]; // minWorkbenchTier 2
    const stash = mockStash([
      { itemId: "cloth_scrap", count: 6 },
      { itemId: "modular_harness", count: 3 },
      { itemId: "control_board", count: 1 },
    ]);
    const r = canCraft(recipe, stash, freshFoundry(), builtAt(1), [recipe.id]);
    expect(r.ok).toBe(false);
    if (!r.ok && r.reason === "tier_too_low") expect(r.required).toBe(2);
  });

  it("rejects locked recipes (need research)", () => {
    const recipe = CRAFT_RECIPES["craft_combat_stim"]; // requires research
    const stash = mockStash([
      { itemId: "synthate", count: 2 },
      { itemId: "botanical", count: 2 },
    ]);
    const r = canCraft(recipe, stash, freshFoundry(), builtAt(2), []);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("locked");
  });

  it("accepts unlockedByDefault recipes without explicit unlock", () => {
    const recipe = CRAFT_RECIPES["craft_bandage_pack"];
    const stash = mockStash([
      { itemId: "synthate", count: 2 },
      { itemId: "botanical", count: 1 },
    ]);
    const r = canCraft(recipe, stash, freshFoundry(), builtAt(1), []);
    expect(r.ok).toBe(true);
  });

  it("reports missing items when stash is short", () => {
    const recipe = CRAFT_RECIPES["craft_bandage_pack"];
    const stash = mockStash([{ itemId: "synthate", count: 1 }]); // need 2 synthate + 1 botanical
    const r = canCraft(recipe, stash, freshFoundry(), builtAt(1), []);
    expect(r.ok).toBe(false);
    if (!r.ok && r.reason === "missing_items") {
      const ids = r.missing.map((m) => m.id).sort();
      expect(ids).toEqual(["botanical", "synthate"]);
    }
  });

  it("reports missing metals when foundry is short", () => {
    const recipe = CRAFT_RECIPES["craft_modular_pack"];
    const stash = mockStash([
      { itemId: "cloth_scrap", count: 5 },
      { itemId: "modular_harness", count: 2 },
    ]);
    const r = canCraft(recipe, stash, freshFoundry({ steel: 50 }), builtAt(2), [recipe.id]);
    expect(r.ok).toBe(false);
    if (!r.ok && r.reason === "missing_metals") {
      expect(r.missing).toEqual([{ id: "steel", need: 100, have: 50 }]);
    }
  });

  it("skips pinned items when accounting for inputs", () => {
    const recipe = CRAFT_RECIPES["craft_antiseptic_vial"]; // 2 synthate
    const stash: StashItem[] = [
      { uid: "p", itemId: "synthate", pinned: true },
      { uid: "q", itemId: "synthate", pinned: true },
    ];
    const r = canCraft(recipe, stash, freshFoundry(), builtAt(1), []);
    expect(r.ok).toBe(false);
    if (!r.ok && r.reason === "missing_items") {
      expect(r.missing[0]).toEqual({ id: "synthate", need: 2, have: 0 });
    }
  });

  it("craft consumes inputs atomically and stamps the produced item", () => {
    const recipe = CRAFT_RECIPES["craft_bandage_pack"];
    const stash = mockStash([
      { itemId: "synthate", count: 3 },
      { itemId: "botanical", count: 2 },
    ]);
    const r = craft(recipe, stash, freshFoundry(), builtAt(1), [], 1700000000000, () => 0.5);
    if (!("ok" in r ? r.ok === false : false)) {
      const success = r as Exclude<typeof r, { ok: false }>;
      // 2 synthate + 1 botanical consumed -> 1 synthate, 1 botanical left
      const counts: Record<string, number> = {};
      for (const si of success.stash) counts[si.itemId] = (counts[si.itemId] ?? 0) + 1;
      expect(counts.synthate).toBe(1);
      expect(counts.botanical).toBe(1);
      expect(counts.bandage_pack).toBe(1);
      expect(success.produced.acquiredAt).toBe(1700000000000);
      expect(success.produced.valueMod).toBeGreaterThan(0.8);
      expect(success.produced.valueMod).toBeLessThan(1.2);
    }
  });

  it("craft consumes from foundry vessels when recipe requires metal", () => {
    const recipe = CRAFT_RECIPES["craft_modular_pack"]; // 100 steel + items
    const stash = mockStash([
      { itemId: "cloth_scrap", count: 5 },
      { itemId: "modular_harness", count: 2 },
    ]);
    const foundry = freshFoundry({ steel: 250 });
    const r = craft(recipe, stash, foundry, builtAt(2), [recipe.id], 1, () => 0.5);
    if ("ok" in r && r.ok === false) throw new Error("expected success");
    const success = r as Exclude<typeof r, { ok: false }>;
    expect(success.foundry.vessels.steel).toBe(150);
  });

  it("inputSatisfactions reports per-input have vs need", () => {
    const recipe = CRAFT_RECIPES["craft_modular_pack"];
    const stash = mockStash([
      { itemId: "cloth_scrap", count: 3 },
      { itemId: "modular_harness", count: 2 },
    ]);
    const sats = inputSatisfactions(recipe, stash, freshFoundry({ steel: 100 }));
    const cloth = sats.find((s) => s.id === "cloth_scrap")!;
    const steel = sats.find((s) => s.id === "steel")!;
    expect(cloth.have).toBe(3);
    expect(cloth.satisfied).toBe(false);
    expect(steel.have).toBe(100);
    expect(steel.satisfied).toBe(true);
  });
});
