"use client";

import { createElement, useEffect } from "react";
import { useNow } from "@/lib/useNow";
import {
  ChevronRight,
  Crosshair,
  ExternalLink,
  Flame,
  Footprints,
  Heart,
  Loader2,
  LogOut,
  Package,
  Pause,
  Play,
  SkipForward,
  Swords,
  X,
  Zap,
} from "lucide-react";
import { ENEMIES } from "@/lib/data/enemies";
import { useGame } from "@/store/game";
import { ACTION_TIMER_MS } from "@/lib/engine/raid";
import {
  ACTIONS,
  actionLabelFor,
  chipsFor,
  contextActions,
  countFor,
  primaryActionOrder,
  type ActionChip,
  type ChipKind,
} from "@/lib/engine/actions";
import { cn } from "@/lib/utils";
import type { ActionId, CurrentRaid } from "@/lib/types";

const ACTION_ICONS: Partial<Record<ActionId, React.ComponentType<{ className?: string }>>> = {
  extract_now: ExternalLink,
};

const CHIP_ICONS: Record<ChipKind, React.ComponentType<{ className?: string }>> = {
  hp: Heart,
  energy: Zap,
  heat: Flame,
  ammo: Crosshair,
  loot: Package,
  distance: Footprints, // both depth and distance are step counts
  depth: Footprints,
  misc: ChevronRight,
};

export function NextActionCard() {
  const raid = useGame((s) => s.currentRaid);
  const overrideAction = useGame((s) => s.overrideAction);
  const resolvePendingChoice = useGame((s) => s.resolvePendingChoice);
  const togglePause = useGame((s) => s.togglePause);
  const skipActionTimer = useGame((s) => s.skipActionTimer);
  const recall = useGame((s) => s.recall);
  const cancelRecall = useGame((s) => s.cancelRecall);
  const paused = !!raid?.pausedAt;
  const wallNow = useNow();
  const now = paused ? raid?.pausedAt ?? wallNow : wallNow;

  // Slice 2: stance_pick is rendered inline (BranchModal returns null
  // for combat). Auto-resolve to defaultId when the timer runs out.
  const isStancePick =
    !!raid?.combat && raid?.pendingChoice?.eventId === "stance_pick";
  useEffect(() => {
    if (!isStancePick || !raid?.pendingChoice || paused) return;
    const c = raid.pendingChoice;
    if (wallNow >= c.startedAt + c.timerMs) {
      resolvePendingChoice(c.defaultId);
    }
  }, [isStancePick, raid?.pendingChoice, paused, wallNow, resolvePendingChoice]);

  if (!raid) return null;
  const queued = raid.queuedAction;
  const stanceChoice = isStancePick ? raid.pendingChoice : null;
  const stanceElapsed = stanceChoice
    ? Math.max(0, now - stanceChoice.startedAt)
    : 0;
  const stanceRemaining = stanceChoice
    ? Math.max(0, stanceChoice.timerMs - stanceElapsed)
    : 0;
  const stancePct = stanceChoice
    ? Math.max(0, Math.min(1, 1 - stanceElapsed / stanceChoice.timerMs))
    : 1;
  const stanceSeconds = Math.ceil(stanceRemaining / 1000);

  const elapsed = paused ? raid.pausedAt! - raid.actionStartedAt : now - raid.actionStartedAt;
  const remaining = Math.max(0, ACTION_TIMER_MS - elapsed);
  const pct = Math.max(0, Math.min(1, 1 - elapsed / ACTION_TIMER_MS));
  const seconds = Math.ceil(remaining / 1000);

  const isExtracting = raid.runState.flags.includes("extracting");
  const primaryOrder = primaryActionOrder(raid);
  const ctxActions = contextActions(raid);

  // Combat-revamp Slice 1: minimal contact indicator above the action card.
  // Shows the engaged enemy + a HP bar across rounds. Full combat panel
  // with stance chips lands in Slice 2.
  const combatBanner = raid.combat ? (
    <div className="mb-2 rounded-sm border border-amber-500/40 bg-amber-500/10 px-2 py-1.5">
      <div className="flex items-center gap-1.5">
        <Swords className="size-3 text-amber-300" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-amber-200">
          Contact
        </span>
        <span className="ml-auto font-mono text-[10px] tabular-nums text-amber-200/80">
          R{raid.combat.round + 1}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between">
        <span className="text-[12px] font-medium text-amber-100">
          {ENEMIES[raid.combat.enemyArchetypeId]?.name ?? "Hostile"}
        </span>
        <span className="font-mono text-[11px] tabular-nums text-amber-100/90">
          {raid.combat.enemyHp}/{raid.combat.enemyHpMax}
        </span>
      </div>
      <div className="mt-1 h-1 bg-amber-950/60">
        <div
          className="h-full bg-amber-400/80 transition-all"
          style={{
            width: `${Math.max(
              0,
              Math.min(100, (raid.combat.enemyHp / raid.combat.enemyHpMax) * 100),
            )}%`,
          }}
        />
      </div>
    </div>
  ) : null;

  // Header / timer block reused across normal and stance modes. In
  // stance mode we swap the action timer for the stance pendingChoice
  // timer and label the card "Combat" instead of "Next action".
  const headerLabel = stanceChoice ? "Combat" : "Next action";
  const headerSeconds = stanceChoice ? stanceSeconds : seconds;
  const headerPct = stanceChoice ? stancePct : pct;
  const urgentStance = stanceChoice && stanceRemaining < 3000;

  return (
    <aside className="flex w-56 shrink-0 flex-col border-l border-border/60 bg-card/30 px-3 py-3">
      {combatBanner}
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "font-mono text-[10px] uppercase tracking-widest",
            stanceChoice ? "text-amber-300" : "text-muted-foreground",
          )}
        >
          {headerLabel}
        </span>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "font-mono text-[11px] tabular-nums",
              urgentStance ? "text-red-400" : "text-muted-foreground",
            )}
          >
            {headerSeconds}s
          </span>
          <button
            type="button"
            onClick={skipActionTimer}
            disabled={paused || !!raid.pendingChoice}
            title="Skip timer"
            className="flex size-5 cursor-pointer items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            <SkipForward className="size-3" />
          </button>
          <button
            type="button"
            onClick={togglePause}
            title={paused ? "Resume" : "Pause"}
            className={cn(
              "flex size-5 cursor-pointer items-center justify-center rounded-sm transition-colors",
              paused
                ? "text-emerald-300 hover:bg-emerald-500/20"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {paused ? <Play className="size-3" /> : <Pause className="size-3" />}
          </button>
        </div>
      </div>
      <div className="mt-1 h-1 bg-border/40">
        <div
          className={cn(
            "h-full",
            paused
              ? "animate-pulse bg-amber-300/80"
              : urgentStance
              ? "bg-red-400/80"
              : "bg-foreground/80",
          )}
          style={{ width: `${headerPct * 100}%`, transition: "width 100ms linear" }}
        />
      </div>
      {stanceChoice ? (
        <div className="mt-2 flex flex-col gap-1">
          {stanceChoice.options.map((opt) => (
            <StanceRow
              key={opt.id}
              optionId={opt.id}
              label={opt.label}
              description={opt.description}
              chips={opt.chips ?? []}
              isDefault={opt.id === stanceChoice.defaultId}
              onPick={resolvePendingChoice}
            />
          ))}
        </div>
      ) : (
        <div className="mt-2 flex flex-col gap-1">
          {primaryOrder.map((id) => (
            <ActionRow
              key={id}
              id={id}
              raid={raid}
              queued={queued}
              onPick={overrideAction}
            />
          ))}
          {ctxActions.length > 0 ? (
            <>
              <div className="my-1 border-t border-border/60" />
              {ctxActions.map((a) => (
                <ActionRow
                  key={a.id}
                  id={a.id}
                  raid={raid}
                  queued={queued}
                  onPick={overrideAction}
                />
              ))}
            </>
          ) : null}
        </div>
      )}
      <div className="mt-3 border-t border-border/60 pt-3">
        {isExtracting ? (
          <button
            type="button"
            onClick={cancelRecall}
            className={cn(
              "group flex w-full cursor-pointer items-center justify-center gap-2 rounded-sm border px-3 py-2 font-mono text-[10px] uppercase tracking-widest transition-colors",
              "border-emerald-500/50 bg-emerald-500/10 text-emerald-300 hover:border-red-500 hover:bg-red-500/15 hover:text-red-300",
            )}
          >
            <span className="flex items-center gap-2 group-hover:hidden">
              <Loader2 className="size-3.5 animate-spin" />
              Moving to extract
            </span>
            <span className="hidden items-center gap-2 group-hover:flex">
              <X className="size-3.5" />
              Cancel extract
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={recall}
            className={cn(
              "flex w-full cursor-pointer items-center justify-center gap-2 rounded-sm px-3 py-2 font-mono text-[10px] uppercase tracking-widest transition-colors",
              "text-red-400/80 hover:bg-red-500/10 hover:text-red-300",
            )}
          >
            <LogOut className="size-3.5" />
            Recall to extract
          </button>
        )}
      </div>
    </aside>
  );
}

function ActionRow({
  id,
  raid,
  queued,
  onPick,
}: {
  id: ActionId;
  raid: CurrentRaid;
  queued: ActionId;
  onPick: (id: ActionId) => void;
}) {
  const a = ACTIONS[id];
  const eligible = a.isEligible(raid);
  const isQueued = id === queued;
  const chips = chipsFor(id);
  const count = countFor(id, raid);
  return (
    <button
      type="button"
      disabled={!eligible || isQueued}
      onClick={() => onPick(id)}
      className={cn(
        "relative flex w-full items-start gap-2 rounded-sm border px-2.5 py-1.5 text-left transition-colors",
        isQueued &&
          "border-border/60 bg-emerald-400/10 text-foreground",
        !isQueued &&
          eligible &&
          "cursor-pointer border-border/60 bg-background/30 text-foreground/80 hover:border-foreground/40 hover:bg-muted",
        !isQueued &&
          !eligible &&
          "cursor-not-allowed border-border/30 bg-background/20 text-muted-foreground/40",
      )}
    >
      <ChevronRight
        className={cn(
          "mt-0.5 size-3 shrink-0",
          isQueued ? "text-emerald-400" : "text-transparent",
        )}
      />
      <div className="flex flex-1 flex-col gap-1">
        <span className="flex items-center gap-1.5 text-[12px] font-medium leading-tight">
          {ACTION_ICONS[id]
            ? createElement(ACTION_ICONS[id]!, { className: "size-3 shrink-0" })
            : null}
          {actionLabelFor(id, raid)}
        </span>
        <span className="text-[10px] font-normal leading-tight text-muted-foreground opacity-80">
          {a.description}
        </span>
        {chips.length > 0 ? (
          <div className="mt-0.5 flex flex-wrap gap-1">
            {chips.map((c, i) => (
              <ChipPill key={i} chip={c} dimmed={!eligible} />
            ))}
          </div>
        ) : null}
      </div>
      {count !== null ? (
        <span
          className={cn(
            "absolute right-1.5 top-1.5 rounded-sm border border-foreground/30 bg-foreground/10 px-1 py-px font-mono text-[10px] tabular-nums text-foreground/80",
            !eligible && "opacity-50",
          )}
          title={`${count} available`}
        >
          {count}x
        </span>
      ) : null}
    </button>
  );
}

// Slice 2 — stance row. Renders one stance option inline in the action
// card so combat doesn't blackout the rest of the terminal. Chips come
// from the pendingChoice option (pre-rendered by makeStancePickChoice
// so the values stay in lock-step with the resolver).
function StanceRow({
  optionId,
  label,
  description,
  chips,
  isDefault,
  onPick,
}: {
  optionId: string;
  label: string;
  description?: string;
  chips: { text: string; tone: "good" | "bad" | "neutral" | "loot" }[];
  isDefault: boolean;
  onPick: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(optionId)}
      className={cn(
        "relative flex w-full cursor-pointer items-start gap-2 rounded-sm border px-2.5 py-1.5 text-left transition-colors",
        "border-border/60 bg-background/30 text-foreground/90 hover:border-amber-400/60 hover:bg-amber-500/10",
        isDefault && "ring-1 ring-amber-400/40",
      )}
    >
      <ChevronRight className="mt-0.5 size-3 shrink-0 text-amber-400" />
      <div className="flex flex-1 flex-col gap-1">
        <span className="flex items-center gap-1.5 text-[12px] font-medium leading-tight">
          {label}
          {isDefault ? (
            <span className="rounded-sm bg-amber-400/20 px-1 py-px font-mono text-[8px] uppercase tracking-widest text-amber-300">
              Default
            </span>
          ) : null}
        </span>
        {description ? (
          <span className="text-[10px] font-normal leading-tight text-muted-foreground opacity-80">
            {description}
          </span>
        ) : null}
        {chips.length > 0 ? (
          <div className="mt-0.5 flex flex-wrap gap-1">
            {chips.map((c, i) => (
              <span
                key={i}
                className={cn(
                  "inline-block rounded-sm px-1 py-px font-mono text-[10px] tabular-nums",
                  c.tone === "good" && "text-emerald-300",
                  c.tone === "bad" && "text-red-300",
                  c.tone === "loot" && "text-amber-300",
                  c.tone === "neutral" && "text-foreground/70",
                )}
              >
                {c.text}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </button>
  );
}

function ChipPill({ chip, dimmed }: { chip: ActionChip; dimmed: boolean }) {
  const Icon = CHIP_ICONS[chip.kind];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-sm px-1 py-px font-mono text-[10px] tabular-nums",
        chip.tone === "good" && "text-emerald-300",
        chip.tone === "bad" && "text-red-300",
        chip.tone === "loot" && "text-amber-300",
        chip.tone === "neutral" && "text-foreground/70",
        dimmed && "opacity-50",
      )}
      title={`${chip.kind}: ${chip.value}`}
    >
      <Icon className="size-3" />
      <span>{chip.value}</span>
    </span>
  );
}
