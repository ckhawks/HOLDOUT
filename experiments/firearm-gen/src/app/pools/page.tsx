import Link from "next/link";
import {
  AMMO_TYPES,
  ATTACHMENTS,
  BRANDS,
  CALIBERS,
  NICKNAMES_BY_TIER,
  VARIANTS_BY_TIER,
  WEAPON_BASES,
} from "@/lib/data/weapons";
import {
  STAT_KEYS,
  STAT_LABELS,
  type AmmoFamily,
  type Attachment,
  type AttachmentSlot,
  type Era,
  type Tier,
  type WeaponClass,
  type WeaponStats,
} from "@/lib/types";
import { BrandLogo } from "@/components/BrandLogo";
import { WeaponClassIcon } from "@/components/WeaponClassIcon";

const CLASS_INFO: Record<WeaponClass, { label: string; tagline: string }> = {
  pistol: { label: "Pistol", tagline: "Compact sidearms. Fast, low recoil, short range." },
  burst: { label: "Burst Rifle", tagline: "Mid-range combat rifles. Controlled bursts, balanced." },
  shotgun: { label: "Shotgun", tagline: "Close-quarters devastation. Heavy damage, narrow range." },
  lmg: { label: "LMG", tagline: "Suppressive fire. High RPM, heavy, high recoil." },
  energy: { label: "Energy", tagline: "Exotic weapons. Long range, low reliability, no mag." },
};

const ERA_LABEL: Record<Era, string> = {
  modern: "MODERN",
  advanced: "ADVANCED",
  exotic: "EXOTIC",
};

const TIER_COLOR: Record<Tier, string> = {
  common: "text-zinc-400",
  uncommon: "text-emerald-400",
  rare: "text-sky-400",
  experimental: "text-fuchsia-400",
};

const TIER_BORDER: Record<Tier, string> = {
  common: "border-zinc-700",
  uncommon: "border-emerald-700/60",
  rare: "border-sky-700/60",
  experimental: "border-fuchsia-700/60",
};

const SLOT_ORDER: AttachmentSlot[] = ["sight", "barrel", "stock", "mag", "underbarrel"];
const TIER_ORDER: Tier[] = ["common", "uncommon", "rare", "experimental"];
const CLASS_ORDER: WeaponClass[] = ["pistol", "burst", "shotgun", "lmg", "energy"];
const ERA_ORDER: Era[] = ["modern", "advanced", "exotic"];

export default function PoolsPage() {
  const basesByClass = groupBy(Object.values(WEAPON_BASES), (b) => b.weaponClass);
  const brandsByEra = groupBy(Object.values(BRANDS), (b) => b.era);
  const attachmentsBySlot = groupBy(Object.values(ATTACHMENTS), (a) => a.slot);
  const calibersByFamily = groupBy(Object.values(CALIBERS), (c) => c.family);
  const ammoByFamily = groupBy(Object.values(AMMO_TYPES), (a) => a.family);
  const FAMILY_ORDER: AmmoFamily[] = ["ballistic", "energy"];
  const FAMILY_LABEL: Record<AmmoFamily, string> = {
    ballistic: "BALLISTIC",
    energy: "ENERGY",
  };

  return (
    <div className="min-h-full bg-zinc-950 text-zinc-100 font-mono">
      <header className="border-b border-zinc-800 bg-zinc-900/40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-baseline justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-wide">FIREARM-GEN · POOLS</h1>
            <p className="text-[11px] uppercase tracking-widest text-zinc-500">
              the entire data set
            </p>
          </div>
          <Link
            href="/"
            className="text-[11px] uppercase tracking-widest text-zinc-400 hover:text-zinc-100 transition"
          >
            ← generator
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-12">
        {/* Weapon classes */}
        <Section
          title="Weapon Classes"
          count={CLASS_ORDER.length}
          subtitle="The five archetypes. Class determines slot layout and stat profile."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CLASS_ORDER.map((c) => (
              <div
                key={c}
                className="border border-zinc-800 bg-zinc-900/40 rounded-md p-5 flex items-start gap-4"
              >
                <div className="text-zinc-100 shrink-0 mt-1">
                  <WeaponClassIcon weaponClass={c} size={56} />
                </div>
                <div className="min-w-0">
                  <div className="text-zinc-100 text-sm font-semibold uppercase tracking-wider">
                    {CLASS_INFO[c].label}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-zinc-500 mt-0.5">
                    {basesByClass[c]?.length ?? 0} bases
                  </div>
                  <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                    {CLASS_INFO[c].tagline}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Manufacturers */}
        <Section
          title="Manufacturers"
          count={Object.keys(BRANDS).length}
          subtitle="Corp-flavored brands. Era-aligned to weapon bases by soft bias."
        >
          {ERA_ORDER.map((era) => {
            const brands = brandsByEra[era] ?? [];
            if (brands.length === 0) return null;
            return (
              <div key={era} className="mb-6 last:mb-0">
                <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-3">
                  {ERA_LABEL[era]} · {brands.length}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {brands.map((b) => (
                    <div
                      key={b.id}
                      className="border border-zinc-800 bg-zinc-900/40 rounded-md p-4 flex items-center gap-3"
                      style={{ borderColor: `${b.color}33` }}
                    >
                      <div className="shrink-0">
                        <BrandLogo brandId={b.id} size={48} />
                      </div>
                      <div className="min-w-0">
                        <div
                          className="text-sm font-semibold truncate"
                          style={{ color: b.color }}
                        >
                          {b.name}
                        </div>
                        <div className="text-[10px] uppercase tracking-widest text-zinc-500">
                          {ERA_LABEL[b.era]}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </Section>

        {/* Calibers */}
        <Section
          title="Calibers"
          count={Object.keys(CALIBERS).length}
          subtitle="Each weapon base is locked to one caliber. Family determines compatible ammo."
        >
          {FAMILY_ORDER.map((fam) => {
            const list = calibersByFamily[fam] ?? [];
            if (list.length === 0) return null;
            const sorted = [...list].sort(
              (a, b) => ERA_ORDER.indexOf(a.era) - ERA_ORDER.indexOf(b.era)
            );
            return (
              <div key={fam} className="mb-6 last:mb-0">
                <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-3">
                  {FAMILY_LABEL[fam]} · {list.length}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {sorted.map((c) => (
                    <div
                      key={c.id}
                      className="border border-zinc-800 bg-zinc-900/30 rounded p-3"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="text-zinc-100 text-sm font-semibold">
                          {c.name}
                        </div>
                        <div className="text-[10px] uppercase tracking-widest text-zinc-500">
                          {ERA_LABEL[c.era]}
                        </div>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {c.weaponClasses.map((wc) => (
                          <span
                            key={wc}
                            className="text-[10px] uppercase tracking-wider text-zinc-300 bg-zinc-800/80 px-1.5 py-0.5 rounded"
                          >
                            {wc}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </Section>

        {/* Ammo */}
        <Section
          title="Ammo Types"
          count={Object.keys(AMMO_TYPES).length}
          subtitle="One ammo type is loaded per generated firearm. Modifiers apply on top of attachments."
        >
          {FAMILY_ORDER.map((fam) => {
            const list = ammoByFamily[fam] ?? [];
            if (list.length === 0) return null;
            const sorted = [...list].sort(
              (a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier)
            );
            return (
              <div key={fam} className="mb-6 last:mb-0">
                <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-3">
                  {FAMILY_LABEL[fam]} · {list.length}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {sorted.map((a) => {
                    const mods = Object.entries(a.modifiers).filter(
                      ([, v]) => typeof v === "number" && v !== 0
                    ) as [keyof WeaponStats, number][];
                    return (
                      <div
                        key={a.id}
                        className={`border ${TIER_BORDER[a.tier]} bg-zinc-900/30 rounded p-3`}
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <div className="text-zinc-100 text-sm font-semibold">
                            {a.name}
                          </div>
                          <div
                            className={`text-[10px] uppercase tracking-widest font-semibold ${TIER_COLOR[a.tier]}`}
                          >
                            {a.tier}
                          </div>
                        </div>
                        <div className="text-[11px] text-zinc-500 italic mb-1">
                          {a.blurb}
                        </div>
                        <div className="text-[11px]">
                          {mods.length === 0 ? (
                            <span className="text-zinc-600 italic">no stat changes</span>
                          ) : (
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                              {mods.map(([k, v]) => {
                                const inverted = k === "recoil" || k === "weight";
                                const isImprovement = inverted ? v < 0 : v > 0;
                                const cls = isImprovement
                                  ? "text-emerald-500"
                                  : "text-rose-500";
                                return (
                                  <span key={k} className="tabular-nums">
                                    <span className="text-zinc-500">{STAT_LABELS[k]}</span>{" "}
                                    <span className={cls}>
                                      {v > 0 ? "+" : ""}
                                      {fmtStat(v, k)}
                                    </span>
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </Section>

        {/* Weapon bases */}
        <Section
          title="Weapon Bases"
          count={Object.keys(WEAPON_BASES).length}
          subtitle="Each base declares stat ranges and which slots it supports."
        >
          {CLASS_ORDER.map((c) => {
            const bases = basesByClass[c] ?? [];
            if (bases.length === 0) return null;
            return (
              <div key={c} className="mb-6 last:mb-0">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-zinc-500 mb-3">
                  <WeaponClassIcon weaponClass={c} size={14} />
                  <span>{CLASS_INFO[c].label} · {bases.length}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {bases.map((base) => (
                    <div
                      key={base.id}
                      className="border border-zinc-800 bg-zinc-900/40 rounded-md p-4"
                    >
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <div className="text-zinc-100 text-sm font-semibold">
                          {base.modelCode}
                        </div>
                        <div className="text-[10px] uppercase tracking-widest text-zinc-500">
                          {ERA_LABEL[base.era]}
                        </div>
                      </div>
                      <div className="text-xs text-zinc-400 mb-1">{base.className}</div>
                      <div className="text-[11px] text-zinc-500 mb-3">
                        <span className="uppercase tracking-wider text-zinc-600">caliber</span>{" "}
                        <span className="text-zinc-300">{CALIBERS[base.caliberId]?.name}</span>
                      </div>
                      <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 text-[11px]">
                        {STAT_KEYS.map((k) => (
                          <RowMini
                            key={k}
                            label={STAT_LABELS[k]}
                            base={fmtStat(base.baseStats[k], k)}
                            variance={`±${fmtStat(base.variance[k], k)}`}
                          />
                        ))}
                      </div>
                      <div className="mt-3 pt-3 border-t border-zinc-800/80">
                        <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
                          slots
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {base.slots.map((s) => (
                            <span
                              key={s}
                              className="text-[10px] uppercase tracking-wider text-zinc-300 bg-zinc-800/80 px-2 py-0.5 rounded"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </Section>

        {/* Attachments */}
        <Section
          title="Attachments"
          count={Object.keys(ATTACHMENTS).length}
          subtitle="Drawn per supported slot. Pick is biased toward weapon tier."
        >
          {SLOT_ORDER.map((slot) => {
            const list = attachmentsBySlot[slot] ?? [];
            if (list.length === 0) return null;
            const sorted = [...list].sort(
              (a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier)
            );
            return (
              <div key={slot} className="mb-6 last:mb-0">
                <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-3">
                  {slot} · {list.length}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {sorted.map((a) => (
                    <AttachmentRow key={a.id} attachment={a} />
                  ))}
                </div>
              </div>
            );
          })}
        </Section>

        {/* Variants & nicknames */}
        <Section
          title="Variants & Nicknames"
          count={
            Object.values(VARIANTS_BY_TIER).flat().length +
            Object.values(NICKNAMES_BY_TIER).flat().length
          }
          subtitle="Tier-keyed name fragments. Variant always present, nickname rolled."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TIER_ORDER.map((t) => (
              <div
                key={t}
                className={`border ${TIER_BORDER[t]} rounded-md p-4 bg-zinc-900/30`}
              >
                <div
                  className={`text-[11px] uppercase tracking-widest font-semibold ${TIER_COLOR[t]} mb-3`}
                >
                  {t}
                </div>
                <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
                  variants
                </div>
                <div className="text-xs text-zinc-300 mb-3">
                  {VARIANTS_BY_TIER[t].join("  ·  ")}
                </div>
                <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
                  nicknames
                </div>
                <div className="text-xs text-zinc-300 leading-relaxed">
                  {NICKNAMES_BY_TIER[t].join("  ·  ")}
                </div>
              </div>
            ))}
          </div>
        </Section>
      </main>
    </div>
  );
}

function Section({
  title,
  subtitle,
  count,
  children,
}: {
  title: string;
  subtitle?: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-4 pb-2 border-b border-zinc-800">
        <h2 className="text-zinc-100 text-base font-semibold uppercase tracking-wider">
          {title}
        </h2>
        {count !== undefined && (
          <div className="text-[11px] text-zinc-500 tabular-nums">{count}</div>
        )}
      </div>
      {subtitle && (
        <p className="text-xs text-zinc-500 mb-4 leading-relaxed">{subtitle}</p>
      )}
      {children}
    </section>
  );
}

function RowMini({ label, base, variance }: { label: string; base: string; variance: string }) {
  return (
    <>
      <div className="text-zinc-500">{label}</div>
      <div className="text-right text-zinc-200 tabular-nums">{base}</div>
      <div className="text-right text-zinc-600 tabular-nums">{variance}</div>
    </>
  );
}

function AttachmentRow({ attachment }: { attachment: Attachment }) {
  const mods = Object.entries(attachment.modifiers).filter(
    ([, v]) => typeof v === "number" && v !== 0
  ) as [keyof WeaponStats, number][];
  return (
    <div
      className={`border ${TIER_BORDER[attachment.tier]} bg-zinc-900/30 rounded p-3`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-zinc-100 text-sm font-semibold">{attachment.name}</div>
        <div
          className={`text-[10px] uppercase tracking-widest font-semibold ${TIER_COLOR[attachment.tier]}`}
        >
          {attachment.tier}
        </div>
      </div>
      <div className="mt-1 text-[11px]">
        {mods.length === 0 ? (
          <span className="text-zinc-600 italic">no stat changes</span>
        ) : (
          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
            {mods.map(([k, v]) => {
              const inverted = k === "recoil" || k === "weight";
              const isImprovement = inverted ? v < 0 : v > 0;
              const cls = isImprovement ? "text-emerald-500" : "text-rose-500";
              return (
                <span key={k} className="tabular-nums">
                  <span className="text-zinc-500">{STAT_LABELS[k]}</span>{" "}
                  <span className={cls}>
                    {v > 0 ? "+" : ""}
                    {fmtStat(v, k)}
                  </span>
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function fmtStat(v: number, stat: keyof WeaponStats): string {
  if (stat === "weight") return v.toFixed(1);
  return Math.round(v).toString();
}

function groupBy<T, K extends string>(items: T[], keyFn: (item: T) => K): Record<K, T[]> {
  const out = {} as Record<K, T[]>;
  for (const it of items) {
    const k = keyFn(it);
    (out[k] ??= []).push(it);
  }
  return out;
}
