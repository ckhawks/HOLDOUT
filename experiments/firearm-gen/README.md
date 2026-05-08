# firearm-gen

Procedural firearm-generation prototype. Standalone Next.js app, lives in `experiments/` as a brainstorm artifact for HOLDOUT.

## What it does

Given an optional `tier`, `weaponClass`, and `seed`, generates a `FirearmInstance`:

- one of 19 weapon bases across 5 classes (pistol, burst, shotgun, lmg, energy) and 3 eras (modern, advanced, exotic)
- one of 15 calibers, locked per base (e.g. `BR-19` is always 5.56×45mm, `Coil-2` is always Arc Coil)
- one of 10 ammo types, rolled at generation, family-matched to caliber (ballistic vs energy)
- brand selected from 14 fictional corps, era-aligned (modern-era brands rare on exotic bases, vice versa). Each brand has its own color.
- 0–5 attachments depending on tier (commons may have none, experimentals are loaded), drawn from 35 attachments across 5 slots (sight, barrel, stock, mag, underbarrel)
- stat block of 7 stats (`damage`, `accuracy`, `rpm`, `range`, `recoil`, `reliability`, `weight`) showing **base | Δ | final** with per-attachment + ammo attribution
- generated full name like `BR-19 Mk-I` (common) up to `Pulse-AR Proto 'REVENANT'` (experimental). Brand is shown separately in the header, not duplicated in the name.

Tier roll is weighted 60/25/12/3 (common/uncommon/rare/experimental). Stat variance and attachment quality both bias up with tier.

## Why it exists

Sketch for the procedural-loot generator HOLDOUT will eventually need. The engine is pure (`generateFirearm({ rand?, seed?, tier?, baseId? })`) so it can be lifted into HOLDOUT's `src/lib/engine/` later if the design lands. Currently HOLDOUT's `lib/data/items.ts` is hand-authored — this proves out a generator-driven alternative.

## Run

```bash
cd experiments/firearm-gen
pnpm install
pnpm dev
```

Open http://localhost:3000. Controls: count (1–64), tier filter, class filter, seed (any string for reproducible rolls). The `/pools` route lists every weapon class, manufacturer, attachment, and weapon base in the data set with their icons at full size.

## Layout

```
src/
  lib/
    types.ts                 - WeaponClass, Tier, WeaponBase, Brand, Attachment, FirearmInstance, AppliedModifier
    rng.ts                   - mulberry32 + pick / pickWeighted / rollVariance / uid
    data/weapons.ts          - bases, brands, attachments, nicknames, variants
    engine/weaponGen.ts      - generateFirearm, generateMany
  components/
    BrandLogo.tsx            - 11 inline SVG corp marks
    WeaponClassIcon.tsx      - 5 inline SVG class glyphs
    StatTable.tsx            - base | Δ | final with attribution
    WeaponCard.tsx           - full card
  app/page.tsx               - dev viewer with controls
  app/pools/page.tsx         - catalog of every base, brand, attachment, class
```

## Status

Standalone, not wired into HOLDOUT. Build and dev server verified clean. No tests.
