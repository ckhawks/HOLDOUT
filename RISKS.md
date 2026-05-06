# HOLDOUT — risks & open design questions

A snapshot from a stress-test brainstorming session. **This is critique-as-tool, not verdict.** Every game in the DNA list (Loop Hero, Universal Paperclips, Slay the Spire, Sunless Sea, Cookie Clicker) would have failed this same exercise on paper. Use these to guide prototyping decisions, not as a kill list.

Companion docs:
- `PLAN.md` — Sprint 1 execution plan (locked scope)
- `IDEAS.md` — curated near-term candidates
- `BRAINSTORM.md` — wide idea pool (loot/Tetris/hoarding, social, etc.)

---

## Showstopper-tier risks

These are the "if you don't solve this, the game might not work" risks. Each is solvable; none has been solved yet.

### The loop might not be fun to *watch*
A 2-minute auto-resolved text feed with sparse interrupts is a no-man's-land — too slow for action, too narrative-light for idle, too sparse for cozy. The risk: players hit fast-forward and the texture you built is invisible. **Single biggest unknown.** Demands real prototyping, not more design.

### Pause-on-tab-close + watch-feed are in tension
No clock gating means feed pacing only buys dramatic timing. Once players learn the rhythm, they'll skip to outcomes. Either ticks fly fast (FTL-style replay) or ticks demand constant attention (board game) — current shape is neither.

### Motivation cliff at hour 2
"Endless progression + no quests + no achievements + 30-min motivation arc" leaves the player adrift after the schematic moment. PLAN flags prior projects stalled at "v0 shipped, now what?" — the proposed motivation arc is itself only 30 minutes. Long-tail pull beyond hour 2 is currently unsourced. **Hoarding / loot-identity / provenance is the most plausible answer** (see BRAINSTORM).

### No real stakes without permadeath
"Lose loadout, return injured, debuff until medkit" is an inconvenience, not drama. If the worst case is "wait one raid for debuff to expire," Recall stops being a real decision after week one.

### No audio = sterile tension
Tarkov's atmosphere is ~80% audio. Text-only "tense raid" fights uphill. Deferring audio to Sprint 5+ is probably too late for the v1 vibe to land.

---

## Mechanic problems

- **"No strict upgrades" is incredibly hard to design.** Tarkov has 200+ guns and 1–2 builds still dominate. Solo-dev horizontal balance is unrealistic — likely 1–2 metas with the rest as flavor.
- **"Anti-meta events that punish the meta" feels bad.** Players read "drone shows up, your loadout is wrong" as the game cheating, not depth.
- **Situational hard gates are binary, not choice.** Required gear becomes mandatory cargo, not a decision.
- **Operative personality refusals pidgeonhole the roster.** Player ends up using only the op without flaws.
- **Wurm-style skill drift is invisible at v1 scale.** Without a deep loop and many hours, "Lockpicking 4.0 → 4.3" is meaningless.
- **Crafted-only BIS removes loot dopamine.** Tarkov's "I FOUND a Slick" moment can't happen if BIS is craft-locked.
- **Mid-event branch micro-choices fight the auto-resolve premise.** More interrupts = modal fatigue.
- **Auto-drop-lowest when backpack full is unsatisfying.** Players want to manually decide. Algorithm-decides feels like robbery.
- **Recall has a single optimal heuristic.** "When alertness > N" stops being interesting. Needs unpredictable variance to stay tense.

## Combinatorial / scaling problems

- **Stat × weapon × mod × gear × location is a tuning explosion.** Solo dev cannot tune this; will be aggressively simplified or aggressively broken.
- **5-table vocab can't sustain 100+ hours.** No content pipeline (items live as TS files); every flavor line is a code edit + commit.
- **Three games grafted together.** Raid game + hideout sim + loadout-RPG, each a sub-system. Splitting solo-dev focus three ways = none ships well.
- **localStorage breaks "endless progression."** Cleared cache or new device = progress lost. A 100-hour game without cloud sync hurts.

## Conceptual / aesthetic risks

- **shadcn/vercel/lucide aesthetic = SaaS dashboard.** Differentiator has to come from typography quirks, glitch, ASCII texture, terminal personality — not the defaults.
- **The dispatch AI as character needs a writer.** ~20 lines repeating becomes a skinned tooltip, not a character. Voice consistency at 100+ hours is nontrivial.

## Project / process risks

- **Stale docs vs reality.** PLAN treats Phase 0–1 as future work, but the repo already has panels, raid engine, save system, vocab, items, locations, raid loop. Build is ahead of the plan.
- **Cross-platform path references break the doc.** PLAN/CLAUDE reference `C:\Projects\ideas\HOLDOUT.md` — unreachable from non-Windows envs. Design rationale should live in the repo.
- **No content pipeline.** Adding flavor = code edit + commit. Long-tail content scaling is friction-heavy.
- **Phase 2 risk callout has no plan B.** "If the engine doesn't feel right, project stalls." No scoped fallback.

---

## The passive-observation problem & possible responses

The single most-important risk has the most options. **None of these is committed — they are directions worth prototyping. User is currently not sold on any specific pivot.**

### A. Tactic deck overlay (Loop Hero-style)
Pre-raid you build a small response deck. Mid-raid each event draws 3 cards; you pick one. Loadout becomes deck-building. Items grant cards. **Lowest reskinning cost; existing engine becomes substrate.** Slay the Spire / Loop Hero / Inscryption all prove the loop.

### B. Verb-table workspace (Cultist Simulator-style)
Dispatch terminal becomes a workspace. Cards (op status, intel, gear) drag into verbs (Dispatch, Decrypt, Negotiate, Train). Time-pressured juggling. Raid is one of N concurrent threads. **Heaviest pivot but most thematic** — the dispatch terminal *is* the game.

### C. Multi-phase operations (recon → plan → infil → objective → exfil)
Each phase its own mini-game. Recon = active intel. Infil = current modal moments. Objective = decision-dense. Exfil = pressure cooker. **Pacing variety solves passive observation without leaving current shape.** Cost: 4 mini-games to design.

### D. Stay close + triple density
Keep current architecture but triple the interrupt rate. Every 2–3 events is a real micro-choice — quick-tap forks, target priority, route picks. **Lightest pivot.** Risk: still feels like watching, just with more buttons.

### Cross-cutting: loot-identity & hoarding pillar
Independent of which depth pivot lands. Item instances with name/history, Tetris inventory grids, stash-as-place, sell-vs-keep tension. **The strongest candidate for a real long-tail motivation engine** scoped for solo dev. Probably ship this regardless.

### Cross-cutting: async social layer
Independent of depth pivot. Comms intercepts, item provenance, intel marketplace, co-signed raids. Cheap "world feels alive" wins; provenance synergizes with hoarding pillar.

---

## Recommended next move

Stop solving the game on paper. Pick one uncertain piece and prototype in code for half a day:

- Type 20 event-chain strings and read them aloud. Does the voice work?
- Wire the most minimal "an item grants a mid-raid choice" thing. Does any shape of choice feel better than no choice?
- Implement a tiny grid backpack with 5 items. Is the Tetris ritual fun even at v0?
- Add `instanceName + history` to existing StashItems. Does naming an item make it feel different?

Doc layer is now ahead of the code. Time to swap.

Or: play 90 min of Loop Hero / Universal Paperclips / Sunless Sea / Save Room / Backpack Hero. Notes write themselves.

---

## Reframe

Pitch-shaped, every good game looks weak. Cookie Clicker on paper: you click a cookie. Loop Hero: you watch a guy walk. Slay the Spire: cards but harder. Sunless Sea: row a boat read words die. They all worked because *execution* found the fun. The risks above are real but they're design problems, not fatal flaws — and most have multiple credible solutions already on the table.
