"use client";

import { Check } from "lucide-react";
import { ITEMS } from "@/lib/data/items";
import { METAL_DISPLAY_NAME } from "@/lib/data/smelt";
import { tierDotFor } from "@/lib/itemDisplay";
import { renderCategoryIcon } from "@/lib/itemIcon";
import { cn } from "@/lib/utils";
import type { MetalId, UpgradeCost } from "@/lib/types";

// Shared cost display. Renders requirements as a small table: status icon,
// label, have/need quantity, progress bar. Used by the hideout grid + every
// module's build/upgrade UI.

export interface CostAffordance {
  items?: ReadonlyArray<{ id: string; need: number; have: number }>;
  metals?: ReadonlyArray<{ id: MetalId; need: number; have: number }>;
  // Actual current credits balance — NOT clamped to cost.cash, so the
  // numerator can show "¤500 / ¤300" when the player has more than the
  // requirement (helps gauge runway across multiple potential purchases).
  cashHave?: number;
  // Free-form extra requirements (e.g. "Schematic recovered"). Rendered as
  // additional rows after cash/items/metals. Use sparingly — most gates fit
  // the regular item/metal cost shape.
  extras?: ReadonlyArray<{ label: string; satisfied: boolean }>;
}

interface Row {
  key: string;
  label: React.ReactNode;
  // Formatted quantity column ("4/4", "¤300", "240/300") — kept as a string
  // here so the renderer doesn't have to know which kind of value it's
  // rendering. null = no quantity (binary requirement; cell stays blank).
  quantity: string | null;
  have: number;
  need: number;
  satisfied: boolean;
}

function rowsFor(cost: UpgradeCost, affordances?: CostAffordance): Row[] {
  const rows: Row[] = [];

  if (cost.cash > 0) {
    const cashHave = Math.max(0, affordances?.cashHave ?? 0);
    const satisfied = cashHave >= cost.cash;
    rows.push({
      key: "cash",
      label: (
        <span className="inline-flex items-center gap-1.5">
          {/* Project-wide credits glyph (see Header.tsx) — not an icon, the
              ¤ character itself is the brand mark for currency. */}
          <span className={cn("inline-flex size-3.5 shrink-0 items-center justify-center font-mono", satisfied ? "text-foreground/85" : "text-muted-foreground/60")}>
            ¤
          </span>
          Credits
        </span>
      ),
      // Show currency glyph in the quantity column so the unit is visible.
      // Numerator reflects the player's actual balance — uncapped — so they
      // can see how comfortable they are vs the requirement.
      quantity: `¤${cashHave.toLocaleString()} / ¤${cost.cash.toLocaleString()}`,
      have: cashHave,
      need: cost.cash,
      satisfied,
    });
  }

  for (const req of cost.items ?? []) {
    const aff = affordances?.items?.find((a) => a.id === req.id);
    const have = aff?.have ?? 0;
    const satisfied = have >= req.count;
    // Item tier color only renders when we have at least one — otherwise the
    // row reads as a muted "still need this" rather than advertising a tier
    // colour for something we don't possess. Category icon prefixes the
    // name so the row visually echoes the stash row treatment.
    rows.push({
      key: `item:${req.id}`,
      label: (
        <span className="inline-flex items-center gap-1.5">
          {renderCategoryIcon(req.id, cn("size-3.5 shrink-0", satisfied ? "" : "text-muted-foreground/60"))}
          <span className={satisfied ? "text-foreground/90" : "text-muted-foreground"}>
            {ITEMS[req.id]?.name ?? req.id}
          </span>
          {/* Rarity-tier dot. Kept on the row even when unsatisfied so the
              player can still see what tier they're hunting for. */}
          <span
            className={cn(
              "inline-block size-1.5 shrink-0 rounded-full",
              tierDotFor(req.id),
              satisfied ? "" : "opacity-60",
            )}
            aria-hidden
          />
        </span>
      ),
      quantity: `${have} / ${req.count}`,
      have,
      need: req.count,
      satisfied,
    });
  }

  for (const req of cost.metals ?? []) {
    const aff = affordances?.metals?.find((a) => a.id === req.id);
    const have = aff?.have ?? 0;
    const satisfied = have >= req.count;
    rows.push({
      key: `metal:${req.id}`,
      label: (
        <span className={satisfied ? "text-foreground/85" : "text-muted-foreground"}>
          {METAL_DISPLAY_NAME[req.id] ?? req.id}
        </span>
      ),
      quantity: `${have} / ${req.count}`,
      have,
      need: req.count,
      satisfied,
    });
  }

  for (const extra of affordances?.extras ?? []) {
    rows.push({
      key: `extra:${extra.label}`,
      label: <span>{extra.label}</span>,
      quantity: null,
      have: extra.satisfied ? 1 : 0,
      need: 1,
      satisfied: extra.satisfied,
    });
  }

  return rows;
}

export function CostList({
  cost,
  affordances,
}: {
  cost: UpgradeCost;
  affordances?: CostAffordance;
}) {
  const rows = rowsFor(cost, affordances);
  if (rows.length === 0) return null;
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.map((r) => {
          const pct = r.need > 0 ? Math.min(1, r.have / r.need) : 1;
          return (
            <tr key={r.key} className="even:bg-foreground/[0.03]">
              <td className="py-1 pl-1.5 pr-2 align-middle w-[22px]">
                <span
                  className={cn(
                    "flex size-4 items-center justify-center rounded-sm",
                    r.satisfied
                      ? "bg-emerald-500/25 text-emerald-300"
                      : "bg-border/40 text-muted-foreground/70",
                  )}
                >
                  {r.satisfied && <Check className="size-3" strokeWidth={3} />}
                </span>
              </td>
              <td
                className={cn(
                  "py-1 pr-3 align-middle",
                  r.satisfied ? "text-foreground/90" : "text-muted-foreground/80",
                )}
              >
                {r.label}
              </td>
              <td
                className={cn(
                  "py-1 pr-3 text-right font-mono text-xs tabular-nums align-middle whitespace-nowrap",
                  r.satisfied ? "text-foreground/75" : "text-muted-foreground/70",
                )}
              >
                {r.quantity ?? ""}
              </td>
              <td className="py-1 pr-1.5 align-middle w-40">
                <div className="h-2 w-full overflow-hidden rounded-sm bg-border/40">
                  <div
                    className={cn(
                      "h-full transition-[width] duration-200",
                      r.satisfied ? "bg-emerald-400/70" : "bg-muted-foreground/40",
                    )}
                    style={{ width: `${pct * 100}%` }}
                  />
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// Backwards-compat alias for existing call sites that imported CostLine.
export const CostLine = CostList;
