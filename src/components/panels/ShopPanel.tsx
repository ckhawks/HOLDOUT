"use client";

import { Backpack, Coins, Crosshair, Droplet, Pill, Soup } from "lucide-react";
import { useGame } from "@/store/game";
import { ITEMS } from "@/lib/data/items";
import { PanelHeader } from "./PanelHeader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TIER_COLOR } from "@/lib/itemDisplay";
import type { ItemCategory, ShopOffer } from "@/lib/types";

const CATEGORY_ORDER: ItemCategory[] = ["bag", "chems", "consumables", "military"];

const CATEGORY_META: Record<string, { label: string; Icon: typeof Backpack }> = {
  bag: { label: "Bags", Icon: Backpack },
  chems: { label: "Medical", Icon: Pill },
  consumables: { label: "Rations", Icon: Soup },
  military: { label: "Munitions", Icon: Crosshair },
};

export function ShopPanel() {
  const offers = useGame((s) => s.shop.offers);
  const cash = useGame((s) => s.cash);
  const stashLen = useGame((s) => s.stash.length);
  const stashCap = useGame((s) => s.hideout.modules.stash.capacity ?? 0);
  const buyOffer = useGame((s) => s.buyOffer);
  const stashFull = stashLen >= stashCap;

  const grouped: Record<string, ShopOffer[]> = {};
  for (const o of offers) {
    const cat = ITEMS[o.itemId]?.category ?? "experimental";
    (grouped[cat] = grouped[cat] || []).push(o);
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <PanelHeader
        title="Marketplace"
        subtitle={`Stock rotates after each raid · ${offers.length} offers · ¤${cash.toLocaleString()} on hand`}
        right={
          <span className="inline-flex items-center gap-1 rounded-sm border border-border/60 bg-card/30 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <Droplet className="size-3" />
            stash {stashLen}/{stashCap}
          </span>
        }
      />
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {offers.length === 0 ? (
          <div className="flex h-full items-center justify-center font-mono text-xs uppercase tracking-widest text-muted-foreground">
            stock empty · run a raid
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {CATEGORY_ORDER.map((cat) => {
              const list = grouped[cat];
              if (!list || list.length === 0) return null;
              const meta = CATEGORY_META[cat] ?? { label: cat, Icon: Backpack };
              return (
                <section key={cat} className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    <meta.Icon className="size-3" />
                    {meta.label}
                  </div>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {list.map((offer) => (
                      <OfferCard
                        key={offer.offerId}
                        offer={offer}
                        cash={cash}
                        stashFull={stashFull}
                        onBuy={() => buyOffer(offer.offerId)}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function OfferCard({
  offer,
  cash,
  stashFull,
  onBuy,
}: {
  offer: ShopOffer;
  cash: number;
  stashFull: boolean;
  onBuy: () => void;
}) {
  const item = ITEMS[offer.itemId];
  if (!item) return null;
  const tooPoor = cash < offer.price;
  const disabled = tooPoor || stashFull;
  const tooltip = stashFull
    ? "Stash full"
    : tooPoor
      ? `Need ¤${(offer.price - cash).toLocaleString()} more`
      : "";
  return (
    <div className="flex items-start justify-between gap-3 rounded-sm border border-border/60 bg-card/40 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className={cn("truncate text-sm font-semibold", TIER_COLOR[item.tier])}>
          {item.name}
        </div>
        <div className="mt-0.5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Coins className="size-3" />¤{offer.price.toLocaleString()}
          </span>
          <span className="opacity-50">·</span>
          <span className="tabular-nums">{offer.stock} in stock</span>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={onBuy}
        title={tooltip}
        className="rounded-sm"
      >
        Buy
      </Button>
    </div>
  );
}
