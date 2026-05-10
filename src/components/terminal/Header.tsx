"use client";

import { useMemo } from "react";
import { useGame } from "@/store/game";
import { Package, Radio } from "lucide-react";
import { SfxPicker } from "./SfxPicker";
import { LOCATIONS_BY_ID } from "@/lib/data/locations";
import { Tooltip } from "@/components/ui/Tooltip";
import { effectiveSellValue } from "@/store/slices/economy";

export function Header() {
  const cash = useGame((s) => s.cash);
  const op = useGame((s) => s.operative);
  const raid = useGame((s) => s.currentRaid);
  const stash = useGame((s) => s.stash);

  const locName = raid ? LOCATIONS_BY_ID[raid.locationId]?.name ?? raid.locationId : null;
  const status = raid ? `RAIDING · ${locName}` : op.state.toUpperCase();

  const stashValue = useMemo(
    () => stash.reduce((sum, si) => sum + effectiveSellValue(si), 0),
    [stash],
  );

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
          <Tooltip text={`Total sell value of ${stash.length} stash items`}>
            <span className="inline-flex cursor-default items-center gap-1.5 text-muted-foreground">
              <Package className="size-3" />
              <span className="text-foreground/90">¤ {stashValue.toLocaleString()}</span>
            </span>
          </Tooltip>
          <span className="text-foreground">¤ {cash.toLocaleString()}</span>
        </div>
      </div>
    </header>
  );
}
