#!/usr/bin/env node
/**
 * generate-catalog.mjs — Generates a single catalog.json per library.
 *
 * Reads the standard library folder structure and emits a self-contained
 * catalog.json that the build script can download in one request instead
 * of fetching 300+ individual files from S3.
 *
 * Usage:
 *   node scripts/generate-catalog.mjs ../arka
 *   node scripts/generate-catalog.mjs ../arka ../agim ../lira
 *   node scripts/generate-catalog.mjs              (all libraries from config)
 *
 * Output: writes catalog.json into the root of each library folder.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const WORKSPACE = path.resolve(ROOT, "..");

const readJson = (p) => {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); }
  catch { return null; }
};

function generateCatalog(libPath) {
  const libId = path.basename(libPath).toLowerCase()
    .replace(/library$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || path.basename(libPath).toLowerCase();

  const library = readJson(path.join(libPath, "library.json")) ?? {
    id: libId,
    name: path.basename(libPath),
  };

  const epochs = readJson(path.join(libPath, "epochs.json")) ?? [];
  const collections = readJson(path.join(libPath, "collections.json")) ?? [];
  const featured = readJson(path.join(libPath, "featured.json")) ?? null;

  const authorsDir = path.join(libPath, "authors");
  const authors = [];

  if (fs.existsSync(authorsDir)) {
    for (const aid of fs.readdirSync(authorsDir).sort()) {
      if (aid.startsWith(".")) continue;
      const adir = path.join(authorsDir, aid);
      if (!fs.statSync(adir).isDirectory()) continue;

      const authorMeta = readJson(path.join(adir, "author.json"));
      if (!authorMeta) continue;

      const booksDir = path.join(adir, "books");
      const books = [];

      if (fs.existsSync(booksDir)) {
        for (const bid of fs.readdirSync(booksDir).sort()) {
          if (bid.startsWith(".")) continue;
          const bdir = path.join(booksDir, bid);
          if (!fs.statSync(bdir).isDirectory()) continue;

          const bookMeta = readJson(path.join(bdir, "book.json"));
          if (!bookMeta) continue;

          // List available content files (for reference, not downloaded)
          const files = [];
          for (const f of fs.readdirSync(bdir)) {
            if (f === "book.json" || f.startsWith(".")) continue;
            const fp = path.join(bdir, f);
            if (fs.statSync(fp).isDirectory()) continue;
            files.push(f);
          }

          books.push({
            ...bookMeta,
            id: `${aid}--${bid}`,
            authorId: aid,
            _files: files.length ? files : undefined,
          });
        }
      }

      authors.push({
        ...authorMeta,
        id: aid,
        books,
      });
    }
  }

  const catalog = {
    version: 2,
    generatedAt: new Date().toISOString(),
    library,
    epochs,
    collections,
    featured,
    authors,
  };

  // Collect all image file paths for build-time caching
  const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".svg"]);
  const imageKeys = [];

  // Banners
  const bannersDir = path.join(libPath, "banners");
  if (fs.existsSync(bannersDir)) {
    for (const f of fs.readdirSync(bannersDir)) {
      if (IMAGE_EXTS.has(path.extname(f).toLowerCase())) {
        imageKeys.push(`banners/${f}`);
      }
    }
  }

  // Library-level assets (logo, banner)
  for (const f of fs.readdirSync(libPath)) {
    if (f.startsWith(".") || f.endsWith(".json") || f.endsWith(".md")) continue;
    const fp = path.join(libPath, f);
    if (fs.statSync(fp).isDirectory()) continue;
    if (IMAGE_EXTS.has(path.extname(f).toLowerCase())) {
      imageKeys.push(f);
    }
  }

  // Author photos + book covers
  for (const a of authors) {
    if (a.photo) imageKeys.push(`authors/${a.id}/photo.jpg`);
    for (const b of a.books ?? []) {
      const bid = b.id?.includes("--") ? b.id.split("--")[1] : b.id;
      const bdir = path.join(libPath, "authors", a.id, "books", bid);
      if (!fs.existsSync(bdir)) continue;
      for (const f of fs.readdirSync(bdir)) {
        if (IMAGE_EXTS.has(path.extname(f).toLowerCase())) {
          imageKeys.push(`authors/${a.id}/books/${bid}/${f}`);
        }
      }
    }
  }

  catalog._imageKeys = imageKeys;

  const outPath = path.join(libPath, "catalog.json");
  fs.writeFileSync(outPath, JSON.stringify(catalog, null, 2));

  const bookCount = authors.reduce((n, a) => n + a.books.length, 0);
  console.log(`✓ ${library.name ?? libId}: ${authors.length} authors, ${bookCount} books → catalog.json`);
  return catalog;
}

// Parse CLI args
const args = process.argv.slice(2);
let libPaths;

if (args.length) {
  libPaths = args.map((p) => path.resolve(p));
} else {
  // Read from libraries.config.json
  const configPath = path.join(ROOT, "libraries.config.json");
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    libPaths = config.libraries
      .filter((l) => l.path)
      .map((l) => path.resolve(ROOT, l.path));
  } else {
    console.error("Usage: node scripts/generate-catalog.mjs <library-path> [...]");
    process.exit(1);
  }
}

for (const libPath of libPaths) {
  if (!fs.existsSync(libPath)) {
    console.warn(`⚠ Library not found: ${libPath}`);
    continue;
  }
  generateCatalog(libPath);
}
