"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Slash } from "lucide-react";
import { useGame } from "@/store/game";
import { pathToEntry } from "@/lib/engine/map";
import type { MapTile, RaidMap as RaidMapType, RoomType } from "@/lib/types";
import { cn } from "@/lib/utils";

// Tile and gap dimensions match the grid CSS: size-7 = 28px, gap-px = 1px,
// outer p-px = 1px. Center of cell (x, y) sits at (x*29 + 15, y*29 + 15).
const TILE_PX = 28;
const GAP_PX = 1;
const PAD_PX = 1;
const STRIDE = TILE_PX + GAP_PX;

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

function isFullyLooted(tile: MapTile): boolean {
  // A tile is "fully looted" only if it had loot to begin with and there's
  // none remaining. Tiles with no loot pool (entry, locked, low-yield rooms
  // with rolled lootMax=0) are never "well-searched" — they're just empty.
  return tile.lootMax > 0 && tile.lootRemaining === 0;
}

function tileStatusLabel(h: HoverState, isPreview: boolean): string {
  const { tile, isOperative } = h;
  if (isOperative) return "operative here";
  if (isPreview) {
    if (!tile.seen) return "next move · unknown room";
    if (tile.blocked) return "next move · sealed";
    if (tile.threat) return "next move · hostile present";
    if (isFullyLooted(tile)) return "next move · well-searched";
    if (tile.visited) return "next move · trodden";
    return "next move · unsearched";
  }
  if (!tile.seen) return "out of sight";
  if (tile.blocked) return "sealed";
  if (tile.type === "entry") return "extract point";
  const threatPrefix = tile.threat ? "hostile · " : "";
  if (isFullyLooted(tile)) return `${threatPrefix}well-searched`;
  if (tile.visited) return `${threatPrefix}trodden but unsearched`;
  return `${threatPrefix}unsearched`;
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
  const isExtracting = raid.runState.flags.includes("extracting");
  const path = isExtracting ? pathToEntry(map, operativePos.x, operativePos.y) : [];
  const previewDir: MoveDir = previewPos
    ? dirFrom(previewPos.x - operativePos.x, previewPos.y - operativePos.y)
    : null;

  // Data is already oriented horizontally: x = depth (0 = entry on the left,
  // map.width-1 = deepest on the right), y = lane (0 = top row). Render is
  // identity — no transposition.
  return (
    <aside className="flex shrink-0 flex-col border-t border-border/60">
      <div className="flex items-center gap-1 border-b border-border/60 px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        Map · entry
        <ArrowRight className="size-3" />
        deep
      </div>
      <div className="flex flex-1 items-center justify-center px-4 py-3">
        <div
          className="relative grid gap-px rounded-sm border border-border/60 bg-border/40 p-px"
          onMouseLeave={() => setHover(null)}
        >
          {path.length > 1 ? <PathOverlay map={map} path={path} /> : null}
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
  const threatOverlay =
    tile.seen && tile.threat ? (
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <AlertTriangle className="size-3.5 text-red-400 drop-shadow-[0_0_3px_rgba(0,0,0,0.7)]" />
      </span>
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

  // Seen-but-blocked: render with a slash glyph so the player reads "no
  // entry" rather than "locked but openable."
  if (tile.blocked) {
    return (
      <div
        {...baseProps}
        className={cn(
          "relative flex size-7 items-center justify-center bg-background/70",
          ringClass,
        )}
      >
        <Slash className="size-5 text-muted-foreground/60" />
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
  if (!tile.visited) {
    return (
      <div
        {...baseProps}
        className={cn(
          "relative size-7 border border-border/60 bg-card/20",
          tile.threat && "border-red-500/70 bg-red-500/15",
          ringClass,
        )}
      >
        {threatOverlay}
        {previewOverlay}
      </div>
    );
  }

  // Visited but not yet looted — trodden room with loot still possibly there.
  if (!isFullyLooted(tile)) {
    return (
      <div
        {...baseProps}
        className={cn(
          "relative size-7 bg-card",
          tile.threat && "border border-red-500/70 bg-red-500/20",
          ringClass,
        )}
      >
        {threatOverlay}
        {previewOverlay}
      </div>
    );
  }

  // Visited and looted — fully cleared.
  return (
    <div
      {...baseProps}
      className={cn(
        "relative size-7 bg-card/50",
        tile.threat && "border border-red-500/70 bg-red-500/15",
        ringClass,
      )}
    >
      {threatOverlay}
      {previewOverlay}
    </div>
  );
}

function PathOverlay({
  map,
  path,
}: {
  map: RaidMapType;
  path: Array<{ x: number; y: number }>;
}) {
  const widthPx = map.width * STRIDE - GAP_PX + PAD_PX * 2;
  const heightPx = map.height * STRIDE - GAP_PX + PAD_PX * 2;
  const points = path
    .map(
      (p) =>
        `${p.x * STRIDE + PAD_PX + TILE_PX / 2},${
          p.y * STRIDE + PAD_PX + TILE_PX / 2
        }`,
    )
    .join(" ");
  return (
    <svg
      className="pointer-events-none absolute left-0 top-0 z-20"
      width={widthPx}
      height={heightPx}
      viewBox={`0 0 ${widthPx} ${heightPx}`}
    >
      <polyline
        points={points}
        fill="none"
        stroke="rgba(74,222,128,0.65)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="4 3"
      />
    </svg>
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
