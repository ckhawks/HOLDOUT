"use client";

import { useEffect, useRef, useState } from "react";
import { useGame } from "@/store/game";
import { useNow } from "@/lib/useNow";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { splitItemText, tierColorFor } from "@/lib/itemDisplay";
import type { BranchEffects, BranchOption, PendingChoice } from "@/lib/types";

interface Chip {
  text: string;
  tone: "bad" | "good" | "neutral" | "loot";
}

function chipsFor(opt: BranchOption): Chip[] {
  const fx: BranchEffects = opt.effects ?? {};
  const chips: Chip[] = [];
  const stat = (delta: number | undefined, label: string, lowerIsGood = false) => {
    if (!delta) return;
    const sign = delta > 0 ? "+" : "";
    const goodIfPositive = !lowerIsGood;
    const tone =
      (delta > 0 && goodIfPositive) || (delta < 0 && !goodIfPositive)
        ? "good"
        : "bad";
    chips.push({ text: `${sign}${delta} ${label}`, tone });
  };
  // Convention: HP/Energy/Ammo positive = good. Heat positive = bad.
  stat(fx.healthDelta, "HP");
  stat(fx.energyDelta, "EN");
  stat(fx.ammoDelta, "Ammo");
  stat(fx.heatDelta, "Heat", true);
  if (fx.distanceAdvance && fx.distanceAdvance > 0) {
    chips.push({ text: `+${fx.distanceAdvance} Dist`, tone: "bad" });
  }
  if (fx.depthAdvance === 0 && fx.distanceAdvance === 0) {
    chips.push({ text: "no advance", tone: "neutral" });
  }
  if (fx.flagsAdded?.length) {
    for (const f of fx.flagsAdded) {
      chips.push({ text: `+${f.replace(/_/g, " ")}`, tone: "neutral" });
    }
  }
  if (fx.rollLoot) {
    chips.push({
      text: fx.rollLoot === "rare" ? "rare loot" : "loot",
      tone: "loot",
    });
  }
  return chips;
}

export function BranchModal() {
  const choice = useGame((s) => s.currentRaid?.pendingChoice ?? null);
  if (!choice) return null;
  // Combat stance_pick renders inline in the action card so the player
  // can still see HP, the event log, and the map during combat. Skip
  // the full-screen modal for it.
  if (choice.eventId === "stance_pick") return null;
  // Keyed remount on each new choice: lets the inner component seed
  // selectedIdx from `choice.defaultId` via useState's lazy initializer
  // instead of an in-effect setState (which the React Compiler flags as a
  // cascading render).
  return <BranchModalInner key={`${choice.eventId}-${choice.startedAt}`} choice={choice} />;
}

function BranchModalInner({ choice }: { choice: PendingChoice }) {
  const paused = useGame((s) => s.currentRaid?.pausedAt ?? null);
  const resolve = useGame((s) => s.resolvePendingChoice);
  // Wall-clock subscription via useSyncExternalStore — fresh on every render,
  // no stale state to chase on unpause. Auto-resolve fires from a render-time
  // check rather than a separate `now`-dep effect.
  const wallNow = useNow();
  const now = paused ?? wallNow;

  useEffect(() => {
    if (paused) return;
    if (wallNow >= choice.startedAt + choice.timerMs) {
      resolve(choice.defaultId);
    }
  }, [choice, paused, wallNow, resolve]);

  const [selectedIdx, setSelectedIdx] = useState(() => {
    const def = choice.options.findIndex((o) => o.id === choice.defaultId);
    return def >= 0 ? def : 0;
  });
  const selectedIdxRef = useRef(selectedIdx);
  useEffect(() => {
    selectedIdxRef.current = selectedIdx;
  }, [selectedIdx]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      const isUp = e.key === "ArrowUp" || e.code === "ArrowUp";
      const isDown = e.key === "ArrowDown" || e.code === "ArrowDown";
      const isConfirm =
        e.key === "Enter" ||
        e.code === "Enter" ||
        e.code === "NumpadEnter" ||
        e.key === "ArrowRight" ||
        e.code === "ArrowRight";
      if (!isUp && !isDown && !isConfirm) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      if (isUp || isDown) {
        const len = choice.options.length;
        setSelectedIdx((i) => (i + (isDown ? 1 : -1) + len) % len);
      } else {
        const opt = choice.options[selectedIdxRef.current];
        if (opt) resolve(opt.id);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [choice, resolve]);

  if (!choice) return null;

  const elapsed = Math.max(0, now - choice.startedAt);
  const remaining = Math.max(0, choice.timerMs - elapsed);
  const pct = Math.max(0, Math.min(1, 1 - elapsed / choice.timerMs));
  const seconds = Math.ceil(remaining / 1000);
  const urgent = remaining < 3000;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-[min(560px,90%)] rounded-md border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
          <span className="font-mono text-[10px] uppercase tracking-widest text-amber-400/80">
            Decision required
          </span>
          <span
            className={cn(
              "font-mono text-xs tabular-nums",
              urgent ? "text-red-400" : "text-muted-foreground",
            )}
          >
            {seconds}s — defaults to{" "}
            <span className="text-foreground">
              {choice.options.find((o) => o.id === choice.defaultId)?.label ?? "—"}
            </span>
          </span>
        </div>
        <div className="px-5 py-4 text-foreground/90 leading-relaxed">
          {splitItemText(choice.prompt).parts.map((p, i) =>
            p.isItem ? (
              <span key={i} className={cn("font-semibold", tierColorFor(undefined))}>
                {p.text}
              </span>
            ) : (
              <span key={i}>{p.text}</span>
            ),
          )}
        </div>
        <div className="h-1 bg-border/40">
          <div
            className={cn(
              "h-full",
              urgent ? "bg-red-400/80" : "bg-foreground/40",
            )}
            style={{ width: `${pct * 100}%`, transition: "width 100ms linear" }}
          />
        </div>
        <div className="flex flex-col gap-2 px-5 py-4">
          {choice.options.map((opt, idx) => {
            const chips = opt.chips ?? chipsFor(opt);
            const isSelected = idx === selectedIdx;
            return (
              <Button
                key={opt.id}
                variant="outline"
                onClick={() => resolve(opt.id)}
                onMouseEnter={() => setSelectedIdx(idx)}
                className={cn(
                  "h-auto justify-start py-2.5",
                  opt.isDefault && "ring-2 ring-amber-400/60",
                  isSelected && "border-emerald-400 bg-emerald-400/10",
                )}
              >
                <ChevronRight
                  className={cn(
                    "size-4 shrink-0",
                    isSelected ? "text-emerald-400" : "text-transparent",
                  )}
                />
                <div className="flex flex-col items-start gap-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{opt.label}</span>
                    {opt.isDefault ? (
                      <span className="rounded-sm bg-amber-400/20 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-amber-300">
                        Default
                      </span>
                    ) : null}
                    {opt.description ? (
                      <span className="text-[11px] font-normal opacity-70">
                        {opt.description}
                      </span>
                    ) : null}
                  </div>
                  {chips.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-1">
                      {chips.map((c, i) => (
                        <span
                          key={i}
                          className={cn(
                            "inline-block rounded-sm border px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wider",
                            c.tone === "good" && "border-emerald-400/50 bg-emerald-500/25 text-emerald-100",
                            c.tone === "bad" && "border-red-400/50 bg-red-500/25 text-red-100",
                            c.tone === "loot" && "border-amber-400/50 bg-amber-500/25 text-amber-100",
                            c.tone === "neutral" && "border-foreground/30 bg-foreground/15 text-foreground",
                          )}
                        >
                          {c.text}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
