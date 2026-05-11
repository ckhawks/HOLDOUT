import { describe, expect, it } from "vitest";
import type { FoundryState, MetalId, ModuleState, StashItem } from "@/lib/types";
import {
  describeSmelt,
  metalSellValue,
  smeltItem,
  vesselCapacity,
  withdrawMetal,
} from "./foundry";

function mockItem(itemId: string): StashItem {
  return { uid: `u-${itemId}`, itemId };
}

function freshFoundry(): FoundryState {
  return { vessels: { steel: 0, copper: 0, titanium: 0, chromite: 0, voidsteel: 0 } };
}

function builtAt(tier: 1 | 2 | 3): ModuleState {
  return { built: true, tier };
}

describe("foundry engine", () => {
  it("rejects smelt when module is not built", () => {
    const r = smeltItem(mockItem("scrap_metal"), freshFoundry(), { built: false, tier: 0 });
    expect("error" in r && r.error).toBe("not_built");
  });

  it("rejects items without a smelt recipe", () => {
    const r = smeltItem(mockItem("silver_chain"), freshFoundry(), builtAt(1));
    expect("error" in r && r.error).toBe("no_recipe");
  });

  it("rejects items above the foundry tier", () => {
    // tungsten_gear requires foundry tier 2
    const r = smeltItem(mockItem("tungsten_gear"), freshFoundry(), builtAt(1));
    expect("error" in r && r.error).toBe("tier_too_low");
    if ("error" in r && r.error === "tier_too_low") expect(r.required).toBe(2);
  });

  it("smelts scrap_metal into steel and stores it in the vessel", () => {
    const r = smeltItem(mockItem("scrap_metal"), freshFoundry(), builtAt(1));
    if ("error" in r) throw new Error("expected success");
    expect(r.foundry.vessels.steel).toBe(30);
    expect(r.result.added).toEqual({ steel: 30 });
    expect(r.result.wasted).toEqual({});
  });

  it("splits hydraulic_piston into steel + copper across vessels", () => {
    const r = smeltItem(mockItem("hydraulic_piston"), freshFoundry(), builtAt(1));
    if ("error" in r) throw new Error("expected success");
    expect(r.foundry.vessels.steel).toBe(80);
    expect(r.foundry.vessels.copper).toBe(20);
  });

  it("wastes overflow when a vessel is at capacity", () => {
    // L1 steel capacity = 500. Pre-fill to 490, then smelt scrap_metal (+30).
    // Expect: vessel ends at 500, wasted = 20.
    const foundry: FoundryState = { ...freshFoundry(), vessels: { ...freshFoundry().vessels, steel: 490 } };
    const r = smeltItem(mockItem("scrap_metal"), foundry, builtAt(1));
    if ("error" in r) throw new Error("expected success");
    expect(r.foundry.vessels.steel).toBe(500);
    expect(r.result.added).toEqual({ steel: 10 });
    expect(r.result.wasted).toEqual({ steel: 20 });
  });

  it("vessel capacity scales with tier", () => {
    expect(vesselCapacity("steel", 1)).toBe(500);
    expect(vesselCapacity("steel", 2)).toBe(1500);
    expect(vesselCapacity("steel", 3)).toBe(5000);
  });

  it("chromite and voidsteel are tier-3 only (capacity 0 below L3)", () => {
    expect(vesselCapacity("chromite", 1)).toBe(0);
    expect(vesselCapacity("chromite", 2)).toBe(0);
    expect(vesselCapacity("chromite", 3)).toBe(500);
    expect(vesselCapacity("voidsteel", 3)).toBe(500);
  });

  it("withdrawMetal clips to stored amount", () => {
    const foundry: FoundryState = { ...freshFoundry(), vessels: { ...freshFoundry().vessels, copper: 40 } };
    const r1 = withdrawMetal(foundry, "copper", 30);
    expect(r1.withdrawn).toBe(30);
    expect(r1.foundry.vessels.copper).toBe(10);
    const r2 = withdrawMetal(r1.foundry, "copper", 999);
    expect(r2.withdrawn).toBe(10);
    expect(r2.foundry.vessels.copper).toBe(0);
  });

  it("withdrawMetal is a no-op for zero or negative amounts", () => {
    const foundry: FoundryState = { ...freshFoundry(), vessels: { ...freshFoundry().vessels, steel: 100 } };
    expect(withdrawMetal(foundry, "steel", 0).withdrawn).toBe(0);
    expect(withdrawMetal(foundry, "steel", -5).withdrawn).toBe(0);
  });

  it("metalSellValue rounds units * per-unit price", () => {
    expect(metalSellValue("steel", 100)).toBe(40); // 100 * 0.4
    expect(metalSellValue("copper", 50)).toBe(30); // 50 * 0.6
    expect(metalSellValue("titanium", 10)).toBe(12); // 10 * 1.2
    expect(metalSellValue("voidsteel", 50)).toBe(200); // 50 * 4.0
  });

  it("describeSmelt summarizes added and wasted", () => {
    const text = describeSmelt({
      consumedUid: "x",
      added: { steel: 30 } as Partial<Record<MetalId, number>>,
      wasted: { copper: 5 } as Partial<Record<MetalId, number>>,
    });
    expect(text).toMatch(/\+30 Steel/);
    expect(text).toMatch(/5 Copper wasted/);
  });
});
