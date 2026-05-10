"use client";

import { useEffect } from "react";
import { useGame } from "@/store/game";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { HideoutPanel } from "@/components/panels/HideoutPanel";
import { StashPanel } from "@/components/panels/StashPanel";
import { OpsPanel } from "@/components/panels/OpsPanel";
import { FeedPanel } from "@/components/panels/FeedPanel";
import { ShopPanel } from "@/components/panels/ShopPanel";
import { SettingsPanel } from "@/components/panels/SettingsPanel";
import { ManualPanel } from "@/components/panels/ManualPanel";
import { RaidOutcomeModal } from "@/components/panels/RaidOutcomeModal";
import { useRaidLoop } from "@/components/terminal/useRaidLoop";
import { initSfx, playSfx } from "@/lib/sfx";
import { dumpRaid } from "@/lib/engine/debug";

export function TerminalShell() {
  const panel = useGame((s) => s.activePanel);
  const hydrate = useGame((s) => s.hydrate);
  const hydrated = useGame((s) => s.hydrated);
  useRaidLoop();

  useEffect(() => {
    hydrate();
    initSfx();
    // Console-callable debug helpers. Type `__h.dump()` (or
    // `window.__h.dump()`) in devtools to see the raid map + state.
    if (typeof window !== "undefined") {
      const h = {
        dump: () => {
          const raid = useGame.getState().currentRaid;
          if (!raid) {
              console.log("no active raid");
            return;
          }
          console.log(dumpRaid(raid));
        },
        tail: (n = 20) => {
          const raid = useGame.getState().currentRaid;
          if (!raid) return;
          for (const e of raid.log.slice(-n)) {
              console.log(`[${e.kind}] ${e.text}`);
          }
        },
        state: () => useGame.getState(),
      };
      (window as unknown as { __h: typeof h; holdout: typeof h }).__h = h;
      // Also expose as `holdout` in case `__h` shadows in devtools.
      (window as unknown as { __h: typeof h; holdout: typeof h }).holdout = h;
      console.log(
        "[holdout] debug helpers ready: __h.dump(), __h.tail(), __h.state()",
      );
    }
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (
        t.closest('[data-slot="button"]') ||
        t.closest("button") ||
        t.closest('[role="button"]') ||
        t.closest("select") ||
        t.closest('[data-sfx="click"]')
      ) {
        playSfx();
      }
    };
    window.addEventListener("click", onClick);
    // Suppress the native right-click menu — we'll add our own UI later.
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    window.addEventListener("contextmenu", onContextMenu);
    // Spacebar toggles pause when a raid is in progress. Capture phase on
    // document so the handler runs before any focused button's space-as-click,
    // and runs regardless of focus (body, panel div, etc.).
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.key !== " ") return;
      const target = e.target as HTMLElement | null;
      // Bail only for actual text-entry contexts.
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      const raid = useGame.getState().currentRaid;
      if (!raid || !raid.active) return;
      e.preventDefault();
      e.stopPropagation();
      // Drop focus so a button doesn't intercept the next press.
      const active = document.activeElement as HTMLElement | null;
      if (active && typeof active.blur === "function") active.blur();
      useGame.getState().togglePause();
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("click", onClick);
      window.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [hydrate]);

  if (!hydrated) {
    return (
      <div className="flex h-svh items-center justify-center bg-background font-mono text-xs uppercase tracking-widest text-muted-foreground">
        booting terminal…
      </div>
    );
  }

  return (
    <div className="flex h-svh flex-col select-none bg-background text-foreground">
      <Header />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="grid-paper flex min-h-0 flex-1 flex-col">
          {panel === "hideout" && <HideoutPanel />}
          {panel === "stash" && <StashPanel />}
          {panel === "ops" && <OpsPanel />}
          {panel === "feed" && <FeedPanel />}
          {panel === "shop" && <ShopPanel />}
          {panel === "manual" && <ManualPanel />}
          {panel === "settings" && <SettingsPanel />}
        </main>
      </div>
      <RaidOutcomeModal />
    </div>
  );
}
