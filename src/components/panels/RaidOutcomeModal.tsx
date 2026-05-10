"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Crosshair,
  Flame,
  Footprints,
  Heart,
  Map as MapIcon,
  Package,
  PillBottle,
  Skull,
  Zap,
} from "lucide-react";
import { useGame, type RaidOutcome, type RaidReportItem } from "@/store/game";
import { Button } from "@/components/ui/button";
import { LOCATIONS_BY_ID } from "@/lib/data/locations";
import { ITEMS } from "@/lib/data/items";
import { TIER_COLOR } from "@/lib/itemDisplay";

export function RaidOutcomeModal() {
  const outcome = useGame((s) => s.raidOutcome);
  const dismiss = useGame((s) => s.dismissRaidOutcome);
  if (!outcome) return null;

  const isDeath = outcome.type === "death";
  const locName = LOCATIONS_BY_ID[outcome.locationId]?.name ?? outcome.locationId;
  const accent = isDeath
    ? {
        ring: "border-red-500/40",
        bar: "border-red-500/30 bg-red-500/10",
        chip: "text-red-200",
        icon: <Skull className="size-5 text-red-300" />,
        label: "Operative lost",
        button: "destructive" as const,
      }
    : {
        ring: "border-emerald-500/40",
        bar: "border-emerald-500/30 bg-emerald-500/10",
        chip: "text-emerald-200",
        icon: <CheckCircle2 className="size-5 text-emerald-300" />,
        label: "Extracted",
        button: "default" as const,
      };

  const netCash = outcome.endingValue - outcome.startingValue;
  const minutes = Math.floor(outcome.durationMs / 60000);
  const seconds = Math.floor((outcome.durationMs % 60000) / 1000);
  const durationText = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  const totalCombat =
    outcome.combatTargetsDown +
    outcome.combatTargetsFled +
    outcome.combatBrokeContact +
    outcome.combatTradedShots;

  return (
    <div className="raid-report-backdrop fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div
        className={[
          "raid-report-card relative w-[min(720px,92%)] max-h-[88vh] overflow-hidden rounded-md border bg-card shadow-2xl",
          accent.ring,
        ].join(" ")}
      >
        {/* Sweep overlay — runs once on mount. */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className={[
              "raid-report-sweep absolute inset-y-0 -left-1/2 w-1/2",
              "bg-gradient-to-r from-transparent via-white/[0.06] to-transparent",
            ].join(" ")}
          />
        </div>

        {/* Header */}
        <div className={["flex items-center gap-3 border-b px-5 py-3", accent.bar].join(" ")}>
          {accent.icon}
          <span className={["font-mono text-[11px] uppercase tracking-widest", accent.chip].join(" ")}>
            {accent.label}
          </span>
          <span className="ml-auto font-mono text-[11px] text-muted-foreground">
            {locName} · {durationText}
          </span>
        </div>

        {/* Body */}
        <div className="max-h-[calc(88vh-7rem)] overflow-y-auto px-5 py-4 space-y-4">
          {isDeath ? (
            <p className="text-foreground/90 leading-relaxed">
              Vital signs flat. The operative didn&apos;t make it out of the {locName}.
              Everything they were carrying is lost. They&apos;ll come back injured —
              give them time before the next dispatch.
            </p>
          ) : (
            <p className="text-foreground/90 leading-relaxed">
              Operative is back. Loadout intact. Here&apos;s how it went.
            </p>
          )}

          <Section title="Loot ledger" icon={<Package className="size-3.5" />}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Stat
                label="Looted"
                value={outcome.itemsLooted.length}
                accent={outcome.itemsLooted.length > 0 ? "text-emerald-300" : undefined}
              />
              <Stat
                label="Lost"
                value={outcome.itemsLost.length}
                accent={outcome.itemsLost.length > 0 ? "text-red-300" : undefined}
              />
              <Stat
                label={isDeath ? "Net value" : "Loot value"}
                value={`¤${isDeath ? -outcome.startingValue : netCash >= 0 ? `+${netCash}` : netCash}`}
                accent={
                  isDeath || netCash < 0
                    ? "text-red-300"
                    : netCash > 0
                      ? "text-emerald-300"
                      : undefined
                }
                mono
              />
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ItemList
                title="Looted"
                items={outcome.itemsLooted}
                emptyText="No new loot."
                tone="gain"
              />
              <ItemList
                title="Lost"
                items={outcome.itemsLost}
                emptyText="Nothing lost."
                tone="loss"
              />
            </div>
          </Section>

          <Section title="Vitals" icon={<Heart className="size-3.5" />}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat
                label="Final HP"
                value={outcome.finalHealth}
                icon={<Heart className="size-3 text-red-300" />}
                accent={
                  outcome.finalHealth <= 25
                    ? "text-red-300"
                    : outcome.finalHealth <= 60
                      ? "text-amber-300"
                      : "text-emerald-300"
                }
                mono
              />
              <Stat
                label="Final Energy"
                value={outcome.finalEnergy}
                icon={<Zap className="size-3 text-yellow-300" />}
                mono
              />
              <Stat
                label="Damage taken"
                value={outcome.damageTaken}
                icon={<Heart className="size-3 text-red-300" />}
                accent={outcome.damageTaken > 0 ? "text-red-300" : undefined}
                mono
              />
              <Stat
                label="Heat peak"
                value={outcome.heatPeak}
                icon={<Flame className="size-3 text-orange-300" />}
                accent={
                  outcome.heatPeak >= 75
                    ? "text-red-300"
                    : outcome.heatPeak >= 40
                      ? "text-amber-300"
                      : undefined
                }
                mono
              />
            </div>
          </Section>

          {totalCombat > 0 && (
            <Section title="Combat" icon={<Crosshair className="size-3.5" />}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Targets down" value={outcome.combatTargetsDown} mono />
                <Stat label="Got away" value={outcome.combatTargetsFled} mono />
                <Stat label="Broke contact" value={outcome.combatBrokeContact} mono />
                <Stat label="Trade shots" value={outcome.combatTradedShots} mono />
              </div>
            </Section>
          )}

          {outcome.choicesMade.length > 0 && (
            <Section title="Decisions" icon={<ArrowUpRight className="size-3.5" />}>
              <ul className="space-y-1">
                {outcome.choicesMade.map((c, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <ArrowDownRight className="size-3.5 text-muted-foreground/60" />
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
                      {c.eventId.replace(/_/g, " ")}
                    </span>
                    <span className="text-foreground/90">→ {c.label}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {outcome.consumablesUsed.length > 0 && (
            <Section title="Consumables used" icon={<PillBottle className="size-3.5" />}>
              <div className="flex flex-wrap gap-2">
                {outcome.consumablesUsed.map((c) => {
                  const name = ITEMS[c.itemId]?.name ?? c.itemId;
                  return (
                    <span
                      key={c.itemId}
                      className="inline-flex items-center gap-1.5 rounded-sm border border-border/60 bg-muted/30 px-2 py-1 text-xs"
                    >
                      <span className="text-foreground/90">{name}</span>
                      {c.count > 1 && (
                        <span className="font-mono text-[10px] text-muted-foreground">×{c.count}</span>
                      )}
                    </span>
                  );
                })}
              </div>
            </Section>
          )}

          <Section title="Exploration" icon={<MapIcon className="size-3.5" />}>
            <div className="flex items-center gap-3">
              <Footprints className="size-3.5 text-muted-foreground" />
              <span className="font-mono text-sm text-foreground/90">
                {outcome.tilesVisited} / {outcome.totalTiles}
              </span>
              <span className="text-xs text-muted-foreground">rooms entered</span>
            </div>
          </Section>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-border/60 px-5 py-3">
          <Button
            onClick={dismiss}
            variant={accent.button}
            className="rounded-sm"
          >
            {isDeath ? "Acknowledge" : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 border-b border-border/40 pb-1">
        <span className="text-muted-foreground">{icon}</span>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  accent,
  mono,
}: {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
  accent?: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-sm border border-border/40 bg-muted/20 px-2.5 py-1.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        <span className="font-mono">{label}</span>
      </div>
      <div
        className={[
          mono ? "font-mono" : "",
          "text-base text-foreground/95",
          accent ?? "",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}

function ItemList({
  title,
  items,
  emptyText,
  tone,
}: {
  title: string;
  items: RaidReportItem[];
  emptyText: string;
  tone: "gain" | "loss";
}) {
  return (
    <div className="rounded-sm border border-border/40 bg-muted/10 p-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">
          {items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <div className="text-xs italic text-muted-foreground/60">{emptyText}</div>
      ) : (
        <ul className="space-y-0.5">
          {[...items].sort((a, b) => b.sellValue - a.sellValue).map((it) => {
            const def = ITEMS[it.itemId];
            const tier = def?.tier ?? "common";
            const name = def?.name ?? it.itemId;
            return (
              <li
                key={it.uid}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className={["truncate font-medium", TIER_COLOR[tier]].join(" ")}>
                  {name}
                </span>
                <span
                  className={[
                    "font-mono text-[11px]",
                    tone === "gain" ? "text-emerald-300/80" : "text-red-300/80",
                  ].join(" ")}
                >
                  {tone === "gain" ? "+" : "−"}¤{it.sellValue}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// Re-export the type used in the modal so other files can import it from
// here without round-tripping through @/store/game (no behavioral change).
export type { RaidOutcome };
