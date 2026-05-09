"use client";

import { useGame } from "@/store/game";
import { ITEMS } from "@/lib/data/items";
import { PanelHeader } from "./PanelHeader";
import { cn } from "@/lib/utils";
import { TIER_COLOR } from "@/lib/itemDisplay";
import { Button } from "@/components/ui/button";
import { Backpack, Coins, PackageOpen, Shirt, Trash2 } from "lucide-react";
import { buildOccupancy, canPlace, shapeFor } from "@/lib/engine/shapes";
import type { BagState, Equipment, PackPlacement, PocketsState, Rotation, StashItem } from "@/lib/types";

type KitTarget = { slot: "pockets" | "bag"; x: number; y: number; rotation: Rotation };

// First-fit placement search across pockets, then bag. Returns null if it
// won't fit anywhere with any rotation.
function findFit(eq: Equipment, item: StashItem): KitTarget | null {
  const tryGrid = (grid: PocketsState | BagState, slot: "pockets" | "bag"): KitTarget | null => {
    for (let r = 0; r < 4; r++) {
      const rotation = r as Rotation;
      const cells = shapeFor(item.itemId, rotation);
      const occ = buildOccupancy(grid.items, grid.grid.width, grid.grid.height);
      for (let y = 0; y < grid.grid.height; y++) {
        for (let x = 0; x < grid.grid.width; x++) {
          if (canPlace(cells, x, y, grid.grid.width, grid.grid.height, occ)) {
            return { slot, x, y, rotation };
          }
        }
      }
    }
    return null;
  };
  return tryGrid(eq.pockets, "pockets") ?? (eq.bag ? tryGrid(eq.bag, "bag") : null);
}

export function StashPanel() {
  const stash = useGame((s) => s.stash);
  const cap = useGame((s) => s.hideout.modules.stash.capacity ?? 0);
  const equipment = useGame((s) => s.operative.equipment);
  const inRaid = useGame((s) => !!s.currentRaid);
  const sellItem = useGame((s) => s.sellItem);
  const sellAllJunk = useGame((s) => s.sellAllJunk);
  const kitFromStash = useGame((s) => s.kitFromStash);
  const stashFromKit = useGame((s) => s.stashFromKit);
  const trashFromKit = useGame((s) => s.trashFromKit);
  const equipBag = useGame((s) => s.equipBag);
  const unequipBag = useGame((s) => s.unequipBag);
  const emptyKit = useGame((s) => s.emptyKitToStash);

  const junkValue = stash.reduce((sum, si) => {
    const item = ITEMS[si.itemId];
    if (!item) return sum;
    if (item.tier === "common" && item.sellValue > 0) return sum + item.sellValue;
    return sum;
  }, 0);

  const stashFull = stash.length >= cap;
  const kitItemCount =
    equipment.pockets.items.length + (equipment.bag?.items.length ?? 0);
  const canEmptyAll = !inRaid && kitItemCount > 0;

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <PanelHeader
        title="Stash"
        subtitle={`${stash.length} of ${cap} slots used${inRaid ? " · operative deployed" : ""}`}
        right={
          junkValue > 0 ? (
            <Button variant="outline" size="sm" onClick={sellAllJunk} className="rounded-sm">
              <Coins className="size-3.5" />
              Sell junk · ¤{junkValue.toLocaleString()}
            </Button>
          ) : undefined
        }
      />
      <div className="flex min-h-0 flex-1">
        {/* Kit sidebar — only meaningful when idle */}
        {!inRaid && (
          <aside className="flex w-72 shrink-0 flex-col gap-3 overflow-y-auto border-r border-border/60 bg-card/20 px-4 py-4">
            <KitSection
              title="Pockets"
              Icon={Shirt}
              items={equipment.pockets.items}
              gridLabel={`${equipment.pockets.grid.width}×${equipment.pockets.grid.height}`}
              onSendToStash={(uid) => stashFromKit(uid)}
              onTrash={(uid) => trashFromKit(uid)}
              stashFull={stashFull}
            />
            {equipment.bag ? (
              <KitSection
                title={`Bag · ${ITEMS[equipment.bag.slot.itemId]?.name ?? "Bag"}`}
                Icon={Backpack}
                items={equipment.bag.items}
                gridLabel={`${equipment.bag.grid.width}×${equipment.bag.grid.height}`}
                onSendToStash={(uid) => stashFromKit(uid)}
                onTrash={(uid) => trashFromKit(uid)}
                stashFull={stashFull}
                footer={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => unequipBag()}
                    disabled={equipment.bag!.items.length > 0 || stashFull}
                    className="rounded-sm"
                    title={
                      equipment.bag!.items.length > 0
                        ? "Empty the bag first"
                        : stashFull
                          ? "Stash full"
                          : ""
                    }
                  >
                    Unequip bag
                  </Button>
                }
              />
            ) : (
              <div className="rounded-sm border border-dashed border-border/40 p-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
                <Backpack className="mr-2 inline size-3" />
                no bag equipped · drag/equip from stash
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => emptyKit()}
              disabled={!canEmptyAll}
              className="rounded-sm"
              title={
                !canEmptyAll
                  ? "Nothing to empty"
                  : stashFull
                    ? "Stash full — some items may not transfer"
                    : ""
              }
            >
              <PackageOpen className="size-3.5" />
              Empty kit
            </Button>
          </aside>
        )}

        {/* Stash list */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4 text-sm">
          {stash.length === 0 ? (
            <div className="flex h-full items-center justify-center font-mono text-xs uppercase tracking-widest text-muted-foreground">
              stash empty · run a raid
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-1 md:grid-cols-2 lg:grid-cols-3">
              {stash.map((si) => {
                const item = ITEMS[si.itemId];
                if (!item) return null;
                const sellable = item.sellValue > 0;
                const equippableBag = item.slot === "bag";
                const fit = !inRaid && !equippableBag ? findFit(equipment, si) : null;
                const canEquip =
                  !inRaid && equippableBag && !equipment.bag;
                return (
                  <div
                    key={si.uid}
                    title={`${item.tier}${sellable ? ` · sells for ¤${item.sellValue}` : " · cannot be sold"}`}
                    className="group flex items-center justify-between gap-2 rounded-sm border border-border/60 bg-card/40 px-3 py-2"
                  >
                    <span className={cn("min-w-0 truncate text-sm font-semibold", TIER_COLOR[item.tier])}>
                      {item.name}
                    </span>
                    <div className="flex shrink-0 items-center gap-1">
                      <span className="font-mono text-xs text-muted-foreground tabular-nums">
                        ¤{item.sellValue}
                      </span>
                      {canEquip && (
                        <button
                          onClick={() => equipBag(si.uid)}
                          className="cursor-pointer rounded-sm border border-transparent px-2 py-0.5 text-xs text-emerald-300/80 transition hover:border-emerald-500/40 hover:text-emerald-300"
                        >
                          equip
                        </button>
                      )}
                      {fit && (
                        <button
                          onClick={() =>
                            kitFromStash(si.uid, fit.slot, fit.x, fit.y, fit.rotation)
                          }
                          className="cursor-pointer rounded-sm border border-transparent px-2 py-0.5 text-xs text-muted-foreground transition hover:border-border hover:text-foreground"
                          title={`Move to ${fit.slot}`}
                        >
                          → kit
                        </button>
                      )}
                      {sellable && (
                        <button
                          onClick={() => sellItem(si.uid)}
                          className="cursor-pointer rounded-sm border border-transparent px-2 py-0.5 text-xs text-muted-foreground transition hover:border-border hover:text-foreground"
                        >
                          sell
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function KitSection({
  title,
  Icon,
  items,
  gridLabel,
  onSendToStash,
  onTrash,
  stashFull,
  footer,
}: {
  title: string;
  Icon: typeof Backpack;
  items: PackPlacement[];
  gridLabel: string;
  onSendToStash: (uid: string) => void;
  onTrash: (uid: string) => void;
  stashFull: boolean;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        <span className="flex items-center gap-1">
          <Icon className="size-3" />
          {title}
        </span>
        <span className="tabular-nums">
          {items.length} · {gridLabel}
        </span>
      </div>
      <div className="flex flex-col gap-1 rounded-sm border border-border/60 bg-background/40 p-2">
        {items.length === 0 ? (
          <span className="py-1 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
            empty
          </span>
        ) : (
          items.map((p) => {
            const item = ITEMS[p.itemId];
            return (
              <div
                key={p.uid}
                className="flex items-center justify-between gap-2 rounded-sm bg-card/40 px-2 py-1"
              >
                <span
                  className={cn(
                    "min-w-0 truncate text-xs",
                    item ? TIER_COLOR[item.tier] : "text-foreground",
                  )}
                >
                  {item?.name ?? p.itemId}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => onSendToStash(p.uid)}
                    disabled={stashFull}
                    className="cursor-pointer rounded-sm border border-transparent px-1.5 py-0.5 text-[10px] text-muted-foreground transition hover:border-border hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    title={stashFull ? "Stash full" : "Send to stash"}
                  >
                    → stash
                  </button>
                  <button
                    onClick={() => onTrash(p.uid)}
                    className="cursor-pointer rounded-sm border border-transparent px-1 py-0.5 text-muted-foreground transition hover:border-red-500/40 hover:text-red-300"
                    title="Discard"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
      {footer ? <div className="mt-1">{footer}</div> : null}
    </div>
  );
}
