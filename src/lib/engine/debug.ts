import type { CurrentRaid } from "@/lib/types";

// Render the raid map to a console-friendly multi-line string. Used for
// debugging movement / pathfinding bugs.
//
// Legend:
//   O  operative
//   →  preview (next step)
//   E  entry
//   #  blocked
//   !  threat (visible)
//   ?  unseen
//   ·  visited
//   o  seen but not visited
export function dumpRaid(raid: CurrentRaid): string {
  const m = raid.map;
  const lines: string[] = [];
  lines.push(`=== RAID DUMP ===`);
  lines.push(`location: ${raid.locationId}`);
  lines.push(`queued: ${raid.queuedAction}`);
  lines.push(
    `operative: (${raid.operativePos.x}, ${raid.operativePos.y})  nextStep: ${
      raid.nextStep ? `(${raid.nextStep.x}, ${raid.nextStep.y})` : "null"
    }`,
  );
  const rs = raid.runState;
  lines.push(
    `runState: hp=${rs.health} heat=${rs.heat} en=${rs.energy} ammo=${rs.ammo} depth=${rs.depth} dist=${rs.distanceFromExtract}`,
  );
  lines.push(`flags: [${rs.flags.join(", ")}]`);
  lines.push(`paused: ${raid.pausedAt ? "yes" : "no"}  active: ${raid.active}`);
  lines.push("");

  // Render the grid. Width column header.
  lines.push(
    "    " +
      Array.from({ length: m.width }, (_, x) => x.toString().padStart(2, " "))
        .join(" "),
  );
  for (let y = 0; y < m.height; y++) {
    const row: string[] = [];
    for (let x = 0; x < m.width; x++) {
      const t = m.tiles[y * m.width + x];
      let ch = " ";
      if (raid.operativePos.x === x && raid.operativePos.y === y) ch = "O";
      else if (raid.nextStep && raid.nextStep.x === x && raid.nextStep.y === y)
        ch = "→";
      else if (t.type === "entry") ch = "E";
      else if (t.blocked) ch = "#";
      else if (!t.seen) ch = "?";
      else if (t.threat) ch = "!";
      else if (t.visited) ch = "·";
      else ch = "o";
      row.push(ch.padStart(2, " "));
    }
    lines.push(`${y.toString().padStart(2, " ")}: ` + row.join(" "));
  }

  lines.push("");
  lines.push("log tail (last 8):");
  for (const e of raid.log.slice(-8)) {
    lines.push(`  [${e.kind}] ${e.text}`);
  }
  return lines.join("\n");
}
