#!/usr/bin/env node
/**
 * bibliography.mjs — harvest each author's book list from their sq.wikipedia
 * article and stage them as metadata-only catalog entries.
 *
 * Usage:
 *   node scripts/import/bibliography.mjs [--limit N] [--apply]
 *
 * Output: corpus/staging/books-candidates.json (+ --apply merges into catalog)
 *
 * Parsing targets level-2 sections named Vepra/Bibliografia/etc. and extracts
 * bullet titles with optional years. Titles only — no text is imported here;
 * digitization remains the manual curation work.
 */
import fsSync from "node:fs";
import path from "node:path";
import { ROOT, STAGING, wikiApi, cachedText, slugify, normName } from "./lib.mjs";

const APPLY = process.argv.includes("--apply");
const argLimit = process.argv.indexOf("--limit");
const LIMIT = argLimit > -1 ? parseInt(process.argv[argLimit + 1], 10) : Infinity;

const catalogPath = path.join(ROOT, "corpus", "catalog.json");
const catalog = JSON.parse(fsSync.readFileSync(catalogPath, "utf8"));
const YEAR = new Date().getFullYear();

/* ---------- parsing ---------- */
function bibliographySections(wikitext) {
  const heads = [...wikitext.matchAll(/^==\s*([^=\n]+?)\s*==\s*$/gm)];
  const out = [];
  for (let i = 0; i < heads.length; i++) {
    const start = heads[i].index + heads[i][0].length;
    const end = i + 1 < heads.length ? heads[i + 1].index : wikitext.length;
    if (/vepra|bibliograf|vëllime|poezi|prozë|botime|librat|tregtime|romane|drama/i.test(heads[i][1]))
      out.push(wikitext.slice(start, end));
  }
  return out.join("\n");
}

function parseTitles(body) {
  const found = [];
  for (let line of body.split("\n")) {
    if (!/^\s*[*#]/.test(line)) continue;
    if (/<ref|isbn|http/i.test(line)) continue;

    const ym = line.match(/\b(1[4-9]\d{2}|20[0-2]\d)\b/);
    const year = ym ? parseInt(ym[1], 10) : null;

    let title = null;
    const lm = line.match(/\[\[([^\]|#]+)(?:\|[^\]]*)?\]\]/);
    if (lm) title = lm[1];
    else {
      const im = line.match(/''([^']+)''/);
      if (im) title = im[1];
    }
    if (!title) {
      title = line.replace(/^\s*[*#]+\s*/, "");
      title = title.split(/\(\s*(?:Tirana|Prishtinë|Shkodër|Rome)/i)[0];
      title = title.replace(/\([^)]*\)/g, ""); // drop parentheticals incl. years
      title = title.replace(/['"„“”«»*]+/g, "").trim();
      title = title.split(/[;–—]|,\s*(?:me|botuar|Tiranë)/i)[0].trim();
    }
    title = (title ?? "").replace(/_/g, " ").replace(/\s+/g, " ").trim();
    if (!title || title.length < 2 || title.length > 100) continue;
    if (/^(shih|referime|literatura|lista)/i.test(title)) continue;
    if (/^\d+$/.test(title)) continue;

    found.push({ title, year });
  }
  return found;
}

const normTitle = (t) => t.toLowerCase().replace(/[ëç]/g, (c) => (c === "ë" ? "e" : "c")).replace(/\s+/g, " ").trim();

/** Strip bibliography artifacts: page counts ("23 ff"), author-initial signatures ("prej N.H.F."). */
function sanitizeTitle(title) {
  let t = title;
  for (let pass = 0; pass < 3; pass++) {
    t = t
      .replace(/\s+[.,;:–—-]?\s*\d{1,4}\s*(?:ff|fq|faqe|f|v)\.?\s*/gi, " ") // page/volume counts
      .replace(/\s+[.,;:]?\s*prej\s+(?:[A-ZÇË]\.\s*){1,4}\s*$/i, "")        // "… prej N.H.F."
      .replace(/\s+[.,;:]?\s*(?:[A-ZÇË]\.\s*){2,4}\s*$/i, "")               // trailing "N.H.F."
      .replace(/\s*[.,;:–—-]+\s*$/, "")                                     // trailing punct
      .replace(/\s{2,}/g, " ")
      .trim();
  }
  return t;
}

/** Fuzzy title equality: normalized containment or ≥75% shared tokens. */
function titlesMatch(a, b) {
  const A = normTitle(a), B = normTitle(b);
  if (!A || !B) return false;
  if (A === B || A.includes(B) || B.includes(A)) return true;
  const ta = new Set(A.split(" "));
  const tb = B.split(" ");
  const shared = tb.filter((w) => ta.has(w)).length;
  return shared / Math.min(ta.size, tb.length) >= 0.75;
}

/* ---------- main ---------- */
const existingTitlesByAuthor = new Map();
for (const b of catalog.books) {
  const arr = existingTitlesByAuthor.get(b.authorId) ?? [];
  arr.push(b.title);
  existingTitlesByAuthor.set(b.authorId, arr);
}
const usedIds = new Set(catalog.books.map((b) => b.id));

const candidates = [];
let authorsWithWorks = 0;
const authors = catalog.authors.slice(0, Number.isFinite(LIMIT) ? LIMIT : catalog.authors.length);

for (const a of authors) {
  try {
    const d = await wikiApi({
      action: "query", prop: "revisions", titles: a.name, redirects: 1,
      rvslots: "main", rvprop: "content", rvlimit: 1,
    });
    const page = Object.values(d.query.pages)[0];
    const wikitext = page?.revisions?.[0]?.slots?.main?.["*"] ?? "";
    if (!wikitext) continue;

    const body = bibliographySections(wikitext);
    if (!body.trim()) continue;

    let addedForAuthor = 0;
    const addedTitlesThisAuthor = [];
    for (const { title: rawTitle, year } of parseTitles(body)) {
      const title = sanitizeTitle(rawTitle);
      if (!title || title.length < 2) continue;
      if (existingTitlesByAuthor.get(a.id)?.some((t) => titlesMatch(t, title))) continue;
      if (addedTitlesThisAuthor.some((t) => titlesMatch(t, title))) continue;
      existingTitlesByAuthor.set(a.id, [...(existingTitlesByAuthor.get(a.id) ?? []), title]);
      addedTitlesThisAuthor.push(title);

      let id = slugify(`${a.id}-${title}`).slice(0, 90);
      while (usedIds.has(id)) id += "-2";
      usedIds.add(id);

      // rights gate for FUTURE text publication; metadata-only facts show regardless
      const clearlyPD =
        (typeof a.died === "number" && a.died + 70 < YEAR) ||
        (year !== null && year <= YEAR - 100);

      candidates.push({
        id,
        title,
        authorId: a.id,
        epochId: a.epochId,
        isFeatured: false,
        tags: ["Bibliografi"],
        publicationYear: year,
        synopsis: "",
        accessType: "full",
        rightsStatus: clearlyPD ? "verified" : "pending",
        availability: "metadata-only",
        editions: [],
      });
      addedForAuthor++;
    }
    if (addedForAuthor > 0) {
      authorsWithWorks++;
      console.log(`  ${a.name.padEnd(26)} +${addedForAuthor}`);
    }
  } catch (e) {
    console.log(`  ✗ ${a.name}: ${e.message}`);
  }
}

fsSync.mkdirSync(STAGING, { recursive: true });
fsSync.writeFileSync(
  path.join(STAGING, "books-candidates.json"),
  JSON.stringify({ harvestedAt: new Date().toISOString(), count: candidates.length, books: candidates }, null, 2)
);
console.log(`\nbibliography: ${candidates.length} metadata-only entries from ${authorsWithWorks} author(s)`);

if (APPLY && candidates.length) {
  catalog.books.push(...candidates);
  fsSync.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + "\n");
  console.log(`apply: catalog now has ${catalog.books.length} books. Run: npm run build:content`);
} else if (!APPLY) {
  console.log("(dry run — re-run with --apply to write)");
}
