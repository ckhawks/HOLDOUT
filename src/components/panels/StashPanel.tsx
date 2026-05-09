"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useGame } from "@/store/game";
import { ITEMS } from "@/lib/data/items";
import { PanelHeader } from "./PanelHeader";
import { cn } from "@/lib/utils";
import { TIER_COLOR, tierColorFor, tileBgFor } from "@/lib/itemDisplay";
import { Button } from "@/components/ui/button";
import { Backpack, Coins, PackageOpen, Shirt } from "lucide-react";
import { buildOccupancy, canPlace, shapeBounds, shapeFor } from "@/lib/engine/shapes";
import type { BagState, Equipment, PocketsState, Rotation, StashItem } from "@/lib/types";

const CELL = 28;

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
          <aside className="flex w-80 shrink-0 flex-col gap-3 overflow-y-auto border-r border-border/60 bg-card/20 px-4 py-4">
            <KitGridDisplay
              title="Pockets"
              Icon={Shirt}
              grid={equipment.pockets}
              onClickItem={(uid) => stashFromKit(uid)}
              clickHint="Click → stash"
              stashFull={stashFull}
            />
            {equipment.bag ? (
              <>
                <KitGridDisplay
                  title={`Bag · ${ITEMS[equipment.bag.slot.itemId]?.name ?? "Bag"}`}
                  Icon={Backpack}
                  grid={equipment.bag}
                  onClickItem={(uid) => stashFromKit(uid)}
                  clickHint="Click → stash"
                  stashFull={stashFull}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => unequipBag()}
                  disabled={equipment.bag.items.length > 0 || stashFull}
                  className="rounded-sm"
                  title={
                    equipment.bag.items.length > 0
                      ? "Empty the bag first"
                      : stashFull
                        ? "Stash full"
                        : ""
                  }
                >
                  Unequip bag
                </Button>
              </>
            ) : (
              <div className="rounded-sm border border-dashed border-border/40 p-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
                <Backpack className="mr-2 inline size-3" />
                no bag equipped · equip from stash
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
                const ctrlClickAction = canEquip
                  ? () => equipBag(si.uid)
                  : fit
                    ? () => kitFromStash(si.uid, fit.slot, fit.x, fit.y, fit.rotation)
                    : null;
                const ctrlHint = canEquip
                  ? "Ctrl+click to equip"
                  : fit
                    ? `Ctrl+click → ${fit.slot}`
                    : "";
                return (
                  <div
                    key={si.uid}
                    title={`${item.tier}${sellable ? ` · sells for ¤${item.sellValue}` : " · cannot be sold"}${ctrlHint ? ` · ${ctrlHint}` : ""}`}
                    onClick={(e) => {
                      // Ctrl/Cmd+click is the fast move-to-kit (or equip) shortcut.
                      // Stops the click from bubbling up and triggering button SFX
                      // on the wrapper.
                      if ((e.ctrlKey || e.metaKey) && ctrlClickAction) {
                        e.preventDefault();
                        e.stopPropagation();
                        ctrlClickAction();
                      }
                    }}
                    className={cn(
                      "group flex items-center justify-between gap-2 rounded-sm border border-border/60 bg-card/40 px-3 py-2",
                      ctrlClickAction && "hover:border-emerald-500/40",
                    )}
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

function KitGridDisplay({
  title,
  Icon,
  grid,
  onClickItem,
  clickHint,
  stashFull,
}: {
  title: string;
  Icon: typeof Backpack;
  grid: PocketsState | BagState;
  onClickItem: (uid: string) => void;
  clickHint: string;
  stashFull: boolean;
}) {
  const w = grid.grid.width;
  const h = grid.grid.height;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        <span className="flex items-center gap-1">
          <Icon className="size-3" />
          {title}
        </span>
        <span className="tabular-nums">
          {grid.items.length}/{w * h}
        </span>
      </div>
      <div
        className="relative select-none border border-border/80 bg-background/40"
        style={{ width: w * CELL, height: h * CELL }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              `linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px),` +
              `linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)`,
            backgroundSize: `${CELL}px ${CELL}px`,
          }}
        />
        {grid.items.map((p) => {
          const cells = shapeFor(p.itemId, p.rotation);
          const item = ITEMS[p.itemId];
          return (
            <div
              key={p.uid}
              className="absolute"
              style={{ left: p.x * CELL, top: p.y * CELL }}
            >
              <ClickableTiles
                cells={cells}
                itemId={p.itemId}
                label={item?.name ?? p.itemId}
                onClick={() => onClickItem(p.uid)}
                disabled={stashFull}
                clickHint={clickHint}
              />
            </div>
          );
        })}
      </div>
      <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/60">
        {clickHint}
        {stashFull ? " · stash full" : ""}
      </div>
    </div>
  );
}

function ClickableTiles({
  cells,
  itemId,
  label,
  onClick,
  disabled,
  clickHint,
}: {
  cells: ReturnType<typeof shapeFor>;
  itemId: string;
  label: string;
  onClick: () => void;
  disabled: boolean;
  clickHint: string;
}) {
  const bg = tileBgFor(itemId);
  const fg = tierColorFor(itemId);
  const { w, h } = shapeBounds(cells);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const tier = ITEMS[itemId]?.tier ?? "common";
  const sellValue = ITEMS[itemId]?.sellValue ?? 0;

  useLayoutEffect(() => {
    const el = tooltipRef.current;
    if (!cursor || !el) return;
    const r = el.getBoundingClientRect();
    const margin = 8;
    const offset = 14;
    let left = cursor.x + offset;
    let top = cursor.y + offset;
    if (left + r.width > window.innerWidth - margin) left = cursor.x - r.width - offset;
    if (top + r.height > window.innerHeight - margin) top = cursor.y - r.height - offset;
    if (left < margin) left = margin;
    if (top < margin) top = margin;
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  }, [cursor]);

  const update = (e: React.PointerEvent) => setCursor({ x: e.clientX, y: e.clientY });
  const clear = () => setCursor(null);

  return (
    <>
      <div className="pointer-events-none relative" style={{ width: w * CELL, height: h * CELL }}>
        {cells.map(([dx, dy], i) => (
          <div
            key={`${dx}-${dy}-${i}`}
            className={cn(
              "pointer-events-auto absolute border transition-[filter]",
              bg,
              cursor && !disabled && "brightness-125",
              disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
            )}
            style={{
              left: dx * CELL,
              top: dy * CELL,
              width: CELL,
              height: CELL,
            }}
            onPointerEnter={update}
            onPointerMove={update}
            onPointerLeave={clear}
            onClick={(e) => {
              e.preventDefault();
              clear();
              if (!disabled) onClick();
            }}
          />
        ))}
        <div
          className={cn(
            "pointer-events-none absolute inset-0 flex items-center justify-center font-mono text-[9px] font-semibold uppercase tracking-widest",
            fg,
          )}
        >
          {abbreviate(label)}
        </div>
      </div>
      {cursor && (
        <div
          ref={tooltipRef}
          className="pointer-events-none fixed z-[60] whitespace-nowrap rounded-sm border border-border/80 bg-popover/95 px-2 py-1 font-mono text-[10px] uppercase tracking-widest shadow-md backdrop-blur"
          style={{ left: cursor.x + 14, top: cursor.y + 14 }}
        >
          <div className={cn("font-semibold", fg)}>{label}</div>
          <div className="text-muted-foreground">
            {tier}
            {sellValue > 0 && ` · ¤${sellValue}`}
          </div>
          <div className="mt-0.5 text-muted-foreground/70">{clickHint}</div>
        </div>
      )}
    </>
  );
}

function abbreviate(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return parts.slice(0, 3).map((p) => p[0]).join("").toUpperCase();
  return name.slice(0, 3).toUpperCase();
}
