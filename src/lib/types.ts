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
  | "apparel";

// Equipment slots an item can occupy. `bag` and `rig` are functional —
// each defines its own secondary grid (sectioned, see BagState). The
// operative wears one of each at most. `weapon`/`armor`/`helmet` are
// reserved — slots exist but nothing reads stat effects yet.
export type EquipSlot = "bag" | "rig" | "weapon" | "armor" | "helmet";

// Which kit grid an item lives in. Distinct from EquipSlot — pockets isn't
// a slot, it's a built-in grid; "bag"/"rig" here mean the equipped item's
// own grid, not the equip slots themselves.
export type KitSlot = "pockets" | "bag" | "rig";

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
  // Bag items: one or more sections the bag provides when equipped. Each
  // section is its own independent grid (Tarkov-rig style — a 2×3 main
  // pocket + a 3×3 admin pocket, etc.). Single-element arrays render as a
  // single grid in the UI. `id` is the stable handle used in placements
  // and drag routing — keep it stable across rebalances.
  bagSections?: BagSectionDef[];
  // Construction-system tags. `component` = counts as upgrade-cost-payable
  // (basic component pool). `specialized` = named "construction junk"
  // gating specific module builds/upgrades. Flat tier — see
  // docs/archive/CONSTRUCTION_SYSTEM.md.
  component?: boolean;
  specialized?: boolean;
  // Combat stat fields (Slice 0+ of the combat revamp). Live on the catalog
  // only — StashItem instances never carry a copy. The shape grows per
  // slice (band/threshold/coverage added as later slices need them) so
  // future stats land without per-instance migrations.
  weaponStats?: WeaponStats;
  armorStats?: ArmorStats;
  helmetStats?: HelmetStats;
  procs?: ItemProc[];
}

// Weapon stats — Slice 0 ships baseDamage + baseAccuracy as placeholders so
// the resolver has something to read. Slice 3 will add `band` + bandFalloff;
// slice 4 will add `pen`.
export interface WeaponStats {
  baseDamage: number;
  baseAccuracy: number;
}

// Armor stats — Slice 0 ships threshold as a placeholder. Slice 4 will add
// per-location coverage maps.
export interface ArmorStats {
  threshold: number;
}

export interface HelmetStats {
  threshold: number;
}

// Conditional proc — Slice 0 ships the shape only; resolver consults the
// list starting in Slice 7. Trigger/effect enums grow per launch proc.
export interface ItemProc {
  trigger: string;
  effect: string;
  value: number;
}

export interface BagSectionDef {
  id: string;
  label?: string;
  width: number;
  height: number;
}

export interface StashItem {
  uid: string;
  itemId: string;
  flavor?: string;
  // Wall-clock timestamp the item entered the stash. Stamped at all push
  // sites (kit→stash, shop buy, empty-kit). Optional for backwards-compat
  // with pre-v26 saves; sort-by-date treats missing as 0 (oldest).
  acquiredAt?: number;
  // Pinned items are excluded from sellAllJunk and never auto-sold. Doesn't
  // affect equip/kit movement — pin = "don't sell", not "freeze".
  pinned?: boolean;
  // Per-instance sell-value multiplier rolled at acquisition (raid loot,
  // shop buy). Range ±15% — two of the same item can have different
  // sell prices. Effective sell = round(base * (valueMod ?? 1)). Optional
  // for backwards-compat with pre-v28 stash items (treated as 1).
  valueMod?: number;
}

export interface PackPlacement extends StashItem {
  x: number;
  y: number;
  rotation: Rotation;
}

// One physical sub-grid within a bag. `id` matches the BagSectionDef id on
// the equipped item. Items live inside a section; moving across sections
// works just like moving across slots — same algebra, different target.
export interface BagSection {
  id: string;
  label?: string;
  grid: { width: number; height: number };
  items: PackPlacement[];
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

// Equipped bag carries one or more independent sections (from the item's
// bagSections). On bag swap, the old bag's contents return to stash (or
// refuse if stash can't hold them).
export interface BagState {
  slot: SlotItem;
  sections: BagSection[];
}

export interface Equipment {
  pockets: PocketsState;
  // Two container slots: bag (back) + rig (chest). Both share BagState's
  // multi-section shape; the operative can wear one of each.
  bag: BagState | null;
  rig: BagState | null;
  // Reserved slots — no stat effects yet. Persisted so future phases can
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
  | "extract_corner_loot"
  // Slice 2 — combat stance picker. Raised once per active combat round
  // via pendingChoice. Resolution does NOT flow through BranchEffects;
  // the store routes stance_pick to a combat-round dispatcher instead.
  | "stance_pick";

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
  // Slice 2 — when set, BranchModal renders these chips verbatim instead
  // of deriving them from `effects`. Combat stance options use this
  // because their numbers come from computed odds, not declarative
  // BranchEffects.
  chips?: { text: string; tone: "good" | "bad" | "neutral" | "loot" }[];
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
  // Per-location pool of "specialized construction junk" item ids (see
  // §10.5 / construction system). On each loot roll, pickItemForLocation
  // first checks for a small specialized-drop chance against this pool.
  // Items not in this list never drop from this location.
  specializedDrops?: ReadonlyArray<string>;
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
  // Combat-revamp Slice 0: deterministic enemy ID rolled at map-gen for
  // each threat tile. The combat resolver reads from data/enemies.ts via
  // this archetypeId. Slice 0 always seeds "grunt" — Slice 3 will expand
  // to Sniper / Brawler based on location + depth.
  enemySpawn?: { archetypeId: string };
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
  // Combat-revamp Slice 1: when non-null, the operative is engaged in
  // multi-round combat. Replaces the legacy `combat_engaged` flag. Each
  // `fight` action tick resolves one round via resolveCombatRound; ends
  // when enemy HP drops to 0 (target_down) or operative dies. Disengage
  // (Slice 2 will add Disengage stance; Slice 1's `flee` action calls
  // resolveDisengage with Heat-gated odds).
  combat: CombatState | null;
}

// Combat-revamp Slice 1 — multi-round combat state. Lives on CurrentRaid
// while a fight is active. The pure resolver in engine/combat.ts mutates
// this each round; the store applies it back to currentRaid.
export interface CombatState {
  enemyArchetypeId: string;
  enemyHp: number;
  enemyHpMax: number;
  // 0-indexed. Round 0 belongs to the initiator (the player when they
  // chose Engage, the enemy when an ambush fired). Slice 6 fully wires
  // round 0 asymmetry; Slice 1 uses it for the "you got the drop" log.
  round: number;
  initiator: "player" | "enemy";
  // Slice 2 — carry-over stance effects. Applied this round, consumed
  // on use. Suppress adds a negative enemyAccuracyMod next round;
  // Reposition sets playerCoverNextRound = true for the next round only.
  // Both reset to defaults after consumption inside resolveCombatRound.
  enemyAccuracyMod: number;
  playerCoverNextRound: boolean;
  // Slice 2 — telegraphed enemy intent. Set when the stance picker is
  // raised so the player can read what the enemy will do this round and
  // pick accordingly. Slice 3 will wire intent to distance changes.
  enemyIntent: EnemyIntent;
}

// Slice 2 — player stance pick each round. Slice 1's single Press is now
// one of four options. Reposition is a single chip in Slice 2 (no
// direction); Slice 3 splits it into Close In / Fall Back.
export type Stance = "press" | "suppress" | "reposition" | "disengage";

// Slice 2 — enemy intent shown in the stance picker UI. Slice 3 expands
// "press" with directional movement based on archetype.
export type EnemyIntent = "press" | "suppress" | "hold";

export type ActionId =
  | "move_forward"
  | "loot"
  | "stay"
  | "extract_step"
  | "extract_now"
  | "fight"
  | "flee"
  | "breach_locked"
  | "use_key";

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

// ─── Construction system ────────────────────────────────────────────────
// Components economy + hideout module state. Designed 2026-05-10; see
// docs/CONSTRUCTION_SYSTEM.md. The whole thing lives under `construction`
// on PersistedState; old hideout.modules stays around as a UI shell.

export type MetalId = "steel" | "copper" | "titanium" | "chromite" | "voidsteel";

export type ModuleId =
  | "recycler"
  | "workbench"
  | "research_bench"
  | "foundry"
  | "armory"
  | "armor_stand"
  | "repair_bench"
  | "generator";

export interface ModuleState {
  built: boolean;
  tier: number; // 0 = unbuilt; 1+ once built
}

export interface FoundryState {
  vessels: Record<MetalId, number>;
}

export interface ResearchState {
  unlockedRecipes: string[];
  active: { recipeId: string; ticksRemaining: number } | null;
}

export interface ArmoryState {
  items: StashItem[];
}

export interface GeneratorState {
  powerCells: number;
}

export interface ArmorStandState {
  // Future: presets: LoadoutPreset[]
  _reserved?: never;
}

export interface RepairBenchState {
  _reserved?: never;
}

export interface ConstructionLogEntry {
  id: string;
  timestamp: number;
  text: string;
}

export interface ConstructionLog {
  recycler: ConstructionLogEntry[];
  foundry: ConstructionLogEntry[];
  workbench: ConstructionLogEntry[];
  research: ConstructionLogEntry[];
}

export interface ConstructionState {
  modules: Record<ModuleId, ModuleState>;
  foundry: FoundryState;
  research: ResearchState;
  armory: ArmoryState;
  generator: GeneratorState;
  armorStand: ArmorStandState;
  repairBench: RepairBenchState;
  log: ConstructionLog;
}

// Extended upgrade-cost shape used by both stash upgrades and module
// build/tier costs. Existing cash-only consumers pass `{ cash }` and the
// helpers treat omitted arrays as empty.
export interface UpgradeCost {
  cash: number;
  items?: ReadonlyArray<{ id: string; count: number }>;
  metals?: ReadonlyArray<{ id: MetalId; count: number }>;
}
