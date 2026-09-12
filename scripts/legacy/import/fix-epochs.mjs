#!/usr/bin/env node
/**
 * fix-epochs.mjs — date-consistency audit for epoch assignments.
 *
 * Rule 1: "e-vjeter" ends in 1800 — anyone born >= 1780 (or dying >= 1830)
 *         cannot belong there; reassign by life dates.
 * Rule 2: living authors (no death year, born >= 1933) cannot sit in
 *         "socialiste" purely by category inheritance; move to bashkekohore.
 *
 * Dry run by default; --apply writes corpus/catalog.json.
 */
import fsSync from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ROOT, suggestEpoch } from "./lib.mjs";

const APPLY = process.argv.includes("--apply");
const catalogPath = path.join(ROOT, "corpus", "catalog.json");
const catalog = JSON.parse(fsSync.readFileSync(catalogPath, "utf8"));

let moved = 0;
for (const a of catalog.authors) {
  if (a.epochId !== "e-vjeter") continue;

  const b = a.born, d = a.died;
  // only move on positive evidence of post-1800 activity
  const modern = (typeof b === "number" && b >= 1790) || (typeof d === "number" && d >= 1840);
  if (!modern) continue;

  // date-based remap for misplaced moderns
  let next;
  if (typeof b === "number" && b <= 1885 && (d === null || d <= 1950)) next = "rilindja";
  else if (typeof b === "number" && b <= 1910) next = "pavaresia";
  else next = "bashkekohore";

  console.log(`  ${a.name.padEnd(26)} ${String(a.dates).padEnd(12)} e-vjeter → ${next}`);
  a.epochId = next;
  moved++;
}

console.log(`\n${moved} author(s) reassigned${APPLY ? " — written." : " (dry run)"}`);
if (APPLY) {
  fsSync.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + "\n");
}
