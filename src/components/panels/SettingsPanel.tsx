"use client";

import { useState } from "react";
import { useGame } from "@/store/game";
import { Button } from "@/components/ui/button";
import { PanelHeader } from "./PanelHeader";
import { TriangleAlert } from "lucide-react";

export function SettingsPanel() {
  const resetGame = useGame((s) => s.resetGame);
  const [confirming, setConfirming] = useState(false);

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <PanelHeader title="Settings" subtitle="System controls." />
      <div className="flex-1 overflow-y-auto px-6 py-6 text-sm">
        <div className="max-w-md rounded-sm border border-dashed border-border/60 bg-card/40 p-4">
          <div className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-foreground">
            <TriangleAlert className="size-4" /> Danger zone
          </div>
          <p className="text-muted-foreground">
            Erase your save and start a new playthrough. Cannot be undone.
          </p>
          {!confirming ? (
            <Button
              variant="destructive"
              onClick={() => setConfirming(true)}
              className="mt-3 rounded-sm"
            >
              Reset game
            </Button>
          ) : (
            <div className="mt-3 flex items-center gap-2">
              <Button
                variant="destructive"
                onClick={() => {
                  resetGame();
                  setConfirming(false);
                }}
                className="rounded-sm"
              >
                Confirm reset
              </Button>
              <Button
                variant="outline"
                onClick={() => setConfirming(false)}
                className="rounded-sm"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
