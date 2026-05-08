"use client";

import { useGame } from "@/store/game";
import { Radio } from "lucide-react";
import { SfxPicker } from "./SfxPicker";
import { LOCATIONS_BY_ID } from "@/lib/data/locations";

export function Header() {
  const cash = useGame((s) => s.cash);
  const op = useGame((s) => s.operative);
  const raid = useGame((s) => s.currentRaid);

  const locName = raid ? LOCATIONS_BY_ID[raid.locationId]?.name ?? raid.locationId : null;
  const status = raid ? `RAIDING · ${locName}` : op.state.toUpperCase();

  return (
    <header className="border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="flex items-center justify-between px-4 py-2 font-mono text-xs uppercase tracking-widest">
        <div className="flex items-center gap-2">
          <Radio className="size-3.5" />
          <span className="text-foreground">HOLDOUT</span>
          <span className="text-muted-foreground">/ dispatch terminal</span>
        </div>
        <div className="flex items-center gap-6">
          <SfxPicker />
          <span className="text-muted-foreground">
            {op.name}
            <span className="ml-2 text-foreground">[{status}]</span>
          </span>
          <span className="text-foreground">¤ {cash.toLocaleString()}</span>
        </div>
      </div>
    </header>
  );
}
