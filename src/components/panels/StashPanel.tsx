"use client";

import { forwardRef, useCallback, useMemo, useRef, useState } from "react";
import { useGame } from "@/store/game";
import { ITEMS } from "@/lib/data/items";
import { PanelHeader } from "./PanelHeader";
import { cn } from "@/lib/utils";
import { TIER_COLOR, tierColorFor, tileBgFor } from "@/lib/itemDisplay";
import { categoryIconFor } from "@/lib/itemIcon";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Backpack, Coins, Crosshair, FolderTree, Heart, PackageOpen, PillBottle, Shirt, Zap } from "lucide-react";
import { isConsumable } from "@/lib/engine/raid";
import { isJunk } from "@/store/slices/economy";
import { buildOccupancy, canPlace, shapeFor } from "@/lib/engine/shapes";
import { findFit } from "@/lib/engine/equipment";
import { gridCellAt, isInside, slotUnder } from "@/lib/dnd";
import { useDragDrop } from "@/lib/useDragDrop";
import type { EquipSlot, ItemCategory, Rotation, StashItem } from "@/lib/types";
import { CATEGORY_ICON } from "@/lib/itemIcon";
import { EquippedColumn, SLOT_ORDER, type SlotHover, type SlotRefMap } from "./EquippedColumn";
import { ItemTooltip, Tooltip } from "@/components/ui/Tooltip";
import { KitDragGhost, KitGrid, KIT_CELL, type KitHover } from "./KitGrid";
import type { KitSlot } from "@/store/game";
import { playSfx } from "@/lib/sfx";

export function StashPanel() {
  const stash = useGame((s) => s.stash);
  const cap = useGame((s) => s.hideout.modules.stash.capacity ?? 0);
  const operative = useGame((s) => s.operative);
  const equipment = operative.equipment;
  const inRaid = useGame((s) => !!s.currentRaid);
  const sellItem = useGame((s) => s.sellItem);
  const sellAllJunk = useGame((s) => s.sellAllJunk);
  const kitFromStash = useGame((s) => s.kitFromStash);
  const stashFromKit = useGame((s) => s.stashFromKit);
  const moveKitItem = useGame((s) => s.moveKitItem);
  const equipFromStash = useGame((s) => s.equipFromStash);
  const unequipToStash = useGame((s) => s.unequipToStash);
  const emptyKit = useGame((s) => s.emptyKitToStash);
  const consumeOnOperative = useGame((s) => s.useConsumableOnOperative);

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
  // Stash display prefs. State only — not persisted; defaults are fine on
  // reload. Default Date desc is what most players expect ("show me what
  // I just got"). Group toggles a category-banded layout.
  const [sortMode, setSortMode] = useState<"date" | "value">("value");
  const [grouped, setGrouped] = useState(true);

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
  const vitalsRef = useRef<HTMLDivElement>(null);
  const [overVitals, setOverVitals] = useState(false);

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
    // Vitals zone is a separate target. It's only meaningful for stash/kit
    // drags whose item is a consumable; we still set the flag for any drag
    // (the visual feedback cares about consumable-ness, not the flag itself).
    setOverVitals(isInside(vitalsRef.current, e.clientX, e.clientY));
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
    const onVitals = isInside(vitalsRef.current, e.clientX, e.clientY);

    // Vitals drop-zone takes priority for consumables. Falls through to the
    // normal drop handling otherwise so dragging a non-consumable over the
    // strip behaves like any other miss.
    if (onVitals && (d.kind === "stash" || d.kind === "kit") && isConsumable(d.itemId)) {
      if (consumeOnOperative(d.uid)) {
        playSfx("inventory");
      }
      setDrag(null);
      setSlotHover(null);
      setKitHover(null);
      setOverStash(false);
      setOverVitals(false);
      return;
    }

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
    setOverVitals(false);
  }, [equipment, equipFromStash, unequipToStash, kitFromStash, stashFromKit, moveKitItem, consumeOnOperative, slotRefs]);

  useDragDrop(drag, { onMove, onUp });

  const [confirmSellJunk, setConfirmSellJunk] = useState(false);
  const [hoveringSellJunk, setHoveringSellJunk] = useState(false);
  const junkItems = useMemo(
    () => stash.filter((si) => isJunk(ITEMS[si.itemId])),
    [stash],
  );
  const junkUidSet = useMemo(() => new Set(junkItems.map((i) => i.uid)), [junkItems]);
  const junkValue = junkItems.reduce(
    (sum, si) => sum + (ITEMS[si.itemId]?.sellValue ?? 0),
    0,
  );
  const junkCount = junkItems.length;

  const stashFull = stash.length >= cap;
  const kitItemCount =
    equipment.pockets.items.length + (equipment.bag?.items.length ?? 0);
  const canEmptyAll = !inRaid && kitItemCount > 0;

  const sortedStash = useMemo(() => {
    const sorter =
      sortMode === "value"
        ? (a: StashItem, b: StashItem) =>
            (ITEMS[b.itemId]?.sellValue ?? 0) - (ITEMS[a.itemId]?.sellValue ?? 0)
        : (a: StashItem, b: StashItem) => (b.acquiredAt ?? 0) - (a.acquiredAt ?? 0);
    return [...stash].sort(sorter);
  }, [stash, sortMode]);

  // Group sections — when grouped is false, return a single unlabeled section
  // so the renderer can iterate over the same shape.
  const sections = useMemo(() => {
    if (!grouped) {
      return [{ category: null as ItemCategory | null, items: sortedStash }];
    }
    const map = new Map<ItemCategory, StashItem[]>();
    for (const si of sortedStash) {
      const cat = ITEMS[si.itemId]?.category;
      if (!cat) continue;
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(si);
    }
    const out: Array<{ category: ItemCategory | null; items: StashItem[] }> = [];
    for (const cat of CATEGORY_ORDER) {
      const items = map.get(cat);
      if (items && items.length > 0) out.push({ category: cat, items });
    }
    return out;
  }, [sortedStash, grouped]);

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <PanelHeader
        title="Stash"
        subtitle={`${stash.length} of ${cap} slots used${inRaid ? " · operative deployed" : ""}`}
        right={
          junkValue > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmSellJunk(true)}
              onMouseEnter={() => setHoveringSellJunk(true)}
              onMouseLeave={() => setHoveringSellJunk(false)}
              className="rounded-sm"
            >
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

        {/* Stash list + vitals strip */}
        <div className="flex min-h-0 flex-1 flex-col">
          {!inRaid && (
            <VitalsStrip
              ref={vitalsRef}
              health={operative.health}
              energy={operative.energy}
              ammo={operative.ammo}
              dragging={!!drag}
              draggingConsumable={
                !!drag &&
                (drag.kind === "stash" || drag.kind === "kit") &&
                isConsumable(drag.itemId)
              }
              over={overVitals}
            />
          )}
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
            <div className="space-y-3">
              <StashToolbar
                sortMode={sortMode}
                grouped={grouped}
                onSortChange={setSortMode}
                onGroupedToggle={() => setGrouped((g) => !g)}
              />
              {sections.map((section) => (
                <div key={section.category ?? "_all"} className="space-y-1">
                  {section.category && (
                    <div className="flex items-center gap-1.5 border-b border-border/40 pb-1">
                      {(() => {
                        const Icon = CATEGORY_ICON[section.category];
                        return <Icon className="size-3 text-muted-foreground" />;
                      })()}
                      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        {section.category}
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground/60">
                        {section.items.length}
                      </span>
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-1 md:grid-cols-2 lg:grid-cols-3">
                    {section.items.map((si) => {
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
                              "group flex items-center justify-between gap-2 rounded-sm border border-border/60 bg-card/40 px-3 py-2 transition-opacity",
                              !inRaid && "cursor-grab active:cursor-grabbing",
                              ctrlClickAction && "hover:border-emerald-500/40",
                              beingDragged && "opacity-30",
                              hoveringSellJunk && !junkUidSet.has(si.uid) && "opacity-25",
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
                </div>
              ))}
            </div>
          )}
        </div>
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
      {confirmSellJunk && (
        <ConfirmSellJunkDialog
          items={junkItems}
          count={junkCount}
          value={junkValue}
          onCancel={() => setConfirmSellJunk(false)}
          onConfirm={() => {
            sellAllJunk();
            setConfirmSellJunk(false);
          }}
        />
      )}
    </section>
  );
}

function ConfirmSellJunkDialog({
  items,
  count,
  value,
  onCancel,
  onConfirm,
}: {
  items: StashItem[];
  count: number;
  value: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  // Collapse items by itemId so duplicates show as "Scrap Metal ×4 ¤60".
  const grouped = useMemo(() => {
    const map = new Map<string, { itemId: string; count: number; total: number }>();
    for (const si of items) {
      const def = ITEMS[si.itemId];
      const cur = map.get(si.itemId) ?? { itemId: si.itemId, count: 0, total: 0 };
      cur.count += 1;
      cur.total += def?.sellValue ?? 0;
      map.set(si.itemId, cur);
    }
    // Sort by total desc so the biggest payouts surface first.
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [items]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="flex max-h-[80vh] w-[min(480px,92%)] flex-col rounded-md border border-border/60 bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border/60 bg-muted/20 px-5 py-3">
          <Coins className="size-4 text-amber-300" />
          <span className="font-mono text-[11px] uppercase tracking-widest text-foreground/90">
            Sell junk
          </span>
        </div>
        <div className="space-y-2 px-5 py-4 text-sm text-foreground/90">
          <p>
            Sell <span className="font-mono tabular-nums">{count}</span>{" "}
            {count === 1 ? "item" : "items"} for{" "}
            <span className="font-mono tabular-nums text-emerald-300">
              ¤{value.toLocaleString()}
            </span>
            ?
          </p>
          <p className="text-xs text-muted-foreground">
            Skips equippables and consumables.
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto border-y border-border/60 bg-muted/5 px-5 py-3">
          <ul className="space-y-0.5">
            {grouped.map((g) => {
              const def = ITEMS[g.itemId];
              const tier = def?.tier ?? "common";
              const name = def?.name ?? g.itemId;
              return (
                <li key={g.itemId} className="flex items-center justify-between gap-2 text-sm">
                  <span className={cn("flex min-w-0 items-center gap-1.5 truncate", TIER_COLOR[tier])}>
                    <span className="truncate font-medium">{name}</span>
                    {g.count > 1 && (
                      <span className="font-mono text-[10px] text-muted-foreground">×{g.count}</span>
                    )}
                  </span>
                  <span className="font-mono text-[11px] text-emerald-300/90 tabular-nums">
                    ¤{g.total.toLocaleString()}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3">
          <Button variant="ghost" size="sm" onClick={onCancel} className="rounded-sm">
            Cancel
          </Button>
          <Button size="sm" onClick={onConfirm} className="rounded-sm">
            <Coins className="size-3.5" />
            Sell ¤{value.toLocaleString()}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Display order for category bands when grouping is on. Roughly: equippables
// first (military / bag / mechanical / electronics), consumables second,
// valuables / intel last. Keeps "stuff to use" near the top.
const CATEGORY_ORDER: ItemCategory[] = [
  "military",
  "bag",
  "mechanical",
  "electronics",
  "medical",
  "consumables",
  "experimental",
  "intel",
  "valuables",
];

function StashToolbar({
  sortMode,
  grouped,
  onSortChange,
  onGroupedToggle,
}: {
  sortMode: "date" | "value";
  grouped: boolean;
  onSortChange: (m: "date" | "value") => void;
  onGroupedToggle: () => void;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-border/40 pb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
      <span>Sort</span>
      <div className="inline-flex overflow-hidden rounded-sm border border-border/60">
        <ToolbarToggle active={sortMode === "value"} onClick={() => onSortChange("value")}>
          Value
        </ToolbarToggle>
        <ToolbarToggle active={sortMode === "date"} onClick={() => onSortChange("date")}>
          Date
        </ToolbarToggle>
      </div>
      <button
        onClick={onGroupedToggle}
        className={cn(
          "inline-flex cursor-pointer items-center gap-1.5 rounded-sm border px-2 py-1 font-sans normal-case tracking-normal transition",
          grouped
            ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-200"
            : "border-border/60 hover:border-border hover:text-foreground",
        )}
      >
        <FolderTree className="size-3" />
        Group by category
      </button>
    </div>
  );
}

function ToolbarToggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "cursor-pointer px-2 py-1 font-sans normal-case tracking-normal transition",
        active
          ? "bg-emerald-500/10 text-emerald-200"
          : "hover:bg-muted/40 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

// Vitals strip — shown above the stash list when not in raid. Three bars
// (HP / Energy / Ammo) plus a use-drop zone. Drag a consumable from
// stash/pockets/bag onto the zone to apply it via useConsumableOnOperative.
// Uses forwardRef so the parent can attach its drop-detection ref.
const VitalsStrip = forwardRef<HTMLDivElement, {
  health: number;
  energy: number;
  ammo: number;
  dragging: boolean;
  draggingConsumable: boolean;
  over: boolean;
}>(function VitalsStrip(
  { health, energy, ammo, dragging, draggingConsumable, over },
  ref,
) {
  const dropActive = dragging && draggingConsumable;
  const dropHover = over && draggingConsumable;
  const dropBad = over && dragging && !draggingConsumable;
  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center gap-3 border-b border-border/60 bg-card/30 px-6 py-2 transition-colors",
        dropHover && "bg-emerald-500/10",
        dropBad && "bg-red-500/5",
      )}
    >
      <VitalsBar
        label="HP"
        value={health}
        max={100}
        icon={<Heart className="size-3 text-red-300" />}
        color="bg-red-500/70"
      />
      <VitalsBar
        label="Energy"
        value={energy}
        max={100}
        icon={<Zap className="size-3 text-yellow-300" />}
        color="bg-yellow-500/70"
      />
      <div className="flex shrink-0 items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
        <Crosshair className="size-3" />
        <span className="uppercase tracking-widest">Ammo</span>
        <span className="text-foreground tabular-nums">{ammo}</span>
      </div>
      <div
        className={cn(
          "ml-auto inline-flex items-center gap-1.5 rounded-sm border border-dashed px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest transition-colors",
          dropHover
            ? "border-emerald-500/70 bg-emerald-500/15 text-emerald-200"
            : dropBad
              ? "border-red-500/50 bg-red-500/10 text-red-300"
              : dropActive
                ? "border-emerald-500/40 text-emerald-300"
                : "border-border/50 text-muted-foreground/70",
        )}
      >
        <PillBottle className="size-3" />
        {dropBad ? "Not consumable" : "Drag consumable to use"}
      </div>
    </div>
  );
});

function VitalsBar({
  label,
  value,
  max,
  icon,
  color,
}: {
  label: string;
  value: number;
  max: number;
  icon: React.ReactNode;
  color: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      {icon}
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <div className="relative h-1.5 w-24 overflow-hidden rounded-sm bg-muted/40">
        <div
          className={cn("absolute inset-y-0 left-0 transition-all", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-[11px] text-foreground tabular-nums">{value}</span>
    </div>
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

