"use client";

import { Skull } from "lucide-react";
import { useGame } from "@/store/game";
import { Button } from "@/components/ui/button";
import { LOCATIONS_BY_ID } from "@/lib/data/locations";

export function RaidOutcomeModal() {
  const outcome = useGame((s) => s.raidOutcome);
  const dismiss = useGame((s) => s.dismissRaidOutcome);
  if (!outcome || outcome.type !== "death") return null;

  const locName = LOCATIONS_BY_ID[outcome.locationId]?.name ?? outcome.locationId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-[min(480px,90%)] rounded-md border border-red-500/40 bg-card shadow-2xl">
        <div className="flex items-center gap-3 border-b border-red-500/30 bg-red-500/10 px-5 py-3">
          <Skull className="size-5 text-red-300" />
          <span className="font-mono text-[11px] uppercase tracking-widest text-red-200">
            Operative lost
          </span>
        </div>
        <div className="space-y-3 px-5 py-5">
          <p className="text-foreground/90 leading-relaxed">
            Vital signs flat. The operative didn&apos;t make it out of the {locName}.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Everything they were carrying is lost. They&apos;ll come back injured —
            give them time before the next dispatch.
          </p>
        </div>
        <div className="flex justify-end border-t border-border/60 px-5 py-3">
          <Button onClick={dismiss} variant="destructive" className="rounded-sm">
            Acknowledge
          </Button>
        </div>
      </div>
    </div>
  );
}
