"use client";

import { Backpack, Flame, Hammer, HeartPulse, Package, Plus, Recycle } from "lucide-react";
import { useGame } from "@/store/game";
import { PanelHeader } from "./PanelHeader";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/Tooltip";
import {
  STASH_SLOTS_PER_LEVEL,
  stashUpgradeCost,
} from "@/lib/engine/upgrades";

interface ModuleCardProps {
  Icon: typeof Package;
  name: string;
  status: string;
  unlocked: boolean;
  hint?: string;
  action?: React.ReactNode;
}

function ModuleCard({ Icon, name, status, unlocked, hint, action }: ModuleCardProps) {
  const card = (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-sm border bg-card/40 p-4 text-sm",
        unlocked ? "border-border" : "border-dashed border-border/50 opacity-70",
      )}
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
  return hint ? <Tooltip text={hint}>{card}</Tooltip> : card;
}

export function HideoutPanel() {
  const h = useGame((s) => s.hideout);
  const stashLen = useGame((s) => s.stash.length);
  const unlocks = useGame((s) => s.unlocks);
  const cash = useGame((s) => s.cash);
  const upgrades = useGame((s) => s.upgrades);
  const setPanel = useGame((s) => s.setPanel);
  const buyStash = useGame((s) => s.buyStashUpgrade);
  const equipment = useGame((s) => s.operative.equipment);
  const recycler = useGame((s) => s.construction.modules.recycler);
  const foundry = useGame((s) => s.construction.modules.foundry);

  const stashCost = stashUpgradeCost(upgrades);
  const summarizeContainer = (label: string, c: typeof equipment.bag): string => {
    if (!c) return `no ${label} equipped`;
    if (c.sections.length === 1) {
      const s = c.sections[0];
      return `${s.grid.width}×${s.grid.height} ${label} equipped`;
    }
    const dims = c.sections.map((s) => `${s.grid.width}×${s.grid.height}`).join(" + ");
    return `${c.sections.length} sections (${dims}) ${label} equipped`;
  };
  const bagSummary = `${summarizeContainer("bag", equipment.bag)} · ${summarizeContainer("rig", equipment.rig)}`;

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <PanelHeader title="Hideout" subtitle="Your concealed position. Where the kit gets built." />
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
          Icon={Backpack}
          name="Loadout"
          status={bagSummary}
          unlocked
          hint="Manage what your operative carries into the next raid"
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPanel("stash")}
              className="rounded-sm"
            >
              Manage in Stash
            </Button>
          }
        />
        <ModuleCard
          Icon={Recycle}
          name="Recycler"
          status={recycler.built ? `tier ${recycler.tier} · ready` : "not built · 600¤ + 1 Industrial Motor"}
          unlocked
          hint={recycler.built ? undefined : "Decompose junk into base components"}
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPanel("recycler")}
              className="rounded-sm"
            >
              {recycler.built ? "Open Recycler" : "View build cost"}
            </Button>
          }
        />
        <ModuleCard
          Icon={Flame}
          name="Foundry"
          status={foundry.built ? `tier ${foundry.tier} · vessels online` : "not built · 2500¤ + parts"}
          unlocked
          hint={foundry.built ? undefined : "Melt metallic items into vessel-stored metals"}
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPanel("foundry")}
              className="rounded-sm"
            >
              {foundry.built ? "Open Foundry" : "View build cost"}
            </Button>
          }
        />
        <ModuleCard
          Icon={Hammer}
          name="Workbench"
          status={unlocks.workbench ? "schematic recovered · install pending" : "no schematic"}
          unlocked={unlocks.workbench}
          hint="Find Schematic: Workbench on a raid"
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
