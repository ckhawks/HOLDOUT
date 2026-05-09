"use client";

import { useGame } from "@/store/game";
import type { MapTile } from "@/lib/types";
import { cn } from "@/lib/utils";

export function RaidMap() {
  const raid = useGame((s) => s.currentRaid);
  if (!raid) return null;
  const { map, operativePos } = raid;

  return (
    <aside className="flex shrink-0 flex-col border-l border-border/60">
      <div className="border-b border-border/60 px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        Map
      </div>
      <div className="flex flex-1 flex-col items-center px-3 py-3">
        <div className="grid gap-px rounded-sm border border-border/60 bg-border/40 p-px">
          {Array.from({ length: map.height }, (_, y) =>
            Array.from({ length: map.width }, (_, x) => {
              const tile = map.tiles[y * map.width + x];
              const isOperative =
                operativePos.x === x && operativePos.y === y;
              return (
                <Tile
                  key={`${x}-${y}`}
                  tile={tile}
                  isOperative={isOperative}
                  style={{ gridColumn: x + 1, gridRow: y + 1 }}
                />
              );
            }),
          )}
        </div>
      </div>
    </aside>
  );
}

function Tile({
  tile,
  isOperative,
  style,
}: {
  tile: MapTile;
  isOperative: boolean;
  style: React.CSSProperties;
}) {
  if (isOperative) {
    return (
      <div
        style={style}
        className="flex size-7 items-center justify-center bg-card"
        title="Operative"
      >
        <span className="size-3 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(74,222,128,0.8)]" />
      </div>
    );
  }
  if (tile.blocked) {
    return <div style={style} className="size-7 bg-background" title="Sealed" />;
  }
  if (tile.type === "entry") {
    return (
      <div
        style={style}
        className="flex size-7 items-center justify-center bg-card"
        title="Entry / extract"
      >
        <span className="size-2 rounded-full bg-emerald-400/40" />
      </div>
    );
  }
  return (
    <div
      style={style}
      title={tile.looted ? "Cleared" : "Unexplored"}
      className={cn(
        "size-7",
        tile.looted ? "bg-card/50" : "bg-card",
      )}
    />
  );
}
