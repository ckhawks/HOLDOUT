"use client";

import { ChevronsUp, Flame, Hammer, Lock, Microscope, Package, Plus, Recycle, Shield, Shirt, Wrench, Zap } from "lucide-react";
import { useGame } from "@/store/game";
import { PanelHeader } from "./PanelHeader";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/Tooltip";
import { CostLine } from "@/components/hideout/UpgradeCostDisplay";
import { STASH_SLOTS_PER_LEVEL, stashUpgradeCost } from "@/lib/engine/upgrades";
import { canAfford as canAffordCost } from "@/lib/engine/hideout";
import { MODULE_BUILD_COSTS, MODULE_DEFS, MODULE_TIER_COSTS, MODULE_TIER_EFFECTS } from "@/lib/data/modules";
import { toast } from "@/lib/toast";
import type { FoundryState, ModuleId, StashItem, UpgradeCost } from "@/lib/types";
import type { CostAffordance } from "@/components/hideout/UpgradeCostDisplay";
import type { PanelId } from "@/store/game";

// Per-module routing + flavor for the unbuilt → built transition. Keeps the
// JSX below readable instead of repeating ten near-identical ModuleCard
// blocks. Every entry corresponds to a `construction.modules[id]`.
interface BuildableModule {
  id: ModuleId;
  name: string;
  Icon: typeof Package;
  panel: PanelId;
  builtStatus: (mod: { tier: number }) => string;
  builtAction: string;
  flavor: string;
}

// Render order matches the expected unlock arc: Stash card (always present)
// → Recycler (produces components) → Workbench (consumes them) → Research
// Bench (unlocks more recipes) → Foundry (metals; mid-late scaling sink) →
// Armory + Armor Stand + Repair Bench (gear/storage QoL; the last two are
// placeholders pending their feature systems) → Generator (powers the
// high-tier modules, only relevant once those tiers are on the horizon).
const BUILDABLE_MODULES: BuildableModule[] = [
  {
    id: "recycler", name: "Recycler", Icon: Recycle, panel: "recycler",
    builtStatus: (m) => `tier ${m.tier} · ready`,
    builtAction: "Open Recycler",
    flavor: "Decompose junk into base components.",
  },
  {
    id: "workbench", name: "Workbench", Icon: Hammer, panel: "workbench",
    builtStatus: (m) => `tier ${m.tier} · craft enabled`,
    builtAction: "Open Workbench",
    flavor: "Craft apparel + medical items from components.",
  },
  {
    id: "research_bench", name: "Research Bench", Icon: Microscope, panel: "research_bench",
    builtStatus: (m) => `tier ${m.tier} · unlock recipes`,
    builtAction: "Open Bench",
    flavor: "Spend docs + components to unlock locked craft recipes.",
  },
  {
    id: "foundry", name: "Foundry", Icon: Flame, panel: "foundry",
    builtStatus: (m) => `tier ${m.tier} · vessels online`,
    builtAction: "Open Foundry",
    flavor: "Melt metallic items into vessel-stored metals.",
  },
  {
    id: "armory", name: "Armory", Icon: Shield, panel: "armory",
    builtStatus: (m) => `tier ${m.tier} · gear storage`,
    builtAction: "Open Armory",
    flavor: "Specialized storage for equippable gear.",
  },
  {
    id: "armor_stand", name: "Armor Stand", Icon: Shirt, panel: "armor_stand",
    builtStatus: (m) => `tier ${m.tier} · presets pending`,
    builtAction: "Open Stand",
    flavor: "Loadout presets (coming later).",
  },
  {
    id: "repair_bench", name: "Repair Bench", Icon: Wrench, panel: "repair_bench",
    builtStatus: () => "built · awaiting condition system",
    builtAction: "Open Bench",
    flavor: "Repair gear (coming with weapon condition).",
  },
  {
    id: "generator", name: "Generator", Icon: Zap, panel: "generator",
    builtStatus: (m) => `tier ${m.tier} · power online`,
    builtAction: "Open Generator",
    flavor: "Powers high-tier modules at raid start.",
  },
];

interface ModuleCardShellProps {
  Icon: typeof Package;
  name: string;
  status?: string;
  unlocked: boolean;
  hint?: string;
  // Small uppercase badge at top-left ("Locked" / "Tier 1" / etc.). When
  // omitted, no chip renders.
  badge?: React.ReactNode;
  // Optional element rendered at top-right of the card — the "Open X" link
  // for built modules sits here so the body can focus on status + upgrade.
  topRight?: React.ReactNode;
  children?: React.ReactNode;
  // Footer slot — pinned to the bottom of the card with a top border so it
  // reads as a separated action area (cost checklist + Build / Upgrade
  // button). Cards in the same grid row stretch to match heights so the
  // dividers align across the row.
  footer?: React.ReactNode;
}

function ModuleCardShell({ Icon, name, status, unlocked, hint, badge, topRight, children, footer }: ModuleCardShellProps) {
  const card = (
    <div
      className={cn(
        "flex h-full flex-col gap-2 rounded-sm border p-4 text-sm",
        unlocked
          ? "border-border bg-card/40"
          : "border-dashed border-border/50 bg-card/15",
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className={cn("size-4 shrink-0", !unlocked && "opacity-60")} />
        <span className={cn("font-mono text-xs uppercase tracking-widest text-foreground", !unlocked && "opacity-60")}>
          {name}
        </span>
        {badge}
        {topRight && <div className="ml-auto">{topRight}</div>}
      </div>
      {!unlocked && hint && (
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/80">
          {hint}
        </div>
      )}
      {children && <div className="flex flex-col gap-2">{children}</div>}
      {status && <div className="text-muted-foreground">{status}</div>}
      {footer && (
        <div className="mt-auto flex flex-col gap-3 border-t border-border/50 pt-3">
          {footer}
        </div>
      )}
    </div>
  );
  return hint && unlocked ? <Tooltip text={hint}>{card}</Tooltip> : card;
}

// Shared badge for the inline title-row chip. Tier 1 = light grey (baseline),
// tier 2 = emerald (first meaningful upgrade), tier 3 = blue (advanced),
// tier 4+ = purple (high-end). Locked has its own muted treatment + a Lock
// icon to clearly signal "not built".
function StatusBadge({ variant, label, tier }: { variant: "locked" | "tier"; label: string; tier?: number }) {
  const tierTone = (() => {
    // Tier 1 is the muted "starter" treatment — darker grey fill with a
    // legible light text, distinct from the locked badge's outlined feel.
    if (!tier || tier <= 1) return "bg-muted-foreground/25 text-muted-foreground";
    if (tier === 2) return "bg-emerald-500/15 text-emerald-300/90";
    if (tier === 3) return "bg-blue-500/15 text-blue-300/90";
    return "bg-purple-500/20 text-purple-300/90";
  })();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest",
        variant === "locked" ? "bg-border/50 text-muted-foreground/90" : tierTone,
      )}
    >
      {variant === "locked" && <Lock className="size-2.5" />}
      {label}
    </span>
  );
}

// Compute have-counts for the cost so the inline display can color-code
// missing inputs in red. Done at render against the live stash/foundry.
function affordanceFor(
  cost: UpgradeCost,
  cash: number,
  stash: StashItem[],
  foundry: FoundryState,
): CostAffordance {
  const itemCounts: Record<string, number> = {};
  for (const si of stash) {
    if (si.pinned) continue;
    itemCounts[si.itemId] = (itemCounts[si.itemId] ?? 0) + 1;
  }
  return {
    cashShort: Math.max(0, cost.cash - cash),
    items: (cost.items ?? []).map((req) => ({
      id: req.id,
      need: req.count,
      have: itemCounts[req.id] ?? 0,
    })),
    metals: (cost.metals ?? []).map((req) => ({
      id: req.id,
      need: req.count,
      have: foundry.vessels[req.id] ?? 0,
    })),
  };
}

function BuildableModuleCard({ def }: { def: BuildableModule }) {
  const mod = useGame((s) => s.construction.modules[def.id]);
  const cash = useGame((s) => s.cash);
  const stash = useGame((s) => s.stash);
  const foundry = useGame((s) => s.construction.foundry);
  const setPanel = useGame((s) => s.setPanel);
  const build = useGame((s) => s.buildModule);
  const upgrade = useGame((s) => s.upgradeModule);

  if (mod.built) {
    const maxTier = MODULE_DEFS[def.id].maxTier;
    const nextTier = mod.tier < maxTier ? mod.tier + 1 : null;
    const upgradeCost = nextTier ? MODULE_TIER_COSTS[`${def.id}:${nextTier}`] : null;
    const upgradeAfford = upgradeCost ? canAffordCost(upgradeCost, { cash, stash, foundry }) : null;
    const upgradeAff = upgradeCost ? affordanceFor(upgradeCost, cash, stash, foundry) : null;

    return (
      <ModuleCardShell
        Icon={def.Icon}
        name={def.name}
        unlocked
        badge={<StatusBadge variant="tier" label={`Tier ${mod.tier}`} tier={mod.tier} />}
        topRight={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPanel(def.panel)}
            className="rounded-sm"
          >
            {def.builtAction}
          </Button>
        }
        footer={
          upgradeCost && upgradeAfford && upgradeAff ? (
            <>
              <FooterTitle title="Upgrade" />
              {MODULE_TIER_EFFECTS[`${def.id}:${nextTier}`] && (
                <div className="text-[12px] text-muted-foreground/85">{MODULE_TIER_EFFECTS[`${def.id}:${nextTier}`]}</div>
              )}
              <CostLine cost={upgradeCost} affordances={upgradeAff} />
              <Button
                variant="outline"
                size="sm"
                disabled={!upgradeAfford.ok}
                onClick={() => {
                  const r = upgrade(def.id);
                  if (!r.ok) {
                    toast(
                      r.reason === "missing_items" ? "Missing required parts." :
                      r.reason === "missing_metals" ? "Foundry has insufficient metal." :
                      r.reason === "missing_cash" ? "Not enough cash." :
                      "Cannot upgrade right now.",
                    );
                  } else {
                    toast(`${def.name} → tier ${nextTier}.`);
                  }
                }}
                className="self-start rounded-sm"
              >
                <ChevronsUp className="size-3.5" />
                Upgrade to Tier {nextTier}
              </Button>
            </>
          ) : undefined
        }
      >
        <div className="text-[12px] text-muted-foreground/90">{def.flavor}</div>
      </ModuleCardShell>
    );
  }

  const cost = MODULE_BUILD_COSTS[def.id];
  const afford = canAffordCost(cost, { cash, stash, foundry });
  const aff = affordanceFor(cost, cash, stash, foundry);

  // Unbuilt modules render with the locked treatment (dashed border + faded
  // bg/title) so the hideout grid distinguishes built modules from buildable
  // ones at a glance. Cost + Build sit in the footer so they pin to the
  // bottom of the card and line up across the grid.
  return (
    <ModuleCardShell
      Icon={def.Icon}
      name={def.name}
      unlocked={false}
      badge={<StatusBadge variant="locked" label="Unbuilt" />}
      footer={
        <>
          <FooterTitle title="Construct" />
          <CostLine cost={cost} affordances={aff} />
          <Button
            variant="outline"
            size="sm"
            disabled={!afford.ok}
            onClick={() => {
              const r = build(def.id);
              if (!r.ok) {
                toast(
                  r.reason === "missing_items" ? "Missing required parts." :
                  r.reason === "missing_metals" ? "Foundry has insufficient metal." :
                  r.reason === "missing_cash" ? "Not enough cash." :
                  "Cannot build right now.",
                );
              } else {
                toast(`${def.name} built.`);
              }
            }}
            className="self-start rounded-sm"
          >
            <Plus className="size-3.5" />
            Build {def.name}
          </Button>
        </>
      }
    >
      <div className="text-[12px] text-muted-foreground/90">{def.flavor}</div>
    </ModuleCardShell>
  );
}

// Small uppercase title used to label a card footer section. Matches the
// existing "UPGRADE · TIER 2" treatment so Construct/Upgrade headings sit
// in the same visual slot.
function FooterTitle({ title }: { title: string }) {
  return (
    <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/80">
      {title}
    </div>
  );
}

export function HideoutPanel() {
  const h = useGame((s) => s.hideout);
  const stashLen = useGame((s) => s.stash.length);
  const cash = useGame((s) => s.cash);
  const upgrades = useGame((s) => s.upgrades);
  const buyStash = useGame((s) => s.buyStashUpgrade);
  const setPanel = useGame((s) => s.setPanel);
  const stashList = useGame((s) => s.stash);
  const foundryState = useGame((s) => s.construction.foundry);

  const stashCost = stashUpgradeCost(upgrades);
  const stashAfford = canAffordCost(stashCost, { cash, stash: stashList, foundry: foundryState });
  const stashAff = affordanceFor(stashCost, cash, stashList, foundryState);

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <PanelHeader title="Hideout" subtitle="Your concealed position. Where the kit gets built." />
      <div className="grid flex-1 grid-cols-1 gap-3 overflow-y-auto px-6 py-6 sm:grid-cols-2 lg:grid-cols-3">
        <ModuleCardShell
          Icon={Package}
          name="Stash"
          status={`${stashLen} of ${h.modules.stash.capacity} slots`}
          unlocked
          badge={<StatusBadge variant="tier" label={`Tier ${upgrades.stashLevel + 1}`} tier={upgrades.stashLevel + 1} />}
          topRight={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPanel("stash")}
              className="rounded-sm"
            >
              Open Stash
            </Button>
          }
          footer={
            <>
              <FooterTitle title="Upgrade" />
              <div className="text-[12px] text-muted-foreground/85">
                +{STASH_SLOTS_PER_LEVEL} slots (to {(h.modules.stash.capacity ?? 0) + STASH_SLOTS_PER_LEVEL}).
              </div>
              <CostLine cost={stashCost} affordances={stashAff} />
              <Button
                variant="outline"
                size="sm"
                disabled={!stashAfford.ok}
                onClick={buyStash}
                className="self-start rounded-sm"
              >
                <ChevronsUp className="size-3.5" />
                Upgrade to Tier {upgrades.stashLevel + 2}
              </Button>
            </>
          }
        >
          <div className="text-[12px] text-muted-foreground/90">
            Persistent storage that survives raids. Doesn&apos;t count against bag or rig capacity.
          </div>
        </ModuleCardShell>

        {BUILDABLE_MODULES.map((def) => (
          <BuildableModuleCard key={def.id} def={def} />
        ))}
      </div>
    </section>
  );
}
