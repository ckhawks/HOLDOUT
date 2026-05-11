"use client";

import { ArrowLeft, Shirt } from "lucide-react";
import { useGame } from "@/store/game";
import { PanelHeader } from "./PanelHeader";
import { Button } from "@/components/ui/button";
import { NotBuiltStub } from "./NotBuiltStub";

export function ArmorStandPanel() {
  const built = useGame((s) => s.construction.modules.armor_stand.built);
  const tier = useGame((s) => s.construction.modules.armor_stand.tier);
  const setPanel = useGame((s) => s.setPanel);
  const presetSlots = tier === 1 ? 1 : tier === 2 ? 3 : 5;

  if (!built) return <NotBuiltStub name="Armor Stand" />;

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <PanelHeader title="Armor Stand" subtitle={`Tier ${tier} · ${presetSlots} preset slot${presetSlots === 1 ? "" : "s"}`} />
      <div className="flex-1 px-6 py-6">
        <Button variant="outline" size="sm" onClick={() => setPanel("hideout")} className="mb-6 rounded-sm">
          <ArrowLeft className="size-3.5" />
          Back to hideout
        </Button>
        <div className="max-w-md space-y-4 rounded-sm border border-border bg-card/40 p-5">
          <div className="flex items-center gap-2">
            <Shirt className="size-5" />
            <span className="font-mono text-sm uppercase tracking-widest">Armor Stand</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Loadout preset slots will live here once preset save/swap is
            wired up. The stand is built and waiting.
          </div>
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${presetSlots}, minmax(0, 1fr))` }}>
            {Array.from({ length: presetSlots }).map((_, i) => (
              <div key={i} className="flex h-16 items-center justify-center rounded-sm border border-dashed border-border/60 bg-background/40 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                empty
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
