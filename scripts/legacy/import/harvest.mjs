#!/usr/bin/env node
/**
 * harvest.mjs — collect candidate author names from Wikipedia seed sources.
 *
 * Usage:  node scripts/import/harvest.mjs [--limit N]
 * Output: corpus/staging/candidates.raw.json
 *
 * Seeds (seeds.json): epoch overview ARTICLES (parse internal links) and/or
 * CATEGORIES (walk members). Names are filtered to humans later in enrich.mjs.
 */
import fsSync from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ROOT, STAGING, wikiApi, parseWikiLinks } from "./lib.mjs";

const seedsPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "seeds.json");
const seeds = JSON.parse(fsSync.readFileSync(seedsPath, "utf8"));

const argLimit = process.argv.indexOf("--limit");
const LIMIT = argLimit > -1 ? parseInt(process.argv[argLimit + 1], 10) : Infinity;

async function articleLinks(title) {
  const d = await wikiApi({
    action: "query", prop: "revisions", titles: title, redirects: 1,
    rvslots: "main", rvprop: "content", rvlimit: 1,
  });
  const page = Object.values(d.query.pages)[0];
  if (!page?.revisions?.[0]?.slots?.main) return [];
  return parseWikiLinks(page.revisions[0].slots.main["*"] ?? "");
}

async function categoryMembers(cat) {
  const names = [];
  let cont = {};
  while (true) {
    const d = await wikiApi({ action: "query", list: "categorymembers", cmtitle: cat, cmlimit: "500", ...cont });
    for (const m of d.query?.categorymembers ?? []) if (m.ns === 0) names.push(m.title);
    if (!d.continue || names.length >= 2000) break;
    cont = { cmcontinue: d.continue.cmcontinue };
  }
  return names;
}

const seen = new Map(); // name -> record
for (const src of seeds.sources) {
  console.log(`harvest: ${src.type} "${src.title}" → suggests ${src.suggests ?? "(by dates)"}`);
  const names =
    src.type === "article"
      ? await articleLinks(src.title)
      : await categoryMembers(src.title.startsWith("Kategoria:") ? src.title : `Kategoria:${src.title}`);

  for (const name of names) {
    if (seen.has(name)) continue;
    seen.set(name, {
      name,
      source: `${src.type}:${src.title}`,
      sourceUrl: `https://sq.wikipedia.org/wiki/${encodeURIComponent(src.title.replace(/ /g, "_"))}`,
      suggestedEpoch: src.suggests ?? null,
    });
  }
  console.log(`   +${names.length} links (total unique so far: ${seen.size})`);
}

let candidates = [...seen.values()];
if (candidates.length > LIMIT) candidates = candidates.slice(0, LIMIT);

fsSync.mkdirSync(STAGING, { recursive: true });
const out = path.join(STAGING, "candidates.raw.json");
fsSync.writeFileSync(
  out,
  JSON.stringify({ harvestedAt: new Date().toISOString(), count: candidates.length, candidates }, null, 2)
);
console.log(`harvest: ${candidates.length} candidate name(s) → ${path.relative(ROOT, out)}`);
