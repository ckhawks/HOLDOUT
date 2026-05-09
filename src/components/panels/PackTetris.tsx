"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Backpack, Shirt, Trash2 } from "lucide-react";
import { useGame, type KitSlot } from "@/store/game";
import type { EquipSlot, PocketsState, BagState, Rotation } from "@/lib/types";
import { EquippedColumn, SLOT_ORDER, type SlotHover, type SlotRefMap } from "./EquippedColumn";
import { KitDragGhost, KitGrid, KIT_CELL } from "./KitGrid";
import { ItemTooltip } from "@/components/ui/Tooltip";
import { ITEMS } from "@/lib/data/items";
import { playSfx } from "@/lib/sfx";
import {
  buildOccupancy,
  canPlace,
  shapeBounds,
  shapeFor,
} from "@/lib/engine/shapes";
import { cn } from "@/lib/utils";
import { tierColorFor, tileBgFor } from "@/lib/itemDisplay";

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
  const trashFromFloor = useGame((s) => s.trashFromFloor);
  const trashFromKit = useGame((s) => s.trashFromKit);
  const equipFromFloor = useGame((s) => s.equipFromFloor);
  const unequipToFloor = useGame((s) => s.unequipToFloor);

  const pocketsRef = useRef<HTMLDivElement>(null);
  const bagRef = useRef<HTMLDivElement>(null);
  const trashRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (!drag || !raid) return;

    function gridCellAt(
      el: HTMLElement | null,
      clientX: number,
      clientY: number,
    ): { x: number; y: number } | null {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const lx = clientX - r.left;
      const ly = clientY - r.top;
      if (lx < 0 || ly < 0 || lx >= r.width || ly >= r.height) return null;
      return { x: Math.floor(lx / CELL), y: Math.floor(ly / CELL) };
    }

    function isOverElement(el: HTMLElement | null, x: number, y: number): boolean {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    }

    function evalDrop(d: DragState, slot: KitSlot, eq: PocketsState | BagState, ox: number, oy: number) {
      const cells = shapeFor(d.itemId, d.rotation);
      const ignoreUid =
        (d.source === "pockets" && slot === "pockets") ||
        (d.source === "bag" && slot === "bag")
          ? d.uid
          : undefined;
      const occ = buildOccupancy(eq.items, eq.grid.width, eq.grid.height, ignoreUid);
      const valid = canPlace(cells, ox, oy, eq.grid.width, eq.grid.height, occ);
      return valid;
    }

    const slotUnder = (x: number, y: number): EquipSlot | null => {
      for (const s of SLOT_ORDER) {
        if (isOverElement(slotRefs[s].current, x, y)) return s;
      }
      return null;
    };
    const slotIsValidTarget = (s: EquipSlot, d: DragState): boolean => {
      if (d.source === "floor") {
        const def = ITEMS[d.itemId];
        if (def?.slot !== s) return false;
        if (s === "bag") return !raid.equipment.bag;
        return !raid.equipment[s];
      }
      if (d.source === `slot:${s}`) return true; // dropping back on itself = no-op
      return false;
    };

    const onMove = (e: PointerEvent) => {
      if (!drag || !raid) return;
      let h: HoverState = null;
      let sh: SlotHover = null;
      const sUnder = slotUnder(e.clientX, e.clientY);
      if (sUnder) {
        sh = { slot: sUnder, valid: slotIsValidTarget(sUnder, drag) };
      } else {
        const pCell = pockets ? gridCellAt(pocketsRef.current, e.clientX, e.clientY) : null;
        if (pCell && pockets) {
          const ox = pCell.x - drag.grabDx;
          const oy = pCell.y - drag.grabDy;
          h = { slot: "pockets", x: ox, y: oy, valid: evalDrop(drag, "pockets", pockets, ox, oy) };
        } else if (bag) {
          const bCell = gridCellAt(bagRef.current, e.clientX, e.clientY);
          if (bCell) {
            const ox = bCell.x - drag.grabDx;
            const oy = bCell.y - drag.grabDy;
            h = { slot: "bag", x: ox, y: oy, valid: evalDrop(drag, "bag", bag, ox, oy) };
          }
        }
      }
      setHover(h);
      setSlotHover(sh);
      setDrag((d) => (d ? { ...d, mouseX: e.clientX, mouseY: e.clientY } : d));
    };

    const onUp = (e: PointerEvent) => {
      if (!drag) return;
      let played = false;
      const sUnder = slotUnder(e.clientX, e.clientY);
      if (sUnder) {
        // Drop on equipped slot.
        if (drag.source === "floor") {
          if (equipFromFloor(drag.uid)) played = true;
        }
        // Slot → same slot or different slot: no-op for now.
      } else if (isOverElement(trashRef.current, e.clientX, e.clientY)) {
        if (drag.source === "floor") {
          trashFromFloor(drag.uid);
          played = true;
        } else if (drag.source === "pockets" || drag.source === "bag") {
          trashFromKit(drag.uid);
          played = true;
        } else if (drag.source.startsWith("slot:")) {
          // Trashing an equipped item: route to floor instead so the player
          // has to confirm by trashing it from the floor. Avoids accidental
          // bag loss with one drag.
          const slot = drag.source.slice(5) as EquipSlot;
          if (unequipToFloor(slot)) played = true;
        }
      } else if (isOverElement(floorRef.current, e.clientX, e.clientY)) {
        if (drag.source === "pockets" || drag.source === "bag") {
          dropToFloor(drag.uid);
          played = true;
        } else if (drag.source.startsWith("slot:")) {
          const slot = drag.source.slice(5) as EquipSlot;
          if (unequipToFloor(slot)) played = true;
        }
      } else {
        const pCell = pockets ? gridCellAt(pocketsRef.current, e.clientX, e.clientY) : null;
        const bCell = !pCell && bag ? gridCellAt(bagRef.current, e.clientX, e.clientY) : null;
        const slot: KitSlot | null = pCell ? "pockets" : bCell ? "bag" : null;
        const cell = pCell ?? bCell;
        if (slot && cell && (drag.source === "floor" || drag.source === "pockets" || drag.source === "bag")) {
          const ox = cell.x - drag.grabDx;
          const oy = cell.y - drag.grabDy;
          const ok =
            drag.source === "floor"
              ? pickupFromFloor(drag.uid, slot, ox, oy, drag.rotation)
              : moveKitItem(drag.uid, slot, ox, oy, drag.rotation);
          if (ok) played = true;
        }
      }
      if (played) playSfx("inventory");
      setDrag(null);
      setHover(null);
      setSlotHover(null);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        rotateInPlace();
      }
    };
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      rotateInPlace();
    };
    function rotateInPlace() {
      setDrag((d) => {
        if (!d) return d;
        const newRot = ((d.rotation + 1) % 4) as Rotation;
        return { ...d, rotation: newRot, grabDx: 0, grabDy: 0 };
      });
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("keydown", onKey);
    window.addEventListener("contextmenu", onContextMenu);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("contextmenu", onContextMenu);
    };
  }, [
    drag,
    raid,
    pockets,
    bag,
    pickupFromFloor,
    moveKitItem,
    dropToFloor,
    trashFromFloor,
    trashFromKit,
    equipFromFloor,
    unequipToFloor,
    slotRefs,
  ]);

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
            ref={trashRef}
            className={cn(
              "flex items-center justify-center gap-2 rounded-sm border border-dashed border-border/60 bg-background/30 py-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors",
              drag && "border-red-500/70 bg-red-950/30 text-red-300",
            )}
          >
            <Trash2 className="size-3.5" />
            <span>Discard</span>
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
        {cells.map(([dx, dy], i) => (
          <div
            key={i}
            className={cn("absolute border", bg)}
            style={{ left: dx * px, top: dy * px, width: px, height: px }}
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
      </div>
    </ItemTooltip>
  );
}

function abbreviate(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return parts.slice(0, 3).map((p) => p[0]).join("").toUpperCase();
  return name.slice(0, 3).toUpperCase();
}
