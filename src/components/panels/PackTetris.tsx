"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Backpack, Shirt, Trash2 } from "lucide-react";
import { useGame, type KitSlot } from "@/store/game";
import type { PocketsState, BagState, Rotation } from "@/lib/types";
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

const CELL = 32;

type DragSource = "floor" | "pockets" | "bag";

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

  const pocketsRef = useRef<HTMLDivElement>(null);
  const bagRef = useRef<HTMLDivElement>(null);
  const trashRef = useRef<HTMLDivElement>(null);
  const floorRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hover, setHover] = useState<HoverState>(null);

  // Ctrl/Cmd+click fast-move: floor → first-fit kit slot. Picks pockets first
  // (like room-contents pickup naturally lands in the closer pouch), then bag.
  const ctrlPickup = (uid: string, itemId: string) => {
    if (!raid) return;
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

    const onMove = (e: PointerEvent) => {
      if (!drag || !raid) return;
      let h: HoverState = null;
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
      setHover(h);
      setDrag((d) => (d ? { ...d, mouseX: e.clientX, mouseY: e.clientY } : d));
    };

    const onUp = (e: PointerEvent) => {
      if (!drag) return;
      let played = false;
      if (isOverElement(trashRef.current, e.clientX, e.clientY)) {
        if (drag.source === "floor") trashFromFloor(drag.uid);
        else trashFromKit(drag.uid);
        played = true;
      } else if (drag.source !== "floor" && isOverElement(floorRef.current, e.clientX, e.clientY)) {
        dropToFloor(drag.uid);
        played = true;
      } else {
        // Try pockets first, then bag.
        const pCell = pockets ? gridCellAt(pocketsRef.current, e.clientX, e.clientY) : null;
        const bCell = !pCell && bag ? gridCellAt(bagRef.current, e.clientX, e.clientY) : null;
        const slot: KitSlot | null = pCell ? "pockets" : bCell ? "bag" : null;
        const cell = pCell ?? bCell;
        if (slot && cell) {
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
            drag={drag}
            hover={hover && hover.slot === "pockets" ? hover : null}
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
              drag={drag}
              hover={hover && hover.slot === "bag" ? hover : null}
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
      </div>

      {drag && <DragGhost drag={drag} />}
    </aside>
  );
}

function KitGrid({
  slot,
  label,
  Icon,
  grid,
  gridRef,
  drag,
  hover,
  onPick,
  onCtrlClick,
}: {
  slot: KitSlot;
  label: string;
  Icon: typeof Backpack;
  grid: PocketsState | BagState;
  gridRef: React.RefObject<HTMLDivElement | null>;
  drag: DragState | null;
  hover: HoverState;
  onPick: (
    uid: string,
    itemId: string,
    rotation: Rotation,
    dx: number,
    dy: number,
    mouseX: number,
    mouseY: number,
  ) => void;
  onCtrlClick: (uid: string) => void;
}) {
  const w = grid.grid.width;
  const h = grid.grid.height;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        <span className="flex items-center gap-1">
          <Icon className="size-3" />
          {label}
        </span>
        <span className="tabular-nums">
          {grid.items.length}/{w * h}
        </span>
      </div>
      <div
        ref={gridRef}
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
          const beingDragged =
            drag &&
            ((slot === "pockets" && drag.source === "pockets") ||
              (slot === "bag" && drag.source === "bag")) &&
            drag.uid === p.uid;
          return (
            <div
              key={p.uid}
              className={cn("absolute", beingDragged && "opacity-30")}
              style={{ left: p.x * CELL, top: p.y * CELL }}
            >
              <ItemTiles
                cells={cells}
                itemId={p.itemId}
                onPointerDown={(e, dx, dy) => {
                  e.preventDefault();
                  // Ctrl/Cmd+click is the fast drop-to-floor shortcut.
                  if (e.ctrlKey || e.metaKey) {
                    onCtrlClick(p.uid);
                    return;
                  }
                  onPick(p.uid, p.itemId, p.rotation, dx, dy, e.clientX, e.clientY);
                }}
                label={item?.name ?? p.itemId}
              />
            </div>
          );
        })}
        {drag && hover && (
          <HoverPreview
            x={hover.x}
            y={hover.y}
            valid={hover.valid}
            cells={shapeFor(drag.itemId, drag.rotation)}
          />
        )}
      </div>
    </div>
  );
}

function ItemTiles({
  cells,
  itemId,
  onPointerDown,
  label,
}: {
  cells: ReturnType<typeof shapeFor>;
  itemId: string;
  onPointerDown: (e: React.PointerEvent, dx: number, dy: number) => void;
  label: string;
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
              "pointer-events-auto absolute cursor-grab border transition-[filter] active:cursor-grabbing",
              bg,
              cursor && "brightness-125",
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
            onPointerDown={(e) => {
              clear();
              onPointerDown(e, dx, dy);
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
        </div>
      )}
    </>
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
  );
}

function HoverPreview({
  x,
  y,
  valid,
  cells,
}: {
  x: number;
  y: number;
  valid: boolean;
  cells: ReturnType<typeof shapeFor>;
}) {
  return (
    <>
      {cells.map(([dx, dy], i) => (
        <div
          key={i}
          className={cn(
            "pointer-events-none absolute border",
            valid ? "border-emerald-400/80 bg-emerald-500/20" : "border-red-400/80 bg-red-500/20",
          )}
          style={{
            left: (x + dx) * CELL,
            top: (y + dy) * CELL,
            width: CELL,
            height: CELL,
          }}
        />
      ))}
    </>
  );
}

function DragGhost({ drag }: { drag: DragState }) {
  const cells = shapeFor(drag.itemId, drag.rotation);
  const item = ITEMS[drag.itemId];
  const bg = tileBgFor(drag.itemId);
  const fg = tierColorFor(drag.itemId);
  const { w, h } = shapeBounds(cells);
  const left = drag.mouseX - (drag.grabDx * CELL + CELL / 2);
  const top = drag.mouseY - (drag.grabDy * CELL + CELL / 2);
  return (
    <div
      className="pointer-events-none fixed z-50 opacity-80"
      style={{ left, top, width: w * CELL, height: h * CELL }}
    >
      {cells.map(([dx, dy], i) => (
        <div
          key={i}
          className={cn("absolute border-2", bg)}
          style={{
            left: dx * CELL,
            top: dy * CELL,
            width: CELL,
            height: CELL,
          }}
        />
      ))}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 flex items-center justify-center font-mono text-[9px] font-semibold uppercase tracking-widest drop-shadow",
          fg,
        )}
      >
        {abbreviate(item?.name ?? drag.itemId)}
      </div>
    </div>
  );
}

function abbreviate(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return parts.slice(0, 3).map((p) => p[0]).join("").toUpperCase();
  return name.slice(0, 3).toUpperCase();
}
