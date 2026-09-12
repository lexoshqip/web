#!/usr/bin/env node
/**
 * merge.mjs — human-approved promotion from staging into corpus/catalog.json.
 *
 * Usage:
 *   node scripts/import/merge.mjs            dry run (prints the plan)
 *   node scripts/import/merge.mjs --apply    writes corpus/catalog.json
 *
 * Only adds NEW authors (matched by normalized name). Existing entries are
 * never modified automatically — curators edit those by hand.
 */
import fsSync from "node:fs";
import path from "node:path";
import { ROOT, STAGING, normName, slugify } from "./lib.mjs";

const APPLY = process.argv.includes("--apply");

const catalogPath = path.join(ROOT, "corpus", "catalog.json");
const catalog = JSON.parse(fsSync.readFileSync(catalogPath, "utf8"));
const enriched = JSON.parse(fsSync.readFileSync(path.join(STAGING, "authors-enriched.json"), "utf8")).authors;

const existing = new Set(catalog.authors.map((a) => normName(a.name)));
const additions = [];

for (const e of enriched) {
  if (existing.has(normName(e.name))) continue;
  additions.push({
    id: e.candidateId || slugify(e.name),
    name: e.name,
    dates: e.dates ?? "—",
    born: e.born,
    died: e.died,
    epochId: e.suggestedEpoch ?? "bashkekohore", // curator confirms
    isFeatured: false,
    bio: e.bio || e.description || "",
    wikipedia: e.wikipedia ?? null,
    ...(e.photoFile ? { photoImported: `corpus/photos/${e.photoFile}` } : {}),
    _provenance: e.provenance,
  });
}

console.log(`merge: ${additions.length} author(s) to add`);
for (const a of additions) {
  console.log(`  + ${a.name.padEnd(28)} ${String(a.dates).padEnd(12)} → ${a.epochId}`);
}

if (!APPLY) {
  console.log("\n(dry run — re-run with --apply to write catalog.json)");
  process.exit(0);
}

catalog.authors.push(...additions.map(({ _provenance, ...rest }) => ({
  ...rest,
  ...(rest.photoImported ? { photoSource: rest.photoImported } : {}),
  // keep provenance visible to curators inside the corpus file
  sourceNote: `${_provenance.source} · ${_provenance.license}`,
})));
fsSync.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + "\n");
console.log(`\nmerge: written. Now review bios/epochs, then: npm run build:content`);
