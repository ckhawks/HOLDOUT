# firearm-gen — design notes

Companion to the prototype. Captures the design intent of what was built, the questions it answers, the questions it punts, and how it maps back to `../../BRAINSTORM.md`.

This is a **prototype log**, not a spec. If the engine is lifted into HOLDOUT proper, the lifted version supersedes this.

---

## Why this exists

`BRAINSTORM.md` raises a loot-identity pillar (line 397, "Item identity (instances, not types)") and a weapons + modding deep-dive (line 273) that together imply each firearm should be a unique instance with brand, condition, history, mods, and a name. HOLDOUT's current `lib/data/items.ts` is hand-authored — fine for Sprint 1, doesn't scale to "the Mk-IV 'Brickeye'" being a different individual from the Mk-IV 'Plumline'.

`firearm-gen` is a single-file proof that a procedural generator can produce that texture from data alone.

## What the prototype commits to

These are the design choices baked into the code. Each is a position, not a default.

### 1. Tier is rolled, not chosen

Probabilities `60 / 25 / 12 / 3` (common / uncommon / rare / experimental). Caller can override (the dev viewer exposes a tier filter), but the natural draw is heavily weighted to junk.

This matches the hoarding pillar — most loot is forgettable so the rare drop *means* something. It also matches Tarkov's drop curve: the exciting moment is rarity scarcity, not stat scarcity.

### 2. Tier is legible at a glance, before you read the stats

Three signals stack:
- **Card border + tint** — zinc / emerald / sky / fuchsia
- **Name shape** — common is `Skarn BR-19 Mk-I`; experimental is `Cipher Industries Pulse-AR Proto 'REVENANT'`
- **Attachment count** — commons may have zero, experimentals are loaded

A player should be able to identify a drop's tier from across the room without reading numbers. This is a deliberate counter-pressure to "no strict upgrades" (RISKS.md line 35) — it's OK if rare drops *look* exciting even when they're horizontally balanced, because the *feeling* of rarity is the loot dopamine.

### 3. Stats show base | Δ | final with per-attachment attribution

Every modifier is shown next to the stat it changed. You can read a `+12 dmg` line and see exactly which attachment bought you that. This is a reaction to RISKS.md line 35 ("'No strict upgrades' is incredibly hard to design") — if balance is fragile, at least the math is transparent. The player can see *why* this build is what it is and reason about swaps.

Trade-off: this is verbose. A clean inventory grid will need a compact mode.

### 4. Brand has era-alignment, not just visual identity

11 fictional corps split across legacy / modern / advanced eras. Brand selection is biased to match the weapon base's era — legacy bases roll legacy brands often, advanced bases roll advanced brands often, but the bias is soft (not a hard gate).

This is a worldbuilding lever: brand choice tells you about the corp landscape over time without a single line of exposition. A "Skarn Industries" rifle on a modern base implies Skarn is still around; an advanced base with a legacy brand reads as a refurb / black-market rework.

### 5. Names encode tier through shape, not labels

| Tier | Shape | Example |
| --- | --- | --- |
| Common | `<base> <variant>` | `BR-19 Mk-I` |
| Uncommon | `<brand> <base> <variant>` | `Skarn BR-19 Mk-II` |
| Rare | `<brand> <base> <variant> '<NICKNAME>'` (15% nick) | `Helix Pulse-AR Mk-III 'OWLEYE'` |
| Experimental | always nickname, full brand name | `Cipher Industries Pulse-AR Proto 'REVENANT'` |

Nicknames are tier-keyed — common nicknames sound mundane, experimental nicknames sound mythic. The name is doing the work the rarity color usually does, in text form. Critical for terminal-aesthetic UIs where text is the medium.

### 6. Attachments slot, don't replace

5 slots (optic, barrel, mag, grip, underbarrel). Each slot fills independently with a tier-scaled probability. No slot is required; a bare common weapon with zero attachments is a valid drop. This protects the "I FOUND a Slick" moment (RISKS.md line 40) — rare attachments are themselves loot, and finding a great optic on a mediocre rifle is its own dopamine hit.

### 7. Pure, seedable, deterministic

`generateFirearm({ rand?, seed?, tier?, baseId? })` is a pure function. Given the same seed it produces the same firearm. This matters for:
- Reproducible bug reports
- Async/networked loot (if the social layer ships, two clients can derive the same item from one seed)
- Save format simplicity (store seed + ID, regenerate display)

## What the prototype punts

- **Condition / wear.** Currently a static "factory" string. The hoarding pillar wants weapons to age and break.
- **History / provenance.** No instance log. BRAINSTORM line 401 wants "where found, raids carried, kills witnessed."
- **Cross-class compatibility rules.** Every attachment in every slot fits every class. BRAINSTORM line 301 wants caliber families and rail families.
- **Brand-set bonuses.** BRAINSTORM line 305. Not modeled.
- **Ammo as a soft mod.** BRAINSTORM line 296. Not modeled.
- **Crafting tier rollout.** BRAINSTORM line 307 wants T1 scavenge → T2 craft → T3 schematic. The generator only does the scavenge half.
- **Stat-check integration.** Generated stats don't yet feed any event resolution. Once HOLDOUT moves from timer-fires to stat-rolls (RISKS.md line 92, IDEAS.md line 14), the generator's `finalStats` are the input.
- **Inventory / Tetris.** No W×H. Items have stat blocks, no spatial footprint yet.
- **Examination ritual.** Generates fully-identified items. BRAINSTORM line 404 wants partial identification + hideout examination time.

## Open questions surfaced by building this

1. **Should the engine generate *all* item types, or just firearms?** Same data-driven pattern could produce armor, consumables, intel docs. Firearms first because mods make them the deepest case — if it works here it works for less complex categories.
2. **Where does the line between "generated" and "hand-authored" sit?** Quest items, schematics, story drops probably want hand-authoring for narrative beats. Junk loot wants generation. Middle ground is fuzzy.
3. **Brand count vs depth.** 11 brands is enough to feel populated, not enough for set-collection ("Brand catalogs: 3/12 complete" — BRAINSTORM line 412). Likely needs 25–40 brands at full scope, with most encountered rarely.
4. **Era as gameplay vs flavor.** Currently era only affects brand selection. Could era also gate which raids drop which weapons (Aerostat = advanced only; Slum = legacy mostly)? Becomes a soft loot bias per location.
5. **Stat axis count.** 4 stats (damage, accuracy, recoil, reliability) is the minimum that lets attachments trade off. BRAINSTORM line 290 implies more (handling, noise, weight). Adding axes is cheap; keeping the card readable as they multiply is the hard part.
6. **The "Δ" UI doesn't scale to mid-raid.** Beautiful in a tooltip / inspector, illegible in a 1-second loot pickup. Need a compact rendering for in-raid pickup events vs the inspector.

## How to lift this into HOLDOUT

If/when the design lands, the move is roughly:

1. Move `src/lib/types.ts` → merge into HOLDOUT's `src/lib/types.ts` (extend `Item` with a `Firearm` variant, or make `Item` a discriminated union).
2. Move `src/lib/rng.ts` → HOLDOUT's `src/lib/engine/rng.ts` (HOLDOUT doesn't have one yet; raid.ts uses `Math.random` directly — see `IDEAS.md` line 12 for related stakes work).
3. Move `src/lib/data/weapons.ts` → HOLDOUT's `src/lib/data/weapons.ts` (sibling to `items.ts`).
4. Move `src/lib/engine/weaponGen.ts` → HOLDOUT's `src/lib/engine/weaponGen.ts`.
5. Wire into `engine/raid.ts` — when a `looted_container` or `found_rare` event fires, optionally call `generateFirearm` for the drop.
6. Move `src/components/{BrandLogo,WeaponClassIcon,StatTable,WeaponCard}.tsx` → HOLDOUT's `src/components/loot/` (new folder).
7. Stash panel renders `WeaponCard` for any item whose category is `firearm`.
8. Save format: store the seed + tier + baseId per instance, regenerate full data on load. Bump `SCHEMA_VERSION`.

The dev viewer page (`src/app/page.tsx`) doesn't lift — it's a workshop tool. Could become a `/dev/loot` debug route in HOLDOUT for designer use.

## Status

Standalone, runs at `localhost:3000` from `experiments/firearm-gen/`. Build verified clean. No tests. Not wired into HOLDOUT. Lifting decision deferred until the loot-identity / weapons direction is committed in PLAN.md.
