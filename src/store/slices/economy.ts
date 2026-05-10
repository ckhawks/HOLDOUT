import type { StateCreator } from "zustand";
import type { Item, StashItem, Upgrades } from "@/lib/types";
import { ITEMS } from "@/lib/data/items";
import { isConsumable } from "@/lib/engine/consumables";
import { makeRng } from "@/lib/engine/raid";
import { refreshShop } from "@/lib/engine/shop";
import { stashCapacity, stashUpgradeCost } from "@/lib/engine/upgrades";
import type { GameState } from "../game";

// "Junk" = sellable items with no in-game use. Excludes equippables (have a
// slot) and consumables (have a CONSUMABLE_EFFECTS entry). Tier doesn't
// gate this — a rare valuable is still junk if there's nothing to do with
// it but sell. Future pin-to-keep affordance covers the "I want to hoard
// this" case (see backlog).
export function isJunk(item: Item | undefined): boolean {
  if (!item) return false;
  if (item.sellValue <= 0) return false;
  if (item.slot != null) return false;
  if (isConsumable(item.id)) return false;
  return true;
}

// Stash + shop economy slice. Selling, buying offers, stash capacity upgrade.
// Pure money-and-items routing — no raid lifecycle interplay.
export interface EconomySlice {
  sellItem: (uid: string) => void;
  sellAllJunk: () => void;
  buyOffer: (offerId: string) => boolean;
  buyStashUpgrade: () => void;
  // Debug-only: re-roll the shop offers immediately. Wired to a button in
  // the Marketplace panel that's only shown when debugMode is on.
  debugResetShop: () => void;
}

export const createEconomySlice: StateCreator<GameState, [], [], EconomySlice> = (set, get) => ({
  sellItem: (uid) => {
    const { stash, cash } = get();
    const idx = stash.findIndex((i) => i.uid === uid);
    if (idx === -1) return;
    const value = ITEMS[stash[idx].itemId]?.sellValue ?? 0;
    if (value <= 0) return;
    const next = [...stash];
    next.splice(idx, 1);
    set({ stash: next, cash: cash + value });
  },

  sellAllJunk: () => {
    const { stash, cash } = get();
    let earned = 0;
    const keep: StashItem[] = [];
    for (const si of stash) {
      const item = ITEMS[si.itemId];
      if (isJunk(item)) {
        earned += item!.sellValue;
      } else {
        keep.push(si);
      }
    }
    if (earned === 0) return;
    set({ stash: keep, cash: cash + earned });
  },

  buyOffer: (offerId) => {
    const { shop, cash, stash, hideout } = get();
    const idx = shop.offers.findIndex((o) => o.offerId === offerId);
    if (idx === -1) return false;
    const offer = shop.offers[idx];
    if (offer.stock <= 0) return false;
    if (cash < offer.price) return false;
    const cap = hideout.modules.stash.capacity ?? Infinity;
    if (stash.length >= cap) return false;
    const newItem: StashItem = {
      uid: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      itemId: offer.itemId,
      acquiredAt: Date.now(),
    };
    const nextStock = offer.stock - 1;
    const nextOffers = nextStock <= 0
      ? [...shop.offers.slice(0, idx), ...shop.offers.slice(idx + 1)]
      : shop.offers.map((o) => (o.offerId === offerId ? { ...o, stock: nextStock } : o));
    set({
      cash: cash - offer.price,
      stash: [...stash, newItem],
      shop: { ...shop, offers: nextOffers },
    });
    return true;
  },

  debugResetShop: () => {
    const seed = Math.floor(Math.random() * 0xffffffff);
    set({ shop: refreshShop(makeRng(seed), Date.now()) });
  },

  buyStashUpgrade: () => {
    const { cash, upgrades, hideout } = get();
    const cost = stashUpgradeCost(upgrades);
    if (cash < cost) return;
    const next: Upgrades = { ...upgrades, stashLevel: upgrades.stashLevel + 1 };
    set({
      cash: cash - cost,
      upgrades: next,
      hideout: {
        ...hideout,
        modules: {
          ...hideout.modules,
          stash: { ...hideout.modules.stash, capacity: stashCapacity(next) },
        },
      },
    });
  },
});
