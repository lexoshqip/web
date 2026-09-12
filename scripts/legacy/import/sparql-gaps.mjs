#!/usr/bin/env node
/**
 * sparql-gaps.mjs — fill epoch coverage gaps that Wikipedia articles/categories miss.
 *
 * One SPARQL query against Wikidata: humans with an sq.wikipedia biography,
 * a literary occupation, and birth years spanning the pre-1945 epochs.
 * Buckets candidates into rilindja / pavaresia by life dates and writes
 * corpus/staging/candidates.raw.json for the standard enrich -> merge flow.
 */
import fsSync from "node:fs";
import path from "node:path";
import { ROOT, STAGING, cachedText, normName } from "./lib.mjs";

const SPARQL = `
SELECT DISTINCT ?title ?born ?died WHERE {
  ?person wdt:P31 wd:Q5 ;
          wdt:P106 ?occ ;
          wdt:P569 ?dob .
  OPTIONAL { ?person wdt:P570 ?dod }
  VALUES ?occ { wd:Q36180 wd:Q4975732 wd:Q6625963 wd:Q1930187 wd:Q482980 wd:Q214917 wd:Q1177420 wd:Q3658341 }
  ?article schema:about ?person ;
           schema:isPartOf <https://sq.wikipedia.org/> ;
           schema:name ?title .
  BIND(YEAR(?dob) AS ?born)
  OPTIONAL { BIND(YEAR(?dod) AS ?died) }
  FILTER(?born >= 1750 && ?born <= 1915)
  {
    { ?person wdt:P1412 wd:Q8748 }
    UNION
    { ?person wdt:P27 ?c . VALUES ?c { wd:Q222 wd:Q1246 } }
  }
}`;

const req = await fetch(
  "https://query.wikidata.org/sparql?format=json&query=" + encodeURIComponent(SPARQL),
  { headers: { "User-Agent": "LexoShqip-miner/0.1 (curators@lexoshqip.example)", Accept: "application/sparql-results+json" } }
);
if (!req.ok) {
  console.error(`SPARQL failed: HTTP ${req.status}`);
  process.exit(1);
}
const data = await req.json();

const catalog = JSON.parse(fsSync.readFileSync(path.join(ROOT, "corpus", "catalog.json"), "utf8"));
const existing = new Set(catalog.authors.map((a) => normName(a.name)));

function suggest(born, died) {
  // Rilindja generation: born ≤1885, died mostly ≤1912 (arbëreshë may live longer)
  if (born <= 1885 && (!died || died <= 1950)) return "rilindja";
  // Interwar generation: born 1866–1910
  if (born >= 1866 && born <= 1910) return "pavaresia";
  return null;
}

const candidates = [];
for (const row of data.results.bindings) {
  const name = row.title.value;
  if (existing.has(normName(name))) continue;
  const born = row.born ? parseInt(row.born.value, 10) : null;
  const died = row.died ? parseInt(row.died.value, 10) : null;
  const ep = suggest(born, died);
  if (!ep) continue;
  candidates.push({
    name,
    source: `sparql:${ep}`,
    sourceUrl: `https://www.wikidata.org/`,
    suggestedEpoch: ep,
  });
}

// dedupe by normalized name, prefer earliest epoch suggestion per name
const seen = new Map();
for (const c of candidates) {
  const k = normName(c.name);
  if (!seen.has(k)) seen.set(k, c);
}
const finalCandidates = [...seen.values()];

fsSync.mkdirSync(STAGING, { recursive: true });
fsSync.writeFileSync(
  path.join(STAGING, "candidates.raw.json"),
  JSON.stringify({ harvestedAt: new Date().toISOString(), count: finalCandidates.length, candidates: finalCandidates }, null, 2)
);

console.log(`sparql-gaps: ${finalCandidates.length} gap candidates`);
for (const c of finalCandidates.slice(0, 40)) console.log(`   ${c.suggestedEpoch.padEnd(11)} ${c.name}`);
