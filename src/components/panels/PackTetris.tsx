"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Backpack, Pill, Shirt } from "lucide-react";
import { useGame, type KitSlot } from "@/store/game";
import { CONSUMABLE_EFFECTS } from "@/lib/engine/raid";
import type { EquipSlot, PocketsState, BagState, Rotation } from "@/lib/types";
import { EquippedColumn, SLOT_ORDER, type SlotHover, type SlotRefMap } from "./EquippedColumn";
import { KitDragGhost, KitGrid, KIT_CELL } from "./KitGrid";
import { ItemTooltip } from "@/components/ui/Tooltip";
import { gridCellAt, isInside, slotUnder } from "@/lib/dnd";
import { useDragDrop } from "@/lib/useDragDrop";
import { ITEMS } from "@/lib/data/items";
import { playSfx } from "@/lib/sfx";
import {
  buildOccupancy,
  canPlace,
  shapeBounds,
  shapeFor,
} from "@/lib/engine/shapes";
import { cn } from "@/lib/utils";
import { abbreviate, tierColorFor, tileBgFor } from "@/lib/itemDisplay";
import { categoryIconFor } from "@/lib/itemIcon";

const CELL = KIT_CELL;

// "bag" = the kit bag grid; "slot:bag"/"slot:weapon" etc. = the equipped slots.
type DragSource = "floor" | "pockets" | "bag" | `slot:${EquipSlot}`;

type DragState = {
  source: DragSource;
  uid: string;
  itemId: string;
  rotation: Rotation;
  grabDx: number;
  grabDy: number;
  mouseX: number;
  mouseY: number;
};

type HoverState =
  | { slot: KitSlot; x: number; y: number; valid: boolean }
  | null;

export function PackTetris() {
  const raid = useGame((s) => s.currentRaid);
  const pickupFromFloor = useGame((s) => s.pickupFromFloor);
  const moveKitItem = useGame((s) => s.moveKitItem);
  const dropToFloor = useGame((s) => s.dropToFloor);
  const equipFromFloor = useGame((s) => s.equipFromFloor);
  const unequipToFloor = useGame((s) => s.unequipToFloor);
  // Aliased away from `useConsumable` — the `use` prefix would trigger
  // react-hooks/rules-of-hooks if called inside a callback.
  const consume = useGame((s) => s.useConsumable);

  const pocketsRef = useRef<HTMLDivElement>(null);
  const bagRef = useRef<HTMLDivElement>(null);
  const consumeZoneRef = useRef<HTMLDivElement>(null);
  const floorRef = useRef<HTMLDivElement>(null);
  // Stable refs (declared individually) so the hook count never changes
  // across renders / HMR — bundling useRef() into an object literal can
  // confuse fast-refresh.
  const helmetRef = useRef<HTMLDivElement>(null);
  const armorRef = useRef<HTMLDivElement>(null);
  const weaponRef = useRef<HTMLDivElement>(null);
  const bagSlotRef = useRef<HTMLDivElement>(null);
  const slotRefs = useMemo<SlotRefMap>(
    () => ({ helmet: helmetRef, armor: armorRef, weapon: weaponRef, bag: bagSlotRef }),
    [],
  );
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hover, setHover] = useState<HoverState>(null);
  const [slotHover, setSlotHover] = useState<SlotHover>(null);

  // Ctrl/Cmd+click fast-move on a floor item:
  //  - If equippable (item has `slot`) and that slot is empty → equip directly.
  //  - Otherwise → first-fit pickup into pockets, then bag.
  const ctrlPickup = (uid: string, itemId: string) => {
    if (!raid) return;
    const def = ITEMS[itemId];
    if (def?.slot) {
      const slotEmpty = def.slot === "bag" ? !raid.equipment.bag : !raid.equipment[def.slot];
      if (slotEmpty) {
        if (equipFromFloor(uid)) {
          playSfx("inventory");
          return;
        }
      }
    }
    const tryGrid = (grid: PocketsState | BagState | null, slot: KitSlot): boolean => {
      if (!grid) return false;
      for (let r = 0; r < 4; r++) {
        const cells = shapeFor(itemId, r as Rotation);
        const occ = buildOccupancy(grid.items, grid.grid.width, grid.grid.height);
        for (let y = 0; y < grid.grid.height; y++) {
          for (let x = 0; x < grid.grid.width; x++) {
            if (canPlace(cells, x, y, grid.grid.width, grid.grid.height, occ)) {
              if (pickupFromFloor(uid, slot, x, y, r as Rotation)) {
                playSfx("inventory");
                return true;
              }
            }
          }
        }
      }
      return false;
    };
    if (tryGrid(raid.equipment.pockets, "pockets")) return;
    tryGrid(raid.equipment.bag, "bag");
  };

  const currentTile = raid
    ? raid.map.tiles[raid.operativePos.y * raid.map.width + raid.operativePos.x]
    : undefined;
  const roomContents = currentTile?.contents ?? [];
  const pockets = raid?.equipment.pockets;
  const bag = raid?.equipment.bag;

  const onMove = useCallback((e: PointerEvent, d: DragState) => {
    if (!raid) return;
    const evalDrop = (slot: KitSlot, eq: PocketsState | BagState, ox: number, oy: number): boolean => {
      const cells = shapeFor(d.itemId, d.rotation);
      const ignoreUid =
        (d.source === "pockets" && slot === "pockets") ||
        (d.source === "bag" && slot === "bag")
          ? d.uid
          : undefined;
      const occ = buildOccupancy(eq.items, eq.grid.width, eq.grid.height, ignoreUid);
      return canPlace(cells, ox, oy, eq.grid.width, eq.grid.height, occ);
    };
    const slotIsValidTarget = (s: EquipSlot): boolean => {
      if (d.source === "floor") {
        const def = ITEMS[d.itemId];
        if (def?.slot !== s) return false;
        if (s === "bag") return !raid.equipment.bag;
        return !raid.equipment[s];
      }
      if (d.source === `slot:${s}`) return true;
      return false;
    };
    let h: HoverState = null;
    let sh: SlotHover = null;
    const sUnder = slotUnder(slotRefs, SLOT_ORDER, e.clientX, e.clientY);
    if (sUnder) {
      sh = { slot: sUnder, valid: slotIsValidTarget(sUnder) };
    } else {
      const pCell = pockets ? gridCellAt(pocketsRef.current, KIT_CELL, e.clientX, e.clientY) : null;
      if (pCell && pockets) {
        const ox = pCell.x - d.grabDx;
        const oy = pCell.y - d.grabDy;
        h = { slot: "pockets", x: ox, y: oy, valid: evalDrop("pockets", pockets, ox, oy) };
      } else if (bag) {
        const bCell = gridCellAt(bagRef.current, KIT_CELL, e.clientX, e.clientY);
        if (bCell) {
          const ox = bCell.x - d.grabDx;
          const oy = bCell.y - d.grabDy;
          h = { slot: "bag", x: ox, y: oy, valid: evalDrop("bag", bag, ox, oy) };
        }
      }
    }
    setHover(h);
    setSlotHover(sh);
    setDrag((cur) => (cur ? { ...cur, mouseX: e.clientX, mouseY: e.clientY } : cur));
  }, [raid, pockets, bag, slotRefs]);

  const onUp = useCallback((e: PointerEvent, d: DragState) => {
    let played = false;
    const sUnder = slotUnder(slotRefs, SLOT_ORDER, e.clientX, e.clientY);
    if (sUnder) {
      if (d.source === "floor") {
        if (equipFromFloor(d.uid)) played = true;
      }
    } else if (isInside(consumeZoneRef.current, e.clientX, e.clientY)) {
      // Use-zone: only consumables in pockets/bag with a CONSUMABLE_EFFECTS
      // entry. Other items dropped here just fall back to drag-cancel.
      if ((d.source === "pockets" || d.source === "bag") && CONSUMABLE_EFFECTS[d.itemId]) {
        consume(d.uid);
        played = true;
      }
    } else if (isInside(floorRef.current, e.clientX, e.clientY)) {
      if (d.source === "pockets" || d.source === "bag") {
        dropToFloor(d.uid);
        played = true;
      } else if (d.source.startsWith("slot:")) {
        const slot = d.source.slice(5) as EquipSlot;
        if (unequipToFloor(slot)) played = true;
      }
    } else {
      const pCell = pockets ? gridCellAt(pocketsRef.current, KIT_CELL, e.clientX, e.clientY) : null;
      const bCell = !pCell && bag ? gridCellAt(bagRef.current, KIT_CELL, e.clientX, e.clientY) : null;
      const slot: KitSlot | null = pCell ? "pockets" : bCell ? "bag" : null;
      const cell = pCell ?? bCell;
      if (slot && cell && (d.source === "floor" || d.source === "pockets" || d.source === "bag")) {
        const ox = cell.x - d.grabDx;
        const oy = cell.y - d.grabDy;
        const ok =
          d.source === "floor"
            ? pickupFromFloor(d.uid, slot, ox, oy, d.rotation)
            : moveKitItem(d.uid, slot, ox, oy, d.rotation);
        if (ok) played = true;
      }
    }
    if (played) playSfx("inventory");
    setDrag(null);
    setHover(null);
    setSlotHover(null);
  }, [pockets, bag, slotRefs, pickupFromFloor, moveKitItem, dropToFloor, equipFromFloor, unequipToFloor, consume]);

  const rotateInPlace = useCallback(() => {
    setDrag((d) => {
      if (!d) return d;
      const newRot = ((d.rotation + 1) % 4) as Rotation;
      return { ...d, rotation: newRot, grabDx: 0, grabDy: 0 };
    });
  }, []);

  const onKey = useCallback((e: KeyboardEvent) => {
    if (e.key === "r" || e.key === "R") {
      e.preventDefault();
      rotateInPlace();
    }
  }, [rotateInPlace]);

  const onContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();
    rotateInPlace();
  }, [rotateInPlace]);

  useDragDrop(drag, { onMove, onUp, onKey, onContextMenu });

  if (!raid || !pockets) return null;

  const pocketsTotal = pockets.grid.width * pockets.grid.height;
  const pocketsUsed = pockets.items.length;
  const bagTotal = bag ? bag.grid.width * bag.grid.height : 0;
  const bagUsed = bag ? bag.items.length : 0;

  return (
    <aside className="flex shrink-0 flex-col border-l border-border/60">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        <span>Kit</span>
        <span className="tabular-nums text-foreground">
          {pocketsUsed + bagUsed}/{pocketsTotal + bagTotal}
        </span>
      </div>

      <div className="flex flex-1 items-stretch gap-3 px-4 py-3">
        {/* Left rail: room contents + trash */}
        <div className="flex w-40 shrink-0 flex-col gap-3">
          <div className="flex flex-1 flex-col">
            <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Room · {roomContents.length}
            </div>
            <div
              ref={floorRef}
              className={cn(
                "flex flex-1 min-h-72 flex-col items-center gap-2 rounded-sm border border-dashed border-border/60 bg-background/30 p-2 transition-colors",
                drag && drag.source !== "floor" && "border-sky-500/70 bg-sky-950/20",
              )}
            >
              {roomContents.length === 0 && (
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
                  nothing on the floor
                </span>
              )}
              {roomContents.map((p) => {
                const item = ITEMS[p.itemId];
                const beingDragged = drag?.source === "floor" && drag.uid === p.uid;
                return (
                  <FloorTile
                    key={p.uid}
                    itemId={p.itemId}
                    label={item?.name ?? p.itemId}
                    hidden={beingDragged}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      // Ctrl/Cmd+click is the fast move-to-kit shortcut.
                      // Skips drag state and runs the first-fit pickup.
                      if (e.ctrlKey || e.metaKey) {
                        ctrlPickup(p.uid, p.itemId);
                        return;
                      }
                      setDrag({
                        source: "floor",
                        uid: p.uid,
                        itemId: p.itemId,
                        rotation: 0,
                        grabDx: 0,
                        grabDy: 0,
                        mouseX: e.clientX,
                        mouseY: e.clientY,
                      });
                    }}
                  />
                );
              })}
            </div>
          </div>

          <div
            ref={consumeZoneRef}
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-border/60 bg-background/30 py-8 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors",
              // Light up green only when a consumable is being dragged.
              drag && CONSUMABLE_EFFECTS[drag.itemId] && (drag.source === "pockets" || drag.source === "bag") &&
                "border-emerald-500/70 bg-emerald-950/30 text-emerald-300",
            )}
            title="Drag a consumable here to use it"
          >
            <Pill className="size-5" />
            <span>Use</span>
          </div>
        </div>

        {/* Right side: pockets above, bag below */}
        <div className="flex flex-col gap-3">
          <KitGrid
            slot="pockets"
            label="Pockets"
            Icon={Shirt}
            grid={pockets}
            gridRef={pocketsRef}
            drag={drag ? { uid: drag.uid, itemId: drag.itemId, rotation: drag.rotation } : null}
            draggingFromThisGrid={drag?.source === "pockets"}
            hover={hover && hover.slot === "pockets" ? { x: hover.x, y: hover.y, valid: hover.valid } : null}
            onPick={(uid, itemId, rotation, dx, dy, mouseX, mouseY) =>
              setDrag({
                source: "pockets",
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
              dropToFloor(uid);
              playSfx("inventory");
            }}
          />
          {bag ? (
            <KitGrid
              slot="bag"
              label={`Bag · ${ITEMS[bag.slot.itemId]?.name ?? bag.slot.itemId}`}
              Icon={Backpack}
              grid={bag}
              gridRef={bagRef}
              drag={drag ? { uid: drag.uid, itemId: drag.itemId, rotation: drag.rotation } : null}
              draggingFromThisGrid={drag?.source === "bag"}
              hover={hover && hover.slot === "bag" ? { x: hover.x, y: hover.y, valid: hover.valid } : null}
              onPick={(uid, itemId, rotation, dx, dy, mouseX, mouseY) =>
                setDrag({
                  source: "bag",
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
                dropToFloor(uid);
                playSfx("inventory");
              }}
            />
          ) : (
            <div className="rounded-sm border border-dashed border-border/40 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
              <Backpack className="mr-2 inline size-3" />
              no bag equipped
            </div>
          )}
          <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/60">
            drag · R or right-click to rotate
          </div>
        </div>

        {/* Equipped column (far right) */}
        <div className="flex shrink-0 items-start pl-3">
          <EquippedColumn
            equipment={raid.equipment}
            refs={slotRefs}
            hover={slotHover}
            draggingForSlot={
              drag?.source === "floor" ? (ITEMS[drag.itemId]?.slot ?? null) : null
            }
            onSlotPointerDown={(slot, e) => {
              const item = slot === "bag" ? raid.equipment.bag?.slot : raid.equipment[slot];
              if (!item) return;
              // Ctrl/Cmd+click on an equipped slot fast-unequips to floor.
              if (e.ctrlKey || e.metaKey) {
                if (unequipToFloor(slot)) playSfx("inventory");
                return;
              }
              setDrag({
                source: `slot:${slot}`,
                uid: item.uid,
                itemId: item.itemId,
                rotation: 0,
                grabDx: 0,
                grabDy: 0,
                mouseX: e.clientX,
                mouseY: e.clientY,
              });
            }}
          />
        </div>
      </div>

      {drag && (
        <KitDragGhost
          itemId={drag.itemId}
          rotation={drag.rotation}
          mouseX={drag.mouseX}
          mouseY={drag.mouseY}
          grabDx={drag.grabDx}
          grabDy={drag.grabDy}
        />
      )}
    </aside>
  );
}

function FloorTile({
  itemId,
  label,
  onPointerDown,
  hidden,
}: {
  itemId: string;
  label: string;
  onPointerDown: (e: React.PointerEvent) => void;
  hidden?: boolean;
}) {
  const bg = tileBgFor(itemId);
  const fg = tierColorFor(itemId);
  const Icon = categoryIconFor(itemId);
  const cells = shapeFor(itemId, 0);
  const { w, h } = shapeBounds(cells);
  const px = CELL - 2;
  return (
    <ItemTooltip itemId={itemId} hint="Drag to kit · Ctrl+click to fast-pickup">
      <div
        className={cn(
          "group relative cursor-grab rounded-sm border border-border/60 bg-card/40 p-1.5 transition-colors active:cursor-grabbing",
          hidden && "opacity-30",
        )}
        onPointerDown={onPointerDown}
      >
      <div className="relative" style={{ width: w * px, height: h * px }}>
        {cells.map(([dx, dy], i) => {
          const iconSize = Math.min(w, h) * px * 0.9;
          const iconLeft = (w * px - iconSize) / 2 - dx * px;
          const iconTop = (h * px - iconSize) / 2 - dy * px;
          return (
            <div
              key={i}
              className={cn("absolute overflow-hidden border", bg)}
              style={{ left: dx * px, top: dy * px, width: px, height: px }}
            >
              {Icon && (
                <Icon
                  className={cn("pointer-events-none absolute opacity-15", fg)}
                  style={{ left: iconLeft, top: iconTop, width: iconSize, height: iconSize }}
                  strokeWidth={1.5}
                />
              )}
            </div>
          );
        })}
        <div
          className={cn(
            "pointer-events-none absolute inset-0 flex items-center justify-center font-mono text-[9px] font-semibold uppercase tracking-widest",
            fg,
          )}
        >
          {abbreviate(label)}
        </div>
      </div>
      </div>
    </ItemTooltip>
  );
}

