import type { ArmorInstance, Era, Tier } from "@/lib/types";
import { ARMOR_INVERTED_STATS, ARMOR_STAT_KEYS, ARMOR_STAT_LABELS } from "@/lib/types";
import { ARMOR_BASES } from "@/lib/data/armor";
import { BRANDS } from "@/lib/data/weapons";
import { BrandLogo } from "@/components/BrandLogo";
import { ArmorPieceIcon } from "@/components/ArmorPieceIcon";

interface Props {
  armor: ArmorInstance;
}

const TIER_COLORS: Record<Tier, string> = {
  common: "text-zinc-400 border-zinc-700",
  uncommon: "text-emerald-400 border-emerald-700/60",
  rare: "text-sky-400 border-sky-700/60",
  experimental: "text-fuchsia-400 border-fuchsia-700/60",
};

const TIER_BG: Record<Tier, string> = {
  common: "bg-zinc-900/60",
  uncommon: "bg-emerald-950/30",
  rare: "bg-sky-950/30",
  experimental: "bg-fuchsia-950/30",
};

const ERA_LABEL: Record<Era, string> = {
  modern: "MODERN",
  advanced: "ADVANCED",
  exotic: "EXOTIC",
};

export function ArmorCard({ armor }: Props) {
  const base = ARMOR_BASES[armor.baseId];
  const brand = BRANDS[armor.brandId];
  const tierClasses = TIER_COLORS[armor.tier];
  const bgClasses = TIER_BG[armor.tier];

  return (
    <div
      className={`border ${tierClasses} ${bgClasses} rounded-md p-4 font-mono text-zinc-200`}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-shrink-0 mt-0.5">
          <BrandLogo brandId={armor.brandId} size={36} />
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="flex items-center gap-2 text-[10px] uppercase tracking-widest"
            style={{ color: brand.color }}
          >
            <span>{brand.name}</span>
            <span className="text-zinc-700">·</span>
            <span className="text-zinc-500">{ERA_LABEL[armor.era]}</span>
          </div>
          <div className="text-zinc-100 text-base font-semibold leading-snug truncate">
            {armor.fullName}
          </div>
          <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-500">
            <ArmorPieceIcon piece={armor.piece} size={16} />
            <span>{base.className}</span>
            <span className="text-zinc-700">·</span>
            <span className="text-zinc-400 uppercase tracking-wider">{armor.piece}</span>
          </div>
        </div>
        <div className={`text-[10px] uppercase tracking-widest font-semibold ${tierClasses.split(" ")[0]}`}>
          {armor.tier}
        </div>
      </div>

      {/* Stats */}
      <StatBlock armor={armor} />

      {/* Coverage */}
      <div className="mt-3 pt-3 border-t border-zinc-800/80">
        <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
          coverage
        </div>
        <div className="flex flex-wrap gap-1">
          {armor.coverage.map((z) => (
            <span
              key={z}
              className="text-[10px] uppercase tracking-wider text-zinc-300 bg-zinc-800/80 px-2 py-0.5 rounded"
            >
              {z}
            </span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500">
        <div>
          condition <span className="text-zinc-300">{armor.condition}</span>
          <span className="text-zinc-700">/100</span>
        </div>
        <div className="font-mono text-[10px] text-zinc-600">#{armor.uid}</div>
      </div>
    </div>
  );
}

function StatBlock({ armor }: { armor: ArmorInstance }) {
  return (
    <div className="font-mono text-xs">
      <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 items-baseline">
        <div className="text-zinc-500 uppercase tracking-wider text-[10px]">stat</div>
        <div className="text-zinc-500 uppercase tracking-wider text-[10px] text-right">value</div>

        {ARMOR_STAT_KEYS.map((key) => {
          const value = armor.finalStats[key];
          const isInverted = ARMOR_INVERTED_STATS.has(key);
          const isBad = key === "stealth" || key === "mobility" ? value < 0 : false;
          const isGood = key === "stealth" || key === "mobility" ? value > 0 : false;
          const valueClass = isBad
            ? "text-rose-400"
            : isGood
            ? "text-emerald-400"
            : "text-zinc-100";
          const display = key === "weight" ? value.toFixed(1) : Math.round(value).toString();
          const suffix =
            key === "weight"
              ? "kg"
              : key === "stealth" || key === "mobility"
              ? value > 0
                ? " bonus"
                : value < 0
                ? " penalty"
                : ""
              : "";
          return (
            <RowMini
              key={key}
              label={ARMOR_STAT_LABELS[key]}
              value={`${value > 0 && (key === "stealth" || key === "mobility") ? "+" : ""}${display}${suffix}`}
              valueClass={valueClass}
              isInverted={isInverted}
            />
          );
        })}
      </div>
    </div>
  );
}

function RowMini({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass: string;
  isInverted: boolean;
}) {
  return (
    <>
      <div className="text-zinc-300">{label}</div>
      <div className={`text-right font-semibold tabular-nums ${valueClass}`}>{value}</div>
    </>
  );
}
