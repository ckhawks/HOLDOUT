"use client";

import { ArrowLeft, ChevronUp, Lock, Shield } from "lucide-react";
import { useGame } from "@/store/game";
import { PanelHeader } from "./PanelHeader";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/Tooltip";
import { ITEMS } from "@/lib/data/items";
import { MODULE_BUILD_COSTS, MODULE_DEFS, MODULE_TIER_COSTS } from "@/lib/data/modules";
import { METAL_DISPLAY_NAME } from "@/lib/data/smelt";
import { tierColorFor } from "@/lib/itemDisplay";
import { renderCategoryIcon } from "@/lib/itemIcon";
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
  const cost = MODULE_BUILD_COSTS.armory;
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <PanelHeader title="Armory" subtitle="Not built yet." />
      <div className="flex-1 px-6 py-6">
        <Button variant="outline" size="sm" onClick={() => setPanel("hideout")} className="mb-6 rounded-sm">
          <ArrowLeft className="size-3.5" />
          Back to hideout
        </Button>
        <div className="max-w-md space-y-4 rounded-sm border border-border bg-card/40 p-5">
          <div className="flex items-center gap-2">
            <Shield className="size-5" />
            <span className="font-mono text-sm uppercase tracking-widest">Armory · Build</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Specialized storage for equippable gear. Items in the Armory do
            not count against stash capacity.
          </div>
          <div>
            <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              build cost
            </div>
            <CostLine cost={cost} />
          </div>
          <Button
            onClick={() => {
              const r = build("armory");
              if (!r.ok) {
                toast(
                  r.reason === "missing_items" ? "Missing required parts." :
                  r.reason === "missing_cash" ? "Not enough cash." :
                  "Cannot build right now.",
                );
              } else {
                toast("Armory built.");
              }
            }}
            className="w-full"
          >
            Build Armory
          </Button>
        </div>
      </div>
    </section>
  );
}

export function ArmoryPanel() {
  const built = useGame((s) => s.construction.modules.armory.built);
  const tier = useGame((s) => s.construction.modules.armory.tier);
  const items = useGame((s) => s.construction.armory.items);
  const stash = useGame((s) => s.stash);
  const cash = useGame((s) => s.cash);
  const deposit = useGame((s) => s.depositArmoryItem);
  const withdraw = useGame((s) => s.withdrawArmoryItem);
  const upgrade = useGame((s) => s.upgradeModule);
  const setPanel = useGame((s) => s.setPanel);

  if (!built) return <UnbuiltView />;

  const t = tier as 1 | 2;
  const cap = t === 1 ? 8 : 16;
  const nextTier = t < (MODULE_DEFS.armory.maxTier as 2) ? 2 : null;
  const upgradeCost = nextTier ? MODULE_TIER_COSTS[`armory:${nextTier}`] : null;

  const depositable = stash.filter((s) => {
    const def = ITEMS[s.itemId];
    return def?.slot != null;
  });

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <PanelHeader title="Armory" subtitle={`Tier ${t} · ${items.length}/${cap} stored`} />
      <div className="flex min-h-0 flex-1 gap-4 px-6 py-4">
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex min-h-0 flex-col gap-2">
            <Button variant="outline" size="sm" onClick={() => setPanel("hideout")} className="self-start rounded-sm">
              <ArrowLeft className="size-3.5" />
              Back to hideout
            </Button>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              In Armory ({items.length}/{cap})
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto rounded-sm border border-border bg-card/40">
              {items.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">Nothing stored.</div>
              ) : (
                <ul>
                  {items.map((si) => {
                    const def = ITEMS[si.itemId];
                    return (
                      <li key={si.uid} className="flex items-center justify-between gap-2 border-b border-border/40 px-3 py-2 text-sm">
                        <div className="flex items-center gap-2">
                          {renderCategoryIcon(si.itemId, "size-3.5")}
                          <span className={tierColorFor(si.itemId)}>{def?.name ?? si.itemId}</span>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => {
                          const r = withdraw(si.uid);
                          if (!r.ok) toast(r.reason === "stash_full" ? "Stash full." : "Couldn't withdraw.");
                        }} className="rounded-sm">
                          → Stash
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
          <div className="flex min-h-0 flex-col gap-2">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Depositable (in stash)
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto rounded-sm border border-border bg-card/40">
              {depositable.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">No equippable gear in stash.</div>
              ) : (
                <ul>
                  {depositable.map((si) => {
                    const def = ITEMS[si.itemId];
                    return (
                      <li key={si.uid} className="flex items-center justify-between gap-2 border-b border-border/40 px-3 py-2 text-sm">
                        <div className="flex items-center gap-2">
                          {renderCategoryIcon(si.itemId, "size-3.5")}
                          <span className={tierColorFor(si.itemId)}>{def?.name ?? si.itemId}</span>
                          {si.pinned && <Lock className="size-3 text-amber-400/70" />}
                        </div>
                        <Button size="sm" variant="outline" disabled={items.length >= cap} onClick={() => {
                          const r = deposit(si.uid);
                          if (!r.ok) toast(r.reason === "full" ? "Armory full." : "Couldn't deposit.");
                        }} className="rounded-sm">
                          → Armory
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>

        {nextTier && upgradeCost && (
          <aside className="w-64 shrink-0">
            <div className="rounded-sm border border-border bg-card/40 p-3">
              <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                <ChevronUp className="size-3.5" />
                Upgrade · tier {nextTier}
              </div>
              <CostLine cost={upgradeCost} />
              <Tooltip text="L2: armory capacity 16 (was 8).">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const r = upgrade("armory");
                    if (!r.ok) toast(r.reason === "missing_cash" ? "Not enough cash." : "Missing required parts.");
                  }}
                  disabled={cash < upgradeCost.cash}
                  className="mt-3 w-full rounded-sm"
                >
                  Upgrade
                </Button>
              </Tooltip>
            </div>
          </aside>
        )}
      </div>
    </section>
  );
}
