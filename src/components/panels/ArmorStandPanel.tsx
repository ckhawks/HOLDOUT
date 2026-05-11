"use client";

import { ArrowLeft, Shirt } from "lucide-react";
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

export function ArmorStandPanel() {
  const built = useGame((s) => s.construction.modules.armor_stand.built);
  const tier = useGame((s) => s.construction.modules.armor_stand.tier);
  const build = useGame((s) => s.buildModule);
  const setPanel = useGame((s) => s.setPanel);
  const cost = MODULE_BUILD_COSTS.armor_stand;
  const presetSlots = !built ? 0 : tier === 1 ? 1 : tier === 2 ? 3 : 5;

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <PanelHeader title="Armor Stand" subtitle={built ? `Tier ${tier} · ${presetSlots} preset slot${presetSlots === 1 ? "" : "s"}` : "Not built yet."} />
      <div className="flex-1 px-6 py-6">
        <Button variant="outline" size="sm" onClick={() => setPanel("hideout")} className="mb-6 rounded-sm">
          <ArrowLeft className="size-3.5" />
          Back to hideout
        </Button>
        <div className="max-w-md space-y-4 rounded-sm border border-border bg-card/40 p-5">
          <div className="flex items-center gap-2">
            <Shirt className="size-5" />
            <span className="font-mono text-sm uppercase tracking-widest">
              {built ? "Armor Stand" : "Armor Stand · Build"}
            </span>
          </div>
          {!built ? (
            <>
              <div className="text-sm text-muted-foreground">
                Loadout presets — save a kit configuration and swap to it
                between raids. Coming in a later phase; this is a placeholder
                shell so you can still build it now.
              </div>
              <div>
                <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  build cost
                </div>
                <CostLine cost={cost} />
              </div>
              <Button
                onClick={() => {
                  const r = build("armor_stand");
                  if (!r.ok) toast("Cannot build right now.");
                  else toast("Armor Stand built.");
                }}
                className="w-full"
              >
                Build Armor Stand
              </Button>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">
              Loadout preset slots will live here once preset save/swap is
              wired up. The stand is built and waiting.
            </div>
          )}
          {built && (
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${presetSlots}, minmax(0, 1fr))` }}>
              {Array.from({ length: presetSlots }).map((_, i) => (
                <div key={i} className="flex h-16 items-center justify-center rounded-sm border border-dashed border-border/60 bg-background/40 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  empty
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
