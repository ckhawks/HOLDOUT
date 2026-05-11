"use client";

import { Backpack, Flame, Hammer, HeartPulse, Microscope, Package, Plus, Recycle, Shield, Shirt, Wrench, Zap } from "lucide-react";
import { useGame } from "@/store/game";
import { PanelHeader } from "./PanelHeader";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/Tooltip";
import {
  STASH_SLOTS_PER_LEVEL,
  stashUpgradeCost,
} from "@/lib/engine/upgrades";
import { canAfford as canAffordCost } from "@/lib/engine/hideout";
import { ITEMS } from "@/lib/data/items";
import { METAL_DISPLAY_NAME } from "@/lib/data/smelt";
import { tierColorFor } from "@/lib/itemDisplay";
import type { MetalId } from "@/lib/types";

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
  const workbench = useGame((s) => s.construction.modules.workbench);
  const researchBench = useGame((s) => s.construction.modules.research_bench);
  const armory = useGame((s) => s.construction.modules.armory);
  const armorStand = useGame((s) => s.construction.modules.armor_stand);
  const repairBench = useGame((s) => s.construction.modules.repair_bench);
  const generator = useGame((s) => s.construction.modules.generator);

  const stashCost = stashUpgradeCost(upgrades);
  const stashList = useGame((s) => s.stash);
  const foundryState = useGame((s) => s.construction.foundry);
  const stashAfford = canAffordCost(stashCost, { cash, stash: stashList, foundry: foundryState });
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
            <div className="flex flex-col gap-1.5">
              {((stashCost.items?.length ?? 0) > 0 || (stashCost.metals?.length ?? 0) > 0) && (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                  {(stashCost.items ?? []).map((req) => (
                    <span key={req.id}>
                      {req.count}× <span className={tierColorFor(req.id)}>{ITEMS[req.id]?.name ?? req.id}</span>
                    </span>
                  ))}
                  {(stashCost.metals ?? []).map((req) => (
                    <span key={req.id}>
                      {req.count} {METAL_DISPLAY_NAME[req.id as MetalId] ?? req.id}
                    </span>
                  ))}
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                disabled={!stashAfford.ok}
                onClick={buyStash}
                className="rounded-sm"
              >
                <Plus className="size-3.5" />
                +{STASH_SLOTS_PER_LEVEL} slots · ¤{stashCost.cash.toLocaleString()}
              </Button>
            </div>
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
          status={
            workbench.built
              ? `tier ${workbench.tier} · craft enabled`
              : unlocks.workbench
                ? "schematic recovered · ready to build"
                : "no schematic"
          }
          unlocked={workbench.built || unlocks.workbench}
          hint={
            workbench.built
              ? undefined
              : unlocks.workbench
                ? "Open the workbench panel to install"
                : "Find Schematic: Workbench on a raid"
          }
          action={
            (workbench.built || unlocks.workbench) ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPanel("workbench")}
                className="rounded-sm"
              >
                {workbench.built ? "Open Workbench" : "View build cost"}
              </Button>
            ) : undefined
          }
        />
        <ModuleCard
          Icon={Microscope}
          name="Research Bench"
          status={researchBench.built ? `tier ${researchBench.tier} · unlock recipes` : "not built · 900¤ + parts"}
          unlocked
          hint={researchBench.built ? undefined : "Spend docs + components to unlock locked craft recipes"}
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPanel("research_bench")}
              className="rounded-sm"
            >
              {researchBench.built ? "Open Bench" : "View build cost"}
            </Button>
          }
        />
        <ModuleCard
          Icon={Shield}
          name="Armory"
          status={armory.built ? `tier ${armory.tier} · gear storage` : "not built · 1200¤ + parts"}
          unlocked
          hint={armory.built ? undefined : "Specialized storage for equippable gear"}
          action={
            <Button variant="outline" size="sm" onClick={() => setPanel("armory")} className="rounded-sm">
              {armory.built ? "Open Armory" : "View build cost"}
            </Button>
          }
        />
        <ModuleCard
          Icon={Zap}
          name="Generator"
          status={generator.built ? `tier ${generator.tier} · power online` : "not built · 3000¤ + parts"}
          unlocked
          hint={generator.built ? undefined : "Powers high-tier modules at raid start"}
          action={
            <Button variant="outline" size="sm" onClick={() => setPanel("generator")} className="rounded-sm">
              {generator.built ? "Open Generator" : "View build cost"}
            </Button>
          }
        />
        <ModuleCard
          Icon={Shirt}
          name="Armor Stand"
          status={armorStand.built ? `tier ${armorStand.tier} · presets pending` : "not built · 500¤ + parts"}
          unlocked
          hint={armorStand.built ? undefined : "Loadout presets (coming later)"}
          action={
            <Button variant="outline" size="sm" onClick={() => setPanel("armor_stand")} className="rounded-sm">
              {armorStand.built ? "Open Stand" : "View build cost"}
            </Button>
          }
        />
        <ModuleCard
          Icon={Wrench}
          name="Repair Bench"
          status={repairBench.built ? "built · awaiting condition system" : "not built · 1000¤ + parts"}
          unlocked
          hint={repairBench.built ? undefined : "Repair gear (coming with weapon condition)"}
          action={
            <Button variant="outline" size="sm" onClick={() => setPanel("repair_bench")} className="rounded-sm">
              {repairBench.built ? "Open Bench" : "View build cost"}
            </Button>
          }
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
