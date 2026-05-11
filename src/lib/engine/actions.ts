import type { ActionId, CurrentRaid, MapTile, RoomType } from "@/lib/types";
import { tileAt } from "@/lib/engine/map";
import { iterKitItems } from "@/lib/engine/equipment";

export interface ActionDef {
  id: ActionId;
  label: string;
  description: string;
  // Whether this action can be picked given current raid state.
  isEligible: (raid: CurrentRaid) => boolean;
}

export const ACTIONS: Record<ActionId, ActionDef> = {
  move_forward: {
    id: "move_forward",
    label: "Move forward",
    description: "Push deeper into the location.",
    isEligible: (raid) => {
      // Always eligible during a raiding state. During extract the queued
      // action is locked to extract_step, so move_forward isn't shown.
      return !raid.runState.flags.includes("extracting");
    },
  },
  loot: {
    id: "loot",
    label: "Loot the room",
    description: "Search the current room for items.",
    isEligible: (raid) => {
      // Allowed during raid AND extract — the operative can opportunistically
      // search a room they're passing back through. Combat suspends it.
      if (raid.runState.flags.includes("combat_engaged")) return false;
      const tile = currentTile(raid);
      if (!tile) return false;
      return tile.type !== "entry" && tile.lootRemaining > 0;
    },
  },
  stay: {
    id: "stay",
    label: "Hold position",
    description: "Stay in place. Lowers heat.",
    isEligible: (raid) => !raid.runState.flags.includes("extracting"),
  },
  extract_step: {
    id: "extract_step",
    label: "Extract",
    description: "Move toward the extract point.",
    isEligible: (raid) => raid.runState.flags.includes("extracting"),
  },
  extract_now: {
    id: "extract_now",
    label: "Leave",
    description: "Step off the extract point and end the raid.",
    isEligible: (raid) => {
      if (raid.runState.flags.includes("combat_engaged")) return false;
      const tile = currentTile(raid);
      return !!tile && tile.type === "entry";
    },
  },
  fight: {
    id: "fight",
    label: "Fight back",
    description: "Trade fire with the threat.",
    isEligible: (raid) => raid.runState.flags.includes("combat_engaged"),
  },
  flee: {
    id: "flee",
    label: "Break contact",
    description: "Try to disengage and slip out.",
    isEligible: (raid) => raid.runState.flags.includes("combat_engaged"),
  },
  breach_locked: {
    id: "breach_locked",
    label: "Breach container",
    description: "Blast open a locked container.",
    isEligible: (raid) => {
      if (raid.runState.flags.includes("combat_engaged")) return false;
      const tile = currentTile(raid);
      return !!tile && tile.lockedContainers.length > 0;
    },
  },
  use_key: {
    id: "use_key",
    label: "Use bypass key",
    description: "Quietly open a locked container. Consumes one Bypass Key.",
    isEligible: (raid) => {
      if (raid.runState.flags.includes("combat_engaged")) return false;
      const tile = currentTile(raid);
      if (!tile || tile.lockedContainers.length === 0) return false;
      return hasItemId(raid.equipment, "bypass_key");
    },
  },
};

// Equipment scan helper — walks pockets, then every bag/rig section.
function hasItemId(eq: CurrentRaid["equipment"], itemId: string): boolean {
  for (const p of iterKitItems(eq)) {
    if (p.itemId === itemId) return true;
  }
  return false;
}

// Static effect chips for each action, used to preview "what happens if I
// queue this." Each chip is { kind, value, tone } where kind drives the
// icon and tone drives the color. Actual rolls in tickAction may deviate.
export type ChipKind =
  | "hp"
  | "energy"
  | "heat"
  | "ammo"
  | "loot"
  | "distance"
  | "depth"
  | "misc";

export interface ActionChip {
  kind: ChipKind;
  value: string;
  tone: "good" | "bad" | "neutral" | "loot";
}

const STATIC_CHIPS: Record<ActionId, ActionChip[]> = {
  move_forward: [{ kind: "depth", value: "+1", tone: "neutral" }],
  loot: [
    { kind: "energy", value: "-1", tone: "bad" },
    { kind: "loot", value: "?", tone: "loot" },
  ],
  stay: [
    { kind: "heat", value: "-8", tone: "good" },
    { kind: "energy", value: "-2", tone: "bad" },
  ],
  extract_step: [{ kind: "distance", value: "-1", tone: "good" }],
  extract_now: [],
  fight: [
    { kind: "ammo", value: "-2", tone: "bad" },
    { kind: "heat", value: "+5", tone: "bad" },
    { kind: "misc", value: "varies", tone: "neutral" },
  ],
  flee: [
    { kind: "misc", value: "60% break", tone: "good" },
    { kind: "hp", value: "40% -5", tone: "bad" },
  ],
  breach_locked: [
    { kind: "ammo", value: "-2", tone: "bad" },
    { kind: "heat", value: "+14", tone: "bad" },
    { kind: "loot", value: "70%", tone: "loot" },
  ],
  use_key: [
    { kind: "heat", value: "+2", tone: "neutral" },
    { kind: "loot", value: "75%", tone: "loot" },
    { kind: "misc", value: "-1 key", tone: "bad" },
  ],
};

// Static chips for the row. Per-raid counts (number of lootable containers,
// number of locked containers) are surfaced as a small "Nx" badge in the
// row's top-right instead — see countFor.
export function chipsFor(id: ActionId): ActionChip[] {
  return STATIC_CHIPS[id];
}

// Optional count badge in the top-right of an action row. Returns null for
// actions where a count doesn't apply.
export function countFor(id: ActionId, raid: CurrentRaid): number | null {
  if (id === "loot") {
    const tile = currentTile(raid);
    return tile && tile.lootRemaining > 0 ? tile.lootRemaining : null;
  }
  if (id === "breach_locked") {
    const tile = currentTile(raid);
    return tile && tile.lockedContainers.length > 0
      ? tile.lockedContainers.length
      : null;
  }
  return null;
}

// Backwards-compat export so existing imports keep working.
export const ACTION_CHIPS = STATIC_CHIPS;

// Dynamic label that reflects the actual move direction for `move_forward`.
// The auto-picker's lane drift and the player's tile-click override can both
// produce moves that aren't strictly forward; the label tracks reality so
// the action card matches the next-step preview arrow on the map.
export function actionLabelFor(id: ActionId, raid: CurrentRaid): string {
  if (id !== "move_forward") return ACTIONS[id].label;
  const step = raid.nextStep;
  if (!step) return ACTIONS.move_forward.label;
  const dx = step.x - raid.operativePos.x;
  const dy = step.y - raid.operativePos.y;
  if (dx > 0) return "Move forward";
  if (dx < 0) return "Move back";
  if (dy < 0) return "Move up";
  if (dy > 0) return "Move down";
  return ACTIONS.move_forward.label;
}

export function currentTile(raid: CurrentRaid): MapTile | undefined {
  return tileAt(raid.map, raid.operativePos.x, raid.operativePos.y);
}

// Pick what the operative would do next without player input. Combat
// sub-mode locks to fight; extract sub-mode locks to extract_step. Otherwise
// loot if available, else push forward.
//
// Extract-while-looting carve-out: if the player manually picked `loot` last
// tick during extract, keep looting as long as the room still has containers.
// Without this, the auto-picker would snap back to extract_step after one
// loot tick, forcing a manual click per container. The opt-in stays — entering
// a new room mid-extract via extract_step does NOT trigger auto-loot.
export function autoPickAction(raid: CurrentRaid): ActionId {
  if (raid.runState.flags.includes("combat_engaged")) return "fight";
  if (raid.runState.flags.includes("extracting")) {
    if (raid.queuedAction === "loot" && ACTIONS.loot.isEligible(raid)) return "loot";
    if (ACTIONS.extract_now.isEligible(raid)) return "extract_now";
    return "extract_step";
  }
  if (ACTIONS.loot.isEligible(raid)) return "loot";
  if (ACTIONS.move_forward.isEligible(raid)) return "move_forward";
  return "stay";
}

// Primary actions are always shown in the action menu (in stable order),
// disabled when ineligible. They drive the operative's default loop:
// raiding / extracting / combat sub-mode.
export function primaryActionOrder(raid: CurrentRaid): ActionId[] {
  if (raid.runState.flags.includes("combat_engaged")) return ["fight", "flee"];
  if (raid.runState.flags.includes("extracting"))
    return ["extract_step", "loot", "stay"];
  return ["move_forward", "loot", "stay"];
}

// Context actions only appear (under a divider) when their isEligible
// returns true. They're the "this room has X" interactions: breach a
// locked container, future lockpick, future use-key.
const CONTEXT_ACTION_IDS: ActionId[] = ["extract_now", "breach_locked", "use_key"];
export function contextActions(raid: CurrentRaid): ActionDef[] {
  if (raid.runState.flags.includes("combat_engaged")) return [];
  return CONTEXT_ACTION_IDS.map((id) => ACTIONS[id]).filter((a) =>
    a.isEligible(raid),
  );
}

// Tags used to bias loot rolls per room type. Imported by the action
// resolver to keep room flavor flowing through Loot outcomes.
export function roomTypeOf(raid: CurrentRaid): RoomType | undefined {
  return currentTile(raid)?.type;
}
