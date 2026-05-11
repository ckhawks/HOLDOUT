import { describe, expect, it } from "vitest";
import type { StashItem } from "@/lib/types";
import { recycleItem, rolledOutputs } from "./recycle";
import { RECYCLE_RECIPES } from "@/lib/data/recycle";

function mockItem(itemId: string): StashItem {
  return { uid: `u-${itemId}`, itemId };
}

// Deterministic sequence rand: returns the next value from `seq`, looping.
function seqRand(seq: number[]): () => number {
  let i = 0;
  return () => {
    const v = seq[i % seq.length];
    i += 1;
    return v;
  };
}

describe("recycle engine", () => {
  it("returns no_recipe for items without a recipe", () => {
    const r = recycleItem(mockItem("silver_chain"), 1, () => 0);
    expect("error" in r && r.error).toBe("no_recipe");
  });

  it("rejects items above the recycler tier", () => {
    // holo_display requires recycler tier 2
    const r = recycleItem(mockItem("holo_display"), 1, () => 0);
    expect("error" in r && r.error).toBe("tier_too_low");
    if ("error" in r && r.error === "tier_too_low") expect(r.required).toBe(2);
  });

  it("accepts the same item once recycler tier is high enough", () => {
    const r = recycleItem(mockItem("holo_display"), 2, () => 0);
    expect("error" in r).toBe(false);
  });

  it("produces all outputs when rand is always 0 (every roll succeeds)", () => {
    const recipe = RECYCLE_RECIPES["combat_knife"];
    const produced = rolledOutputs(recipe, 1, () => 0);
    expect(produced.length).toBe(recipe.outputs.length);
    expect(produced.map((p) => p.id).sort()).toEqual(["scrap_metal", "spring_coil"].sort());
  });

  it("produces nothing when rand is always 0.999 (every roll fails)", () => {
    const recipe = RECYCLE_RECIPES["combat_knife"];
    const produced = rolledOutputs(recipe, 1, () => 0.999);
    expect(produced).toEqual([]);
  });

  it("L2 tier bonus lifts borderline chances over the line", () => {
    // bandage_pack: botanical 50%, synthate 30%.
    // rolledOutputs consumes TWO rand values per output (chance + stack check)
    // when the chance roll succeeds, ONE when it fails.
    // Sequence [0.4, 0.0, 0.4, 0.0]:
    //   L1 botanical (0.5):   0.4<0.5  pass + 0.0<0 fail  -> ×1
    //   L1 synthate  (0.3):   0.4<0.3  fail               -> skip (only 1 rand consumed)
    //   So at L1 sequence advances: 0.4, 0.0, 0.4 (3 consumed). Result: ["botanical"]
    //   L2 botanical (0.65):  0.4<0.65 pass + 0.0<0 fail  -> ×1
    //   L2 synthate  (0.45):  0.4<0.45 pass + 0.0<0 fail  -> ×1
    //   Result: ["botanical", "synthate"]
    const recipe = RECYCLE_RECIPES["bandage_pack"];
    const l1 = rolledOutputs(recipe, 1, seqRand([0.4, 0.0, 0.4, 0.0]));
    const l2 = rolledOutputs(recipe, 2, seqRand([0.4, 0.0, 0.4, 0.0]));
    expect(l1.map((p) => p.id)).toEqual(["botanical"]);
    expect(l2.map((p) => p.id).sort()).toEqual(["botanical", "synthate"].sort());
  });

  it("L3 rolls bonus-stack chance only at tier 3", () => {
    // antiseptic_vial: synthate 90%. At rand sequence [0.0 chance roll, 0.1 stack roll]
    // L1 -> synthate ×1 (no stack roll consumed... actually rolledOutputs
    // consumes a stack-roll value too for every successful chance roll;
    // at L1 bonusStackChance is 0 so it always fails -> ×1).
    // L3 -> synthate ×2 (chance succeeds, stack roll 0.1 < 0.2).
    const recipe = RECYCLE_RECIPES["antiseptic_vial"];
    const l1 = rolledOutputs(recipe, 1, seqRand([0.0, 0.1]));
    const l3 = rolledOutputs(recipe, 3, seqRand([0.0, 0.1]));
    expect(l1).toEqual([{ id: "synthate", count: 1 }]);
    expect(l3).toEqual([{ id: "synthate", count: 2 }]);
  });

  it("L3 stack chance does not fire when stack-roll exceeds threshold", () => {
    const recipe = RECYCLE_RECIPES["antiseptic_vial"];
    // chance roll succeeds; stack roll 0.5 > 0.2 fails
    const l3 = rolledOutputs(recipe, 3, seqRand([0.0, 0.5]));
    expect(l3).toEqual([{ id: "synthate", count: 1 }]);
  });

  it("recycleItem returns the consumed uid + produced outputs", () => {
    const item = mockItem("frag_grenade");
    const r = recycleItem(item, 1, () => 0);
    if ("error" in r) throw new Error("expected success");
    expect(r.consumedUid).toBe(item.uid);
    expect(r.produced.map((p) => p.id).sort()).toEqual(["scrap_metal", "spring_coil"].sort());
  });
});
