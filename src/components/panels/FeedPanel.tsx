"use client";

import { useEffect, useRef, useState } from "react";
import { useGame } from "@/store/game";
import { Button } from "@/components/ui/button";
import { PanelHeader } from "./PanelHeader";
import {
  Bandage,
  CornerDownRight,
  Crosshair,
  Droplet,
  Flame,
  Footprints,
  Heart,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { splitItemText, tierColorFor } from "@/lib/itemDisplay";
import { PackTetris } from "./PackTetris";
import { BranchModal } from "./BranchModal";
import { NextActionCard } from "./NextActionCard";
import { RaidMap } from "./RaidMap";
import { LOCATIONS_BY_ID } from "@/lib/data/locations";

export function FeedPanel() {
  const raid = useGame((s) => s.currentRaid);
  const useBandage = useGame((s) => s.useBandage);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [raid?.log.length]);

  if (!raid) {
    return (
      <section className="flex min-h-0 flex-1 flex-col">
        <PanelHeader title="Comms Feed" subtitle="No active raid. Dispatch from Ops to begin." />
        <div className="flex flex-1 items-center justify-center font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          channel idle · waiting for handler
        </div>
      </section>
    );
  }

  const rs = raid.runState;
  const hasBleed =
    rs.flags.includes("bleeding_minor") || rs.flags.includes("bleeding_major");
  const hasMajor = rs.flags.includes("bleeding_major");
  const hasBandage =
    raid.equipment.pockets.items.some((p) => p.itemId === "bandage_pack") ||
    !!raid.equipment.bag?.items.some((p) => p.itemId === "bandage_pack");
  const extracting = rs.flags.includes("extracting");
  const exhausted = rs.energy <= 0;

  const locationName = LOCATIONS_BY_ID[raid.locationId]?.name ?? raid.locationId;

  return (
    <section className="relative flex min-h-0 flex-1 flex-col">
      <PanelHeader
        title="Comms Feed"
        subtitle={
          extracting
            ? `${locationName} · extracting · about ${rs.distanceFromExtract} rooms away`
            : `${locationName} · depth ${rs.depth}`
        }
      />
      <div className="grid grid-cols-5 gap-3 border-b border-border/60 px-6 py-3 font-mono text-[11px] uppercase tracking-widest">
        <Stat icon={Heart} label="Health" value={rs.health} tone={rs.health < 40 ? "warn" : "ok"} />
        <Stat icon={Zap} label="Energy" value={rs.energy} tone={rs.energy < 30 ? "warn" : "ok"} />
        <Stat icon={Flame} label="Heat" value={rs.heat} tone={rs.heat > 60 ? "warn" : "ok"} inverted />
        <Stat icon={Crosshair} label="Ammo" value={rs.ammo} tone={rs.ammo < 10 ? "warn" : "ok"} />
        <Stat icon={Footprints} label="Distance" value={rs.distanceFromExtract} />
      </div>
      {hasBleed ? (
        <div className="flex items-center gap-3 border-b border-border/60 bg-red-500/5 px-6 py-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest",
              hasMajor ? "bg-red-500/20 text-red-300" : "bg-amber-500/20 text-amber-300",
            )}
          >
            <Droplet className="size-3" />
            {hasMajor ? "Major bleed" : "Minor bleed"}
          </span>
          <span className="text-xs text-muted-foreground">
            HP draining each tick.
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={!hasBandage}
            onClick={useBandage}
            className="ml-auto"
          >
            Bandage
            <Bandage className="size-3.5" />
          </Button>
        </div>
      ) : null}
      {exhausted ? (
        <div className="flex items-center gap-3 border-b border-border/60 bg-amber-500/5 px-6 py-2">
          <span className="inline-flex items-center gap-1 rounded-sm bg-amber-500/20 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-amber-300">
            <Zap className="size-3" />
            Exhausted
          </span>
          <span className="text-xs text-muted-foreground">
            HP draining each tick — eat or drink something.
          </span>
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div ref={scrollRef} className="min-h-0 flex-1 select-text overflow-y-auto px-6 py-4 text-sm">
        {raid.log.map((entry, idx) => {
          const distFromEnd = raid.log.length - 1 - idx;
          const opacity = Math.max(0.25, 1 - distFromEnd * 0.05);
          if (entry.kind === "choice_result") {
            return (
              <div
                key={entry.id}
                className="flex items-center gap-2 py-0.5 pl-[7.25rem] text-[13px] text-amber-300/90 transition-opacity"
                style={{ opacity }}
              >
                <CornerDownRight className="size-3.5 shrink-0 opacity-70" />
                <span className="italic">{entry.text}</span>
              </div>
            );
          }
          if (entry.kind === "combat_resolved") {
            return (
              <div
                key={entry.id}
                className="my-1 flex items-center gap-3 border-l-2 border-amber-400/70 bg-amber-500/5 py-2 pl-3 pr-3 transition-opacity"
                style={{ opacity }}
              >
                <Crosshair className="size-4 shrink-0 text-amber-300" />
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-amber-300">
                  Engagement
                </span>
                <span className="text-foreground leading-relaxed font-medium">
                  {splitItemText(entry.text).parts.map((p, i) =>
                    p.isItem ? (
                      <span
                        key={i}
                        className={cn("font-semibold", tierColorFor(entry.itemId))}
                      >
                        {p.text}
                      </span>
                    ) : (
                      <span key={i}>{p.text}</span>
                    ),
                  )}
                </span>
              </div>
            );
          }
          return (
          <div
            key={entry.id}
            className="flex items-center gap-3 py-1.5 transition-opacity"
            style={{ opacity }}
          >
            <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
              {new Date(entry.timestamp).toLocaleTimeString([], { hour12: false })}
            </span>
            <span
              className={cn(
                "shrink-0 font-mono uppercase tracking-widest text-[10px] w-16",
                entry.kind === "loot" && "text-emerald-400/80",
                entry.kind === "damage" && "text-red-400/80",
                entry.kind === "system" && "text-foreground",
                entry.kind === "flavor" && "text-muted-foreground",
                entry.kind === "choice" && "text-amber-400/80",
              )}
            >
              {entry.kind}
            </span>
            <span className="text-foreground/90 leading-relaxed">
              {splitItemText(entry.text).parts.map((p, i) =>
                p.isItem ? (
                  <span
                    key={i}
                    className={cn(
                      "font-semibold",
                      tierColorFor(entry.itemId),
                    )}
                  >
                    {p.text}
                  </span>
                ) : (
                  <span key={i}>{p.text}</span>
                ),
              )}
            </span>
          </div>
          );
        })}
      </div>
      <RaidMap />
      </div>
      <NextActionCard />
      <PackTetris />
      </div>
      <BranchModal />
    </section>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
  // True if higher = bad for this stat (heat). Inverts the up/down color
  // mapping: heat going up flashes red; everything else uses up=green.
  inverted = false,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  tone?: "ok" | "warn";
  inverted?: boolean;
}) {
  const prevRef = useRef(value);
  const [flash, setFlash] = useState<"good" | "bad" | null>(null);
  const [delta, setDelta] = useState<number | null>(null);

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = value;
    if (prev === value) return;
    if (typeof prev !== "number" || typeof value !== "number") return;
    const diff = value - prev;
    // "good" = the direction the player wants this stat to move. For HP /
    // Energy / Ammo / Distance, that's up; for Heat (inverted), down.
    const isGood = inverted ? diff < 0 : diff > 0;
    setFlash(isGood ? "good" : "bad");
    setDelta(diff);
    const t = setTimeout(() => {
      setFlash(null);
      setDelta(null);
    }, 800);
    return () => clearTimeout(t);
  }, [value, inverted]);

  return (
    <div className="relative flex flex-col">
      <span className="flex items-center gap-1 text-muted-foreground">
        {Icon ? <Icon className="size-3" /> : null}
        {label}
      </span>
      <span
        className={cn(
          "transition-colors duration-300",
          // Flash color wins during the 800ms animation window. Falls back
          // to the warn (amber) or default tone after.
          flash === "good" && "text-emerald-300",
          flash === "bad" && "text-red-400",
          !flash && tone === "warn" && "text-amber-400",
          !flash && tone !== "warn" && "text-foreground",
        )}
      >
        {value}
      </span>
      {delta !== null && delta !== 0 ? (
        <span
          className={cn(
            "stat-delta-float pointer-events-none absolute -right-1 top-0 font-mono text-[10px] tabular-nums",
            flash === "good" ? "text-emerald-300" : "text-red-400",
          )}
        >
          {delta > 0 ? `+${delta}` : delta}
        </span>
      ) : null}
    </div>
  );
}
