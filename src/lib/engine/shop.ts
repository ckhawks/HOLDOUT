import type { ShopOffer, ShopState } from "@/lib/types";
import { ITEMS } from "@/lib/data/items";

// Buy markup over sell value. Tightens the loop without making buying free
// arbitrage. ¤6 bandage → ¤18 buy.
const BUY_MARKUP = 3;
const MIN_PRICE = 5;

// Item pools the shop draws from. The shop NEVER carries unsellable items
// (sellValue 0 = unique key items / schematics). bandage_pack is pulled out
// of the random chem pool because it's guaranteed every refresh.
const CHEM_POOL = ["antiseptic_vial", "med_syrette"];
const FOOD_POOL = ["ration_pack", "water_bulb", "coffee_can"];
const AMMO_POOL = ["rifle_round", "pistol_mag"];

export function priceFor(itemId: string): number {
  const item = ITEMS[itemId];
  if (!item) return 999;
  // Bags / scarce items use their own scale: even at sellValue ¤60 a satchel
  // is undersold for what it does, so keep markup applied uniformly.
  return Math.max(MIN_PRICE, Math.round(item.sellValue * BUY_MARKUP));
}

function pickN(pool: string[], n: number, rand: () => number): string[] {
  const shuffled = [...pool];
  // Fisher–Yates with the seeded RNG so shop refresh is deterministic per save.
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(n, pool.length));
}

function offerId(rand: () => number): string {
  return `o_${Math.floor(rand() * 0xffffffff).toString(36)}_${Math.floor(rand() * 0xffff).toString(36)}`;
}

// Generate a fresh shop catalog. Called on raid end (refresh) and on hydrate
// when the persisted shop is empty.
export function generateShopOffers(rand: () => number): ShopOffer[] {
  const offers: ShopOffer[] = [];
  // 2 distinct bags. Order in pickN gives a natural weighting since shuffled
  // results are unbiased — the cheaper bags are taken first only by accident.
  // We do bias the selection: always include canvas_satchel (50% of the time
  // pickN happens to roll it anyway, but we want the cheap option to almost
  // always be present), plus one weighted random other.
  const otherBags = ["canvas_satchel", "tactical_pack", "raider_rucksack"];
  const bagPicks = pickN(otherBags, 2, rand);
  for (const id of bagPicks) {
    offers.push({ offerId: offerId(rand), itemId: id, price: priceFor(id), stock: 1 });
  }
  // Bandages always available — survival item, not random.
  offers.push({
    offerId: offerId(rand),
    itemId: "bandage_pack",
    price: priceFor("bandage_pack"),
    stock: 4 + Math.floor(rand() * 3),
  });
  // 2 distinct other chems, 2-5 stock each.
  for (const id of pickN(CHEM_POOL, 2, rand)) {
    offers.push({
      offerId: offerId(rand),
      itemId: id,
      price: priceFor(id),
      stock: 2 + Math.floor(rand() * 4),
    });
  }
  // 2 distinct foods, 3-7 stock each.
  for (const id of pickN(FOOD_POOL, 2, rand)) {
    offers.push({
      offerId: offerId(rand),
      itemId: id,
      price: priceFor(id),
      stock: 3 + Math.floor(rand() * 5),
    });
  }
  // 2 distinct ammos, 5-10 stock each.
  for (const id of pickN(AMMO_POOL, 2, rand)) {
    offers.push({
      offerId: offerId(rand),
      itemId: id,
      price: priceFor(id),
      stock: 5 + Math.floor(rand() * 6),
    });
  }
  return offers;
}

export function refreshShop(rand: () => number, now: number): ShopState {
  return { offers: generateShopOffers(rand), lastRefreshAt: now };
}
