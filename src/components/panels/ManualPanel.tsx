"use client";

import { PanelHeader } from "./PanelHeader";

export function ManualPanel() {
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <PanelHeader title="Manual" subtitle="What this is and how to play." />
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-8 text-sm leading-relaxed">
          <Section label="What is HOLDOUT?">
            <p>
              HOLDOUT is a raid game where you play the <em>handler</em>, not
              the operative. You pick a target, send one operative in, and
              guide them tick by tick — deciding what they do next, reading
              the comms feed, and pulling them out before greed turns into a
              body bag.
            </p>
            <p className="text-muted-foreground">
              Think of it like being the voice in a heist-movie earpiece —
              you&apos;re back at base on the radio, the operative is the one
              in the building. The whole game is a fictional dispatch
              terminal: no 3D world, no character to steer with WASD. You
              direct, they execute.
            </p>
          </Section>

          <Section label="The core loop">
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                Pick a target in <Tab>Ops</Tab> — locations have difficulty
                tiers and some need a key item before you can enter.
              </li>
              <li>
                In <Tab>Feed</Tab>, the <b>Next Action</b> card shows what your
                operative is about to do (move forward, loot the room, hold
                position). You can override it any tick before the timer runs
                out.
              </li>
              <li>
                Events resolve and scroll — looted containers, spotted patrols,
                locked doors, rare finds. Loot lands in the <b>Pack</b>; if
                it&apos;s full, the lowest-value item drops.
              </li>
              <li>
                Hit <b>Recall</b> to start the extract sequence. Heat and
                distance from extract determine how risky the trip back is. If
                your operative dies, the loadout is gone.
              </li>
              <li>
                Surviving loot transfers to the <Tab>Stash</Tab>. Sell junk for
                cash, save up, buy upgrades in the <Tab>Hideout</Tab>.
              </li>
            </ol>
          </Section>

          <Section label="What you actually control">
            <ul className="space-y-2">
              <li>
                <b>Where to go</b> — which location, when. Higher tiers have
                better loot and more ways to die.
              </li>
              <li>
                <b>What to do next</b> — every tick you can override the queued
                action. Push deeper for better loot, loot the current room
                instead of moving on, or hold position to let heat cool
                off.
              </li>
              <li>
                <b>When to bail</b> — Recall is always available. Walking out
                with a half-pack alive beats dying with a full one.
              </li>
              <li>
                <b>What to buy</b> — cash from selling loot funds Pack / Stash
                upgrades and (eventually) new hideout modules that change what
                you can do on the next raid.
              </li>
            </ul>
          </Section>

          <Section label="What to watch">
            <ul className="space-y-2">
              <li>
                <b>Health</b> — damage events drain it. At zero, your operative
                dies and you lose everything in the pack.
              </li>
              <li>
                <b>Energy</b> — drains every tick. Low energy means worse
                outcomes on the events that test it.
              </li>
              <li>
                <b>Heat</b> — rises with noise (blasting doors, firefights).
                High heat makes the extract sequence more dangerous.
              </li>
              <li>
                <b>Depth</b> — how far in you&apos;ve pushed. Deeper = better
                loot tiers, but a longer way back out.
              </li>
            </ul>
          </Section>

          <Section label="Getting started">
            <ul className="space-y-2">
              <li>
                Open <Tab>Ops</Tab>, pick the lowest-difficulty location, hit{" "}
                <b>Send</b>.
              </li>
              <li>
                Watch the <Tab>Feed</Tab>. The <b>Next Action</b> card at the
                bottom shows what your operative will do next — leave it on
                auto for a few ticks to get a feel, then start clicking{" "}
                <b>Loot</b> or <b>Move forward</b> to override.
              </li>
              <li>
                Press <Kbd>Space</Kbd> to pause whenever you need a beat to
                read.
              </li>
              <li>
                When the pack is mostly full and heat is rising, hit{" "}
                <b>Recall</b>. Don&apos;t get greedy on your first run — the
                extract sequence is where most deaths happen.
              </li>
              <li>
                Back at base, sell commons in <Tab>Stash</Tab>, then visit{" "}
                <Tab>Hideout</Tab>. Your first goal is the <b>+2 Pack</b> or{" "}
                <b>+10 Stash</b> upgrade.
              </li>
              <li>
                Locked modules (Workbench, Medbay) and gated locations unlock
                when you find their schematics or key items on raids. Keep an
                eye out for rare drops.
              </li>
            </ul>
          </Section>

          <Section label="Things that are not in the game">
            <p className="text-muted-foreground">
              No real-time PvP, no permadeath wipes, no real-world-clock timers
              (the game pauses when you close the tab — zero energy bars,
              construction waits, or daily logins). No quest objectives — raids
              are open-ended: pick a place, go loot, come back. Progression is
              endless; there&apos;s no retirement screen.
            </p>
          </Section>
        </div>
      </div>
    </section>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-3 font-mono text-xs uppercase tracking-[0.25em] text-foreground">
        {label}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Tab({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-xs uppercase tracking-widest text-foreground">
      {children}
    </span>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded-sm border border-border/60 bg-card/60 px-1.5 py-0.5 font-mono text-[11px] text-foreground">
      {children}
    </kbd>
  );
}

