"use client";

import { useEffect, useState } from "react";
import { useGame } from "@/store/game";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { splitItemText, tierColorFor } from "@/lib/itemDisplay";
import type { BranchEffects, BranchOption } from "@/lib/types";

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
  // Convention: HP/Energy/Ammo positive = good. Alertness positive = bad.
  stat(fx.healthDelta, "HP");
  stat(fx.energyDelta, "EN");
  stat(fx.ammoDelta, "Ammo");
  stat(fx.alertnessDelta, "Alert", true);
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
  // BranchModal is dormant in the action-driven phase 1; pendingChoice is
  // never set. Kept around for phase 2 forced-choice interrupts (patrols,
  // locked-door encounters).
  const choice = useGame((s) => s.currentRaid?.pendingChoice ?? null);
  const paused = useGame((s) => s.currentRaid?.pausedAt ?? null);
  const resolve = (_id: string) => {
    /* no-op until phase 2 wires forced-choice interrupts */
  };
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!choice) return;
    if (paused) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, [choice, paused]);

  useEffect(() => {
    if (!choice) return;
    if (paused) return;
    const remaining = choice.startedAt + choice.timerMs - now;
    if (remaining <= 0) {
      resolve(choice.defaultId);
    }
  }, [choice, paused, now, resolve]);

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
          {choice.options.map((opt) => {
            const chips = chipsFor(opt);
            return (
              <Button
                key={opt.id}
                variant="outline"
                onClick={() => resolve(opt.id)}
                className={cn(
                  "h-auto justify-start py-2.5",
                  opt.isDefault && "ring-2 ring-amber-400/60",
                )}
              >
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
