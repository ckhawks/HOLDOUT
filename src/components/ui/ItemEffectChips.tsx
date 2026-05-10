import { Droplet, Heart, Zap } from "lucide-react";
import { CONSUMABLE_EFFECTS } from "@/lib/engine/consumables";
import { cn } from "@/lib/utils";

// Consumable effect chips, styled to match the per-action chips in
// NextActionCard so the player gets a visually-consistent read of "what
// does this do." Render inside any item tooltip / hover surface.
export function ItemEffectChips({ itemId, dimmed }: { itemId: string; dimmed?: boolean }) {
  const eff = CONSUMABLE_EFFECTS[itemId];
  if (!eff) return null;
  return (
    <span className={cn("inline-flex items-center gap-1.5", dimmed && "opacity-50")}>
      {eff.hp ? <Chip Icon={Heart} value={`+${eff.hp}`} tone="good" /> : null}
      {eff.energy ? <Chip Icon={Zap} value={`+${eff.energy}`} tone="good" /> : null}
      {eff.clearBleed ? <Chip Icon={Droplet} value="clear" tone="good" /> : null}
    </span>
  );
}

function Chip({
  Icon,
  value,
  tone,
}: {
  Icon: typeof Heart;
  value: string;
  tone: "good" | "bad" | "neutral";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-sm px-1 py-px font-mono text-[10px] tabular-nums",
        tone === "good" && "text-emerald-300",
        tone === "bad" && "text-red-300",
        tone === "neutral" && "text-foreground/70",
      )}
    >
      <Icon className="size-3" />
      <span>{value}</span>
    </span>
  );
}
