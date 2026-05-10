# Server-authoritative port — scoping notes

**Date:** 2026-05-10
**Status:** Exploratory. Not on the roadmap. Captured so the analysis isn't lost.

## Premise

Convert HOLDOUT from its current client-only architecture (Zustand + localStorage, all logic in-browser) to a server-authoritative model: backend API owns game state, database persists it, client has no authority and renders what the server returns.

## Why this is cheap-ish to do

The engine was deliberately built port-ready. See `DESIGN.md` → "Multiplayer port-readiness" and `CLAUDE.md` → "Engine purity":

- `lib/engine/` is pure, seedable, side-effect-free
- No `Date.now()` / `Math.random()` inside the engine — both are threaded as parameters
- The store is the only place allowed to call them
- Save format is already schema-versioned (`engine/save.ts`)

That discipline is the load-bearing piece. Without it this would be a rewrite. With it, it's a wrapping job — the engine moves to the server essentially as-is.

## Work required

### 1. Backend scaffold
- Next.js route handlers, or a separate Node server (Hono / Express / Fastify)
- Reuse `lib/engine/` verbatim — extract to a shared package, or path-alias from both client and server
- Postgres + Prisma or Drizzle

### 2. Auth
- NextAuth or Clerk
- One user → one save (initially)

### 3. Database schema

Two reasonable shapes:

- **Blob-per-user.** One JSON column holding the whole `GameState`. Cheapest port — keeps migrations identical to the existing `migrate()` chain in `engine/save.ts`. Bad for cross-user queries (leaderboards, marketplace), fine for single-player-with-cloud-save.
- **Normalized.** Tables for stash items, operative, hideout, currentRaid, log entries. More upfront work, enables async-multi features later.

**Recommendation:** blob-first. Normalize later when a feature actually needs it (async-multi, marketplace, leaderboards). Don't pay normalization cost speculatively.

### 4. API surface

One endpoint per store action. Examples:

- `POST /api/raid/start`
- `POST /api/raid/tick`
- `POST /api/raid/action` (autoPick / context action)
- `POST /api/stash/sell`
- `POST /api/equipment/move`
- `GET /api/state` (full state fetch on load)

Each handler: load state → call engine fn → persist → return new state (or a delta).

Use optimistic locking (version column on the save row) to prevent concurrent-tab clobber.

### 5. Tick ownership — the interesting design decision

Currently `useRaidLoop` (`src/components/terminal/useRaidLoop.ts`) fires `doTick()` after `ACTION_TIMER_MS` elapses. Server-authoritative means the server owns the clock. Two options:

- **Lazy tick.** Store `actionStartedAt` server-side. On every client poll or action, the server fast-forwards any ticks that *should* have fired since last contact. Treats `actionStartedAt` as frozen when the user disconnects, so a closed tab = paused raid.
- **Active tick.** Server cron / setInterval per active raid pushes ticks in real time. Needs a worker process. Needs to handle "user closed tab → pause" explicitly (presence tracking).

**Recommendation:** lazy tick. It maps cleanly onto the locked design constraint ("game pauses when player walks away") and avoids the infra cost of an always-on worker. Pair with SSE/WebSocket for live log streaming if pushing feels better than polling.

### 6. Client refactor

- Zustand store becomes a thin cache of server state
- Store actions become `await fetch(...)` → `set(serverResponse)`
- Pure engine functions on the client become unnecessary at runtime (could keep for optimistic UI, but simpler to drop)
- `useRaidLoop` becomes a poller or WebSocket/SSE subscriber instead of a local-timer driver

### 7. Realtime (optional)

For log streaming and tick updates: WebSocket or SSE pushing log entries. Polling at 1s works for v1.

### 8. Anti-cheat (mostly free)

Server validates every action against `ACTIONS[id].eligible(raid)` before applying. Client can only fake *which action* it requests; eligibility, RNG, and outcomes are server-controlled. Most concerns vanish without explicit work.

## Effort estimate

- ~2–3 weeks for: blob-shape DB + auth + lazy ticks + endpoint-per-action + client refactor
- +1–2 weeks if normalized schema is needed up front (async-multi / marketplace on the near horizon)

## Main tradeoff

Lose the "close tab, pure pause, zero infra" simplicity that makes the current design cheap to host. Server-authoritative means paying for a DB + runtime even when nobody is playing. Worth it only if multiplayer / leaderboards / anti-cheat are actual goals. Otherwise localStorage is doing real work for free.

## Pre-work that would make this easier later (cheap, do anytime)

- Keep enforcing "no `Date.now()` / `Math.random()` in `lib/engine/`" — this is already enforced; don't let it slip
- When adding new store actions, keep them as thin wrappers over engine fns (`next = engineFn(prev, ...); set({ next })`) — no logic in the store closure
- Consider extracting `lib/engine/` to its own package boundary (even just a tsconfig path alias) so the eventual server can import it without dragging client-only deps
