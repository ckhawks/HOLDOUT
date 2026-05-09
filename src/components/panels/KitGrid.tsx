"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { Backpack } from "lucide-react";
import { ITEMS } from "@/lib/data/items";
import { shapeBounds, shapeFor } from "@/lib/engine/shapes";
import { abbreviate, tierColorFor, tileBgFor } from "@/lib/itemDisplay";
import { categoryIconFor } from "@/lib/itemIcon";
import { cn } from "@/lib/utils";
import type { BagState, PocketsState, Rotation } from "@/lib/types";
import type { KitSlot } from "@/store/game";

export const KIT_CELL = 32;

export type KitHover = { x: number; y: number; valid: boolean };

// Whatever the current drag is — only `uid` is needed by KitGrid (to dim the
// source item if it lives in this grid), plus the optional preview shape
// (itemId + rotation) so the hover overlay can render the dragging item's
// outline against this grid.
export type KitDragHint = {
  uid: string;
  itemId: string;
  rotation: Rotation;
};

export function KitGrid({
  slot,
  label,
  Icon,
  grid,
  gridRef,
  drag,
  draggingFromThisGrid,
  hover,
  onPick,
  onCtrlClick,
}: {
  slot: KitSlot;
  label: string;
  Icon: typeof Backpack;
  grid: PocketsState | BagState;
  gridRef: React.RefObject<HTMLDivElement | null>;
  drag: KitDragHint | null;
  draggingFromThisGrid: boolean;
  hover: KitHover | null;
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
        style={{ width: w * KIT_CELL, height: h * KIT_CELL }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              `linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px),` +
              `linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)`,
            backgroundSize: `${KIT_CELL}px ${KIT_CELL}px`,
          }}
        />
        {grid.items.map((p) => {
          const cells = shapeFor(p.itemId, p.rotation);
          const item = ITEMS[p.itemId];
          const beingDragged =
            draggingFromThisGrid && drag?.uid === p.uid;
          return (
            <div
              key={p.uid}
              className={cn("absolute", beingDragged && "opacity-30")}
              style={{ left: p.x * KIT_CELL, top: p.y * KIT_CELL }}
            >
              <ItemTiles
                cells={cells}
                itemId={p.itemId}
                onPointerDown={(e, dx, dy) => {
                  e.preventDefault();
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
  const Icon = categoryIconFor(itemId);

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
      <div className="pointer-events-none relative" style={{ width: w * KIT_CELL, height: h * KIT_CELL }}>
        {cells.map(([dx, dy], i) => {
          const iconSize = Math.min(w, h) * KIT_CELL * 0.9;
          const iconLeft = (w * KIT_CELL - iconSize) / 2 - dx * KIT_CELL;
          const iconTop = (h * KIT_CELL - iconSize) / 2 - dy * KIT_CELL;
          return (
            <div
              key={`${dx}-${dy}-${i}`}
              className={cn(
                "pointer-events-auto absolute cursor-grab overflow-hidden border transition-[filter] active:cursor-grabbing",
                bg,
                cursor && "brightness-125",
              )}
              style={{
                left: dx * KIT_CELL,
                top: dy * KIT_CELL,
                width: KIT_CELL,
                height: KIT_CELL,
              }}
              onPointerEnter={update}
              onPointerMove={update}
              onPointerLeave={clear}
              onPointerDown={(e) => {
                clear();
                onPointerDown(e, dx, dy);
              }}
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
            left: (x + dx) * KIT_CELL,
            top: (y + dy) * KIT_CELL,
            width: KIT_CELL,
            height: KIT_CELL,
          }}
        />
      ))}
    </>
  );
}

export function KitDragGhost({
  itemId,
  rotation,
  mouseX,
  mouseY,
  grabDx,
  grabDy,
}: {
  itemId: string;
  rotation: Rotation;
  mouseX: number;
  mouseY: number;
  grabDx: number;
  grabDy: number;
}) {
  const cells = shapeFor(itemId, rotation);
  const item = ITEMS[itemId];
  const bg = tileBgFor(itemId);
  const fg = tierColorFor(itemId);
  const Icon = categoryIconFor(itemId);
  const { w, h } = shapeBounds(cells);
  const left = mouseX - (grabDx * KIT_CELL + KIT_CELL / 2);
  const top = mouseY - (grabDy * KIT_CELL + KIT_CELL / 2);
  return (
    <div
      className="pointer-events-none fixed z-50 opacity-80"
      style={{ left, top, width: w * KIT_CELL, height: h * KIT_CELL }}
    >
      {cells.map(([dx, dy], i) => {
        const iconSize = Math.min(w, h) * KIT_CELL * 0.9;
        const iconLeft = (w * KIT_CELL - iconSize) / 2 - dx * KIT_CELL;
        const iconTop = (h * KIT_CELL - iconSize) / 2 - dy * KIT_CELL;
        return (
          <div
            key={i}
            className={cn("absolute overflow-hidden border-2", bg)}
            style={{
              left: dx * KIT_CELL,
              top: dy * KIT_CELL,
              width: KIT_CELL,
              height: KIT_CELL,
            }}
          >
            {Icon && (
              <Icon
                className={cn("pointer-events-none absolute opacity-20", fg)}
                style={{ left: iconLeft, top: iconTop, width: iconSize, height: iconSize }}
                strokeWidth={1.5}
              />
            )}
          </div>
        );
      })}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 flex items-center justify-center font-mono text-[9px] font-semibold uppercase tracking-widest drop-shadow",
          fg,
        )}
      >
        {abbreviate(item?.name ?? itemId)}
      </div>
    </div>
  );
}

