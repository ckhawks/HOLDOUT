import type { ActionId, CurrentRaid, MapTile, RoomType } from "@/lib/types";
import { tileAt } from "@/lib/engine/map";

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
      const tile = currentTile(raid);
      if (!tile) return false;
      return tile.type !== "entry" && tile.lootRemaining > 0;
    },
  },
  stay: {
    id: "stay",
    label: "Hold position",
    description: "Stay in place. Lowers alertness.",
    isEligible: (raid) => !raid.runState.flags.includes("extracting"),
  },
  extract_step: {
    id: "extract_step",
    label: "Extract",
    description: "Move toward the extract point.",
    isEligible: (raid) => raid.runState.flags.includes("extracting"),
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
};

export function currentTile(raid: CurrentRaid): MapTile | undefined {
  return tileAt(raid.map, raid.operativePos.x, raid.operativePos.y);
}

// Pick what the operative would do next without player input. Combat
// sub-mode locks to fight; extract sub-mode locks to extract_step. Otherwise
// loot if available, else push forward.
export function autoPickAction(raid: CurrentRaid): ActionId {
  if (raid.runState.flags.includes("combat_engaged")) return "fight";
  if (raid.runState.flags.includes("extracting")) return "extract_step";
  if (ACTIONS.loot.isEligible(raid)) return "loot";
  if (ACTIONS.move_forward.isEligible(raid)) return "move_forward";
  return "stay";
}

// Returns the actions the player can override to right now. Combat sub-mode
// shows only fight/flee; extract sub-mode shows extract_step/stay; raiding
// shows the regular trio.
export function availableActions(raid: CurrentRaid): ActionDef[] {
  const order: ActionId[] = raid.runState.flags.includes("combat_engaged")
    ? ["fight", "flee"]
    : raid.runState.flags.includes("extracting")
      ? ["extract_step", "stay"]
      : ["move_forward", "loot", "stay"];
  return order.map((id) => ACTIONS[id]).filter((a) => a.isEligible(raid));
}

// Tags used to bias loot rolls per room type. Imported by the action
// resolver to keep room flavor flowing through Loot outcomes.
export function roomTypeOf(raid: CurrentRaid): RoomType | undefined {
  return currentTile(raid)?.type;
}
