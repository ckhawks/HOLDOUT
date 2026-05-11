"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PanelHeader } from "./PanelHeader";
import { useGame } from "@/store/game";

// Edge-case fallback for module panels reached when the module isn't built.
// Normal navigation only links into a panel once it's built; this catches
// HMR/save-state edge cases where activePanel is stuck on a module that's
// since been wiped.
export function NotBuiltStub({ name }: { name: string }) {
  const setPanel = useGame((s) => s.setPanel);
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <PanelHeader title={name} subtitle="Not built yet. Head to the hideout to build it." />
      <div className="flex-1 px-6 py-6">
        <Button variant="outline" size="sm" onClick={() => setPanel("hideout")} className="rounded-sm">
          <ArrowLeft className="size-3.5" />
          Back to hideout
        </Button>
      </div>
    </section>
  );
}
