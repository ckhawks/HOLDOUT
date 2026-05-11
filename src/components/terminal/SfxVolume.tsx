"use client";

import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { getSfxVolume, initSfx, playSfx, setSfxVolume } from "@/lib/sfx";
import { cn } from "@/lib/utils";

export function SfxVolume() {
  if (typeof window !== "undefined") initSfx();
  const [vol, setVol] = useState(() =>
    typeof window === "undefined" ? 0.5 : getSfxVolume(),
  );

  useEffect(() => {
    setSfxVolume(vol);
  }, [vol]);

  const muted = vol === 0;
  const Icon = muted ? VolumeX : Volume2;

  return (
    <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
      <button
        type="button"
        onClick={() => {
          setVol(muted ? 0.5 : 0);
        }}
        title={muted ? "Unmute" : "Mute"}
        className={cn(
          "flex size-5 cursor-pointer items-center justify-center rounded-sm transition-colors hover:bg-muted hover:text-foreground",
          muted && "text-muted-foreground/60",
        )}
      >
        <Icon className="size-3" />
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={vol}
        className="slider-slim h-2 w-16 cursor-pointer"
        style={{ ["--slider-pct" as string]: `${vol * 100}%` }}
        onChange={(e) => setVol(parseFloat(e.target.value))}
        onMouseUp={() => {
          if (vol > 0) playSfx();
        }}
      />
      <span className="w-7 text-right tabular-nums text-muted-foreground">
        {Math.round(vol * 100)}%
      </span>
    </div>
  );
}
