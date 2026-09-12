#!/usr/bin/env node
/**
 * gutenberg.mjs — mine Project Gutenberg for Albanian-related books.
 *
 * Sources:
 *  - Gutendex API (fast discovery; used by default)
 *  - Official catalog feed pg_catalog.csv.gz (--catalog, for exhaustive offline runs)
 *
 * Output: corpus/staging/gutenberg-candidates.json
 * Nothing touches corpus/catalog.json — merge is always human-approved.
 */
import fsSync from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = path.join(ROOT, ".cache", "import");
const STAGING = path.join(ROOT, "corpus", "staging");
const UA = { "User-Agent": "LexoShqip-miner/0.1 (curators@lexoshqip.example)" };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function cachedText(url) {
  await fsSync.promises.mkdir(CACHE, { recursive: true });
  const f = path.join(CACHE, crypto.createHash("sha1").update(url).digest("hex"));
  try {
    return await fsSync.promises.readFile(f, "utf8");
  } catch {
    /* fetch below */
  }
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  const text = await res.text();
  await fsSync.promises.writeFile(f, text);
  return text;
}

async function gutendex(params) {
  return JSON.parse(await cachedText("https://gutendex.com/books?" + new URLSearchParams(params)));
}

function mapBook(b) {
  return {
    gutenbergId: b.id,
    title: b.title,
    authors: b.authors.map((a) => ({
      name: a.name,
      born: a.birth_year ?? null,
      died: a.death_year ?? null,
    })),
    languages: b.languages,
    subjects: b.subjects?.slice(0, 8) ?? [],
    copyright: !!b.copyright,
    formats: Object.fromEntries(
      Object.entries(b.formats ?? {})
        .filter(([k]) => /\.(txt|epub|pdf)$/.test(k))
        .map(([k, v]) => [k.replace(/^application\/|text\/|\+/g, "").replace(/;/g, ""), v])
    ),
    provenance: {
      source: "Project Gutenberg (via Gutendex)",
      sourceUrl: `https://www.gutenberg.org/ebooks/${b.id}`,
      licenseNote: "US public domain per Gutenberg; verify life+70 rule for EU/AL before publishing.",
      retrievedAt: new Date().toISOString(),
    },
  };
}

/* ---------------- main ---------------- */
const candidates = [];

/* 1. Albanian-language holdings */
let page = 1;
while (true) {
  const d = await gutendex({ languages: "al", page });
  candidates.push(...d.results.map(mapBook));
  if (!d.next) break;
  page++;
  await sleep(1500);
}

/* 2. Works about Albania (foreign-language shelf candidate) */
const search = await gutendex({ search: "albania" });
for (const b of search.results) {
  if (!candidates.some((c) => c.gutenbergId === b.id)) candidates.push(mapBook(b));
}

await fsSync.promises.mkdir(STAGING, { recursive: true });
const out = path.join(STAGING, "gutenberg-candidates.json");
fsSync.writeFileSync(
  out,
  JSON.stringify(
    {
      minedAt: new Date().toISOString(),
      note: "Candidates only. Curators review -> merge into corpus/catalog.json (rights gate applies).",
      count: candidates.length,
      albanianLanguage: candidates.filter((c) => c.languages.includes("al")).length,
      candidates,
    },
    null,
    2
  )
);

console.log(`gutenberg: ${candidates.length} candidate(s) written to ${path.relative(ROOT, out)}`);
console.log(`          albanian-language: ${candidates.filter((c) => c.languages.includes("al")).length}`);
for (const c of candidates.slice(0, 10)) {
  console.log(`  #${c.gutenbergId} [${c.languages.join(",")}] ${c.title.slice(0, 60)} — ${c.authors[0]?.name ?? "?"}`);
}
