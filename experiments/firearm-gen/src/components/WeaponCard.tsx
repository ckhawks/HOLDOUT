import type { Era, FirearmInstance, Tier } from "@/lib/types";
import { AMMO_TYPES, BRANDS, CALIBERS, WEAPON_BASES } from "@/lib/data/weapons";
import { BrandLogo } from "@/components/BrandLogo";
import { WeaponClassIcon } from "@/components/WeaponClassIcon";
import { StatTable } from "@/components/StatTable";

interface Props {
  firearm: FirearmInstance;
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

export function WeaponCard({ firearm }: Props) {
  const base = WEAPON_BASES[firearm.baseId];
  const brand = BRANDS[firearm.brandId];
  const caliber = CALIBERS[firearm.caliberId];
  const ammo = AMMO_TYPES[firearm.ammoTypeId];
  const tierClasses = TIER_COLORS[firearm.tier];
  const bgClasses = TIER_BG[firearm.tier];

  return (
    <div
      className={`border ${tierClasses} ${bgClasses} rounded-md p-4 font-mono text-zinc-200`}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-shrink-0 mt-0.5">
          <BrandLogo brandId={firearm.brandId} size={36} />
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="flex items-center gap-2 text-[10px] uppercase tracking-widest"
            style={{ color: brand.color }}
          >
            <span>{brand.name}</span>
            <span className="text-zinc-700">·</span>
            <span className="text-zinc-500">{ERA_LABEL[firearm.era]}</span>
          </div>
          <div className="text-zinc-100 text-base font-semibold leading-snug truncate">
            {firearm.fullName}
          </div>
          <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-500">
            <WeaponClassIcon weaponClass={firearm.weaponClass} size={16} />
            <span>{base.className}</span>
            <span className="text-zinc-700">·</span>
            <span className="text-zinc-400">{caliber.name}</span>
          </div>
        </div>
        <div className={`text-[10px] uppercase tracking-widest font-semibold ${tierClasses.split(" ")[0]}`}>
          {firearm.tier}
        </div>
      </div>

      {/* Stats */}
      <StatTable firearm={firearm} />

      {/* Attachments */}
      <div className="mt-3 pt-3 border-t border-zinc-800/80">
        <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
          attachments
        </div>
        {firearm.attachments.length === 0 ? (
          <div className="text-xs text-zinc-600 italic">— none equipped —</div>
        ) : (
          <ul className="text-xs text-zinc-300 space-y-0.5">
            {firearm.attachments.map((a) => (
              <li key={a.id} className="flex items-baseline gap-2">
                <span className="text-zinc-500 text-[10px] uppercase w-[68px] shrink-0">
                  {a.slot}
                </span>
                <span>{a.name}</span>
                <span className="text-[10px] text-zinc-600 uppercase ml-auto">
                  {a.tier}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Loaded ammo */}
      <div className="mt-3 pt-3 border-t border-zinc-800/80">
        <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
          loaded ammo
        </div>
        <div className="text-xs flex items-baseline gap-2">
          <span className="text-zinc-200 font-semibold">{ammo.name}</span>
          <span className="text-[10px] uppercase text-zinc-600">{ammo.tier}</span>
        </div>
        <div className="text-[11px] text-zinc-500 italic mt-0.5">{ammo.blurb}</div>
      </div>

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500">
        <div>
          condition <span className="text-zinc-300">{firearm.condition}</span>
          <span className="text-zinc-700">/100</span>
        </div>
        <div className="font-mono text-[10px] text-zinc-600">#{firearm.uid}</div>
      </div>
    </div>
  );
}
