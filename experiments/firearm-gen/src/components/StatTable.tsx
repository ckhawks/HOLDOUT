import type { FirearmInstance, WeaponStats } from "@/lib/types";
import { INVERTED_STATS, STAT_KEYS, STAT_LABELS } from "@/lib/types";

interface Props {
  firearm: FirearmInstance;
}

export function StatTable({ firearm }: Props) {
  const { baseStats, finalStats, attributions } = firearm;

  const attribByStat: Record<string, typeof attributions> = {};
  for (const a of attributions) {
    (attribByStat[a.stat] ??= []).push(a);
  }

  return (
    <div className="font-mono text-xs">
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 gap-y-0.5 items-baseline">
        <div className="text-zinc-500 uppercase tracking-wider text-[10px]">stat</div>
        <div className="text-zinc-500 uppercase tracking-wider text-[10px] text-right">base</div>
        <div className="text-zinc-500 uppercase tracking-wider text-[10px] text-right">Δ</div>
        <div className="text-zinc-500 uppercase tracking-wider text-[10px] text-right">final</div>

        {STAT_KEYS.map((key) => {
          const base = baseStats[key];
          const final = finalStats[key];
          const delta = round(final - base, key);
          const inverted = INVERTED_STATS.has(key);
          const isImprovement =
            delta !== 0 && (inverted ? delta < 0 : delta > 0);
          const isWorsened =
            delta !== 0 && (inverted ? delta > 0 : delta < 0);
          const attrs = attribByStat[key] ?? [];

          return (
            <Row
              key={key}
              label={STAT_LABELS[key]}
              base={fmt(base, key)}
              delta={delta === 0 ? "—" : (delta > 0 ? `+${fmt(delta, key)}` : fmt(delta, key))}
              final={fmt(final, key)}
              improvement={isImprovement}
              worsened={isWorsened}
              attributions={attrs.map((a) => ({
                name: a.attachmentName,
                delta: a.delta,
                statKey: key as keyof WeaponStats,
              }))}
            />
          );
        })}
      </div>
    </div>
  );
}

function Row(props: {
  label: string;
  base: string;
  delta: string;
  final: string;
  improvement: boolean;
  worsened: boolean;
  attributions: { name: string; delta: number; statKey: keyof WeaponStats }[];
}) {
  const deltaClass = props.improvement
    ? "text-emerald-500"
    : props.worsened
    ? "text-rose-500"
    : "text-zinc-500";

  return (
    <>
      <div className="text-zinc-300">
        {props.label}
        {props.attributions.length > 0 && (
          <span className="ml-2 text-[10px] text-zinc-500">
            {props.attributions
              .map((a) => `${a.name} ${a.delta > 0 ? "+" : ""}${a.delta}`)
              .join(", ")}
          </span>
        )}
      </div>
      <div className="text-right text-zinc-400 tabular-nums">{props.base}</div>
      <div className={`text-right tabular-nums ${deltaClass}`}>{props.delta}</div>
      <div className="text-right text-zinc-100 font-semibold tabular-nums">{props.final}</div>
    </>
  );
}

function fmt(v: number, stat: keyof WeaponStats): string {
  if (stat === "weight") return v.toFixed(1);
  return Math.round(v).toString();
}

function round(v: number, stat: keyof WeaponStats): number {
  if (stat === "weight") return Math.round(v * 10) / 10;
  return Math.round(v);
}
