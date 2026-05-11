"use client";

import { ArrowLeft, Wrench } from "lucide-react";
import { useGame } from "@/store/game";
import { PanelHeader } from "./PanelHeader";
import { Button } from "@/components/ui/button";
import { ITEMS } from "@/lib/data/items";
import { MODULE_BUILD_COSTS } from "@/lib/data/modules";
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

export function RepairBenchPanel() {
  const built = useGame((s) => s.construction.modules.repair_bench.built);
  const build = useGame((s) => s.buildModule);
  const setPanel = useGame((s) => s.setPanel);
  const cost = MODULE_BUILD_COSTS.repair_bench;

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <PanelHeader title="Repair Bench" subtitle={built ? "Built · awaiting weapon condition system" : "Not built yet."} />
      <div className="flex-1 px-6 py-6">
        <Button variant="outline" size="sm" onClick={() => setPanel("hideout")} className="mb-6 rounded-sm">
          <ArrowLeft className="size-3.5" />
          Back to hideout
        </Button>
        <div className="max-w-md space-y-4 rounded-sm border border-border bg-card/40 p-5">
          <div className="flex items-center gap-2">
            <Wrench className="size-5" />
            <span className="font-mono text-sm uppercase tracking-widest">
              {built ? "Repair Bench" : "Repair Bench · Build"}
            </span>
          </div>
          {!built ? (
            <>
              <div className="text-sm text-muted-foreground">
                Will restore weapon / armor condition once the condition
                system lands. Placeholder shell — buildable now so the bench
                is in place when repair is wired up.
              </div>
              <div>
                <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  build cost
                </div>
                <CostLine cost={cost} />
              </div>
              <Button
                onClick={() => {
                  const r = build("repair_bench");
                  if (!r.ok) toast("Cannot build right now.");
                  else toast("Repair Bench built.");
                }}
                className="w-full"
              >
                Build Repair Bench
              </Button>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">
              Repair functionality is blocked on the weapon-condition system
              not yet existing. The bench is ready for it to land.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
