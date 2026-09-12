#!/usr/bin/env node
/**
 * prune-authors.mjs — slim the roster to originals + famous-per-epoch keeps.
 *
 * Originals = entries without `sourceNote` (hand-curated seed).
 * Imported  = entries with `sourceNote` (mined from Wikipedia/Wikidata).
 *
 * Usage:
 *   node scripts/import/prune-authors.mjs            dry run
 *   node scripts/import/prune-authors.mjs --apply    writes catalog + removes orphan photos
 */
import fsSync from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ROOT } from "./lib.mjs";

const APPLY = process.argv.includes("--apply");

/** Famous imported authors worth keeping for UI/UX validation. */
const KEEP_BY_EPOCH = {
  "e-vjeter": ["nezim-frakulla", "jul-variboba", "hasan-zyko-kamberi"],
  rilindja: [
    "kostandin-kristoforidhi",
    "naum-veqilharxhi",
    "abdyl-frasheri",
    "luigj-gurakuqi",
    "aleksander-stavre-drenova", // Asdreni
    "zef-serembe",
    "gavril-dara-i-riu",
  ],
  pavaresia: ["foqion-postoli", "ali-asllani", "musine-kokalari", "hil-mosi"],
  socialiste: [
    "sterjo-spasse",
    "jakov-xoxa",
    "kasem-trebeshina",
    "shevqet-musaraj",
    "fatmir-gjata",
  ],
  bashkekohore: ["ben-blushi", "ridvan-dibra", "agron-tufa", "ornela-vorpsi", "elvira-dones"],
};

const catalogPath = path.join(ROOT, "corpus", "catalog.json");
const catalog = JSON.parse(fsSync.readFileSync(catalogPath, "utf8"));

const originals = [];
const keptImports = [];
const removed = [];

for (const a of catalog.authors) {
  const isImported = !!(a.sourceNote || a.photoSource);
  if (!isImported) {
    originals.push(a);
    continue;
  }
  if ((KEEP_BY_EPOCH[a.epochId] ?? []).includes(a.id)) keptImports.push(a);
  else removed.push(a);
}

console.log(`prune: ${originals.length} originals kept, ${keptImports.length} famous imports kept, ${removed.length} removed`);

/* safety: never orphan a book */
const validIds = new Set([...originals, ...keptImports].map((a) => a.id));
const orphans = catalog.books.filter((b) => !validIds.has(b.authorId));
if (orphans.length) {
  console.error(`ABORT: ${orphans.length} book(s) would be orphaned:`, orphans.map((b) => b.id));
  process.exit(1);
}

for (const a of removed.slice(0, 40)) console.log(`   − ${a.name} (${a.epochId})`);
if (removed.length > 40) console.log(`   … and ${removed.length - 40} more`);

if (!APPLY) {
  console.log("\n(dry run — re-run with --apply)");
  process.exit(0);
}

catalog.authors = [...originals, ...keptImports];
fsSync.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + "\n");

/* remove now-orphaned portrait files */
const photosDir = path.join(ROOT, "corpus", "photos");
if (fsSync.existsSync(photosDir)) {
  for (const a of removed) {
    for (const f of fsSync.readdirSync(photosDir)) {
      if (f.startsWith(a.id + ".")) {
        fsSync.unlinkSync(path.join(photosDir, f));
        console.log(`   🗑 ${f}`);
      }
    }
  }
}

console.log(`\napply: ${catalog.authors.length} authors remain. Run: npm run build:content`);
