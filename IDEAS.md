# HOLDOUT — Future ideas / Sprint 2+ candidates

A scratchpad for things we want later. Not committed scope. Reorder freely.

## From the user

- **Loot categories per location** — each location biases toward certain item categories (e.g. Warehouse → industrial scrap; Lab → electronics; Med facility → consumables). Currently the drop pool is global.
- **Random threat / danger levels per location** — within a range, so locations roll a danger value each session (or per-raid). Player strategizes which to hit when. Pairs with health/energy loop and operative state (injured? avoid hot zones).

## From the build session (potential next directions)

- **Stakes & decisions (Phase 4)** — locked-door modal (Pick / Blast / Skip + 8s timer), recall extract sequence, death/injury model. Turns Recall into a real decision.
- **Content breadth** — more locations (Ops dropdown is currently length-1), more event types, expanded vocab so feed doesn't repeat. Cheap, additive.
- **Combat layer** — flesh out `spotted_patrol`: ammo consumption, sneak/shoot skill rolls, possible escalation chains. `Operative.skills` is in the type but unused. Wurm-style XP-per-use ties this to long-term progression.
- **Item flavor (Tarkov DNA)** — carry `{adj}` flavor onto each `StashItem` so loot has individual identity ("Cracked Battery, half-charged, labelled in cyrillic"). Cheap atmosphere win.
- **Run summary modal** — after Recall, show loot value, time, depth, key events. Closes the feedback loop and makes upgrade math obvious.
- **Hideout depth** — Workbench schematic currently flips a flag and does nothing. Wire actual crafting (consume X, Y → produce Z gear). Medbay healing flow.
- **Polish/feel** — typewriter on log entries, real-tick-delay-driven progress bar, persistent injury debuff between raids, tick-rate debug slider.

## Suggested rough order

1. Item flavor + run summary (small, immediate "feels better")
2. Phase 4 stakes (door modal, extract sequence, death)
3. Content breadth (locations + categories + threat levels — bundles well with the user's two items)
4. Combat / skills layer
5. Hideout depth (crafting, medbay)
