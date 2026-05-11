"use client";

import { ArrowLeft, BatteryCharging, ChevronUp, Zap } from "lucide-react";
import { useGame } from "@/store/game";
import { PanelHeader } from "./PanelHeader";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/Tooltip";
import { ITEMS } from "@/lib/data/items";
import { MODULE_BUILD_COSTS, MODULE_DEFS, MODULE_TIER_COSTS } from "@/lib/data/modules";
import { METAL_DISPLAY_NAME } from "@/lib/data/smelt";
import { tierColorFor } from "@/lib/itemDisplay";
import { toast } from "@/lib/toast";
import type { MetalId, UpgradeCost } from "@/lib/types";

function CostLine({ cost }: { cost: UpgradeCost }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      <span className="font-mono">¤{cost.cash.toLocaleString()}</span>
      {(cost.items ?? []).map((req) => (
        <span key={req.id} className="text-muted-foreground">
          {req.count}× <span className={tierColorFor(req.id)}>{ITEMS[req.id]?.name ?? req.id}</span>
        </span>
      ))}
      {(cost.metals ?? []).map((req) => (
        <span key={req.id} className="text-muted-foreground">
          {req.count} {METAL_DISPLAY_NAME[req.id as MetalId] ?? req.id}
        </span>
      ))}
    </div>
  );
}

function UnbuiltView() {
  const setPanel = useGame((s) => s.setPanel);
  const build = useGame((s) => s.buildModule);
  const cost = MODULE_BUILD_COSTS.generator;
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <PanelHeader title="Generator" subtitle="Not built yet." />
      <div className="flex-1 px-6 py-6">
        <Button variant="outline" size="sm" onClick={() => setPanel("hideout")} className="mb-6 rounded-sm">
          <ArrowLeft className="size-3.5" />
          Back to hideout
        </Button>
        <div className="max-w-md space-y-4 rounded-sm border border-border bg-card/40 p-5">
          <div className="flex items-center gap-2">
            <Zap className="size-5" />
            <span className="font-mono text-sm uppercase tracking-widest">Generator · Build</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Stores power cells (cracked_battery) consumed on raid start by
            high-tier modules. Makes cracked batteries a real recurring sink.
          </div>
          <div>
            <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              build cost
            </div>
            <CostLine cost={cost} />
          </div>
          <Button
            onClick={() => {
              const r = build("generator");
              if (!r.ok) toast("Cannot build right now.");
              else toast("Generator built.");
            }}
            className="w-full"
          >
            Build Generator
          </Button>
        </div>
      </div>
    </section>
  );
}

export function GeneratorPanel() {
  const built = useGame((s) => s.construction.modules.generator.built);
  const tier = useGame((s) => s.construction.modules.generator.tier);
  const powerCells = useGame((s) => s.construction.generator.powerCells);
  const modules = useGame((s) => s.construction.modules);
  const stash = useGame((s) => s.stash);
  const cash = useGame((s) => s.cash);
  const deposit = useGame((s) => s.depositPowerCell);
  const upgrade = useGame((s) => s.upgradeModule);
  const setPanel = useGame((s) => s.setPanel);

  if (!built) return <UnbuiltView />;

  const t = tier as 1 | 2;
  const cap = t === 1 ? 20 : 60;
  const nextTier = t < (MODULE_DEFS.generator.maxTier as 2) ? 2 : null;
  const upgradeCost = nextTier ? MODULE_TIER_COSTS[`generator:${nextTier}`] : null;
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

        {nextTier && upgradeCost && (
          <div className="mt-4 max-w-md rounded-sm border border-border bg-card/40 p-3">
            <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <ChevronUp className="size-3.5" />
              Upgrade · tier {nextTier}
            </div>
            <CostLine cost={upgradeCost} />
            <Tooltip text="L2: capacity 60 (was 20).">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const r = upgrade("generator");
                  if (!r.ok) toast("Cannot upgrade right now.");
                }}
                disabled={cash < upgradeCost.cash}
                className="mt-3 rounded-sm"
              >
                Upgrade
              </Button>
            </Tooltip>
          </div>
        )}
      </div>
    </section>
  );
}
