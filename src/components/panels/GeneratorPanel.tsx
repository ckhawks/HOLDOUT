"use client";

import { ArrowLeft, BatteryCharging } from "lucide-react";
import { useGame } from "@/store/game";
import { PanelHeader } from "./PanelHeader";
import { Button } from "@/components/ui/button";
import { NotBuiltStub } from "./NotBuiltStub";
import { toast } from "@/lib/toast";

export function GeneratorPanel() {
  const built = useGame((s) => s.construction.modules.generator.built);
  const tier = useGame((s) => s.construction.modules.generator.tier);
  const powerCells = useGame((s) => s.construction.generator.powerCells);
  const modules = useGame((s) => s.construction.modules);
  const stash = useGame((s) => s.stash);
  const deposit = useGame((s) => s.depositPowerCell);
  const setPanel = useGame((s) => s.setPanel);

  if (!built) return <NotBuiltStub name="Generator" />;

  const t = tier as 1 | 2;
  const cap = t === 1 ? 20 : 60;
  const batteryCount = stash.filter((s) => !s.pinned && s.itemId === "cracked_battery").length;

  let perRaid = 0;
  if (modules.workbench.built && modules.workbench.tier >= 3) perRaid += 1;
  if (modules.recycler.built && modules.recycler.tier >= 3) perRaid += 1;
  if (modules.research_bench.built && modules.research_bench.tier >= 2) perRaid += 1;
  if (modules.foundry.built) {
    if (modules.foundry.tier >= 3) perRaid += 2;
    else if (modules.foundry.tier >= 2) perRaid += 1;
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <PanelHeader title="Generator" subtitle={`Tier ${t} · ${powerCells}/${cap} cells · ${perRaid}/raid`} />
      <div className="flex-1 px-6 py-4">
        <Button variant="outline" size="sm" onClick={() => setPanel("hideout")} className="mb-4 rounded-sm">
          <ArrowLeft className="size-3.5" />
          Back to hideout
        </Button>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-sm border border-border bg-card/40 p-4">
            <div className="mb-3 flex items-center gap-2">
              <BatteryCharging className="size-4" />
              <span className="font-mono text-[11px] uppercase tracking-widest">Cells</span>
            </div>
            <div className="mb-2 font-mono text-2xl tabular-nums">{powerCells} <span className="text-sm text-muted-foreground">/ {cap}</span></div>
            <div className="mb-3 h-1 bg-border/40">
              <div className="h-full bg-emerald-400/70" style={{ width: `${Math.min(1, powerCells / cap) * 100}%` }} />
            </div>
            <div className="text-sm text-muted-foreground">
              <span className="text-foreground">{batteryCount}</span> cracked batter{batteryCount === 1 ? "y" : "ies"} in stash
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={batteryCount === 0 || powerCells >= cap}
              onClick={() => {
                const r = deposit();
                if (!r.ok) toast(r.reason === "no_battery" ? "No cracked batteries in stash." : "Couldn't deposit.");
              }}
              className="mt-3 rounded-sm"
            >
              Deposit 1 battery
            </Button>
          </div>

          <div className="rounded-sm border border-border bg-card/40 p-4">
            <div className="mb-3 font-mono text-[11px] uppercase tracking-widest">Raid draw</div>
            {perRaid === 0 ? (
              <div className="text-sm text-muted-foreground">
                No high-tier modules built. No power draw this raid.
              </div>
            ) : (
              <ul className="space-y-1 text-sm text-muted-foreground">
                {modules.workbench.tier >= 3 && <li>Workbench L3 · 1 cell</li>}
                {modules.recycler.tier >= 3 && <li>Recycler L3 · 1 cell</li>}
                {modules.research_bench.tier >= 2 && <li>Research Bench L2 · 1 cell</li>}
                {modules.foundry.tier === 2 && <li>Foundry L2 · 1 cell</li>}
                {modules.foundry.tier === 3 && <li>Foundry L3 · 2 cells</li>}
              </ul>
            )}
            <div className="mt-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              total {perRaid}/raid
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
