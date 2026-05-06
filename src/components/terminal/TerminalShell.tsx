"use client";

import { useEffect } from "react";
import { useGame } from "@/store/game";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { HideoutPanel } from "@/components/panels/HideoutPanel";
import { StashPanel } from "@/components/panels/StashPanel";
import { OpsPanel } from "@/components/panels/OpsPanel";
import { FeedPanel } from "@/components/panels/FeedPanel";
import { SettingsPanel } from "@/components/panels/SettingsPanel";
import { useRaidLoop } from "@/components/terminal/useRaidLoop";

export function TerminalShell() {
  const panel = useGame((s) => s.activePanel);
  const hydrate = useGame((s) => s.hydrate);
  const hydrated = useGame((s) => s.hydrated);
  useRaidLoop();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!hydrated) {
    return (
      <div className="flex h-svh items-center justify-center bg-background font-mono text-xs uppercase tracking-widest text-muted-foreground">
        booting terminal…
      </div>
    );
  }

  return (
    <div className="flex h-svh flex-col bg-background text-foreground">
      <Header />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="grid-paper flex min-h-0 flex-1 flex-col">
          {panel === "hideout" && <HideoutPanel />}
          {panel === "stash" && <StashPanel />}
          {panel === "ops" && <OpsPanel />}
          {panel === "feed" && <FeedPanel />}
          {panel === "settings" && <SettingsPanel />}
        </main>
      </div>
    </div>
  );
}
