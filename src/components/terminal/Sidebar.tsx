"use client";

import { BookOpen, Database, Home, Package, Radio, Send, Settings, Store } from "lucide-react";
import { useGame, type PanelId } from "@/store/game";
import { cn } from "@/lib/utils";

const NAV: { id: PanelId; label: string; Icon: typeof Home }[] = [
  { id: "hideout", label: "Hideout", Icon: Home },
  { id: "stash", label: "Stash", Icon: Package },
  { id: "shop", label: "Market", Icon: Store },
  { id: "ops", label: "Ops", Icon: Send },
  { id: "feed", label: "Feed", Icon: Radio },
];

const FOOTER_NAV: { id: PanelId; label: string; Icon: typeof Home }[] = [
  { id: "manual", label: "Manual", Icon: BookOpen },
  { id: "data", label: "Data", Icon: Database },
  { id: "settings", label: "Settings", Icon: Settings },
];

export function Sidebar() {
  const active = useGame((s) => s.activePanel);
  const setPanel = useGame((s) => s.setPanel);
  const raidActive = useGame((s) => !!s.currentRaid?.active);

  return (
    <nav className="flex w-20 flex-col items-stretch border-r border-border/60 bg-background py-2">
      {NAV.map(({ id, label, Icon }) => (
        <NavBtn
          key={id}
          id={id}
          label={label}
          Icon={Icon}
          active={active}
          setPanel={setPanel}
          notify={id === "feed" && raidActive && active !== "feed"}
        />
      ))}
      <div className="mt-auto">
        {FOOTER_NAV.map(({ id, label, Icon }) => (
          <NavBtn key={id} id={id} label={label} Icon={Icon} active={active} setPanel={setPanel} />
        ))}
      </div>
    </nav>
  );
}

function NavBtn({
  id,
  label,
  Icon,
  active,
  setPanel,
  notify = false,
}: {
  id: PanelId;
  label: string;
  Icon: typeof Home;
  active: PanelId;
  setPanel: (p: PanelId) => void;
  notify?: boolean;
}) {
  const selected = active === id;
  return (
    <button
      onClick={() => setPanel(id)}
      title={label}
      className={cn(
        "group flex w-full cursor-pointer flex-col items-center gap-1 px-2 py-3 font-mono text-[10px] uppercase tracking-widest transition",
        selected ? "text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <span
        className={cn(
          "relative flex size-9 items-center justify-center rounded-sm border",
          selected ? "border-foreground/40 bg-accent" : "border-transparent group-hover:border-border",
        )}
      >
        <Icon className="size-4" />
        {notify ? (
          <span className="absolute right-1 top-1 flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
          </span>
        ) : null}
      </span>
      <span>{label}</span>
    </button>
  );
}
