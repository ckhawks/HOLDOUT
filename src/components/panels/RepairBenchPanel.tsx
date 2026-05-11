"use client";

import { ArrowLeft, Wrench } from "lucide-react";
import { useGame } from "@/store/game";
import { PanelHeader } from "./PanelHeader";
import { Button } from "@/components/ui/button";
import { NotBuiltStub } from "./NotBuiltStub";

export function RepairBenchPanel() {
  const built = useGame((s) => s.construction.modules.repair_bench.built);
  const setPanel = useGame((s) => s.setPanel);

  if (!built) return <NotBuiltStub name="Repair Bench" />;

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <PanelHeader title="Repair Bench" subtitle="Built · awaiting weapon condition system" />
      <div className="flex-1 px-6 py-6">
        <Button variant="outline" size="sm" onClick={() => setPanel("hideout")} className="mb-6 rounded-sm">
          <ArrowLeft className="size-3.5" />
          Back to hideout
        </Button>
        <div className="max-w-md space-y-4 rounded-sm border border-border bg-card/40 p-5">
          <div className="flex items-center gap-2">
            <Wrench className="size-5" />
            <span className="font-mono text-sm uppercase tracking-widest">Repair Bench</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Repair functionality is blocked on the weapon-condition system
            not yet existing. The bench is ready for it to land.
          </div>
        </div>
      </div>
    </section>
  );
}
