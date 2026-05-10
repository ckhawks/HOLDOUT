"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ITEMS } from "@/lib/data/items";
import { tierColorFor, tileBgFor } from "@/lib/itemDisplay";
import { renderCategoryIcon } from "@/lib/itemIcon";
import { CONSUMABLE_EFFECTS } from "@/lib/engine/raid";
import { ItemEffectChips } from "./ItemEffectChips";
import { shapeBounds, shapeFor } from "@/lib/engine/shapes";

// Tracks whether the user is currently pressing the mouse anywhere on the
// window. While true, tooltips suppress — drags shouldn't show their source
// item's tooltip overlapping the drag ghost. This is a module-level signal
// rather than per-component so any drag system (PackTetris, StashPanel,
// EquippedColumn) gets coverage for free.
let mouseIsDown = false;
const subscribers = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener(
    "pointerdown",
    () => {
      mouseIsDown = true;
      subscribers.forEach((fn) => fn());
    },
    true,
  );
  window.addEventListener(
    "pointerup",
    () => {
      mouseIsDown = false;
      subscribers.forEach((fn) => fn());
    },
    true,
  );
}

// Cursor-following hover tooltip — replaces native `title` attributes for
// a unified look. The wrapper span uses `display: contents` so it doesn't
// affect layout; pointer events fire on the child element directly.
export function Tooltip({
  children,
  text,
  className,
  disabled,
}: {
  children: React.ReactNode;
  text: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [pressed, setPressed] = useState(false);
  const tipRef = useRef<HTMLDivElement>(null);

  // Subscribe to global press state so the tooltip hides for the duration
  // of any drag in any panel.
  useEffect(() => {
    const onChange = () => setPressed(mouseIsDown);
    subscribers.add(onChange);
    return () => {
      subscribers.delete(onChange);
    };
  }, []);

  useLayoutEffect(() => {
    const el = tipRef.current;
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
      <span
        className={cn("contents", className)}
        onPointerEnter={(e) => {
          if (!disabled) setCursor({ x: e.clientX, y: e.clientY });
        }}
        onPointerMove={(e) => {
          if (!disabled) setCursor({ x: e.clientX, y: e.clientY });
        }}
        onPointerLeave={() => setCursor(null)}
      >
        {children}
      </span>
      {cursor && !pressed && text && (
        <div
          ref={tipRef}
          className="pointer-events-none fixed z-[60] whitespace-nowrap rounded-sm border border-border/80 bg-popover/95 px-2 py-1 font-mono text-[10px] uppercase tracking-widest shadow-md backdrop-blur"
          style={{ left: cursor.x + 14, top: cursor.y + 14 }}
        >
          {text}
        </div>
      )}
    </>
  );
}

// Tooltip flavor that renders an item's standard info (name in tier color,
// tier + sell value, optional hint). Used everywhere an item's identity is
// exposed — stash rows, kit grids, equipped slots, shop offers — so the
// presentation stays consistent.
export function ItemTooltip({
  itemId,
  hint,
  children,
  disabled,
}: {
  itemId: string;
  hint?: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const item = ITEMS[itemId];
  if (!item) return <>{children}</>;
  const fg = tierColorFor(itemId);
  const bg = tileBgFor(itemId);
  const cellPx = 10;
  const cells = shapeFor(itemId, 0);
  const bounds = shapeBounds(cells);
  const iconNode = renderCategoryIcon(itemId, "size-3");
  const text = (
    <div className="flex items-start gap-2">
      <div
        className="relative shrink-0"
        style={{ width: bounds.w * cellPx, height: bounds.h * cellPx }}
      >
        {cells.map(([dx, dy], i) => (
          <div
            key={i}
            className={cn("absolute border", bg)}
            style={{ left: dx * cellPx, top: dy * cellPx, width: cellPx, height: cellPx }}
          />
        ))}
      </div>
      <div className="flex flex-col">
        <div className={cn("flex items-center gap-1 font-semibold", fg)}>
          {iconNode}
          {item.name}
        </div>
        <div className="text-muted-foreground">
          {item.category} · {item.tier}
          {item.sellValue > 0 && ` · ¤${item.sellValue}`}
        </div>
        {CONSUMABLE_EFFECTS[itemId] && (
          <div className="mt-0.5">
            <ItemEffectChips itemId={itemId} />
          </div>
        )}
        {item.bagGrid && (
          <div className="text-muted-foreground">
            {item.bagGrid.width}×{item.bagGrid.height} inventory · {item.bagGrid.width * item.bagGrid.height} cells
          </div>
        )}
        {item.bagGrid && (
          <div
            className="mt-1 border border-border/60 bg-background/40"
            style={{ width: item.bagGrid.width * cellPx, height: item.bagGrid.height * cellPx }}
          >
            <div
              className="size-full"
              style={{
                backgroundImage:
                  `linear-gradient(to right, rgba(255,255,255,0.12) 1px, transparent 1px),` +
                  `linear-gradient(to bottom, rgba(255,255,255,0.12) 1px, transparent 1px)`,
                backgroundSize: `${cellPx}px ${cellPx}px`,
              }}
            />
          </div>
        )}
        {hint && <div className="mt-0.5 text-muted-foreground/70">{hint}</div>}
      </div>
    </div>
  );
  return (
    <Tooltip text={text} disabled={disabled}>
      {children}
    </Tooltip>
  );
}
