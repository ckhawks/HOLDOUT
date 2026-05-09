"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Lock } from "lucide-react";
import { useGame } from "@/store/game";
import type { MapTile, RoomType } from "@/lib/types";
import { cn } from "@/lib/utils";

type MoveDir = "right" | "left" | "up" | "down" | null;

function dirFrom(dx: number, dy: number): MoveDir {
  if (dx > 0) return "right";
  if (dx < 0) return "left";
  if (dy > 0) return "down";
  if (dy < 0) return "up";
  return null;
}

const ROOM_LABEL: Record<RoomType, string> = {
  entry: "Entry",
  corridor: "Corridor",
  storage: "Storage",
  office: "Office",
  mechanical: "Mechanical",
  gantry: "Gantry",
  locked: "Sealed",
};

interface HoverState {
  tile: MapTile;
  isOperative: boolean;
  cursor: { x: number; y: number };
}

function tileStatusLabel(h: HoverState, isPreview: boolean): string {
  const { tile, isOperative } = h;
  if (isOperative) return "operative here";
  if (isPreview) {
    if (!tile.seen) return "next move · unknown room";
    if (tile.blocked) return "next move · sealed";
    return tile.looted ? "next move · well-searched" : "next move · unsearched";
  }
  if (!tile.seen) return "out of sight";
  // Seen but not visited — visible but not searched yet.
  if (!tile.looted) {
    if (tile.blocked) return "sealed";
    if (tile.type === "entry") return "extract point";
    return "unsearched";
  }
  if (tile.type === "entry") return "extract point";
  return "well-searched";
}

function titleCase(s: string): string {
  return s.replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}

function tileTypeLabel(tile: MapTile): string {
  // Anything the operative has glanced at — including unentered adjacent
  // rooms — reveals its specific name. Only the never-seen fog stays as ???.
  if (!tile.seen) return "???";
  // Use the per-tile fixed name so map and event log match.
  return tile.name ? titleCase(tile.name) : ROOM_LABEL[tile.type];
}

export function RaidMap() {
  const raid = useGame((s) => s.currentRaid);
  const [hover, setHover] = useState<HoverState | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = tooltipRef.current;
    if (!hover || !el) return;
    const r = el.getBoundingClientRect();
    const margin = 8;
    const offset = 14;
    let left = hover.cursor.x + offset;
    let top = hover.cursor.y + offset;
    if (left + r.width > window.innerWidth - margin)
      left = hover.cursor.x - r.width - offset;
    if (top + r.height > window.innerHeight - margin)
      top = hover.cursor.y - r.height - offset;
    if (left < margin) left = margin;
    if (top < margin) top = margin;
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  }, [hover]);

  if (!raid) return null;
  const { map, operativePos } = raid;
  const previewPos = raid.nextStep;
  const previewDir: MoveDir = previewPos
    ? dirFrom(previewPos.x - operativePos.x, previewPos.y - operativePos.y)
    : null;

  // Data is already oriented horizontally: x = depth (0 = entry on the left,
  // map.width-1 = deepest on the right), y = lane (0 = top row). Render is
  // identity — no transposition.
  return (
    <aside className="flex shrink-0 flex-col border-t border-border/60">
      <div className="border-b border-border/60 px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        Map · entry → deep
      </div>
      <div className="flex flex-1 items-center justify-center px-4 py-3">
        <div
          className="grid gap-px rounded-sm border border-border/60 bg-border/40 p-px"
          onMouseLeave={() => setHover(null)}
        >
          {Array.from({ length: map.height }, (_, y) =>
            Array.from({ length: map.width }, (_, x) => {
              const tile = map.tiles[y * map.width + x];
              const isOperative =
                operativePos.x === x && operativePos.y === y;
              const isHovered =
                hover && hover.tile.x === x && hover.tile.y === y;
              const isPreview =
                !!previewPos && previewPos.x === x && previewPos.y === y;
              return (
                <Tile
                  key={`${x}-${y}`}
                  tile={tile}
                  isOperative={isOperative}
                  isHovered={!!isHovered}
                  isPreview={isPreview}
                  previewDir={isPreview ? previewDir : null}
                  style={{ gridColumn: x + 1, gridRow: y + 1 }}
                  onPointerEnter={(e) =>
                    setHover({
                      tile,
                      isOperative,
                      cursor: { x: e.clientX, y: e.clientY },
                    })
                  }
                  onPointerMove={(e) =>
                    setHover({
                      tile,
                      isOperative,
                      cursor: { x: e.clientX, y: e.clientY },
                    })
                  }
                />
              );
            }),
          )}
        </div>
      </div>
      {hover ? (
        <div
          ref={tooltipRef}
          className="pointer-events-none fixed z-[60] whitespace-nowrap rounded-sm border border-border/80 bg-popover/95 px-2 py-1 font-mono text-[10px] uppercase tracking-widest shadow-md backdrop-blur"
          style={{ left: hover.cursor.x + 14, top: hover.cursor.y + 14 }}
        >
          <div className="font-semibold text-foreground">
            {tileTypeLabel(hover.tile)}
          </div>
          <div className="text-muted-foreground">
            {tileStatusLabel(
              hover,
              !!previewPos &&
                previewPos.x === hover.tile.x &&
                previewPos.y === hover.tile.y,
            )}
          </div>
        </div>
      ) : null}
    </aside>
  );
}

function Tile({
  tile,
  isOperative,
  isHovered,
  isPreview,
  previewDir,
  style,
  onPointerEnter,
  onPointerMove,
}: {
  tile: MapTile;
  isOperative: boolean;
  isHovered: boolean;
  isPreview: boolean;
  previewDir: MoveDir;
  style: React.CSSProperties;
  onPointerEnter: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
}) {
  const ringClass = cn(isHovered && "ring-2 ring-foreground/70");
  // Gradient direction tells the player where the operative is heading: the
  // saturated end of the gradient sits on the side facing the operative, and
  // fades toward the opposite edge.
  const previewOverlay =
    isPreview && previewDir ? (
      <PreviewOverlay dir={previewDir} />
    ) : null;
  const baseProps = {
    style,
    onPointerEnter,
    onPointerMove,
  };

  // Unseen — fog of war. Render as a blank dim cell, no info.
  if (!tile.seen) {
    return (
      <div
        {...baseProps}
        className={cn(
          "relative size-7 border border-dashed border-border/20 bg-background/40",
          ringClass,
        )}
      >
        {previewOverlay}
      </div>
    );
  }

  if (isOperative) {
    return (
      <div
        {...baseProps}
        className={cn(
          "relative flex size-7 items-center justify-center bg-card",
          ringClass,
        )}
      >
        <span className="size-3 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(74,222,128,0.8)]" />
      </div>
    );
  }

  // Seen-but-blocked: render with a lock glyph so the player knows it's
  // sealed without spoiling room type detail.
  if (tile.blocked) {
    return (
      <div
        {...baseProps}
        className={cn(
          "relative flex size-7 items-center justify-center bg-background/70",
          ringClass,
        )}
      >
        <Lock className="size-3 text-muted-foreground/70" />
        {previewOverlay}
      </div>
    );
  }

  if (tile.type === "entry") {
    return (
      <div
        {...baseProps}
        className={cn(
          "relative flex size-7 items-center justify-center bg-card",
          ringClass,
        )}
      >
        <span className="size-2 rounded-full bg-emerald-400/40" />
        {previewOverlay}
      </div>
    );
  }

  // Seen but not visited: outline only, dim center.
  if (!tile.looted) {
    return (
      <div
        {...baseProps}
        className={cn(
          "relative size-7 border border-border/60 bg-card/20",
          ringClass,
        )}
      >
        {previewOverlay}
      </div>
    );
  }

  // Visited.
  return (
    <div
      {...baseProps}
      className={cn("relative size-7 bg-card/60", ringClass)}
    >
      {previewOverlay}
    </div>
  );
}

function PreviewOverlay({ dir }: { dir: NonNullable<MoveDir> }) {
  // A flat dim amber fill on the next tile so it stands apart, plus an arrow
  // straddling the edge between the operative tile and the next tile.
  const arrowPosition: Record<NonNullable<MoveDir>, React.CSSProperties> = {
    right: { left: 0, top: "50%", transform: "translate(-50%, -50%)" },
    left: { right: 0, top: "50%", transform: "translate(50%, -50%)" },
    up: { bottom: 0, left: "50%", transform: "translate(-50%, 50%)" },
    down: { top: 0, left: "50%", transform: "translate(-50%, -50%)" },
  };
  const ArrowIcon =
    dir === "right"
      ? ArrowRight
      : dir === "left"
        ? ArrowLeft
        : dir === "up"
          ? ArrowUp
          : ArrowDown;
  return (
    <>
      <span className="pointer-events-none absolute inset-0 bg-amber-400/15" />
      <ArrowIcon
        className="pointer-events-none absolute z-10 size-3.5 text-amber-100 drop-shadow-[0_0_2px_rgba(0,0,0,0.7)]"
        style={arrowPosition[dir]}
      />
    </>
  );
}
