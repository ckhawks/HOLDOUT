"use client";

import { Backpack, HardHat, Shield, Swords } from "lucide-react";
import type { Equipment, EquipSlot, SlotItem } from "@/lib/types";
import { ITEMS } from "@/lib/data/items";
import { cn } from "@/lib/utils";
import { tierColorFor, tileBgFor } from "@/lib/itemDisplay";
import { ItemTooltip, Tooltip } from "@/components/ui/Tooltip";

const SLOT_META: Record<EquipSlot, { label: string; Icon: typeof Backpack }> = {
  helmet: { label: "Helmet", Icon: HardHat },
  armor: { label: "Armor", Icon: Shield },
  weapon: { label: "Weapon", Icon: Swords },
  bag: { label: "Bag", Icon: Backpack },
};

// Top-to-bottom order. Bag at the bottom because it's the most-used / closest
// to the kit grids visually.
export const SLOT_ORDER: EquipSlot[] = ["helmet", "armor", "weapon", "bag"];

export type SlotRefMap = Record<EquipSlot, React.RefObject<HTMLDivElement | null>>;

export type SlotHover = { slot: EquipSlot; valid: boolean } | null;

export interface EquippedColumnProps {
  equipment: Equipment;
  refs: SlotRefMap;
  hover: SlotHover;
  // Pointer-down on a filled slot: start a drag whose source is that slot.
  onSlotPointerDown?: (slot: EquipSlot, e: React.PointerEvent) => void;
  // Highlight a dragging item to show this slot as a candidate target.
  draggingForSlot?: EquipSlot | null;
  // Optional title shown above the column.
  title?: string;
}

function slotItem(eq: Equipment, slot: EquipSlot): SlotItem | null {
  if (slot === "bag") return eq.bag?.slot ?? null;
  return eq[slot];
}

export function EquippedColumn({
  equipment,
  refs,
  hover,
  onSlotPointerDown,
  draggingForSlot,
  title = "Equipped",
}: EquippedColumnProps) {
  return (
    <div className="flex w-20 shrink-0 flex-col gap-2">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {title}
      </div>
      <div className="flex flex-col gap-2">
        {SLOT_ORDER.map((slot) => {
          const item = slotItem(equipment, slot);
          const meta = SLOT_META[slot];
          const isHover = hover?.slot === slot;
          const isCandidate = draggingForSlot === slot;
          const slotInner = (
              <div
                ref={refs[slot]}
                data-slot={slot}
                className={cn(
                  "relative flex h-16 w-16 flex-col items-center justify-center rounded-sm border bg-card/30 transition-colors",
                  item ? "border-border/80" : "border-dashed border-border/40",
                  isCandidate && !isHover && "border-foreground/40 bg-foreground/5",
                  isHover && hover.valid && "border-emerald-400/80 bg-emerald-500/15",
                  isHover && !hover.valid && "border-red-500/80 bg-red-500/15",
                )}
              >
                {item ? (
                  <SlotTile
                    itemId={item.itemId}
                    label={ITEMS[item.itemId]?.name ?? item.itemId}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      onSlotPointerDown?.(slot, e);
                    }}
                  />
                ) : (
                  <>
                    <meta.Icon className="size-5 text-muted-foreground/40" />
                    <span className="mt-0.5 font-mono text-[8px] uppercase tracking-widest text-muted-foreground/60">
                      {meta.label}
                    </span>
                  </>
                )}
              </div>
          );
          return item ? (
            <ItemTooltip
              key={slot}
              itemId={item.itemId}
              hint={`${meta.label} slot · drag or ctrl+click to unequip`}
            >
              {slotInner}
            </ItemTooltip>
          ) : (
            <Tooltip key={slot} text={`${meta.label} · empty`}>
              {slotInner}
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}

function SlotTile({
  itemId,
  label,
  onPointerDown,
}: {
  itemId: string;
  label: string;
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  const bg = tileBgFor(itemId);
  const fg = tierColorFor(itemId);
  return (
    <div
      onPointerDown={onPointerDown}
      className={cn(
        "flex size-full cursor-grab items-center justify-center rounded-sm border active:cursor-grabbing",
        bg,
      )}
    >
      <span
        className={cn(
          "pointer-events-none font-mono text-[10px] font-semibold uppercase tracking-widest",
          fg,
        )}
      >
        {abbreviate(label)}
      </span>
    </div>
  );
}

function abbreviate(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return parts.slice(0, 3).map((p) => p[0]).join("").toUpperCase();
  return name.slice(0, 3).toUpperCase();
}
