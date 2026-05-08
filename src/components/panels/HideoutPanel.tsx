"use client";

import { Hammer, HeartPulse, Home, Package, Plus } from "lucide-react";
import { useGame } from "@/store/game";
import { PanelHeader } from "./PanelHeader";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  PACK_GRID_WIDTH,
  STASH_SLOTS_PER_LEVEL,
  backpackUpgradeCost,
  packDimensions,
  stashUpgradeCost,
} from "@/lib/engine/upgrades";

interface ModuleCardProps {
  Icon: typeof Home;
  name: string;
  status: string;
  unlocked: boolean;
  hint?: string;
  action?: React.ReactNode;
}

function ModuleCard({ Icon, name, status, unlocked, hint, action }: ModuleCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-sm border bg-card/40 p-4 text-sm",
        unlocked ? "border-border" : "border-dashed border-border/50 opacity-70",
      )}
      title={hint}
    >
      <div className="flex items-center gap-2">
        <Icon className="size-4" />
        <span className="font-mono text-xs uppercase tracking-widest text-foreground">{name}</span>
      </div>
      <div className="text-muted-foreground">{status}</div>
      {!unlocked && hint && (
        <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/80">
          locked · {hint}
        </div>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function HideoutPanel() {
  const h = useGame((s) => s.hideout);
  const stashLen = useGame((s) => s.stash.length);
  const unlocks = useGame((s) => s.unlocks);
  const cash = useGame((s) => s.cash);
  const upgrades = useGame((s) => s.upgrades);
  const buyBackpack = useGame((s) => s.buyBackpackUpgrade);
  const buyStash = useGame((s) => s.buyStashUpgrade);

  const backpackCost = backpackUpgradeCost(upgrades);
  const stashCost = stashUpgradeCost(upgrades);

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <PanelHeader title="Hideout" subtitle="Your concealed position. Modules expand the loop." />
      <div className="grid flex-1 grid-cols-1 gap-3 overflow-y-auto px-6 py-6 md:grid-cols-2 xl:grid-cols-3">
        <ModuleCard
          Icon={Package}
          name="Stash"
          status={`${stashLen} of ${h.modules.stash.capacity} slots · level ${upgrades.stashLevel}`}
          unlocked
          action={
            <Button
              variant="outline"
              size="sm"
              disabled={cash < stashCost}
              onClick={buyStash}
              className="rounded-sm"
            >
              <Plus className="size-3.5" />
              +{STASH_SLOTS_PER_LEVEL} slots · ¤{stashCost.toLocaleString()}
            </Button>
          }
        />
        <ModuleCard
          Icon={Home}
          name="Backpack"
          status={`${packDimensions(upgrades).width}×${packDimensions(upgrades).height} grid · level ${upgrades.backpackLevel}`}
          unlocked
          action={
            <Button
              variant="outline"
              size="sm"
              disabled={cash < backpackCost}
              onClick={buyBackpack}
              className="rounded-sm"
            >
              <Plus className="size-3.5" />
              +1 row ({PACK_GRID_WIDTH} cells) · ¤{backpackCost.toLocaleString()}
            </Button>
          }
        />
        <ModuleCard
          Icon={Hammer}
          name="Workbench"
          status={unlocks.workbench ? "schematic recovered · install pending" : "no schematic"}
          unlocked={unlocks.workbench}
          hint="Find the Workbench Schematic on a raid"
        />
        <ModuleCard
          Icon={HeartPulse}
          name="Medbay"
          status="not built"
          unlocked={unlocks.medbay}
          hint="Recover from injury without burning a raid"
        />
      </div>
    </section>
  );
}
