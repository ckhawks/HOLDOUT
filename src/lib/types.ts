export type ItemTier = "common" | "uncommon" | "rare" | "experimental";

export type ItemCategory =
  | "mechanical"
  | "electronics"
  | "medical"
  | "consumables"
  | "valuables"
  | "intel"
  | "military"
  | "experimental"
  | "bag";

// Equipment slots an item can occupy. `bag` is functional (defines the
// secondary grid). `weapon`/`armor`/`helmet` are reserved — slots exist but
// nothing reads stat effects yet.
export type EquipSlot = "bag" | "weapon" | "armor" | "helmet";

// Which kit grid an item lives in. Distinct from EquipSlot — pockets isn't
// a slot, it's a built-in grid; "bag" here means the equipped bag's grid,
// not the bag-equip slot.
export type KitSlot = "pockets" | "bag";

export type Cell = readonly [number, number];
export type ShapeCells = ReadonlyArray<Cell>;
export type Rotation = 0 | 1 | 2 | 3;

export interface Item {
  id: string;
  name: string;
  tier: ItemTier;
  category: ItemCategory;
  sellValue: number;
  weight: number;
  shape: ShapeCells;
  // Which equip slot this item occupies when equipped. Undefined = not equippable.
  slot?: EquipSlot;
  // Bag items: the grid the bag provides when equipped.
  bagGrid?: { width: number; height: number };
}

export interface StashItem {
  uid: string;
  itemId: string;
  flavor?: string;
  // Wall-clock timestamp the item entered the stash. Stamped at all push
  // sites (kit→stash, shop buy, empty-kit). Optional for backwards-compat
  // with pre-v26 saves; sort-by-date treats missing as 0 (oldest).
  acquiredAt?: number;
}

export interface PackPlacement extends StashItem {
  x: number;
  y: number;
  rotation: Rotation;
}

export interface PendingItem extends StashItem {
  arrivedAt: number;
}

export interface RunState {
  // Suspicion / world-attention level. Increases on loud actions (combat,
  // breach_locked, engaging patrols) and on movement; decreases on `stay`.
  // The only current consumer: per move tick, a `heat / 400` chance fires a
  // patrol-ambush modal in addition to pre-gen threat tiles. Renamed from
  // `alertness` in save schema v19. Range is loosely 0–100 but uncapped.
  heat: number;
  health: number;
  energy: number;
  ammo: number;
  depth: number;
  distanceFromExtract: number;
  flags: string[];
}

export type LogKind =
  | "flavor"
  | "loot"
  | "damage"
  | "system"
  | "choice"
  | "choice_result"
  | "combat_resolved";

export interface LogEntry {
  id: string;
  timestamp: number;
  text: string;
  kind: LogKind;
  itemId?: string;
}

export type OperativeState =
  | "idle"
  | "raiding"
  | "extracting"
  | "injured";

export interface SlotItem {
  uid: string;
  itemId: string;
  flavor?: string;
}

export interface PocketsState {
  grid: { width: number; height: number };
  items: PackPlacement[];
}

// Equipped bag carries its own grid (from the item's bagGrid) and contents.
// On bag swap, the old bag's contents return to stash (or refuse if stash
// can't hold them).
export interface BagState {
  slot: SlotItem;
  grid: { width: number; height: number };
  items: PackPlacement[];
}

export interface Equipment {
  pockets: PocketsState;
  bag: BagState | null;
  // Reserved slots — no stat effects yet. Persisted so future sprints can
  // wire them in without another migration.
  weapon: SlotItem | null;
  armor: SlotItem | null;
  helmet: SlotItem | null;
}

export interface Operative {
  name: string;
  state: OperativeState;
  injuryDebuff: boolean;
  skills: { sneak: number; shoot: number; scrounge: number };
  equipment: Equipment;
  // Persistent vitals across raids. startRaid seeds runState from these;
  // endRaid writes back the final values (or sets 50/50/0 on death). Health
  // and energy are 0–100; ammo is uncapped (well, gameplay-bounded by what
  // the player can scrounge or buy).
  health: number;
  energy: number;
  ammo: number;
}

export interface HideoutModule {
  unlocked: boolean;
  capacity?: number;
}

export interface Hideout {
  modules: {
    stash: HideoutModule;
    pockets: HideoutModule;
    workbench: HideoutModule;
    medbay: HideoutModule;
    loadout: HideoutModule;
  };
}

export type EventKind =
  | "looted_container"
  | "spotted_patrol"
  | "found_rare"
  | "took_damage"
  | "locked_door"
  | "heard_voices"
  | "target_down"
  | "firefight_continues"
  | "target_fled"
  | "extract_clear"
  | "extract_skirmish"
  | "extract_corner_loot";

export interface BranchEffects {
  heatDelta?: number;
  healthDelta?: number;
  energyDelta?: number;
  ammoDelta?: number;
  depthAdvance?: number;
  distanceAdvance?: number;
  flagsAdded?: string[];
  flagsRemoved?: string[];
  rollLoot?: "common" | "rare";
}

export interface BranchOption {
  id: string;
  label: string;
  description?: string;
  effects?: BranchEffects;
  isDefault?: boolean;
}

export interface PassiveEffects {
  heatDelta?: number;
  healthDelta?: number;
  energyDelta?: number;
  ammoDelta?: number;
}

export interface RaidEventDef {
  id: EventKind;
  weight: number;
  kind: LogKind;
  templates: string[];
  preconditions?: (state: RunState) => boolean;
  postconditions?: string[] | ((rand: () => number) => string[]);
  removeFlags?: string[];
  exclusive?: boolean;
  passiveEffects?: PassiveEffects;
  rollLoot?: "common" | "rare";
  depthAdvance?: number;
  distanceAdvance?: number;
  branches?: BranchOption[];
  branchTimerMs?: number;
}

export interface PendingChoice {
  eventId: EventKind;
  prompt: string;
  options: BranchOption[];
  defaultId: string;
  startedAt: number;
  timerMs: number;
}

export interface LocationUnlock {
  type: "permanent" | "consumable";
  itemId: string;
  label: string;
}

export interface Location {
  id: string;
  name: string;
  description: string;
  tier: number;
  difficulty: "low" | "mid" | "high";
  categoryWeights?: Partial<Record<ItemCategory, number>>;
  eventWeights?: Partial<Record<EventKind, number>>;
  // Optional bias for which room types appear on the location's map.
  // Falls back to a generic mix if not set.
  roomTypeWeights?: Partial<Record<RoomType, number>>;
  // Optional per-location override for the per-tile blocker probability.
  // Falls back to BLOCKED_TILE_RATIO if not set. Higher = denser walls /
  // more cramped layouts.
  blockedTileRatio?: number;
  unlock?: LocationUnlock;
}

export type RoomType =
  | "entry"
  | "corridor"
  | "storage"
  | "office"
  | "mechanical"
  | "gantry"
  | "locked";

// Locked containers are a separate pool from the regular `containers` queue.
// You can't just Loot them — needs a Force/Blast (or, future, a key item).
// Loot tier inside is independent of opening method (30% empty, 50% common,
// 20% rare).
export interface LockedContainer {
  name: string;
  // Future: which item type would unlock this. Unused for now.
  keyType: "key" | "keycard" | "id_badge";
}

export interface MapTile {
  x: number;
  y: number;
  type: RoomType;
  // Specific room name fixed at generation, e.g. "shift office" for type
  // "office". Used both in map tooltip and as the {location} substitution in
  // event templates so the log and the map agree on what room you're in.
  name: string;
  blocked: boolean;
  // Operative has been on this tile. Drives map visited treatment.
  visited: boolean;
  // Number of "lootable containers" still in this room. Each Loot action
  // consumes one and rolls for an item drop. 0 = fully searched.
  lootRemaining: number;
  // Initial lootRemaining at generation, used for "2/3 searched" displays.
  lootMax: number;
  // Specific (unlocked) container names left in this room, in the order the
  // operative will work through them. Length always equals lootRemaining;
  // popped from the front on each Loot action.
  containers: string[];
  // Locked containers in this room — separate from the regular Loot queue.
  // Force/Blast clears one at a time; loot tier inside is rolled
  // independently of opening method.
  lockedContainers: LockedContainer[];
  // Items currently sitting in this room — dropped by loot actions or by
  // the player. Persist across operative leaving and returning.
  contents: StashItem[];
  // Operative has been on this tile OR an orthogonal neighbor — drives fog
  // of war reveal.
  seen: boolean;
  // Pre-generated patrol present in this room. When the operative tries to
  // move into a threat tile, the patrol forced-choice modal fires. Cleared
  // when the patrol is resolved (target_down or target_fled).
  threat: boolean;
}

export interface RaidMap {
  width: number;
  height: number;
  // Flat tile array indexed by y * width + x. Entry sits at (entry.x, entry.y),
  // typically the bottom-middle. Operative pushes upward (decreasing y) to go
  // deeper, returns toward entry on recall.
  tiles: MapTile[];
  entry: { x: number; y: number };
}

// Running counters captured during a raid, surfaced in the after-raid report.
// Updated by the store as ticks resolve / consumables are used / choices are
// made. Stays on CurrentRaid (not on the engine result) so the report can
// summarize the entire run, not just the last tick.
export interface RaidTally {
  damageTaken: number;
  energySpent: number;
  heatPeak: number;
  combatTargetsDown: number;
  combatTargetsFled: number;
  combatBrokeContact: number;
  combatTradedShots: number;
  choicesMade: Array<{ eventId: EventKind; optionId: string; label: string }>;
  consumablesUsed: Array<{ itemId: string }>;
}

export interface CurrentRaid {
  locationId: string;
  startedAt: number;
  runState: RunState;
  log: LogEntry[];
  // Operative's equipment for this raid. Mutated in place as items are picked
  // up / dropped / rearranged. On Recall: remains intact and gets flushed
  // back to operative.equipment. On death: contents wiped, bag/weapon/armor/
  // helmet stripped, operative comes back with bare pockets.
  equipment: Equipment;
  // Snapshot of equipment at raid start, taken in startRaid(). Used by the
  // after-raid report to diff what came home (kept) vs what was lost vs
  // what was newly looted. UIDs are the join key.
  startingEquipment: Equipment;
  tally: RaidTally;
  active: boolean;
  pendingChoice: PendingChoice | null;
  map: RaidMap;
  operativePos: { x: number; y: number };
  // Pre-computed next tile the operative will step into on the next forward
  // (or extract) advance. Decided at the end of the previous tick so the
  // preview indicator matches the actual move that will happen.
  nextStep: { x: number; y: number } | null;
  // Wall-clock timestamp when the player paused. null = running. On resume the
  // store shifts pending.arrivedAt and pendingChoice.startedAt forward so the
  // pause time doesn't expire items or auto-resolve branches.
  pausedAt: number | null;
  // The action the operative will perform on the next tick. Auto-picked by
  // the engine; player can override before the timer fires.
  queuedAction: ActionId;
  // Wall-clock when the current action timer started — drives the countdown
  // bar on the action card. Shifts forward on resume after pause.
  actionStartedAt: number;
  // When set, the raid is in its terminal "ending" phase: active=false,
  // showing the final log line, waiting for the hook to fire endRaid() at
  // `at`. Replaces the chained setTimeout-in-store pattern so the tick loop
  // owns all scheduling. Cleared back to null by endRaid.
  pendingEnd: { at: number; success: boolean } | null;
}

export type ActionId =
  | "move_forward"
  | "loot"
  | "stay"
  | "extract_step"
  | "fight"
  | "flee"
  | "breach_locked";

export interface Unlocks {
  workbench: boolean;
  medbay: boolean;
  biolab: boolean;
}

export interface ShopOffer {
  // Stable id for React keys; regenerated on each refresh so a refresh
  // visibly resets the row identity.
  offerId: string;
  itemId: string;
  price: number;
  stock: number;
}

export interface ShopState {
  offers: ShopOffer[];
  // Wall-clock timestamp of last refresh — informational only, used by the
  // panel header. Refresh itself is event-driven (raid end), not time-based.
  lastRefreshAt: number;
}

export interface Upgrades {
  // Pockets size upgrade — adds rows to the operative's built-in pockets
  // grid. Replaces the previous "backpack +N slots" upgrade since pack is
  // now split into pockets + equipped bag.
  pocketsLevel: number;
  stashLevel: number;
}
