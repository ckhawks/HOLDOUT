import {
  Atom,
  Backpack,
  Cpu,
  Crosshair,
  FileText,
  Gem,
  Pill,
  UtensilsCrossed,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { ItemCategory } from "@/lib/types";
import { ITEMS } from "@/lib/data/items";

export const CATEGORY_ICON: Record<ItemCategory, LucideIcon> = {
  mechanical: Wrench,
  electronics: Cpu,
  medical: Pill,
  consumables: UtensilsCrossed,
  valuables: Gem,
  intel: FileText,
  military: Crosshair,
  experimental: Atom,
  bag: Backpack,
};

export function categoryIconFor(itemId: string | undefined): LucideIcon | null {
  if (!itemId) return null;
  const cat = ITEMS[itemId]?.category;
  return cat ? CATEGORY_ICON[cat] : null;
}
