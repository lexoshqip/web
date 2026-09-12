#!/usr/bin/env node
/**
 * enrich.mjs — verify humans, pull dates/bio/portrait from Wikidata+Wikipedia.
 *
 * Usage:  node scripts/import/enrich.mjs [--limit N] [--no-photos]
 * Input:  corpus/staging/candidates.raw.json
 * Output: corpus/staging/authors-enriched.json  (+ photos in corpus/photos/)
 *
 * Provenance is recorded per author: Wikipedia text is CC BY-SA 4.0
 * (attribution required); portrait licenses are stored in a sidecar file.
 */
import fsSync from "node:fs";
import path from "node:path";
import { ROOT, STAGING, wikiApi, cachedText, slugify, normName, claimYear, isHuman, suggestEpoch } from "./lib.mjs";

const arg = (flag) => {
  const i = process.argv.indexOf(flag);
  return i > -1 ? process.argv[i + 1] : null;
};
const LIMIT = parseInt(arg("--limit") ?? "Infinity", 10);
const PHOTOS = !process.argv.includes("--no-photos");

const catalog = JSON.parse(fsSync.readFileSync(path.join(ROOT, "corpus", "catalog.json"), "utf8"));
const existing = new Set(catalog.authors.map((a) => normName(a.name)));

const raw = JSON.parse(fsSync.readFileSync(path.join(STAGING, "candidates.raw.json"), "utf8"));
console.log(`enrich: ${raw.candidates.length} candidates, ${existing.size} already in catalog`);

const enriched = [];
let skipped = 0;

for (const c of raw.candidates) {
  if (enriched.length >= LIMIT) break;
  if (existing.has(normName(c.name))) { skipped++; continue; }
  const id = slugify(c.name);

  try {
    /* --- Wikidata entity via sqwiki sitelink --- */
    const wd = await wikiApi(
      {
        action: "wbgetentities", sites: "sqwiki", titles: c.name,
        props: "claims|labels|descriptions|sitelinks", languages: "sq",
      },
      "https://www.wikidata.org/w/api.php"
    );
    const entity = Object.values(wd.entities ?? {})[0];
    if (!entity || (entity.missing ?? Object.keys(entity).length === 0)) { skipped++; continue; }
    if (!isHuman(entity)) { skipped++; continue; }

    const born = claimYear(entity.claims, "P569");
    const died = claimYear(entity.claims, "P570");
    const qid = entity.id;
    const description = entity.descriptions?.sq?.value ?? entity.descriptions?.en?.value ?? "";

    /* --- intro bio extract from sq.wikipedia --- */
    const ex = await wikiApi({
      action: "query", prop: "extracts", explaintext: 1, exintro: 1, titles: c.name, redirects: 1,
    });
    const page = Object.values(ex.query.pages)[0];
    const bio = (page?.extract ?? "").trim();

    const record = {
      candidateId: id,
      name: c.name,
      qid,
      born,
      died,
      dates: born || died ? `${born ?? "?"}–${died ?? "?"}` : "—",
      suggestedEpoch: c.suggestedEpoch ?? suggestEpoch(born, died),
      bio,
      description,
      wikipedia: `https://sq.wikipedia.org/wiki/${encodeURIComponent(c.name.replace(/ /g, "_"))}`,
      photoFile: null,
      provenance: {
        source: "Wikipedia (sq) + Wikidata",
        sourceUrl: `https://sq.wikipedia.org/wiki/${encodeURIComponent(c.name.replace(/ /g, "_"))}`,
        license: "CC BY-SA 4.0 — attribution required on author pages",
        retrievedAt: new Date().toISOString(),
      },
      harvestedFrom: c.source,
    };

    /* --- portrait via P18 → Commons thumb + license sidecar --- */
    const p18 = entity.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
    if (PHOTOS && p18) {
      try {
        const ci = await wikiApi(
          {
            action: "query", titles: `File:${p18}`, prop: "imageinfo",
            iiprop: "url|extmetadata", iiurlwidth: 600,
          },
          "https://commons.wikimedia.org/w/api.php"
        );
        const info = Object.values(ci.query.pages)[0]?.imageinfo?.[0];
        const url = info?.thumburl ?? info?.url;
        if (url) {
          const meta = info.extmetadata ?? {};
          const license = meta.LicenseShortName?.value ?? "unknown";
          const free = /public domain|pd|cc0|cc by(?!-nc)/i.test(license);
          if (free) {
            await new Promise(async (resolve, reject) => {
              const res = await fetch(url, { headers: { "User-Agent": UAof() } });
              if (!res.ok) return reject(new Error(`photo HTTP ${res.status}`));
              const buf = Buffer.from(await res.arrayBuffer());
              const ext = path.extname(new URL(url).pathname) || ".jpg";
              fsSync.mkdirSync(path.join(ROOT, "corpus", "photos"), { recursive: true });
              fsSync.writeFileSync(path.join(ROOT, "corpus", "photos", id + ext), buf);
              fsSync.writeFileSync(
                path.join(ROOT, "corpus", "photos", `${id}.license.json`),
                JSON.stringify({ file: p18, license, licenseUrl: meta.LicenseUrl?.value ?? "", artist: meta.Artist?.value ?? "", sourceUrl: info.descriptionurl }, null, 2)
              );
              record.photoFile = `${id}${ext}`;
              resolve();
            });
            await new Promise((r) => setTimeout(r, 800));
          } else {
            record.photoLicenseRejected = license;
          }
        }
      } catch (e) {
        record.photoError = String(e.message ?? e);
      }
    }

    enriched.push(record);
    console.log(`  ✓ ${c.name} (${record.dates}, ${record.suggestedEpoch ?? "epoch?"})${record.photoFile ? " 📷" : ""}`);
  } catch (e) {
    console.log(`  ✗ ${c.name}: ${e.message}`);
    skipped++;
  }
}

function UAof() {
  return "LexoShqip-miner/0.1 (curators@lexoshqip.example)";
}

fsSync.writeFileSync(
  path.join(STAGING, "authors-enriched.json"),
  JSON.stringify({ enrichedAt: new Date().toISOString(), count: enriched.length, authors: enriched }, null, 2)
);
console.log(`\nenrich: ${enriched.length} verified, ${skipped} skipped/already-present`);
console.log("next: review the staging file, then run merge.mjs (--apply to write)");
