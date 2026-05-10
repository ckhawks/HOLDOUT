"use client";

import { useGame } from "@/store/game";
import { LOCATIONS } from "@/lib/data/locations";
import { ROOM_EVENT_BIAS } from "@/lib/data/events";
import { ITEMS } from "@/lib/data/items";
import { ACTIONS, chipsFor } from "@/lib/engine/actions";
import type { ActionId } from "@/lib/types";
import {
  ACTION_TIMER_MS,
  BLEED_MAJOR_DRAIN,
  BLEED_MINOR_DRAIN,
  ENERGY_BASE_DRAIN,
  EXHAUSTION_DRAIN,
  HEAT_AMBUSH_DIVISOR,
  INTERRUPT_CHANCE,
  PATROL_TIMER_MS,
  TICK_MAX_MS,
  TICK_MIN_MS,
} from "@/lib/engine/raid";
import { CONSUMABLE_EFFECTS } from "@/lib/engine/consumables";
import {
  BLOCKED_TILE_RATIO,
  DIFFICULTY_MULTIPLIER,
  MAP_HEIGHT,
  MAP_WIDTH,
  THREAT_TILE_RATIO,
} from "@/lib/engine/map";
import {
  AMMO_POOL,
  BAG_POOL,
  BUY_MARKUP,
  CHEM_POOL,
  FOOD_POOL,
  MIN_PRICE,
  priceFor,
} from "@/lib/engine/shop";
import { SCHEMA_VERSION } from "@/lib/engine/save";
import { PanelHeader } from "./PanelHeader";

// Operator-debug data view. Surfaces the gameplay knobs that are normally
// hidden from the player — drop rates, threat scaling, action effects, shop
// markup, save schema. No gating yet; everyone can see it.
export function DataPanel() {
  const rngSeed = useGame((s) => s.rngSeed);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PanelHeader
        title="Data"
        subtitle="Operator-debug view. Live engine values for tuning and sanity checks."
      />
      <div className="flex-1 space-y-8 overflow-y-auto px-6 py-6 text-sm">
        <Section title="Save & runtime">
          <KV k="Save schema version" v={SCHEMA_VERSION} />
          <KV k="RNG seed" v={rngSeed} />
        </Section>

        <Section title="Raid timers">
          <KV k="Action timer" v={`${ACTION_TIMER_MS / 1000}s`} />
          <KV k="Patrol modal timer" v={`${PATROL_TIMER_MS / 1000}s`} />
          <KV k="Tick range" v={`${TICK_MIN_MS / 1000}–${TICK_MAX_MS / 1000}s`} />
          <KV k="Interrupt chance / tick" v={pct(INTERRUPT_CHANCE)} />
          <KV k="Energy drain / tick" v={ENERGY_BASE_DRAIN} />
          <KV k="Bleed minor / tick" v={`${BLEED_MINOR_DRAIN} hp`} />
          <KV k="Bleed major / tick" v={`${BLEED_MAJOR_DRAIN} hp`} />
          <KV k="Exhaustion drain / tick (energy = 0)" v={`${EXHAUSTION_DRAIN} hp`} />
        </Section>

        <Section title="Consumables">
          <Table
            head={["item", "+hp", "+energy", "clears bleed"]}
            rows={Object.entries(CONSUMABLE_EFFECTS).map(([id, eff]) => [
              ITEMS[id]?.name ?? id,
              eff.hp ? `+${eff.hp}` : "—",
              eff.energy ? `+${eff.energy}` : "—",
              eff.clearBleed ? "yes" : "—",
            ])}
          />
        </Section>

        <Section title="Map gen">
          <KV k="Map size" v={`${MAP_WIDTH} × ${MAP_HEIGHT}`} />
          <KV k="Default blocked-tile ratio" v={pct(BLOCKED_TILE_RATIO)} />
          <KV k="Default threat-tile ratio" v={pct(THREAT_TILE_RATIO)} />
          <KV
            k="Heat → ambush rate"
            v={`heat / ${HEAT_AMBUSH_DIVISOR} per move tick`}
          />
        </Section>

        <Section title="Heat-ambush by current heat">
          <Table
            head={["heat", "ambush chance / move"]}
            rows={[25, 50, 75, 100, 150].map((h) => [
              String(h),
              pct(Math.min(1, h / HEAT_AMBUSH_DIVISOR)),
            ])}
          />
        </Section>

        <Section title="Locations">
          <Table
            head={[
              "id",
              "tier",
              "difficulty",
              "mult",
              "threat ratio",
              "blocker ratio",
              "unlock",
            ]}
            rows={LOCATIONS.map((l) => {
              const mult = DIFFICULTY_MULTIPLIER[l.difficulty];
              const threat = THREAT_TILE_RATIO * mult;
              const blocker = l.blockedTileRatio ?? BLOCKED_TILE_RATIO;
              return [
                l.id,
                String(l.tier),
                l.difficulty,
                mult.toFixed(2) + "×",
                pct(threat),
                pct(blocker) + (l.blockedTileRatio ? " (override)" : ""),
                l.unlock?.label ?? "—",
              ];
            })}
          />
        </Section>

        <Section title="Loot category weights (per location)">
          <div className="space-y-3">
            {LOCATIONS.map((l) => (
              <div key={l.id}>
                <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  {l.id}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs">
                  {Object.entries(l.categoryWeights ?? {}).map(([cat, w]) => (
                    <span key={cat}>
                      <span className="text-muted-foreground">{cat}</span>{" "}
                      <span className="text-foreground">{w}</span>
                    </span>
                  ))}
                  {!l.categoryWeights && (
                    <span className="text-muted-foreground italic">global pool fallback</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Room-type event bias">
          <Table
            head={["room type", "biases"]}
            rows={Object.entries(ROOM_EVENT_BIAS).map(([rt, biases]) => [
              rt,
              Object.entries(biases)
                .map(([ev, w]) => `${ev}=${w}`)
                .join("  "),
            ])}
          />
        </Section>

        <Section title="Actions (label + chips)">
          <Table
            head={["action", "label", "chips"]}
            rows={(Object.keys(ACTIONS) as ActionId[]).map((id) => [
              id,
              ACTIONS[id].label,
              chipsFor(id)
                .map((c) => `${c.kind}=${c.value}`)
                .join("  ") || "—",
            ])}
          />
        </Section>

        <Section title="Shop">
          <KV k="Buy markup" v={`${BUY_MARKUP}×`} />
          <KV k="Min price" v={`¤${MIN_PRICE}`} />
          <KV k="Always in stock" v="bandage_pack" />
          <KV k="Bag picks / refresh" v={`2 of ${BAG_POOL.length}`} />
          <KV k="Chem picks / refresh" v={`2 of ${CHEM_POOL.length}`} />
          <KV k="Food picks / refresh" v={`2 of ${FOOD_POOL.length}`} />
          <KV k="Ammo picks / refresh" v={`2 of ${AMMO_POOL.length}`} />
        </Section>

        <Section title="Items by tier">
          <Table
            head={["tier", "count", "ids"]}
            rows={(["common", "uncommon", "rare", "experimental"] as const).map((tier) => {
              const ids = Object.values(ITEMS).filter((i) => i.tier === tier);
              return [
                tier,
                String(ids.length),
                ids.map((i) => i.id).join(", "),
              ];
            })}
          />
        </Section>

        <Section title="Item buy prices (top 12 by sell value)">
          <Table
            head={["id", "tier", "category", "sell ¤", "buy ¤"]}
            rows={Object.values(ITEMS)
              .filter((i) => i.sellValue > 0)
              .sort((a, b) => b.sellValue - a.sellValue)
              .slice(0, 12)
              .map((i) => [i.id, i.tier, i.category, String(i.sellValue), String(priceFor(i.id))])}
          />
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 font-mono text-xs uppercase tracking-[0.25em] text-foreground">
        {title}
      </h3>
      <div className="rounded-sm border border-border/60 bg-background/40 p-4">{children}</div>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string | number }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/30 py-1.5 text-xs last:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-mono text-foreground">{v}</span>
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full font-mono text-xs">
        <thead>
          <tr className="text-muted-foreground">
            {head.map((h) => (
              <th key={h} className="border-b border-border/60 px-2 py-1.5 text-left font-normal uppercase tracking-widest">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border/20 last:border-0">
              {r.map((c, j) => (
                <td key={j} className="px-2 py-1 text-foreground">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

