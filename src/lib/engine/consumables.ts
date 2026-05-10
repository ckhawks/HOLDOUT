// Consumable effects + apply functions. Items not in CONSUMABLE_EFFECTS can't
// be consumed (the store action no-ops). Bandage stays bleed-only via
// applyBandage; nano_clot is the panic-pop that does both HP + bleed clear.
//
// Per the medical-ladder design in BACKLOG: cheap antiseptic for top-off,
// med syrette for mid-game, nano-clot for emergencies. Energy items map to
// Phase K's hunger/thirst loop.

import type { CurrentRaid, Equipment, Operative, StashItem } from "@/lib/types";
import { makeLogger } from "./logging";

export interface ConsumableEffect {
  hp?: number;
  energy?: number;
  clearBleed?: boolean;
  log?: string;
}

export const CONSUMABLE_EFFECTS: Record<string, ConsumableEffect> = {
  bandage_pack: { clearBleed: true, log: "Bandage on. Bleed clamped." },
  antiseptic_vial: { hp: 10, log: "Patched up. +10 HP." },
  med_syrette: { hp: 30, log: "Med syrette injected. +30 HP." },
  nano_clot: { hp: 60, clearBleed: true, log: "Nano-clot fired. +60 HP, bleed clamped." },
  ration_pack: { energy: 30, log: "Ration down. +30 energy." },
  water_bulb: { energy: 15, log: "Water down. +15 energy." },
  coffee_can: { energy: 25, log: "Coffee. +25 energy." },
  protein_bar: { energy: 20, log: "Protein bar down. +20 energy." },
  tea_brick: { energy: 18, log: "Hot tea. +18 energy." },
  electrolyte_pouch: { energy: 40, log: "Electrolytes in. +40 energy." },
  combat_stim: { energy: 30, log: "Combat stim. +30 energy." },
};

export function isConsumable(itemId: string): boolean {
  return itemId in CONSUMABLE_EFFECTS;
}

export function applyConsumable(
  raid: CurrentRaid,
  uid: string,
  now: number,
  rand: () => number,
): CurrentRaid {
  // Find the item by uid in pockets first, then bag.
  const eq = raid.equipment;
  const pocketIdx = eq.pockets.items.findIndex((p) => p.uid === uid);
  const bagIdx =
    pocketIdx === -1 && eq.bag ? eq.bag.items.findIndex((p) => p.uid === uid) : -1;
  if (pocketIdx === -1 && bagIdx === -1) return raid;
  const placement =
    pocketIdx !== -1 ? eq.pockets.items[pocketIdx] : eq.bag!.items[bagIdx];
  const effect = CONSUMABLE_EFFECTS[placement.itemId];
  if (!effect) return raid;

  // Don't consume an item that wouldn't actually do anything. Bandage with
  // no bleed, syrette at full HP, ration at full energy → no-op. Prevents
  // the drag-misclick footgun in the Use zone.
  const rs = raid.runState;
  const hasBleed =
    rs.flags.includes("bleeding_minor") || rs.flags.includes("bleeding_major");
  const hpHelps = (effect.hp ?? 0) > 0 && rs.health < 100;
  const energyHelps = (effect.energy ?? 0) > 0 && rs.energy < 100;
  const bleedHelps = !!effect.clearBleed && hasBleed;
  if (!hpHelps && !energyHelps && !bleedHelps) return raid;

  const equipment: Equipment =
    pocketIdx !== -1
      ? {
          ...eq,
          pockets: {
            ...eq.pockets,
            items: [
              ...eq.pockets.items.slice(0, pocketIdx),
              ...eq.pockets.items.slice(pocketIdx + 1),
            ],
          },
        }
      : {
          ...eq,
          bag: eq.bag
            ? {
                ...eq.bag,
                items: [
                  ...eq.bag.items.slice(0, bagIdx),
                  ...eq.bag.items.slice(bagIdx + 1),
                ],
              }
            : null,
        };

  let flags = raid.runState.flags;
  if (effect.clearBleed) {
    flags = flags.filter((f) => f !== "bleeding_minor" && f !== "bleeding_major");
  }
  const health = Math.max(
    0,
    Math.min(100, raid.runState.health + (effect.hp ?? 0)),
  );
  const energy = Math.max(
    0,
    Math.min(100, raid.runState.energy + (effect.energy ?? 0)),
  );

  return {
    ...raid,
    equipment,
    runState: { ...raid.runState, health, energy, flags },
    log: [
      ...raid.log,
      makeLogger(now, rand)("system", effect.log ?? "Consumed."),
    ],
  };
}

export function applyBandage(
  raid: CurrentRaid,
  now: number,
  rand: () => number,
): CurrentRaid {
  const hadMinor = raid.runState.flags.includes("bleeding_minor");
  const hadMajor = raid.runState.flags.includes("bleeding_major");
  if (!hadMinor && !hadMajor) return raid;
  // Pull a bandage from pockets first (closer to hand), then bag.
  const eq = raid.equipment;
  const pocketIdx = eq.pockets.items.findIndex((p) => p.itemId === "bandage_pack");
  const bagIdx =
    pocketIdx === -1 && eq.bag
      ? eq.bag.items.findIndex((p) => p.itemId === "bandage_pack")
      : -1;
  if (pocketIdx === -1 && bagIdx === -1) return raid;
  const flags = raid.runState.flags.filter(
    (f) => f !== "bleeding_minor" && f !== "bleeding_major",
  );
  const equipment: Equipment =
    pocketIdx !== -1
      ? {
          ...eq,
          pockets: {
            ...eq.pockets,
            items: [
              ...eq.pockets.items.slice(0, pocketIdx),
              ...eq.pockets.items.slice(pocketIdx + 1),
            ],
          },
        }
      : {
          ...eq,
          bag: eq.bag
            ? {
                ...eq.bag,
                items: [
                  ...eq.bag.items.slice(0, bagIdx),
                  ...eq.bag.items.slice(bagIdx + 1),
                ],
              }
            : null,
        };
  return {
    ...raid,
    equipment,
    runState: { ...raid.runState, flags },
    log: [
      ...raid.log,
      makeLogger(now, rand)(
        "system",
        hadMajor ? "Bandage on. Bleed clamped." : "Bandage on.",
      ),
    ],
  };
}

// Out-of-raid consumable use. Mirrors `applyConsumable` but operates on the
// persisted operative + stash (no raid log, no bleed flags — those only live
// on a CurrentRaid). Finds the uid in equipment.pockets / equipment.bag /
// stash, applies the effect's HP and energy deltas to operative vitals, and
// removes the item from wherever it lived. Returns the original tuple
// unchanged on no-op (item not found, item not consumable, item wouldn't
// help current vitals — same would-help guard as the in-raid version).
export function applyConsumableToOperative(
  operative: Operative,
  stash: ReadonlyArray<StashItem>,
  uid: string,
): { operative: Operative; stash: StashItem[]; consumed: boolean; itemId: string | null } {
  const noChange = { operative, stash: [...stash], consumed: false, itemId: null };

  // Locate the item.
  const eq = operative.equipment;
  const pocketIdx = eq.pockets.items.findIndex((p) => p.uid === uid);
  const bagIdx =
    pocketIdx === -1 && eq.bag ? eq.bag.items.findIndex((p) => p.uid === uid) : -1;
  const stashIdx =
    pocketIdx === -1 && bagIdx === -1 ? stash.findIndex((s) => s.uid === uid) : -1;
  if (pocketIdx === -1 && bagIdx === -1 && stashIdx === -1) return noChange;

  const itemId =
    pocketIdx !== -1
      ? eq.pockets.items[pocketIdx].itemId
      : bagIdx !== -1
        ? eq.bag!.items[bagIdx].itemId
        : stash[stashIdx].itemId;
  const effect = CONSUMABLE_EFFECTS[itemId];
  if (!effect) return noChange;

  // Would-help guard. Bleed-clear effects are no-ops out of raid (no flags
  // to clear), so a bandage out here only helps if it also has hp/energy.
  const hpHelps = (effect.hp ?? 0) > 0 && operative.health < 100;
  const energyHelps = (effect.energy ?? 0) > 0 && operative.energy < 100;
  if (!hpHelps && !energyHelps) return noChange;

  // Remove from source.
  let nextEquipment: Equipment = eq;
  let nextStash: StashItem[] = [...stash];
  if (pocketIdx !== -1) {
    nextEquipment = {
      ...eq,
      pockets: {
        ...eq.pockets,
        items: [
          ...eq.pockets.items.slice(0, pocketIdx),
          ...eq.pockets.items.slice(pocketIdx + 1),
        ],
      },
    };
  } else if (bagIdx !== -1) {
    nextEquipment = {
      ...eq,
      bag: eq.bag
        ? {
            ...eq.bag,
            items: [
              ...eq.bag.items.slice(0, bagIdx),
              ...eq.bag.items.slice(bagIdx + 1),
            ],
          }
        : null,
    };
  } else {
    nextStash = [...stash.slice(0, stashIdx), ...stash.slice(stashIdx + 1)];
  }

  return {
    operative: {
      ...operative,
      equipment: nextEquipment,
      health: Math.max(0, Math.min(100, operative.health + (effect.hp ?? 0))),
      energy: Math.max(0, Math.min(100, operative.energy + (effect.energy ?? 0))),
    },
    stash: nextStash,
    consumed: true,
    itemId,
  };
}
