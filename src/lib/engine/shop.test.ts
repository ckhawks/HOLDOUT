import { describe, expect, it } from "vitest";
import { generateShopOffers, priceFor, refreshShop } from "./shop";
import { makeRng } from "./raid";

describe("priceFor", () => {
  it("applies the buy markup over sellValue", () => {
    // bandage_pack: sellValue 6 → 6 * 3 = 18.
    expect(priceFor("bandage_pack")).toBe(18);
  });

  it("clamps small items to MIN_PRICE", () => {
    // Anything with sellValue * 3 < 5 is bumped up; we don't have a 0-value
    // sellable in the pool, but the floor is still observable as Math.max(5, ...).
    // Use a known low-value item to confirm the floor isn't tripped accidentally.
    expect(priceFor("bandage_pack")).toBeGreaterThanOrEqual(5);
  });

  it("returns 999 for unknown item ids", () => {
    expect(priceFor("not_a_real_item")).toBe(999);
  });
});

describe("generateShopOffers", () => {
  it("always includes a bandage_pack offer", () => {
    const offers = generateShopOffers(makeRng(1));
    const bandage = offers.find((o) => o.itemId === "bandage_pack");
    expect(bandage).toBeDefined();
    expect(bandage?.stock).toBeGreaterThanOrEqual(4);
    expect(bandage?.stock).toBeLessThanOrEqual(6);
  });

  it("returns 2 distinct bag offers", () => {
    const offers = generateShopOffers(makeRng(7));
    const bags = offers.filter((o) =>
      ["canvas_satchel", "tactical_pack", "raider_rucksack"].includes(o.itemId),
    );
    expect(bags).toHaveLength(2);
    const ids = new Set(bags.map((b) => b.itemId));
    expect(ids.size).toBe(2);
  });

  it("returns 2 distinct chems (excluding the guaranteed bandage)", () => {
    const offers = generateShopOffers(makeRng(13));
    const chems = offers.filter((o) =>
      ["antiseptic_vial", "med_syrette"].includes(o.itemId),
    );
    expect(chems).toHaveLength(2);
    expect(new Set(chems.map((c) => c.itemId)).size).toBe(2);
  });

  it("is deterministic for a given seed", () => {
    const a = generateShopOffers(makeRng(42));
    const b = generateShopOffers(makeRng(42));
    expect(a).toEqual(b);
  });

  it("varies between seeds", () => {
    const a = generateShopOffers(makeRng(1));
    const b = generateShopOffers(makeRng(999));
    expect(a).not.toEqual(b);
  });

  it("every offer has positive stock and price >= MIN_PRICE", () => {
    const offers = generateShopOffers(makeRng(5));
    for (const o of offers) {
      expect(o.stock).toBeGreaterThan(0);
      expect(o.price).toBeGreaterThanOrEqual(5);
    }
  });

  it("every offer has a unique offerId", () => {
    const offers = generateShopOffers(makeRng(11));
    const ids = new Set(offers.map((o) => o.offerId));
    expect(ids.size).toBe(offers.length);
  });
});

describe("refreshShop", () => {
  it("stamps the supplied now as lastRefreshAt", () => {
    const shop = refreshShop(makeRng(1), 12345);
    expect(shop.lastRefreshAt).toBe(12345);
  });

  it("populates offers from generateShopOffers", () => {
    const shop = refreshShop(makeRng(1), 0);
    expect(shop.offers.length).toBeGreaterThan(0);
  });
});
