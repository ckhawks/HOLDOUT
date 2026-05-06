"use client";

import { useState } from "react";
import { LOCATIONS } from "@/lib/data/locations";
import { useGame } from "@/store/game";
import { Button } from "@/components/ui/button";
import { PanelHeader } from "./PanelHeader";
import { ArrowRight } from "lucide-react";

export function OpsPanel() {
  const [loc, setLoc] = useState(LOCATIONS[0].id);
  const beginRaid = useGame((s) => s.beginRaid);
  const op = useGame((s) => s.operative);
  const raid = useGame((s) => s.currentRaid);

  const disabled = op.state !== "idle" || !!raid;
  const location = LOCATIONS.find((l) => l.id === loc) ?? LOCATIONS[0];

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <PanelHeader title="Ops Console" subtitle="Dispatch operative to a target location." />
      <div className="flex flex-1 flex-col gap-6 px-6 py-6 text-sm">
        <div className="space-y-2">
          <label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Target Location
          </label>
          <select
            value={loc}
            onChange={(e) => setLoc(e.target.value)}
            disabled={disabled}
            className="w-full max-w-md cursor-pointer rounded-sm border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
          >
            {LOCATIONS.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
        <div className="max-w-md rounded-sm border border-border/60 bg-card/50 p-4 text-sm leading-relaxed text-muted-foreground">
          <div className="mb-1 font-mono text-xs uppercase tracking-widest text-foreground">{location.name}</div>
          {location.description}
          <div className="mt-2 font-mono text-xs uppercase tracking-widest text-foreground/70">Tier {location.tier}</div>
        </div>
        <div>
          <Button
            disabled={disabled}
            onClick={() => beginRaid(loc)}
            className="rounded-sm"
          >
            {disabled ? "Operative deployed" : "Send operative"}
            <ArrowRight className="size-4" />

          </Button>
        </div>
      </div>
    </section>
  );
}
