"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { generateManyArmor } from "@/lib/engine/armorGen";
import { ArmorCard } from "@/components/ArmorCard";
import type { ArmorPiece, Tier } from "@/lib/types";

const TIER_OPTIONS: ("any" | Tier)[] = ["any", "common", "uncommon", "rare", "experimental"];
const PIECE_OPTIONS: ("any" | ArmorPiece)[] = ["any", "helmet", "chest", "legs", "boots"];

export default function ArmorPage() {
  const [count, setCount] = useState(8);
  const [tier, setTier] = useState<"any" | Tier>("any");
  const [piece, setPiece] = useState<"any" | ArmorPiece>("any");
  const [seedInput, setSeedInput] = useState("");
  const [bumper, setBumper] = useState(0);

  const items = useMemo(() => {
    const seed = seedInput.trim() ? Number(seedInput.trim()) || hashStr(seedInput.trim()) : undefined;
    const target = piece === "any" ? null : piece;
    if (!target && tier === "any") {
      return generateManyArmor(count, { seed });
    }
    const out = [] as ReturnType<typeof generateManyArmor>;
    let safety = count * 30;
    while (out.length < count && safety-- > 0) {
      const batch = generateManyArmor(Math.max(count, 16), {
        seed: seed !== undefined ? seed + out.length : undefined,
        tier: tier === "any" ? undefined : tier,
      });
      for (const a of batch) {
        if (target && a.piece !== target) continue;
        out.push(a);
        if (out.length >= count) break;
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, tier, piece, seedInput, bumper]);

  return (
    <div className="min-h-full bg-zinc-950 text-zinc-100 font-mono">
      <header className="border-b border-zinc-800 bg-zinc-900/40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-baseline justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-wide">FIREARM-GEN · ARMOR</h1>
            <p className="text-[11px] uppercase tracking-widest text-zinc-500">
              instance generator · v0
            </p>
          </div>
          <div className="flex items-baseline gap-4">
            <Link
              href="/"
              className="text-[11px] uppercase tracking-widest text-zinc-400 hover:text-zinc-100 transition"
            >
              ← firearms
            </Link>
            <Link
              href="/pools"
              className="text-[11px] uppercase tracking-widest text-zinc-400 hover:text-zinc-100 transition"
            >
              pools →
            </Link>
            <div className="text-[11px] text-zinc-600">{items.length} rolls</div>
          </div>
        </div>
      </header>

      {/* Controls */}
      <div className="border-b border-zinc-800 bg-zinc-900/20">
        <div className="max-w-6xl mx-auto px-6 py-3 flex flex-wrap items-end gap-x-6 gap-y-3 text-xs">
          <Field label="count">
            <input
              type="number"
              value={count}
              min={1}
              max={64}
              onChange={(e) =>
                setCount(Math.max(1, Math.min(64, Number(e.target.value) || 1)))
              }
              className="w-16 bg-zinc-900 border border-zinc-800 px-2 py-1 text-zinc-100 rounded focus:outline-none focus:border-zinc-600"
            />
          </Field>

          <Field label="tier">
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value as "any" | Tier)}
              className="bg-zinc-900 border border-zinc-800 px-2 py-1 text-zinc-100 rounded focus:outline-none focus:border-zinc-600"
            >
              {TIER_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>

          <Field label="piece">
            <select
              value={piece}
              onChange={(e) => setPiece(e.target.value as "any" | ArmorPiece)}
              className="bg-zinc-900 border border-zinc-800 px-2 py-1 text-zinc-100 rounded focus:outline-none focus:border-zinc-600"
            >
              {PIECE_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>

          <Field label="seed">
            <input
              type="text"
              value={seedInput}
              onChange={(e) => setSeedInput(e.target.value)}
              placeholder="(empty = random)"
              className="w-40 bg-zinc-900 border border-zinc-800 px-2 py-1 text-zinc-100 rounded focus:outline-none focus:border-zinc-600 placeholder:text-zinc-700"
            />
          </Field>

          <button
            onClick={() => setBumper((b) => b + 1)}
            className="ml-auto px-4 py-1.5 bg-zinc-100 text-zinc-900 font-semibold rounded hover:bg-white transition uppercase tracking-wider text-[11px]"
          >
            re-roll
          </button>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((a) => (
            <ArmorCard key={a.uid + bumper} armor={a} />
          ))}
        </div>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-widest text-zinc-500">{label}</span>
      {children}
    </label>
  );
}

function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
