"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { PENDING_EXPIRY_MS, useGame } from "@/store/game";
import type { Rotation } from "@/lib/types";
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

type DragState = {
  source: "pending" | "pack";
  uid: string;
  itemId: string;
  rotation: Rotation;
  // grab offset in cells (which cell of the shape was grabbed)
  grabDx: number;
  grabDy: number;
  mouseX: number;
  mouseY: number;
};

export function PackTetris() {
  const raid = useGame((s) => s.currentRaid);
  const placeFromPending = useGame((s) => s.placeFromPending);
  const movePackItem = useGame((s) => s.movePackItem);
  const unplacePackItem = useGame((s) => s.unplacePackItem);
  const trashFromPending = useGame((s) => s.trashFromPending);
  const trashFromPack = useGame((s) => s.trashFromPack);
  const pruneExpiredPending = useGame((s) => s.pruneExpiredPending);

  const gridRef = useRef<HTMLDivElement>(null);
  const trashRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hoverCell, setHoverCell] = useState<{ x: number; y: number; valid: boolean } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Drive countdown + expiry pruning at 200ms. Frozen while paused so
  // countdown bars don't tick down and items don't expire mid-pause.
  useEffect(() => {
    if (!raid?.active) return;
    if (raid.pausedAt) {
      setNow(raid.pausedAt);
      return;
    }
    const id = setInterval(() => {
      pruneExpiredPending();
      setNow(Date.now());
    }, 200);
    return () => clearInterval(id);
  }, [raid?.active, raid?.pausedAt, pruneExpiredPending]);

  // Global pointer + key listeners while dragging
  useEffect(() => {
    if (!drag || !raid) return;

    function getCellAt(clientX: number, clientY: number): { x: number; y: number } | null {
      const el = gridRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;
      if (localX < 0 || localY < 0 || localX >= rect.width || localY >= rect.height) return null;
      return { x: Math.floor(localX / CELL), y: Math.floor(localY / CELL) };
    }

    function isOverTrash(clientX: number, clientY: number): boolean {
      const el = trashRef.current;
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
    }

    function isOverPending(clientX: number, clientY: number): boolean {
      const el = pendingRef.current;
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
    }

    const onMove = (e: PointerEvent) => {
      if (!drag || !raid) return;
      const cell = getCellAt(e.clientX, e.clientY);
      if (cell) {
        const ox = cell.x - drag.grabDx;
        const oy = cell.y - drag.grabDy;
        const cells = shapeFor(drag.itemId, drag.rotation);
        const ignoreUid = drag.source === "pack" ? drag.uid : undefined;
        const occ = buildOccupancy(raid.pack, raid.packGrid.width, raid.packGrid.height, ignoreUid);
        const valid = canPlace(cells, ox, oy, raid.packGrid.width, raid.packGrid.height, occ);
        setHoverCell({ x: ox, y: oy, valid });
      } else {
        setHoverCell(null);
      }
      setDrag((d) => (d ? { ...d, mouseX: e.clientX, mouseY: e.clientY } : d));
    };

    const onUp = (e: PointerEvent) => {
      if (!drag) return;
      let played = false;
      if (isOverTrash(e.clientX, e.clientY)) {
        if (drag.source === "pending") trashFromPending(drag.uid);
        else trashFromPack(drag.uid);
        played = true;
      } else if (drag.source === "pack" && isOverPending(e.clientX, e.clientY)) {
        unplacePackItem(drag.uid);
        played = true;
      } else {
        const cell = getCellAt(e.clientX, e.clientY);
        if (cell) {
          const ox = cell.x - drag.grabDx;
          const oy = cell.y - drag.grabDy;
          const ok =
            drag.source === "pending"
              ? placeFromPending(drag.uid, ox, oy, drag.rotation)
              : movePackItem(drag.uid, ox, oy, drag.rotation);
          if (ok) played = true;
        }
      }
      if (played) playSfx("inventory");
      setDrag(null);
      setHoverCell(null);
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
        // Re-normalize grab offset against new rotation: keep the cell under cursor the same.
        // Easiest approach: reset grab to the shape's "first cell" — small UX hit but simple.
        // Better: project the previously-grabbed cell through 90deg rotation.
        // For v1, reset grab to (0, 0) — the user re-positions by mouse.
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
  }, [drag, raid, placeFromPending, movePackItem, unplacePackItem, trashFromPending, trashFromPack]);

  if (!raid) return null;

  const { width: gridW, height: gridH } = raid.packGrid;

  return (
    <aside className="flex shrink-0 flex-col border-l border-border/60">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        <span>Pack</span>
        <span className="tabular-nums text-foreground">
          {raid.pack.length}/{gridW * gridH}
        </span>
      </div>

      <div className="flex flex-1 items-stretch gap-3 px-4 py-3">
        {/* Left rail: incoming + trash */}
        <div className="flex w-40 shrink-0 flex-col gap-3">
          <div className="flex flex-1 flex-col">
            <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Incoming · {raid.pending.length}/{raid.pendingCapacity}
            </div>
            <div
              ref={pendingRef}
              className={cn(
                "flex flex-1 min-h-96 flex-col items-center gap-2 rounded-sm border border-dashed border-border/60 bg-background/30 p-2 transition-colors",
                drag?.source === "pack" && "border-sky-500/70 bg-sky-950/20",
              )}
            >
              {raid.pending.length === 0 && (
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
                  empty
                </span>
              )}
              {raid.pending.map((p) => {
                const item = ITEMS[p.itemId];
                const beingDragged = drag?.source === "pending" && drag.uid === p.uid;
                return (
                  <PendingTile
                    key={p.uid}
                    itemId={p.itemId}
                    label={item?.name ?? p.itemId}
                    hidden={beingDragged}
                    arrivedAt={p.arrivedAt}
                    now={now}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      setDrag({
                        source: "pending",
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

        {/* Right side: pack grid (room here for additional bags later) */}
        <div className="flex flex-col gap-2">
          <div
            ref={gridRef}
            className="relative select-none border border-border/80 bg-background/40"
            style={{ width: gridW * CELL, height: gridH * CELL }}
          >
          {/* cell backgrounds */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                `linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px),` +
                `linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)`,
              backgroundSize: `${CELL}px ${CELL}px`,
            }}
          />
          {/* placed items */}
          {raid.pack.map((p) => {
            const cells = shapeFor(p.itemId, p.rotation);
            const item = ITEMS[p.itemId];
            const beingDragged = drag?.source === "pack" && drag.uid === p.uid;
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
                    setDrag({
                      source: "pack",
                      uid: p.uid,
                      itemId: p.itemId,
                      rotation: p.rotation,
                      grabDx: dx,
                      grabDy: dy,
                      mouseX: e.clientX,
                      mouseY: e.clientY,
                    });
                  }}
                  label={item?.name ?? p.itemId}
                />
              </div>
            );
          })}

            {/* hover preview */}
            {drag && hoverCell && (
              <HoverPreview
                x={hoverCell.x}
                y={hoverCell.y}
                valid={hoverCell.valid}
                cells={shapeFor(drag.itemId, drag.rotation)}
              />
            )}
          </div>

          <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/60">
            drag · R or right-click to rotate
          </div>
        </div>
      </div>

      {/* Floating ghost while dragging */}
      {drag && <DragGhost drag={drag} />}
    </aside>
  );
}

function HoverTooltip({
  itemId,
  label,
  children,
  className,
  style,
  onPointerDown,
  disabled,
  highlightClassName = "ring-2 ring-foreground/60 ring-offset-1 ring-offset-background",
}: {
  itemId: string;
  label: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onPointerDown?: (e: React.PointerEvent) => void;
  disabled?: boolean;
  highlightClassName?: string;
}) {
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const fg = tierColorFor(itemId);
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

  return (
    <>
      <div
        ref={ref}
        className={cn(className, cursor && highlightClassName)}
        style={style}
        onPointerEnter={(e) => {
          if (disabled) return;
          setCursor({ x: e.clientX, y: e.clientY });
        }}
        onPointerMove={(e) => {
          if (disabled) return;
          setCursor({ x: e.clientX, y: e.clientY });
        }}
        onPointerLeave={() => setCursor(null)}
        onPointerDown={(e) => {
          setCursor(null);
          onPointerDown?.(e);
        }}
      >
        {children}
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

function PendingTile({
  itemId,
  label,
  onPointerDown,
  hidden,
  arrivedAt,
  now,
}: {
  itemId: string;
  label: string;
  onPointerDown: (e: React.PointerEvent) => void;
  hidden?: boolean;
  arrivedAt: number;
  now: number;
}) {
  const bg = tileBgFor(itemId);
  const fg = tierColorFor(itemId);
  const cells = shapeFor(itemId, 0);
  const { w, h } = shapeBounds(cells);
  const px = CELL - 2;
  const elapsed = now - arrivedAt;
  const remaining = Math.max(0, PENDING_EXPIRY_MS - elapsed);
  const pct = (remaining / PENDING_EXPIRY_MS) * 100;
  const urgent = remaining < 5000;
  return (
    <HoverTooltip
      itemId={itemId}
      label={label}
      className={cn(
        "group relative cursor-grab rounded-sm border border-border/60 bg-card/40 p-1.5 transition-colors active:cursor-grabbing",
        hidden && "opacity-30",
      )}
      onPointerDown={onPointerDown}
      disabled={hidden}
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
      <div className="mt-1 h-1 w-full overflow-hidden rounded-sm bg-border/40">
        <div
          className={cn("h-full", urgent ? "bg-red-400/90" : "bg-foreground/60")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </HoverTooltip>
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
  // Position ghost so the grabbed cell sits under the cursor
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
  // Take first letter of each word, max 3 letters
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return parts.slice(0, 3).map((p) => p[0]).join("").toUpperCase();
  return name.slice(0, 3).toUpperCase();
}
