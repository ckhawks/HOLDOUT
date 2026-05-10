"use client";

import { useEffect, useState } from "react";
import { SFX_FILES, type SfxId, getActiveSfx, initSfx, playSfx, setActiveSfx, setSfxVolume } from "@/lib/sfx";

export function SfxPicker() {
  // Run initSfx() before useState's lazy initializers so getActiveSfx() can
  // return the persisted choice. Safe to call repeatedly — initSfx is idempotent
  // (pool-length guard) and SSR-skipped.
  if (typeof window !== "undefined") initSfx();
  const [active, setActive] = useState<SfxId | "">(() => getActiveSfx() ?? "");
  const [vol, setVol] = useState(0.5);

  useEffect(() => {
    setSfxVolume(0.5);
  }, []);

  return (
    <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
      <span>SFX</span>
      <select
        className="rounded-sm border border-border/60 bg-background px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-foreground outline-none focus:border-foreground/40"
        value={active}
        onChange={(e) => {
          const next = e.target.value as SfxId | "";
          setActive(next);
          setActiveSfx(next || null);
          if (next) playSfx();
        }}
      >
        <option value="">— off —</option>
        {SFX_FILES.map((f) => (
          <option key={f.id} value={f.id}>
            {f.label}
          </option>
        ))}
      </select>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={vol}
        className="h-1 w-16 cursor-pointer"
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          setVol(v);
          setSfxVolume(v);
        }}
      />
      <button
        type="button"
        className="rounded-sm border border-border/60 px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
        onClick={() => playSfx()}
      >
        test
      </button>
    </div>
  );
}
