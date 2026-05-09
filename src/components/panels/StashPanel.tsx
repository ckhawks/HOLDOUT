"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useGame } from "@/store/game";
import { ITEMS } from "@/lib/data/items";
import { PanelHeader } from "./PanelHeader";
import { cn } from "@/lib/utils";
import { TIER_COLOR, tierColorFor, tileBgFor } from "@/lib/itemDisplay";
import { categoryIconFor } from "@/lib/itemIcon";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Backpack, Coins, PackageOpen, Shirt } from "lucide-react";
import { buildOccupancy, canPlace, shapeFor } from "@/lib/engine/shapes";
import { findFit } from "@/lib/engine/equipment";
import { gridCellAt, isInside, slotUnder } from "@/lib/dnd";
import { useDragDrop } from "@/lib/useDragDrop";
import type { EquipSlot, Rotation } from "@/lib/types";
import { EquippedColumn, SLOT_ORDER, type SlotHover, type SlotRefMap } from "./EquippedColumn";
import { ItemTooltip, Tooltip } from "@/components/ui/Tooltip";
import { KitDragGhost, KitGrid, KIT_CELL, type KitHover } from "./KitGrid";
import type { KitSlot } from "@/store/game";
import { playSfx } from "@/lib/sfx";

export function StashPanel() {
  const stash = useGame((s) => s.stash);
  const cap = useGame((s) => s.hideout.modules.stash.capacity ?? 0);
  const equipment = useGame((s) => s.operative.equipment);
  const inRaid = useGame((s) => !!s.currentRaid);
  const sellItem = useGame((s) => s.sellItem);
  const sellAllJunk = useGame((s) => s.sellAllJunk);
  const kitFromStash = useGame((s) => s.kitFromStash);
  const stashFromKit = useGame((s) => s.stashFromKit);
  const moveKitItem = useGame((s) => s.moveKitItem);
  const trashFromKit = useGame((s) => s.trashFromKit);
  const equipFromStash = useGame((s) => s.equipFromStash);
  const unequipToStash = useGame((s) => s.unequipToStash);
  const emptyKit = useGame((s) => s.emptyKitToStash);

  // Drag state covering all stash-side interactions:
  //  - stash row → equipped slot / kit grid
  //  - equipped slot → stash list
  //  - kit item → other kit slot (rearrange) / stash list
  type DragSource =
    | { kind: "stash"; uid: string; itemId: string }
    | { kind: "slot"; slot: EquipSlot; itemId: string }
    | {
        kind: "kit";
        from: KitSlot;
        uid: string;
        itemId: string;
        rotation: Rotation;
        grabDx: number;
        grabDy: number;
      };
  const [drag, setDrag] = useState<(DragSource & { mouseX: number; mouseY: number }) | null>(null);
  const [slotHover, setSlotHover] = useState<SlotHover>(null);
  const [kitHover, setKitHover] = useState<{ slot: KitSlot } & KitHover | null>(null);
  const [overStash, setOverStash] = useState(false);

  // Refs declared at the top level so the hook count is stable across
  // renders and HMR. Bundling them into an object literal calling useRef()
  // inline can confuse React fast-refresh under some edit sequences.
  const helmetRef = useRef<HTMLDivElement>(null);
  const armorRef = useRef<HTMLDivElement>(null);
  const weaponRef = useRef<HTMLDivElement>(null);
  const bagSlotRef = useRef<HTMLDivElement>(null);
  const slotRefs = useMemo<SlotRefMap>(
    () => ({ helmet: helmetRef, armor: armorRef, weapon: weaponRef, bag: bagSlotRef }),
    [],
  );
  const stashListRef = useRef<HTMLDivElement>(null);
  const pocketsRef = useRef<HTMLDivElement>(null);
  const bagRef = useRef<HTMLDivElement>(null);

  type Drag = NonNullable<typeof drag>;

  const onMove = useCallback((e: PointerEvent, d: Drag) => {
    const slotIsValidTarget = (s: EquipSlot): boolean => {
      if (d.kind === "stash") {
        const def = ITEMS[d.itemId];
        if (def?.slot !== s) return false;
        if (s === "bag") return !equipment.bag;
        return !equipment[s];
      }
      return s === (d.kind === "slot" ? d.slot : null);
    };
    const evalKitDrop = (target: KitSlot, ox: number, oy: number): boolean => {
      const grid = target === "pockets" ? equipment.pockets : equipment.bag;
      if (!grid) return false;
      const itemId = d.kind === "stash" || d.kind === "kit" ? d.itemId : null;
      if (!itemId) return false;
      const rotation = d.kind === "kit" ? d.rotation : 0;
      const cells = shapeFor(itemId, rotation);
      const ignoreUid = d.kind === "kit" && d.from === target ? d.uid : undefined;
      const occ = buildOccupancy(grid.items, grid.grid.width, grid.grid.height, ignoreUid);
      return canPlace(cells, ox, oy, grid.grid.width, grid.grid.height, occ);
    };

    const s = slotUnder(slotRefs, SLOT_ORDER, e.clientX, e.clientY);
    if (s) {
      setSlotHover({ slot: s, valid: slotIsValidTarget(s) });
      setKitHover(null);
      setOverStash(false);
    } else {
      setSlotHover(null);
      const dragHasShape = d.kind === "stash" || d.kind === "kit";
      const grabDx = d.kind === "kit" ? d.grabDx : 0;
      const grabDy = d.kind === "kit" ? d.grabDy : 0;
      const pCell = dragHasShape ? gridCellAt(pocketsRef.current, KIT_CELL, e.clientX, e.clientY) : null;
      const bCell = !pCell && dragHasShape && equipment.bag
        ? gridCellAt(bagRef.current, KIT_CELL, e.clientX, e.clientY)
        : null;
      if (pCell) {
        const ox = pCell.x - grabDx;
        const oy = pCell.y - grabDy;
        setKitHover({ slot: "pockets", x: ox, y: oy, valid: evalKitDrop("pockets", ox, oy) });
        setOverStash(false);
      } else if (bCell) {
        const ox = bCell.x - grabDx;
        const oy = bCell.y - grabDy;
        setKitHover({ slot: "bag", x: ox, y: oy, valid: evalKitDrop("bag", ox, oy) });
        setOverStash(false);
      } else {
        setKitHover(null);
        setOverStash(isInside(stashListRef.current, e.clientX, e.clientY));
      }
    }
    setDrag((cur) => (cur ? { ...cur, mouseX: e.clientX, mouseY: e.clientY } : cur));
  }, [equipment, slotRefs]);

  const onUp = useCallback((e: PointerEvent, d: Drag) => {
    let played = false;
    const s = slotUnder(slotRefs, SLOT_ORDER, e.clientX, e.clientY);
    const grabDx = d.kind === "kit" ? d.grabDx : 0;
    const grabDy = d.kind === "kit" ? d.grabDy : 0;
    const pCell = gridCellAt(pocketsRef.current, KIT_CELL, e.clientX, e.clientY);
    const bCell = !pCell && equipment.bag
      ? gridCellAt(bagRef.current, KIT_CELL, e.clientX, e.clientY)
      : null;
    const kitTarget: KitSlot | null = pCell ? "pockets" : bCell ? "bag" : null;
    const cell = pCell ?? bCell;
    const onStashList = isInside(stashListRef.current, e.clientX, e.clientY);

    if (d.kind === "slot") {
      if (!s) {
        if (unequipToStash(d.slot)) played = true;
      }
    } else if (d.kind === "stash") {
      if (s) {
        if (equipFromStash(d.uid)) played = true;
      } else if (kitTarget && cell) {
        if (kitFromStash(d.uid, kitTarget, cell.x - grabDx, cell.y - grabDy, 0)) {
          played = true;
        }
      }
    } else if (d.kind === "kit") {
      if (s) {
        // kit → slot: no-op
      } else if (kitTarget && cell) {
        if (moveKitItem(d.uid, kitTarget, cell.x - grabDx, cell.y - grabDy, d.rotation)) {
          played = true;
        }
      } else if (onStashList) {
        if (stashFromKit(d.uid)) played = true;
      }
    }
    if (played) playSfx("inventory");
    setDrag(null);
    setSlotHover(null);
    setKitHover(null);
    setOverStash(false);
  }, [equipment, equipFromStash, unequipToStash, kitFromStash, stashFromKit, moveKitItem, slotRefs]);

  useDragDrop(drag, { onMove, onUp });

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
        {/* Equipped column (far left) — only meaningful when idle */}
        {!inRaid && (
          <aside className="flex shrink-0 flex-col border-r border-border/60 bg-card/20 px-3 py-4">
            <EquippedColumn
              equipment={equipment}
              refs={slotRefs}
              hover={slotHover}
              draggingForSlot={
                drag?.kind === "stash" ? (ITEMS[drag.itemId]?.slot ?? null) : null
              }
              onSlotPointerDown={(slot, e) => {
                const item = slot === "bag" ? equipment.bag?.slot : equipment[slot];
                if (!item) return;
                // Ctrl/Cmd+click on an equipped slot fast-unequips back to stash.
                if (e.ctrlKey || e.metaKey) {
                  if (unequipToStash(slot)) playSfx("inventory");
                  return;
                }
                setDrag({
                  kind: "slot",
                  slot,
                  itemId: item.itemId,
                  mouseX: e.clientX,
                  mouseY: e.clientY,
                });
              }}
            />
          </aside>
        )}
        {/* Kit sidebar — only meaningful when idle */}
        {!inRaid && (
          <aside className="flex w-80 shrink-0 flex-col gap-3 overflow-y-auto border-r border-border/60 bg-card/20 px-4 py-4">
            <KitGrid
              slot="pockets"
              label="Pockets"
              Icon={Shirt}
              grid={equipment.pockets}
              gridRef={pocketsRef}
              drag={
                drag && (drag.kind === "kit" || drag.kind === "stash")
                  ? {
                      uid: drag.kind === "kit" ? drag.uid : drag.uid,
                      itemId: drag.itemId,
                      rotation: drag.kind === "kit" ? drag.rotation : 0,
                    }
                  : null
              }
              draggingFromThisGrid={drag?.kind === "kit" && drag.from === "pockets"}
              hover={kitHover && kitHover.slot === "pockets" ? { x: kitHover.x, y: kitHover.y, valid: kitHover.valid } : null}
              onPick={(uid, itemId, rotation, dx, dy, mouseX, mouseY) =>
                setDrag({
                  kind: "kit",
                  from: "pockets",
                  uid,
                  itemId,
                  rotation,
                  grabDx: dx,
                  grabDy: dy,
                  mouseX,
                  mouseY,
                })
              }
              onCtrlClick={(uid) => {
                if (stashFromKit(uid)) playSfx("inventory");
              }}
            />
            {equipment.bag ? (
              <KitGrid
                slot="bag"
                label={`Bag · ${ITEMS[equipment.bag.slot.itemId]?.name ?? "Bag"}`}
                Icon={Backpack}
                grid={equipment.bag}
                gridRef={bagRef}
                drag={
                  drag && (drag.kind === "kit" || drag.kind === "stash")
                    ? {
                        uid: drag.kind === "kit" ? drag.uid : drag.uid,
                        itemId: drag.itemId,
                        rotation: drag.kind === "kit" ? drag.rotation : 0,
                      }
                    : null
                }
                draggingFromThisGrid={drag?.kind === "kit" && drag.from === "bag"}
                hover={kitHover && kitHover.slot === "bag" ? { x: kitHover.x, y: kitHover.y, valid: kitHover.valid } : null}
                onPick={(uid, itemId, rotation, dx, dy, mouseX, mouseY) =>
                  setDrag({
                    kind: "kit",
                    from: "bag",
                    uid,
                    itemId,
                    rotation,
                    grabDx: dx,
                    grabDy: dy,
                    mouseX,
                    mouseY,
                  })
                }
                onCtrlClick={(uid) => {
                  if (stashFromKit(uid)) playSfx("inventory");
                }}
              />
            ) : (
              <div className="rounded-sm border border-dashed border-border/40 p-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
                <Backpack className="mr-2 inline size-3" />
                no bag equipped · drag from stash
              </div>
            )}
            <Tooltip
              text={
                !canEmptyAll
                  ? "Nothing to empty"
                  : stashFull
                    ? "Stash full — some items may not transfer"
                    : "Move all kit items to stash"
              }
            >
              <Button
                variant="outline"
                size="sm"
                onClick={() => emptyKit()}
                disabled={!canEmptyAll}
                className="rounded-sm"
              >
                <PackageOpen className="size-3.5" />
                Empty kit
              </Button>
            </Tooltip>
          </aside>
        )}

        {/* Stash list */}
        <div
          ref={stashListRef}
          className={cn(
            "min-h-0 flex-1 overflow-y-auto px-6 py-4 text-sm transition-colors",
            overStash && drag?.kind === "slot" && "bg-emerald-500/5",
          )}
        >
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
                const equippable = item.slot != null;
                const equippableNow =
                  !inRaid && equippable && (
                    item.slot === "bag" ? !equipment.bag : !equipment[item.slot!]
                  );
                const fit = !inRaid && !equippable ? findFit(equipment, si) : null;
                const ctrlClickAction = equippableNow
                  ? () => equipFromStash(si.uid)
                  : fit
                    ? () => kitFromStash(si.uid, fit.slot, fit.x, fit.y, fit.rotation)
                    : null;
                const ctrlHint = equippableNow
                  ? `Ctrl+click to equip · drag to ${item.slot} slot`
                  : fit
                    ? `Ctrl+click to move into kit`
                    : "";
                const beingDragged = drag?.kind === "stash" && drag.uid === si.uid;
                const Icon = categoryIconFor(si.itemId);
                return (
                  <ItemTooltip key={si.uid} itemId={si.itemId} hint={ctrlHint || undefined}>
                    <div
                      onPointerDown={(e) => {
                        if (inRaid) return;
                        if ((e.target as HTMLElement).closest("button")) return;
                        e.preventDefault();
                        setDrag({
                          kind: "stash",
                          uid: si.uid,
                          itemId: si.itemId,
                          mouseX: e.clientX,
                          mouseY: e.clientY,
                        });
                      }}
                      onClick={(e) => {
                        if ((e.ctrlKey || e.metaKey) && ctrlClickAction) {
                          e.preventDefault();
                          e.stopPropagation();
                          ctrlClickAction();
                          playSfx("inventory");
                        }
                      }}
                      className={cn(
                        "group flex items-center justify-between gap-2 rounded-sm border border-border/60 bg-card/40 px-3 py-2",
                        !inRaid && "cursor-grab active:cursor-grabbing",
                        ctrlClickAction && "hover:border-emerald-500/40",
                        beingDragged && "opacity-30",
                      )}
                    >
                      <span className={cn("flex min-w-0 items-center gap-1.5 text-sm font-semibold", TIER_COLOR[item.tier])}>
                        {Icon && <Icon className="size-3.5 shrink-0 opacity-80" />}
                        <span className="truncate">{item.name}</span>
                      </span>
                      <div className="flex shrink-0 items-center gap-1">
                        <span className="font-mono text-xs text-muted-foreground tabular-nums">
                          ¤{item.sellValue}
                        </span>
                        {fit && (
                          <Tooltip text={`Move to ${fit.slot}`}>
                            <button
                              onClick={() =>
                                kitFromStash(si.uid, fit.slot, fit.x, fit.y, fit.rotation)
                              }
                              className="inline-flex cursor-pointer items-center gap-0.5 rounded-sm border border-transparent px-2 py-0.5 text-xs text-muted-foreground transition hover:border-border hover:text-foreground"
                            >
                              <ArrowLeft className="size-3" />
                              kit
                            </button>
                          </Tooltip>
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
                  </ItemTooltip>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {drag &&
        (drag.kind === "kit" ? (
          <KitDragGhost
            itemId={drag.itemId}
            rotation={drag.rotation}
            mouseX={drag.mouseX}
            mouseY={drag.mouseY}
            grabDx={drag.grabDx}
            grabDy={drag.grabDy}
          />
        ) : (
          <StashDragGhost itemId={drag.itemId} mouseX={drag.mouseX} mouseY={drag.mouseY} />
        ))}
    </section>
  );
}

function StashDragGhost({
  itemId,
  mouseX,
  mouseY,
}: {
  itemId: string;
  mouseX: number;
  mouseY: number;
}) {
  const item = ITEMS[itemId];
  const fg = tierColorFor(itemId);
  const bg = tileBgFor(itemId);
  const label = item?.name ?? itemId;
  return (
    <div
      className="pointer-events-none fixed z-50 opacity-90"
      style={{ left: mouseX + 12, top: mouseY + 12 }}
    >
      <div
        className={cn(
          "flex items-center gap-2 rounded-sm border border-border/80 px-2 py-1 shadow-md backdrop-blur",
          bg,
        )}
      >
        <span className={cn("font-mono text-[10px] font-semibold uppercase tracking-widest", fg)}>
          {label}
        </span>
      </div>
    </div>
  );
}

