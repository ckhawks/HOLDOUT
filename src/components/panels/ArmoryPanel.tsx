"use client";

import { ArrowLeft, Lock } from "lucide-react";
import { useGame } from "@/store/game";
import { PanelHeader } from "./PanelHeader";
import { Button } from "@/components/ui/button";
import { ITEMS } from "@/lib/data/items";
import { tierColorFor } from "@/lib/itemDisplay";
import { renderCategoryIcon } from "@/lib/itemIcon";
import { NotBuiltStub } from "./NotBuiltStub";
import { toast } from "@/lib/toast";

export function ArmoryPanel() {
  const built = useGame((s) => s.construction.modules.armory.built);
  const tier = useGame((s) => s.construction.modules.armory.tier);
  const items = useGame((s) => s.construction.armory.items);
  const stash = useGame((s) => s.stash);
  const deposit = useGame((s) => s.depositArmoryItem);
  const withdraw = useGame((s) => s.withdrawArmoryItem);
  const setPanel = useGame((s) => s.setPanel);

  if (!built) return <NotBuiltStub name="Armory" />;

  const t = tier as 1 | 2;
  const cap = t === 1 ? 8 : 16;

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

      </div>
    </section>
  );
}
