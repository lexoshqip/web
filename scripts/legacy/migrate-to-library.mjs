#!/usr/bin/env node
/**
 * migrate-to-library.mjs — ONE-TIME migration from the legacy flat corpus/
 * layout (monolithic corpus/catalog.json) to the new Library/ hierarchy:
 *
 *   Library/
 *     epochs.json
 *     collections.json
 *     banners/<epoch-id>.<ext>
 *     authors/<author-id>/
 *       author.json
 *       photo.<ext>            (+ photo.license.json sidecar when present)
 *       books/<book-id>/
 *         book.json            (metadata incl. tiered rights + sources)
 *         text.md              (was master.md)
 *         excerpt.md           (was master-trial.md)
 *         cover.*, audio/, variants…   (copied verbatim)
 *
 * Rights model migration:
 *   rightsStatus "verified" → rights.verification "source-declared",
 *                             rights.license      "public-domain"
 *   rightsStatus "pending"  → rights.verification "pending",
 *                             rights.license      "unknown"
 * Curators promote individual books to "juridical" later by editing book.json.
 *
 * Refuses to run if Library/authors already exists (use --force to wipe).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const CORPUS = path.join(ROOT, "corpus");
const LIB = path.join(ROOT, "Library");

if (!fs.existsSync(path.join(CORPUS, "catalog.json"))) {
  console.error("corpus/catalog.json not found — nothing to migrate.");
  process.exit(1);
}
if (fs.existsSync(path.join(LIB, "authors")) && !process.argv.includes("--force")) {
  console.error("Library/authors already exists — refusing to overwrite (use --force).");
  process.exit(1);
}
if (process.argv.includes("--force")) fs.rmSync(LIB, { recursive: true, force: true });

const catalog = JSON.parse(fs.readFileSync(path.join(CORPUS, "catalog.json"), "utf8"));
const PHOTO_EXTS = [".jpg", ".jpeg", ".png", ".webp"];

/* --- top-level metadata --- */
fs.mkdirSync(LIB, { recursive: true });
fs.writeFileSync(path.join(LIB, "epochs.json"), JSON.stringify(catalog.epochs, null, 2) + "\n");
fs.writeFileSync(path.join(LIB, "collections.json"), JSON.stringify(catalog.collections ?? [], null, 2) + "\n");

/* --- banners --- */
if (fs.existsSync(path.join(CORPUS, "banners"))) {
  fs.cpSync(path.join(CORPUS, "banners"), path.join(LIB, "banners"), { recursive: true });
}

/* --- staging (import candidates etc.) --- */
if (fs.existsSync(path.join(CORPUS, "staging"))) {
  fs.cpSync(path.join(CORPUS, "staging"), path.join(LIB, "staging"), { recursive: true });
}

/* --- authors: folder + author.json + photo (+ license sidecar) --- */
for (const a of catalog.authors) {
  const dir = path.join(LIB, "authors", a.id);
  fs.mkdirSync(dir, { recursive: true });

  const { id, photoImported, photoSource, ...rest } = a; // ids live in folder names; stale corpus paths dropped
  fs.writeFileSync(path.join(dir, "author.json"), JSON.stringify(rest, null, 2) + "\n");

  const photo = PHOTO_EXTS.map((ext) => path.join(CORPUS, "photos", id + ext)).find((p) => fs.existsSync(p));
  if (photo) {
    const ext = path.extname(photo).toLowerCase();
    fs.copyFileSync(photo, path.join(dir, `photo${ext}`));
    const sidecar = path.join(CORPUS, "photos", `${id}.license.json`);
    if (fs.existsSync(sidecar)) {
      const lic = JSON.parse(fs.readFileSync(sidecar, "utf8"));
      // drop the original filename reference; provenance stays accurate
      delete lic.file;
      fs.writeFileSync(path.join(dir, "photo.license.json"), JSON.stringify(lic, null, 2) + "\n");
    }
  }
}

/* --- books: nested under their author --- */
let movedFiles = 0;
for (const b of catalog.books) {
  const dir = path.join(LIB, "authors", b.authorId, "books", b.id);
  fs.mkdirSync(dir, { recursive: true });

  /* rights transformation */
  const rights =
    b.rightsStatus === "verified"
      ? { license: "public-domain", verification: "source-declared", sources: [] }
      : { license: "unknown", verification: "pending", sources: [] };

  const { id, authorId, master, masterTrial, rightsStatus, ...meta } = b;
  meta.rights = rights;

  /* files[] paths become relative to the book folder (basename only) */
  for (const f of meta.files ?? []) f.path = path.basename(f.path);

  /* legacy master path hints preserved as plain conventions text.md/excerpt.md */
  fs.writeFileSync(path.join(dir, "book.json"), JSON.stringify(meta, null, 2) + "\n");

  /* copy every file from the old flat folder; the DECLARED masters become
     the new plain conventions text.md / excerpt.md */
  const srcDir = path.join(CORPUS, "books", id);
  if (fs.existsSync(srcDir)) {
    for (const f of fs.readdirSync(srcDir)) {
      if (f.startsWith(".")) continue;
      let dest = f;
      if (master && f === path.basename(master)) dest = "text.md";
      else if (masterTrial && f === path.basename(masterTrial)) dest = "excerpt.md";
      else if (f === "master.md") dest = "text.md";
      else if (f === "master-trial.md") dest = "excerpt.md";
      fs.cpSync(path.join(srcDir, f), path.join(dir, dest), { recursive: true });
      movedFiles++;
    }
  }
}

console.log("─────────────── migrate-to-library ───────────────");
console.log(`authors:        ${catalog.authors.length}`);
console.log(`books:          ${catalog.books.length}`);
console.log(`files copied:   ${movedFiles}`);
console.log(`epochs/collections/banners/staging: migrated`);
console.log(`output:         ${LIB}`);
