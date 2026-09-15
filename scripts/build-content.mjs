#!/usr/bin/env node
/**
 * build-content.mjs — LexoShqip static content pipeline.
 *
 * Reads one or more content roots (configurable via LEXOSHQIP_LIBRARY env var),
 * validates them, generates placeholder artwork (SVG), publishes curated
 * editions (md/epub/pdf/audio as present in each book's folder) as-is, and
 * emits the deployable static JSON API into /public/api plus media into
 * /public/content. No files are auto-converted — what is in the folder is
 * what gets served.
 *
 * Every root follows the same layout:
 *   $LIBRARY/
 *     epochs.json, collections.json, featured.json
 *     banners/<epoch-id>.<ext>
 *     authors/<author-id>/author.json          (id = folder name)
 *       photo.<ext>                            (optional real portrait)
 *       books/<book-id>/book.json              (id = folder name)
 *         text.md / excerpt.md                 (master text / trial fragment)
 *         cover.*, audio/, variants…           (optional assets)
 *
 * Multiple roots are merged id-first-wins: the first root to define an id
 * provides its record (the curated Library/ beats personal picks), later
 * roots only append what's new — so a local PersonalLibrary can coexist with
 * the shipped library and add its own authors and books.
 *   - LEXOSHQIP_LIBRARY accepts a comma/colon-separated list of roots,
 *     e.g. LEXOSHQIP_LIBRARY="Library:PersonalLibrary". Paths are resolved
 *     against the workspace root (the folder containing Website/).
 *   - When LEXOSHQIP_LIBRARY is unset, every sibling folder of the workspace
 *     named *Library is used, sorted (Library/ first).
 *
 * Only books whose rights.verification is not "pending" are ever emitted;
 * availability "metadata-only" books appear as bibliographic records.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import AdmZip from "adm-zip";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WORKSPACE = path.resolve(ROOT, "..");

/* Load .dev.vars into process.env for local builds */
const devVarsPath = path.join(ROOT, ".dev.vars");
if (fs.existsSync(devVarsPath)) {
  for (const line of fs.readFileSync(devVarsPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

/**
 * Fetch a remotely-deployed library by HTTP.
 *
 * Each deployed library must expose a `manifest.json` at its root listing
 * every content file path relative to the library root, e.g.:
 *   { "files": ["epochs.json", "collections.json", "authors/fan-noli/author.json", ...] }
 *
 * All listed files are downloaded and mirrored into .cache/libraries/<id>/
 * so the rest of the build can treat them identically to a local library.
 *
 * Returns the cache directory path, or null on failure.
 */
async function fetchRemoteLibrary(id, url) {
  const base = url.replace(/\/$/, "");
  const cacheDir = path.join(ROOT, ".cache", "libraries", id);

  let manifest;
  try {
    console.log(`[libraries] fetching manifest for ${id} from ${base}/manifest.json`);
    const res = await fetch(`${base}/manifest.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    manifest = await res.json();
  } catch (err) {
    console.warn(`[libraries] could not fetch manifest for ${id}: ${err.message}`);
    return fs.existsSync(cacheDir) ? cacheDir : null;
  }

  const files = manifest.files ?? [];
  fs.mkdirSync(cacheDir, { recursive: true });

  await Promise.all(files.map(async (file) => {
    const dest = path.join(cacheDir, file);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    try {
      const res = await fetch(`${base}/${file}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      fs.writeFileSync(dest, text, "utf8");
    } catch (err) {
      console.warn(`[libraries] failed to fetch ${file} from ${id}: ${err.message}`);
    }
  }));

  return cacheDir;
}

/* ------------------------------------------------------------------ */
/* S3 / Backblaze B2 helpers (build-time fetch for private buckets)    */
/* ------------------------------------------------------------------ */
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY_ID ?? "";
const S3_SECRET_KEY = process.env.S3_SECRET_ACCESS_KEY ?? "";

function hmac(key, data) {
  return crypto.createHmac("sha256", key).update(data).digest();
}

function sha256(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function s3BaseUrl(endpoint, bucket) {
  const host = endpoint.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return `https://${bucket}.${host}`;
}

function s3Sign({ method, bucket, key, endpoint, region, date, query = "" }) {
  const host = `${bucket}.${endpoint.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;
  const isoDate = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = isoDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const canonicalUri = key ? `/${encodeURIComponent(key).replace(/%2F/g, "/")}` : "/";
  const payloadHash = "UNSIGNED-PAYLOAD";

  const headers = {
    host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": isoDate,
  };
  const signedHeaderKeys = Object.keys(headers).sort();
  const canonicalHeaders = signedHeaderKeys.map((k) => `${k}:${headers[k]}\n`).join("");
  const signedHeaders = signedHeaderKeys.join(";");

  const canonicalRequest = [
    method, canonicalUri, query, canonicalHeaders, signedHeaders, payloadHash,
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256", isoDate, credentialScope, sha256(canonicalRequest),
  ].join("\n");

  const kDate = hmac(`AWS4${S3_SECRET_KEY}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, "s3");
  const kSigning = hmac(kService, "aws4_request");
  const signature = crypto.createHmac("sha256", kSigning).update(stringToSign).digest("hex");

  return {
    authorization: `AWS4-HMAC-SHA256 Credential=${S3_ACCESS_KEY}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    ...headers,
  };
}

async function s3GetObject(bucket, key, endpoint, region) {
  const date = new Date();
  const url = `${s3BaseUrl(endpoint, bucket)}/${encodeURIComponent(key).replace(/%2F/g, "/")}`;
  const auth = s3Sign({ method: "GET", bucket, key, endpoint, region, date });
  const res = await fetch(url, { headers: auth });
  if (!res.ok) throw new Error(`S3 GET ${key}: HTTP ${res.status}`);
  return res;
}

async function s3ListObjects(bucket, prefix, endpoint, region) {
  const keys = [];
  let continuationToken = "";
  do {
    const date = new Date();
    const queryParams = [`prefix=${encodeURIComponent(prefix)}`, "list-type=2"];
    if (continuationToken) queryParams.push(`continuation-token=${encodeURIComponent(continuationToken)}`);
    queryParams.sort();
    const queryString = queryParams.join("&");
    const canonicalQueryString = queryParams.map((p) => {
      const [k, v] = p.split("=");
      return `${encodeURIComponent(decodeURIComponent(k))}=${encodeURIComponent(decodeURIComponent(v ?? ""))}`;
    }).sort().join("&");

    const auth = s3Sign({
      method: "GET", bucket, key: "", endpoint, region, date, query: canonicalQueryString,
    });
    const url = `${s3BaseUrl(endpoint, bucket)}/?${queryString}`;
    const res = await fetch(url, { headers: auth });
    if (!res.ok) throw new Error(`S3 LIST ${prefix}: HTTP ${res.status}`);
    const xml = await res.text();
    const keyMatches = xml.match(/<Key>(.*?)<\/Key>/g) ?? [];
    for (const m of keyMatches) keys.push(m.replace(/<\/?Key>/g, ""));
    const contMatch = xml.match(/<NextContinuationToken>(.*?)<\/NextContinuationToken>/);
    continuationToken = contMatch ? contMatch[1] : "";
  } while (continuationToken);
  return keys;
}

async function fetchS3Library(id, s3Config) {
  const { bucket, endpoint, region } = s3Config;
  const cacheDir = path.join(ROOT, ".cache", "libraries", id);
  fs.mkdirSync(cacheDir, { recursive: true });

  if (!S3_ACCESS_KEY || !S3_SECRET_KEY) {
    console.warn(`[libraries] S3 credentials not set — skipping ${id}`);
    return fs.readdirSync(cacheDir).length ? cacheDir : null;
  }

  console.log(`[libraries] fetching ${id} from S3: ${bucket}`);

  try {
    // Step 1: Download catalog.json + library.json
    const [catalogRes, libMetaRes] = await Promise.all([
      s3GetObject(bucket, "catalog.json", endpoint, region),
      s3GetObject(bucket, "library.json", endpoint, region).catch(() => null),
    ]);
    const catalog = await catalogRes.json();
    fs.writeFileSync(path.join(cacheDir, "catalog.json"), JSON.stringify(catalog, null, 2));
    if (libMetaRes && libMetaRes.ok) {
      const libMeta = await libMetaRes.json();
      fs.writeFileSync(path.join(cacheDir, "library.json"), JSON.stringify(libMeta, null, 2));
    }
    const bookCount = (catalog.authors ?? []).reduce((n, a) => n + (a.books ?? []).length, 0);
    console.log(`[libraries] ${id}: ${(catalog.authors ?? []).length} authors, ${bookCount} books`);

    // Step 2: Download images (covers, portraits, banners) via S3 ListObjects
    const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".svg"]);
    const listing = await s3ListObjects(bucket, "", endpoint, region);
    // Persist the full listing — used later to derive S3-proxy format URLs for
    // books whose binaries are not present locally (Cloudflare CI builds).
    fs.writeFileSync(path.join(cacheDir, "objects.json"), JSON.stringify(listing));
    const imageKeys = listing.filter((k) => {
      const ext = path.extname(k).toLowerCase();
      return IMAGE_EXTS.has(ext);
    });

    if (imageKeys.length) {
      const CONCURRENCY = 10;
      let downloaded = 0;
      const total = imageKeys.length;
      for (let i = 0; i < imageKeys.length; i += CONCURRENCY) {
        const batch = imageKeys.slice(i, i + CONCURRENCY);
        await Promise.all(batch.map(async (key) => {
          const dest = path.join(cacheDir, key);
          if (fs.existsSync(dest)) { downloaded++; return; }
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          try {
            const imgRes = await s3GetObject(bucket, key, endpoint, region);
            const buffer = Buffer.from(await imgRes.arrayBuffer());
            fs.writeFileSync(dest, buffer);
            downloaded++;
          } catch (err) {
            console.warn(`[libraries] failed to fetch ${key}: ${err.message}`);
          }
        }));
        process.stdout.write(`\r[libraries] ${id}: images ${downloaded}/${total}`);
      }
      process.stdout.write("\n");
    }

    return cacheDir;
  } catch (err) {
    console.warn(`[libraries] S3 fetch failed for ${id}: ${err.message}`);
    return fs.existsSync(cacheDir) && fs.readdirSync(cacheDir).length ? cacheDir : null;
  }
}

async function resolveLibraries() {
  // 1. Env var override (CI/CD or one-off runs)
  if (process.env.LEXOSHQIP_LIBRARY) {
    return {
      paths: process.env.LEXOSHQIP_LIBRARY
        .split(/[,:]/).map((p) => p.trim()).filter(Boolean)
        .map((p) => path.resolve(WORKSPACE, p)),
      s3Configs: new Map(),
    };
  }
  // 2. libraries.config.json — the preferred way
  const configPath = path.join(ROOT, "libraries.config.json");
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    const paths = [];
    const s3Configs = new Map();
    for (const lib of config.libraries) {
      if (!lib.enabled) continue;
      if (lib.s3) {
        // S3-backed library — fetch via S3 API into local cache
        const p = await fetchS3Library(lib.id, lib.s3);
        if (p) {
          paths.push(p);
          s3Configs.set(p, lib.s3);
        }
      } else if (lib.url) {
        // Remote deployed library — fetch via HTTP into local cache
        const p = await fetchRemoteLibrary(lib.id, lib.url);
        if (p) paths.push(p);
      } else if (lib.path) {
        paths.push(path.resolve(WORKSPACE, lib.path));
      }
    }
    return { paths, s3Configs };
  }
  // 3. Fallback: auto-discover all *Library sibling folders
  return {
    paths: fs.readdirSync(WORKSPACE)
      .filter((n) => {
        try { return n.endsWith("Library") && fs.statSync(path.join(WORKSPACE, n)).isDirectory(); }
        catch { return false; }
      })
      .sort()
      .map((n) => path.join(WORKSPACE, n)),
    s3Configs: new Map(),
  };
}

const _resolved = await resolveLibraries();
const LIBRARIES = _resolved.paths
  .filter((p, i, a) => fs.existsSync(p) && a.indexOf(p) === i);
const S3_CONFIGS = _resolved.s3Configs;

/* Local library repo paths (for finding split volumes etc.) */
const LOCAL_LIB_PATHS = [];
const configPath = path.join(ROOT, "libraries.config.json");
if (fs.existsSync(configPath)) {
  const cfg = JSON.parse(fs.readFileSync(configPath, "utf8"));
  for (const lib of cfg.libraries) {
    if (lib.path) {
      const p = path.resolve(ROOT, lib.path);
      if (fs.existsSync(p)) LOCAL_LIB_PATHS.push(p);
    }
  }
}
const PUBLIC = path.join(ROOT, "public");
const API_OUT = path.join(PUBLIC, "api");
const CONTENT_OUT = path.join(PUBLIC, "content");

/* rights registries — single source of truth for labels shown in the UI */
const DEED = (code) => `https://creativecommons.org/licenses/${code}/4.0/deed.sq`;
export const LICENSES = {
  "public-domain": { label: "Domain publik" },
  "cc0": { label: "CC0 1.0", deedUrl: "https://creativecommons.org/publicdomain/zero/1.0/deed.sq" },
  "cc-by": { label: "CC BY 4.0", deedUrl: DEED("by") },
  "cc-by-sa": { label: "CC BY-SA 4.0", deedUrl: DEED("by-sa") },
  "cc-by-nd": { label: "CC BY-ND 4.0", deedUrl: DEED("by-nd") },
  "cc-by-nc": { label: "CC BY-NC 4.0", deedUrl: DEED("by-nc") },
  "cc-by-nc-sa": { label: "CC BY-NC-SA 4.0", deedUrl: DEED("by-nc-sa") },
  "cc-by-nc-nd": { label: "CC BY-NC-ND 4.0", deedUrl: DEED("by-nc-nd") },
  "permission": { label: "Me leje të titullarit" },
  "freely-available": { label: "Lirshëm në internet" },
  "unknown": { label: "Të drejta për t'u përcaktuar" },
};
export const VERIFICATIONS = {
  "juridical": { label: "Verifikuar juridikisht" },
  "source-declared": { label: "Sipas burimit" },
  "pending": { label: "Në shqyrtim" },
};

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */
const hash = (s) => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const PALETTES = [
  ["#f4ecdc", "#3a2f25", "#9e1b1b"],
  ["#efe6d2", "#27384a", "#b98a2f"],
  ["#f2e9df", "#40342b", "#275c4d"],
  ["#ece4d4", "#2e2a39", "#7c3aed"],
  ["#f5edda", "#33413b", "#a44a1f"],
];

const escXml = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* ------------------------------------------------------------------ */
/* svg artwork                                                         */
/* ------------------------------------------------------------------ */
function coverSvg(book, authorName) {
  const [bg, ink, accent] = PALETTES[hash(book.id) % PALETTES.length];
  const words = book.title.split(/\s+/);
  const lines = [];
  let cur = "";
  for (const w of words) {
    if (!cur) cur = w;
    else if ((cur + " " + w).length <= 16) cur += " " + w;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  const shown = lines.slice(0, 5);
  if (lines.length > 5) shown[4] = shown[4].slice(0, 13) + "…";
  const startY = 340 - (shown.length - 1) * 28;
  const titleTspans = shown
    .map((l, i) => `<tspan x="300" y="${startY + i * 56}">${escXml(l)}</tspan>`)
    .join("");
  const trial = book.accessType === "trial";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
  <rect width="600" height="900" fill="${bg}"/>
  <rect x="22" y="22" width="556" height="856" fill="none" stroke="${accent}" stroke-width="3"/>
  <rect x="34" y="34" width="532" height="832" fill="none" stroke="${ink}" stroke-opacity=".35" stroke-width="1"/>
  <path d="M300 108 l14 14 -14 14 -14 -14 Z" fill="${accent}"/>
  <line x1="180" y1="122" x2="272" y2="122" stroke="${ink}" stroke-opacity=".4"/>
  <line x1="328" y1="122" x2="420" y2="122" stroke="${ink}" stroke-opacity=".4"/>
  <text x="300" y="${startY - 60}" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-size="21" fill="${ink}" fill-opacity=".65">LexoShqip</text>
  <text font-family="Georgia,serif" font-weight="700" font-size="46" fill="${ink}" text-anchor="middle">${titleTspans}</text>
  <line x1="220" y1="700" x2="380" y2="700" stroke="${accent}" stroke-width="2"/>
  <text x="300" y="750" text-anchor="middle" font-family="Georgia,serif" font-size="25" letter-spacing="2" fill="${ink}">${escXml(authorName)}</text>
  <text x="300" y="848" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-size="13" letter-spacing="3" fill="${ink}" fill-opacity=".55">${book.publicationYear}</text>
  ${
    trial
      ? `<g transform="rotate(-14 480 150)"><rect x="395" y="118" width="170" height="44" fill="${accent}"/><text x="480" y="147" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-weight="bold" font-size="19" letter-spacing="2" fill="#fff">FRAGMENT</text></g>`
      : ""
  }
</svg>`;
}

function portraitSvg(name) {
  const [bg, , accent] = PALETTES[hash(name) % PALETTES.length];
  const initials = name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${bg}"/>
  <circle cx="256" cy="256" r="200" fill="#ffffff" fill-opacity=".45" stroke="${accent}" stroke-width="6"/>
  <circle cx="256" cy="256" r="178" fill="none" stroke="${accent}" stroke-opacity=".4" stroke-dasharray="2 7" stroke-width="2"/>
  <text x="256" y="312" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="150" fill="${accent}">${escXml(initials)}</text>
</svg>`;
}

function bannerSvg(epoch) {
  const [bg, , accent] = PALETTES[hash(epoch.id) % PALETTES.length];
  let diamonds = "";
  for (let i = 0; i < 24; i++)
    diamonds += `<path d="M${70 + i * 46} 430 l10 10 -10 10 -10 -10 Z" fill="${accent}" fill-opacity=".5"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="480" viewBox="0 0 1200 480">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${bg}"/><stop offset="1" stop-color="${accent}" stop-opacity=".25"/>
  </linearGradient></defs>
  <rect width="1200" height="480" fill="url(#g)"/>
  <circle cx="1020" cy="90" r="210" fill="#ffffff" fill-opacity=".25"/>
  <circle cx="1120" cy="360" r="140" fill="${accent}" fill-opacity=".12"/>
  ${diamonds}
</svg>`;
}

function collectionBannerSvg(col) {
  const [bg, ink, accent] = PALETTES[hash(col.id) % PALETTES.length];
  /* stacked book spines as a decorative motif */
  const spines = [80, 140, 200, 260, 320, 380, 440, 500, 560, 620, 680, 740, 800, 860, 920, 980, 1040, 1100];
  const books = spines.map((x, i) => {
    const w = 28 + (i % 3) * 12;
    const h = 180 + (i % 5) * 40;
    const op = 0.12 + (i % 4) * 0.06;
    return `<rect x="${x}" y="${480 - h}" width="${w}" height="${h}" rx="3" fill="${accent}" fill-opacity="${op.toFixed(2)}"/>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="480" viewBox="0 0 1200 480">
  <defs><linearGradient id="g" x1="0" y1="1" x2="1" y2="0">
    <stop offset="0" stop-color="${bg}"/><stop offset="1" stop-color="${ink}" stop-opacity=".15"/>
  </linearGradient></defs>
  <rect width="1200" height="480" fill="url(#g)"/>
  ${books}
  <circle cx="160" cy="140" r="260" fill="#ffffff" fill-opacity=".08"/>
</svg>`;
}

function libraryBannerSvg(lib) {
  const accent = lib.accent ?? "#555";
  /* horizontal lines + geometric shapes using library accent */
  let lines = "";
  for (let i = 0; i < 18; i++)
    lines += `<line x1="0" y1="${40 + i * 24}" x2="1200" y2="${40 + i * 24}" stroke="${accent}" stroke-opacity="${i % 3 === 0 ? ".18" : ".07"}" stroke-width="1"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="480" viewBox="0 0 1200 480">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${accent}" stop-opacity=".22"/>
      <stop offset="1" stop-color="${accent}" stop-opacity=".04"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="480" fill="#f7f0e0"/>
  <rect width="1200" height="480" fill="url(#g)"/>
  ${lines}
  <circle cx="1050" cy="100" r="280" fill="${accent}" fill-opacity=".09"/>
  <circle cx="950"  cy="380" r="160" fill="${accent}" fill-opacity=".06"/>
  <rect x="0" y="0" width="8" height="480" fill="${accent}" fill-opacity=".5"/>
</svg>`;
}

/* ------------------------------------------------------------------ */
/* main                                                                */
/* ------------------------------------------------------------------ */
const BANNER_EXTS = [".jpg", ".jpeg", ".png", ".webp"];
const LOGO_EXTS = [".svg", ".png", ".jpg", ".webp"];
const warnings = [];
const fail = (m) => {
  console.error("BUILD FAILED:", m);
  process.exit(1);
};

/* --- load the Library roots into the in-memory catalog shape ---
   id-first-wins: the first root owning an epoch/collection/author/book id is
   the record source; later roots only append still-unknown ids. Every book
   keeps its `_dir` so assets resolve from the root that actually hosts it. */
if (!LIBRARIES.length)
  fail(`no content library found — create "Library/" beside Website/ or set LEXOSHQIP_LIBRARY to a list of roots`);

const readJson = (p, what) => {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (e) {
    fail(`${what}: invalid JSON (${p}): ${e.message}`);
  }
};

/* --- read per-library metadata (library.json) --- */
const libraryMetaMap = new Map(); // root → {id, name, description, accent}
for (const root of LIBRARIES) {
  const libFile = path.join(root, "library.json");
  if (fs.existsSync(libFile)) {
    const m = readJson(libFile, "library.json");
    libraryMetaMap.set(root, {
      id: m.id ?? path.basename(root).toLowerCase(),
      name: m.name ?? path.basename(root),
      description: m.description ?? "",
      accent: m.accent ?? "#555",
      maintainer: m.maintainer,
      website: m.website,
      policy: m.policy,
      contact: m.contact,
      links: m.links,
    });
  } else {
    const folder = path.basename(root);
    libraryMetaMap.set(root, {
      id: folder.toLowerCase().replace(/library$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || folder.toLowerCase(),
      name: folder,
      description: "",
      accent: "#555",
    });
  }
}

const catalog = { epochs: [], collections: [], authors: [], books: [] };
const seenEpoch = new Set();
const seenCollection = new Set();
const seenAuthor = new Set();
const seenBook = new Set();

for (const root of LIBRARIES) {
  const catalogFile = path.join(root, "catalog.json");
  const hasCatalog = fs.existsSync(catalogFile);

  if (hasCatalog) {
    /* catalog.json mode — single file with all data (S3-optimized) */
    const libCatalog = readJson(catalogFile, "catalog.json");
    for (const e of libCatalog.epochs ?? []) {
      if (seenEpoch.has(e.id)) continue;
      seenEpoch.add(e.id);
      catalog.epochs.push(e);
    }
    for (const c of libCatalog.collections ?? []) {
      if (seenCollection.has(c.id)) continue;
      seenCollection.add(c.id);
      catalog.collections.push(c);
    }
    for (const a of libCatalog.authors ?? []) {
      if (!seenAuthor.has(a.id)) {
        seenAuthor.add(a.id);
        catalog.authors.push({ ...a, _dir: path.join(root, "authors", a.id), _libraryId: libraryMetaMap.get(root)?.id });
      }
      const booksDir = path.join(root, "authors", a.id, "books");
      for (const b of a.books ?? []) {
        const bid = b.id?.includes("--") ? b.id.split("--")[1] : b.id;
        const key = `${a.id}/${bid}`;
        if (seenBook.has(key)) continue;
        seenBook.add(key);
        const meta = { ...b, id: `${a.id}--${bid}`, authorId: a.id, _dir: path.join(root, "authors", a.id, "books", bid), _libraryId: libraryMetaMap.get(root)?.id };
        meta.rightsStatus = meta.rights?.verification === "pending" ? "pending" : "verified";
        catalog.books.push(meta);
      }
    }
  } else {
    /* Traditional mode — individual JSON files */
    const epochsFile = path.join(root, "epochs.json");
    for (const e of fs.existsSync(epochsFile) ? readJson(epochsFile, "epochs.json") : []) {
      if (seenEpoch.has(e.id)) continue;
      seenEpoch.add(e.id);
      catalog.epochs.push(e);
    }

    const collectionsFile = path.join(root, "collections.json");
    for (const c of fs.existsSync(collectionsFile) ? readJson(collectionsFile, "collections.json") : []) {
      if (seenCollection.has(c.id)) continue;
      seenCollection.add(c.id);
      catalog.collections.push(c);
    }

    const authorsRoot = path.join(root, "authors");
    if (!fs.existsSync(authorsRoot)) continue;
    for (const aid of fs.readdirSync(authorsRoot).sort()) {
      const adir = path.join(authorsRoot, aid);
      if (aid.startsWith(".") || !fs.statSync(adir).isDirectory()) continue;
      if (!fs.existsSync(path.join(adir, "author.json")))
        fail(`author folder "${aid}" is missing author.json`);
      /* author record comes from the first root that has it; its photo too */
      if (!seenAuthor.has(aid)) {
      seenAuthor.add(aid);
      catalog.authors.push({ ...readJson(path.join(adir, "author.json"), `authors/${aid}`), id: aid, _dir: adir, _libraryId: libraryMetaMap.get(root)?.id });
    }

    /* books are merged independently so later roots can add new titles to an
       already-known author (e.g. a personal pick by Migjeni) */
    const booksDir = path.join(adir, "books");
    if (!fs.existsSync(booksDir)) continue;
    for (const bid of fs.readdirSync(booksDir).sort()) {
      const bdir = path.join(booksDir, bid);
      if (bid.startsWith(".") || !fs.statSync(bdir).isDirectory()) continue;
      if (!fs.existsSync(path.join(bdir, "book.json")))
        fail(`book folder "${aid}/books/${bid}" is missing book.json`);
      const key = `${aid}/${bid}`;
      if (seenBook.has(key)) continue;
      seenBook.add(key);
      const meta = readJson(path.join(bdir, "book.json"), `authors/${aid}/books/${bid}`);
      /* legacy field → derived from tiered rights */
      meta.rightsStatus = meta.rights?.verification === "pending" ? "pending" : "verified";
      catalog.books.push({ ...meta, id: `${aid}--${bid}`, authorId: aid, _dir: bdir, _libraryId: libraryMetaMap.get(root)?.id });
    }
    }
  }
}

console.log(`library: ${LIBRARIES.map((p) => path.relative(WORKSPACE, p)).join(", ")} → ${catalog.authors.length} authors, ${catalog.books.length} books`);

/* --- validation --- */
const seenIds = new Set();
for (const key of ["epochs", "authors", "books"]) {
  for (const item of catalog[key]) {
    if (seenIds.has(item.id)) fail(`${key}: duplicate id "${item.id}"`);
    seenIds.add(item.id);
  }
  seenIds.clear();
}
const epochIds = new Set(catalog.epochs.map((e) => e.id));
const authorIds = new Set(catalog.authors.map((a) => a.id));
const collectionIds = new Set((catalog.collections ?? []).map((k) => k.id));

for (const a of catalog.authors) {
  const foreign = a.kind === "foreign";
  if (!foreign && !a.epochId && !(a.epochIds ?? []).length)
    fail(`author "${a.id}": missing epochId`);
  const epochList = [a.epochId, ...(a.epochIds ?? [])].filter(Boolean);
  for (const eid of epochList)
    if (!epochIds.has(eid)) fail(`author "${a.id}": unknown epochId "${eid}"`);
  if (!a.wikipedia?.startsWith("https://")) warnings.push(`author "${a.id}": missing wikipedia link`);
  for (const l of a.links ?? [])
    if (!l.label?.trim() || !/^https?:\/\//.test(l.url ?? ""))
      fail(`author "${a.id}": every links[] entry needs "label" and an http(s) "url"`);
  if (a.altNames !== undefined && (!Array.isArray(a.altNames) || a.altNames.some((n) => typeof n !== "string" || !n.trim())))
    fail(`author "${a.id}": altNames must be an array of non-empty strings`);
  for (const k of ["bornPlace", "diedPlace", "portraitCredit"])
    if (a[k] !== undefined && typeof a[k] !== "string")
      fail(`author "${a.id}": "${k}" must be a string`);
}
for (const b of catalog.books) {
  if (!authorIds.has(b.authorId)) fail(`book "${b.id}": unknown authorId`);
  if (b.epochId && !epochIds.has(b.epochId)) fail(`book "${b.id}": unknown epochId "${b.epochId}"`);
  if (!b.epochId && !(b.collectionIds ?? []).length)
    fail(`book "${b.id}": needs an epochId or at least one collectionId`);
  for (const col of b.collectionIds ?? [])
    if (!collectionIds.has(col)) fail(`book "${b.id}": unknown collectionId "${col}"`);
  if (![null, undefined, "main", "emerging"].includes(b.channel))
    fail(`book "${b.id}": channel must be "main" or "emerging"`);
  if (!["full", "trial"].includes(b.accessType)) fail(`book "${b.id}": bad accessType`);
  if (!["verified", "pending"].includes(b.rightsStatus)) fail(`book "${b.id}": bad rightsStatus`);

  /* tiered rights validation */
  const r = b.rights ?? {};
  if (!LICENSES[r.license])
    fail(`book "${b.id}": rights.license must be one of: ${Object.keys(LICENSES).join(", ")}`);
  if (!VERIFICATIONS[r.verification])
    fail(`book "${b.id}": rights.verification must be one of: ${Object.keys(VERIFICATIONS).join(", ")}`);
  for (const s of r.sources ?? [])
    if (!s.name?.trim() || !s.url?.startsWith("http"))
      fail(`book "${b.id}": every rights.sources entry needs "name" and an http(s) "url"`);
  if (b.altTitles !== undefined && (!Array.isArray(b.altTitles) || b.altTitles.some((t) => typeof t !== "string" || !t.trim())))
    fail(`book "${b.id}": altTitles must be an array of non-empty strings`);
  for (const k of ["subtitle", "originalTitle", "originalLanguage", "language", "isbn", "ageGroup", "coverCredit", "narrator"])
    if (b[k] !== undefined && typeof b[k] !== "string")
      fail(`book "${b.id}": "${k}" must be a string`);
}

const pending = catalog.books.filter(
  (b) => b.rightsStatus !== "verified" && b.availability !== "metadata-only"
);
/* Bibliographic facts (title/author/year) are publishable even when the TEXT
   still awaits legal verification — hence metadata-only pending books appear. */
const verifiedBooks = catalog.books.filter(
  (b) => b.rightsStatus === "verified" || b.availability === "metadata-only"
);
for (const b of pending) warnings.push(`excluded (rightsStatus=${b.rightsStatus}, has text): "${b.id}"`);

const s3LibraryIds = new Set();
const proxyS3ByLibId = new Map();
for (const [root, s3] of S3_CONFIGS.entries()) {
  const meta = libraryMetaMap.get(root);
  if (meta) {
    s3LibraryIds.add(meta.id);
    if (s3.proxy) proxyS3ByLibId.set(meta.id, s3);
  }
}

/* Live R2 object index: bookId → content files as they actually exist in the
   bucket. This is what S3-proxy URLs are derived from, so the build works in
   Cloudflare CI where the library repos aren't available. */
const s3ContentIndex = new Map();
for (const [root, s3] of S3_CONFIGS.entries()) {
  const meta = libraryMetaMap.get(root);
  if (!meta || !s3.proxy) continue;
  if (!s3) continue;
  const objectsFile = path.join(root, "objects.json");
  if (!fs.existsSync(objectsFile)) continue;
  let keys = [];
  try { keys = JSON.parse(fs.readFileSync(objectsFile, "utf8")); } catch { continue; }
  for (const key of keys) {
    const m = key.match(/^authors\/([^/]+)\/books\/([^/]+)\/(.+)$/);
    if (!m) continue;
    const bookId = `${m[1]}--${m[2]}`;
    let entry = s3ContentIndex.get(bookId);
    if (!entry) { entry = { bucket: s3.bucket, bucketName: meta.id, files: [] }; s3ContentIndex.set(bookId, entry); }
    entry.files.push(m[3]);
  }
}
for (const entry of s3ContentIndex.values()) entry.files.sort();

for (const b of verifiedBooks) {
  const bdir = b._dir;
  if (b.availability === "metadata-only") continue;
  if (s3LibraryIds.has(b._libraryId)) continue; // S3 content served at runtime
  /* scan-first workflow: a full-text master is only required when nothing
     else provides content (book.epub/pdf/mp3 or explicit files[]) */
  const textFile = path.join(bdir, b.accessType === "trial" ? "excerpt.md" : "text.md");
  if (!fs.existsSync(textFile)) {
    const hasPremade =
      ["epub", "pdf", "mp3"].some((ext) => fs.existsSync(path.join(bdir, `book.${ext}`))) ||
      (b.files ?? []).length > 0;
    if (!hasPremade)
      fail(`book "${b.id}": no content — expected ${path.relative(bdir, textFile)} (or book.epub/pdf/mp3, files[])`);
  }
}

/* --- reset output dirs --- */
fs.rmSync(API_OUT, { recursive: true, force: true });
fs.rmSync(CONTENT_OUT, { recursive: true, force: true });
fs.mkdirSync(API_OUT, { recursive: true });
fs.mkdirSync(CONTENT_OUT, { recursive: true });

/* --- libraries --- */
const libBookCount = new Map();
const libAuthorCount = new Map();
for (const b of verifiedBooks) {
  if (b._libraryId) libBookCount.set(b._libraryId, (libBookCount.get(b._libraryId) ?? 0) + 1);
}
for (const a of catalog.authors) {
  if (a._libraryId) libAuthorCount.set(a._libraryId, (libAuthorCount.get(a._libraryId) ?? 0) + 1);
}
fs.mkdirSync(path.join(CONTENT_OUT, "libraries"), { recursive: true });
const librariesList = LIBRARIES.map((root) => {
  const m = libraryMetaMap.get(root);
  /* copy logo if present */
  let logoUrl = null;
  const realLogo = LOGO_EXTS.map((ext) => path.join(root, `logo${ext}`)).find((p) => fs.existsSync(p));
  if (realLogo) {
    const ext = path.extname(realLogo).toLowerCase();
    fs.copyFileSync(realLogo, path.join(CONTENT_OUT, "libraries", `${m.id}${ext}`));
    logoUrl = `/content/libraries/${m.id}${ext}`;
  }
  /* copy or generate banner */
  let bannerUrl = null;
  const realBanner = BANNER_EXTS.concat([".svg"]).map((ext) => path.join(root, `banner${ext}`)).find((p) => fs.existsSync(p));
  if (realBanner) {
    const ext = path.extname(realBanner).toLowerCase();
    fs.copyFileSync(realBanner, path.join(CONTENT_OUT, "libraries", `${m.id}-banner${ext}`));
    bannerUrl = `/content/libraries/${m.id}-banner${ext}`;
  } else {
    fs.writeFileSync(path.join(CONTENT_OUT, "libraries", `${m.id}-banner.svg`), libraryBannerSvg(m));
    bannerUrl = `/content/libraries/${m.id}-banner.svg`;
  }
  return {
    id: m.id,
    name: m.name,
    description: m.description,
    accent: m.accent,
    ...(m.brandColor ? { brandColor: m.brandColor } : {}),
    ...(logoUrl ? { logoUrl } : {}),
    bannerUrl,
    ...(m.maintainer ? { maintainer: m.maintainer } : {}),
    ...(m.website ? { website: m.website } : {}),
    ...(m.policy ? { policy: m.policy } : {}),
    ...(m.contact ? { contact: m.contact } : {}),
    ...(m.links?.length ? { links: m.links } : {}),
    bookCount: libBookCount.get(m.id) ?? 0,
    authorCount: libAuthorCount.get(m.id) ?? 0,
    ...((() => {
      const s3 = S3_CONFIGS.get(root);
      return s3?.proxy ? { s3Proxy: { bucket: s3.bucket, prefix: "/api/s3-proxy" } } : {};
    })()),
  };
});
fs.writeFileSync(
  path.join(API_OUT, "libraries.json"),
  JSON.stringify({ items: librariesList }, null, 2)
);
const libraryById = new Map(librariesList.map((l) => [l.id, l]));

/* --- collections --- */
const collectionCoverImages = new Map();
{
  const dir = path.join(CONTENT_OUT, "collections");
  fs.mkdirSync(dir, { recursive: true });
  for (const col of catalog.collections ?? []) {
    const real = BANNER_EXTS.map((ext) =>
      LIBRARIES.map((root) => path.join(root, "banners", `collection-${col.id}${ext}`)).find((p) => fs.existsSync(p))
    ).find(Boolean);
    if (real) {
      const destExt = path.extname(real).toLowerCase();
      fs.copyFileSync(real, path.join(dir, `${col.id}${destExt}`));
      collectionCoverImages.set(col.id, `/content/collections/${col.id}${destExt}`);
    } else {
      fs.writeFileSync(path.join(dir, `${col.id}.svg`), collectionBannerSvg(col));
      collectionCoverImages.set(col.id, `/content/collections/${col.id}.svg`);
    }
  }
}
fs.writeFileSync(
  path.join(API_OUT, "collections.json"),
  JSON.stringify({
    items: (catalog.collections ?? []).map((c) => ({
      ...c,
      coverImage: collectionCoverImages.get(c.id),
    })),
  }, null, 2)
);

/* --- emit epochs --- */
const epochCoverImages = new Map();
for (const e of catalog.epochs) {
  const dir = path.join(CONTENT_OUT, "epochs");
  fs.mkdirSync(dir, { recursive: true });
  const real = BANNER_EXTS.map((ext) => LIBRARIES.map((root) => path.join(root, "banners", e.id + ext)).find((p) => fs.existsSync(p))).find(Boolean);
  if (real) {
    const destExt = path.extname(real).toLowerCase();
    fs.copyFileSync(real, path.join(CONTENT_OUT, "epochs", e.id + destExt));
    epochCoverImages.set(e.id, `/content/epochs/${e.id}${destExt}`);
  } else {
    fs.writeFileSync(path.join(dir, `${e.id}.svg`), bannerSvg(e));
    epochCoverImages.set(e.id, `/content/epochs/${e.id}.svg`);
  }
}
fs.writeFileSync(
  path.join(API_OUT, "epochs.json"),
  JSON.stringify({
    items: catalog.epochs.map((e) => ({
      ...e,
      coverImage: epochCoverImages.get(e.id),
    })),
  }, null, 2)
);

/* --- emit authors --- */
const PHOTO_EXTS = [".jpg", ".jpeg", ".png", ".webp"];
const authorPortrait = new Map();
for (const a of catalog.authors) {
  const real = PHOTO_EXTS.map((ext) => path.join(a._dir, `photo${ext}`)).find((p) =>
    fs.existsSync(p)
  );
  if (real) {
    fs.mkdirSync(path.join(CONTENT_OUT, "authors"), { recursive: true });
    const destExt = path.extname(real).toLowerCase();
    fs.copyFileSync(real, path.join(CONTENT_OUT, "authors", a.id + destExt));
    authorPortrait.set(a.id, `/content/authors/${a.id}${destExt}`);
  } else {
    fs.mkdirSync(path.join(CONTENT_OUT, "authors"), { recursive: true });
    fs.writeFileSync(
      path.join(CONTENT_OUT, "authors", `${a.id}.svg`),
      portraitSvg(a.name)
    );
    authorPortrait.set(a.id, `/content/authors/${a.id}.svg`);
  }
}
const bookIdsByAuthor = new Map();
for (const b of verifiedBooks) {
  const arr = bookIdsByAuthor.get(b.authorId) ?? [];
  arr.push(b.id);
  bookIdsByAuthor.set(b.authorId, arr);
}
fs.mkdirSync(path.join(API_OUT, "authors"), { recursive: true });
fs.writeFileSync(
  path.join(API_OUT, "authors", "index.json"),
  JSON.stringify({
    items: catalog.authors.map((a) => ({
      id: a.id,
      name: a.name,
      dates: a.dates,
      epochId: a.epochId ?? null,
      kind: a.kind ?? "albanian",
      isFeatured: !!a.isFeatured,
      portrait: authorPortrait.get(a.id),
      bookCount: (bookIdsByAuthor.get(a.id) ?? []).length,
      libraryId: a._libraryId ?? null,
      ...(a.epochIds?.length ? { epochIds: a.epochIds } : {}),
      ...(a.links?.length ? { links: a.links } : {}),
      ...(a.altNames?.length ? { altNames: a.altNames } : {}),
      ...(a.bornPlace ? { bornPlace: a.bornPlace } : {}),
      ...(a.diedPlace ? { diedPlace: a.diedPlace } : {}),
    })),
  }, null, 2)
);

/* --- emit books (assets, editions, api files) --- */
fs.mkdirSync(path.join(API_OUT, "books"), { recursive: true });
const authorById = new Map(catalog.authors.map((a) => [a.id, a]));
const relatedCache = new Map();

/**
 * Publishes one audiobook from a self-contained zip: extracts audio entries
 * (sorted by filename) into content/books/<bookId>/audio-<id>/, emits the
 * chapters manifest, copies the source zip through unchanged, and returns an
 * edition record (or null with a console warning).
 *
 * Chapter metadata lives INSIDE the zip: an optional chapters.json entry
 * ([{file,title,duration}]) matched by entry name or basename; missing
 * fields fall back to the filename / zero duration.
 */
function publishAudiobookZip({
  zipPath, publishName, bdir, bookId, suggestedId,
  label, uniqueEid,
}) {
  try {
    const adm = new AdmZip(zipPath);
    const entries = adm.getEntries()
      .filter((e) => !e.isDirectory && /\.(mp3|m4a|wav)$/i.test(e.entryName))
      .sort((a, b) => a.entryName.localeCompare(b.entryName, undefined, { numeric: true }));
    if (!entries.length) {
      console.log(`  ⚠ ${bookId}: "${publishName}" contains no audio files — skipped`);
      return null;
    }

    const id = uniqueEid(suggestedId);

    /* chapters.json inside the zip (per-version metadata) */
    const chEntry = adm.getEntries().find(
      (e) => !e.isDirectory && path.basename(e.entryName).toLowerCase() === "chapters.json"
    );
    let meta = {};
    if (chEntry) {
      try {
        for (const m of JSON.parse(chEntry.getData().toString("utf8"))) {
          if (m?.file) {
            meta[m.file] = m;
            meta[path.basename(m.file)] = m;
          }
        }
      } catch {
        console.log(`  ⚠ ${bookId}: "${publishName}" has an invalid chapters.json — falling back to filenames`);
      }
    }
    const lookupMeta = (entryName) =>
      meta[entryName] ??
      meta[path.basename(entryName)] ??
      meta[path.basename(entryName).replace(/\.[a-z0-9]+$/i, "")];

    const destAudio = path.join(bdir, `audio-${id}`);
    fs.mkdirSync(destAudio, { recursive: true });
    const audioFiles = entries.map((e) => {
      const base = path.basename(e.entryName);
      fs.writeFileSync(path.join(destAudio, base), e.getData());
      const m = lookupMeta(e.entryName);
      return {
        file: `/content/books/${bookId}/audio-${id}/${encodeURIComponent(base)}`,
        title: m?.title ?? base.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " "),
        duration: m?.duration ?? 0,
      };
    });

    fs.copyFileSync(zipPath, path.join(bdir, publishName));

    return {
      id,
      format: "audio",
      label: label ?? id.replace(/-/g, " "),
      url: audioFiles[0].file,
      audioChapters: JSON.stringify(audioFiles),
      audioZip: `/content/books/${bookId}/${encodeURIComponent(publishName)}`,
    };
  } catch (err) {
    console.log(`  ⚠ ${bookId}: audiobook "${publishName}" failed: ${err.message}`);
    return null;
  }
}
const coverFiles = new Map(); // bookId → cover filename
const textStats = new Map(); //  bookId → { wordCount, readingMinutes }
const audioFlags = new Map(); // bookId → true when a streamable audiobook exists

function computeRelated(book) {
  const byYear = (x, y) => x.publicationYear - y.publicationYear || x.id.localeCompare(y.id);
  const sameAuthor = verifiedBooks
    .filter((b) => b.authorId === book.authorId && b.id !== book.id)
    .sort(byYear)
    .map((b) => b.id);
  const sameEpoch = verifiedBooks
    .filter((b) => b.epochId === book.epochId && b.authorId !== book.authorId)
    .sort(byYear)
    .map((b) => b.id);
  return [...new Set([...sameAuthor, ...sameEpoch])].slice(0, 6);
}

/* --- placeholder WAV for audio editions (curators replace with real recordings) --- */
function makeWav(seconds = 40) {
  const rate = 8000, n = rate * seconds;
  const data = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    const env = Math.min(1, t * 2, (seconds - t) * 2);
    const s = Math.round(Math.sin(2 * Math.PI * 220 * t) * 6000 * Math.max(env, 0));
    data.writeInt16LE(s, i * 2);
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0); header.writeUInt32LE(36 + data.length, 4); header.write("WAVE", 8);
  header.write("fmt ", 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22); header.writeUInt32LE(rate, 24); header.writeUInt32LE(rate * 2, 28);
  header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34);
  header.write("data", 36); header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

/* Build S3 proxy lookup: libraryId → s3 config (for S3-aware book processing) */

for (const book of verifiedBooks) {
  const author = authorById.get(book.authorId);
  const bdir = path.join(CONTENT_OUT, "books", book.id);
  const srcDir = book._dir; /* Library/authors/<aid>/books/<bid>/ */
  fs.mkdirSync(bdir, { recursive: true });

  const isS3Proxy = proxyS3ByLibId.has(book._libraryId);

  /* covers — use uploaded image if present, else generate SVG */
    const COVER_EXTS = [".png", ".jpg", ".jpeg", ".webp"];
    let coverFile = "cover.svg";

    /* For S3-backed books, _dir points to cache — covers are already there */
    const realCover = COVER_EXTS
      .map((ext) => path.join(srcDir, `cover${ext}`))
      .find((p) => fs.existsSync(p));

    if (realCover) {
      const destExt = path.extname(realCover).toLowerCase();
      fs.copyFileSync(realCover, path.join(bdir, `cover${destExt}`));
      coverFile = `cover${destExt}`;
    } else if (!isS3Proxy) {
      fs.writeFileSync(path.join(bdir, "cover.svg"), coverSvg(book, author.name));
    } else {
      /* S3 book with no cover image — generate fallback SVG */
      fs.writeFileSync(path.join(bdir, "cover.svg"), coverSvg(book, author.name));
    }

  const isMetadataOnly = book.availability === "metadata-only";
  const formats = {};

  if (isMetadataOnly) {
    /* bibliographic record only — no master text yet */
  } else {
    /* text source — plain conventions inside the book folder:
       text.md (full) / excerpt.md (trial fragment).
       Scan-first books may ship only pre-made binaries instead. */
    const isTrial = book.accessType === "trial";
    const masterRel = isTrial ? "excerpt.md" : "text.md";
    let md = null;
    {
      const masterAbs = path.join(srcDir, masterRel);
      if (fs.existsSync(masterAbs)) md = fs.readFileSync(masterAbs, "utf8");
    }

    if (md != null) {
      /* derived reading stats (~200 words/min) — zero curation burden */
      const wordCount = md.replace(/[#>*`_[\]()]/g, " ").split(/\s+/).filter(Boolean).length;
      textStats.set(book.id, { wordCount, readingMinutes: Math.max(1, Math.round(wordCount / 200)) });
      const stem = isTrial ? "excerpt" : "text";
      fs.writeFileSync(path.join(bdir, `${stem}.md`), md);

      formats.md = `/content/books/${book.id}/${stem}.md`;
    }

    /* ── curated binary formats: no declarations needed, no auto-conversion.
          Book.epub / book.pdf / book.mp3 present in the source folder are
          published as-is (book.epub wins over book.md as a preferred reading
          format; if absent, the .md is the only text edition). Audio comes
          from an audio/chapters.json manifest (chaptered audiobook) or a
          single book.mp3. Additional versions: book_<id>.<ext> files,
          audio_<id>/ dirs, or explicit files[] entries. ── */

    const audioDir = path.join(srcDir, "audio");
    const audioChaptersFile = path.join(audioDir, "chapters.json");
    if (fs.existsSync(audioChaptersFile)) {
      const chapterList = JSON.parse(fs.readFileSync(audioChaptersFile, "utf8"));
      /* quality gate: chapter names & durations are what listeners see */
      const noTitle = chapterList.filter((c) => !String(c.title ?? "").trim()).length;
      const noDur = chapterList.filter((c) => !Number(c.duration)).length;
      if (noTitle) warnings.push(`book "${book.id}": ${noTitle}/${chapterList.length} chapters missing "title" in audio/chapters.json`);
      if (noDur) warnings.push(`book "${book.id}": ${noDur}/${chapterList.length} chapters missing "duration" in audio/chapters.json`);
      const audioFiles = [];
      fs.mkdirSync(path.join(bdir, "audio"), { recursive: true });

      for (const ch of chapterList) {
        const src = path.join(audioDir, ch.file);
        if (!fs.existsSync(src)) continue;
        fs.copyFileSync(src, path.join(bdir, "audio", ch.file));
        audioFiles.push({
          file: `/content/books/${book.id}/audio/${ch.file}`,
          title: ch.title ?? "",
          duration: ch.duration ?? 0,
        });
      }

      formats.audio = audioFiles[0]?.file ?? "";
      formats.audioZip = `/content/books/${book.id}/audiobook.zip`;
      formats.audioChapters = JSON.stringify(audioFiles);

      // zip all mp3s (+ manifest & cover so the archive is self-describing)
      const zip = new AdmZip();
      for (const ch of chapterList) {
        const src = path.join(audioDir, ch.file);
        if (fs.existsSync(src)) zip.addLocalFile(src, "", ch.file);
      }
      zip.addFile("chapters.json", Buffer.from(JSON.stringify(chapterList, null, 2)));
      if (!/^\.svg$/i.test(path.extname(coverFile)))
        zip.addLocalFile(path.join(bdir, coverFile), "", coverFile);
      fs.writeFileSync(path.join(bdir, "audiobook.zip"), zip.toBuffer());

      /* optional single-file M4B export — needs ffmpeg on the build machine;
         skipped gracefully (with a warning) when unavailable. */
      try {
        execFileSync(
          path.join(ROOT, "..", "Tools", "createM4bAudiobook.sh"),
          [audioDir,
           "--title", book.title, "--author", author.name,
           ...(book.narrator ? ["--narrator", book.narrator] : []),
           ...(book.publicationYear ? ["--year", String(book.publicationYear)] : []),
           ...(book.synopsis ? ["--description", String(book.synopsis).slice(0, 500)] : []),
           "--cover", path.join(bdir, coverFile),
           path.join(bdir, "audiobook.m4b")],
          { stdio: "pipe" }
        );
        console.log(`  ♫ ${book.id}: M4B export created`);
      } catch (e) {
        console.log(`  ⚠ ${book.id}: M4B export skipped (${String(e.message).split("\n")[0]})`);
      }
    } else if (fs.existsSync(path.join(srcDir, "book.mp3"))) {
      const name = isTrial ? "file-excerpt.mp3" : "book.mp3";
      fs.copyFileSync(path.join(srcDir, "book.mp3"), path.join(bdir, name));
      formats.audio = `/content/books/${book.id}/${name}`;
    }

    /* curated epub/pdf artifacts (book.epub / book.pdf / book_vol*.pdf) — published as-is */
    for (const ed of ["pdf", "epub"]) {
      const uploadedPath = path.join(srcDir, `book.${ed}`);
      if (fs.existsSync(uploadedPath)) {
        const name = isTrial ? `file-excerpt.${ed}` : `book.${ed}`;
        fs.copyFileSync(uploadedPath, path.join(bdir, name));
        formats[ed] = `/content/books/${book.id}/${name}`;
      } else if (ed === "pdf") {
        /* Multi-volume: book_vol1.pdf, book_vol2.pdf, etc. */
        /* Search both cache dir and local library repos */
        const bid = book.id?.split("--")[1];
        const searchDirs = [srcDir];
        for (const lp of LOCAL_LIB_PATHS) {
          const localBookDir = path.join(lp, "authors", book.authorId, "books", bid);
          if (fs.existsSync(localBookDir) && localBookDir !== srcDir) {
            searchDirs.push(localBookDir);
          }
        }
        let volFiles = [];
        let volSrcDir = srcDir;
        for (const d of searchDirs) {
          if (!fs.existsSync(d)) continue;
          const found = fs.readdirSync(d).filter((f) => /^book_vol\d+\.pdf$/i.test(f));
          if (found.length > volFiles.length) { volFiles = found; volSrcDir = d; }
        }
        volFiles.sort();
        if (volFiles.length > 0) {
          const volumes = [];
          for (let i = 0; i < volFiles.length; i++) {
            const vname = volFiles[i]; /* keep original name (book_vol1.pdf) so the S3 key matches R2 */
            fs.copyFileSync(path.join(volSrcDir, volFiles[i]), path.join(bdir, vname));
            volumes.push({
              id: `vol${i + 1}`,
              label: `Volumi ${i + 1}`,
              url: `/content/books/${book.id}/${vname}`,
            });
          }
          formats.volumes = volumes;
        }
      }
    }

  }

  /* ── variant editions, opt-in by filename convention:
        text/binary:  book.<id>.<ext>   or book_<id>.<ext>   (epub|pdf|md)
        audio:        audio.<id>/       or audio_<id>/       (dir with chapters.json)
     Anything else in the book folder (raw downloads etc.) is ignored. ── */
  const variantRe = /^book[._]([a-z0-9][a-z0-9-]*)\.(epub|pdf|md)$/i;
  const audioVariantRe = /^audio[._]([a-z0-9][a-z0-9-]*)$/i;
  const RESERVED_IDS = new Set(["master", "trial"]);
  const editionsOut = [];
  const publishedSrc = new Set();
  const variantSrcDir = srcDir;
  const corpusEntries = fs.existsSync(variantSrcDir) ? fs.readdirSync(variantSrcDir) : [];

  /* alternate audiobooks first (directories) */
  for (const dname of corpusEntries) {
    const am = audioVariantRe.exec(dname);
    if (!am || RESERVED_IDS.has(am[1].toLowerCase())) continue;
    const srcAudioDir = path.join(variantSrcDir, dname);
    const chFile = path.join(srcAudioDir, "chapters.json");
    if (!fs.statSync(srcAudioDir).isDirectory() || !fs.existsSync(chFile)) continue;

    const chapterList = JSON.parse(fs.readFileSync(chFile, "utf8"));
    const destAudio = path.join(bdir, `audio-${am[1].toLowerCase()}`);
    fs.mkdirSync(destAudio, { recursive: true });
    const audioFiles = [];
    for (const ch of chapterList) {
      const src = path.join(srcAudioDir, ch.file);
      if (!fs.existsSync(src)) continue;
      fs.copyFileSync(src, path.join(destAudio, ch.file));
      audioFiles.push({
        file: `/content/books/${book.id}/audio-${am[1].toLowerCase()}/${ch.file}`,
        title: ch.title ?? "",
        duration: ch.duration ?? 0,
      });
    }
    if (!audioFiles.length) continue;

    const zipName = `audiobook-${am[1].toLowerCase()}.zip`;
    const zip = new AdmZip();
    for (const ch of chapterList) {
      const src = path.join(srcAudioDir, ch.file);
      if (fs.existsSync(src)) zip.addLocalFile(src, "", ch.file);
    }
    fs.writeFileSync(path.join(bdir, zipName), zip.toBuffer());

    editionsOut.push({
      id: am[1].toLowerCase(),
      format: "audio",
      label: (book.variantLabels ?? {})[am[1]] ?? am[1].replace(/-/g, " "),
      url: audioFiles[0].file,
      audioChapters: JSON.stringify(audioFiles),
      audioZip: `/content/books/${book.id}/${zipName}`,
    });
  }

  /* text & binary variants (files) */
  const declaredFiles = new Set((book.files ?? []).map((f) => path.basename(f.path)));
  for (const fname of corpusEntries) {
    const m = variantRe.exec(fname);
    if (!m || RESERVED_IDS.has(m[1].toLowerCase()) || declaredFiles.has(fname)) continue;
    fs.copyFileSync(path.join(variantSrcDir, fname), path.join(bdir, fname));
    publishedSrc.add(fname);
    editionsOut.push({
      id: m[1].toLowerCase(),
      format: m[2].toLowerCase(),
      label:
        (book.variantLabels ?? {})[m[1]] ?? m[1].replace(/-/g, " "),
      url: `/content/books/${book.id}/${fname}`,
    });
  }

  /* ── audiobook zips: <any name>.audio.zip → one audiobook edition each ──
        chapters = audio files inside the zip, sorted by filename;
        optional sidecar "<name>.audio.chapters.json" supplies titles/durations
        (zips already declared in books[].files[] are skipped there) */
  const audioZipRe = /^(.+)\.audio\.zip$/i;
  const uniqueEid = (base) => {
    let id = base; let n = 2;
    while (editionsOut.some((e) => e.id === id)) id = `${base}-${n++}`;
    return id;
  };
  for (const fname of corpusEntries) {
    const zm = audioZipRe.exec(fname);
    if (!zm || declaredFiles.has(fname)) continue;
    const edition = publishAudiobookZip({
      zipPath: path.join(variantSrcDir, fname),
      publishName: fname,
      bdir,
      bookId: book.id,
      suggestedId: zm[1].toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "audio",
      label: null,
      uniqueEid,
    });
    if (edition) {
      /* canonical zip produced by Tools/buildAudiobooks.sh gets a clean label */
      if (zm[1].toLowerCase() === book.id.toLowerCase())
        edition.label = "Audiolib · arkivë e plotë (ZIP)";
      edition.label = (book.variantLabels ?? {})[edition.id] ?? edition.label;
      editionsOut.push(edition);
      publishedSrc.add(fname);
    }
  }

  /* ── pre-made M4B exports: <any name>.m4b → single-file audio edition
        (web only; apps filter edition id "m4b*") ── */
  for (const fname of corpusEntries) {
    if (!/\.m4b$/i.test(fname) || declaredFiles.has(fname)) continue;
    fs.copyFileSync(path.join(variantSrcDir, fname), path.join(bdir, fname));
    editionsOut.push({
      id: uniqueEid("m4b"),
      format: "audio",
      label: "M4B · gjithë libri në një skedar",
      url: `/content/books/${book.id}/${encodeURIComponent(fname)}`,
    });
    publishedSrc.add(fname);
  }

  /* ── book.json-declared versions: files[] — any filename, explicit ──
        { format: "epub|pdf|md|audio", path: "<file inside the book folder>",
          id?: "...", label?: "..." }  (audio path must be a *.zip) */
  for (const f of book.files ?? []) {
    const fmt = String(f.format ?? "").toLowerCase();
    if (!["epub", "pdf", "md", "audio"].includes(fmt)) {
      console.log(`  ⚠ ${book.id}: files[] entry has unknown format "${f.format}" — skipped`);
      continue;
    }
    const src = path.join(srcDir, f.path);
    if (!fs.existsSync(src)) {
      console.log(`  ⚠ ${book.id}: files[] path missing on disk: ${f.path} — skipped`);
      continue;
    }
    const baseNoExt = path.basename(f.path).replace(/\.[a-z0-9.]+$/i, "");
    const suggestedId = String(f.id ?? baseNoExt)
      .toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || fmt;

    if (fmt === "audio") {
      const edition = publishAudiobookZip({
        zipPath: src,
        publishName: path.basename(f.path),
        bdir,
        bookId: book.id,
        suggestedId,
        label: f.label ?? null,
        uniqueEid,
      });
      if (edition) {
        if (f.base) {
          /* base audiobook: populate formats.* so it renders as the primary row */
          const chapters = JSON.parse(edition.audioChapters);
          formats.audio = chapters[0]?.file ?? "";
          formats.audioZip = edition.audioZip;
          formats.audioChapters = edition.audioChapters;
        } else {
          editionsOut.push(edition);
        }
        publishedSrc.add(path.basename(f.path));
      }
      continue;
    }

    if (f.base) {
      /* base text/binary file: publish under its own name into formats.* */
      fs.copyFileSync(src, path.join(bdir, path.basename(f.path)));
      publishedSrc.add(path.basename(f.path));
      formats[fmt] = `/content/books/${book.id}/${encodeURIComponent(path.basename(f.path))}`;
      continue;
    }

    const vid = uniqueEid(suggestedId);
    const pubName = `${vid}.${fmt}`;
    fs.copyFileSync(src, path.join(bdir, pubName));
    publishedSrc.add(path.basename(f.path));
    editionsOut.push({
      id: vid,
      format: fmt,
      label: f.label ?? baseNoExt.replace(/-/g, " "),
      url: `/content/books/${book.id}/${encodeURIComponent(pubName)}`,
    });
  }

  /* single-file audiobook export (web download convenience; apps filter id "m4b*").
     Skipped when a pre-made *.m4b was already picked up above. */
  const hasM4bEdition = editionsOut.some((e) => e.format === "audio" && /^m4b/.test(e.id));
  if (!hasM4bEdition && formats.audioChapters && fs.existsSync(path.join(bdir, "audiobook.m4b"))) {
    editionsOut.push({
      id: uniqueEid("m4b"),
      format: "audio",
      label: "M4B · gjithë libri në një skedar",
      url: `/content/books/${book.id}/audiobook.m4b`,
    });
  }

  /* ── S3-backed formats: when binaries aren't available on disk (Cloudflare
        CI has no library repos), publish the formats the live R2 bucket lists. ── */
  if (isS3Proxy && !isMetadataOnly) {
    const idx = s3ContentIndex.get(book.id);
    if (idx) {
      const bid = book.id.split("--")[1];
      const vurl = (name) =>
        `/api/s3-proxy/${encodeURIComponent(idx.bucket)}/content/authors/${book.authorId}/books/${bid}/${name}`;
      const present = new Set(idx.files);
      if (!formats.pdf && present.has("book.pdf")) formats.pdf = vurl("book.pdf");
      if (!formats.epub && present.has("book.epub")) formats.epub = vurl("book.epub");
      if (!formats.audio && present.has("book.mp3")) formats.audio = vurl("book.mp3");
      if (!formats.audioZip && present.has("audiobook.zip")) formats.audioZip = vurl("audiobook.zip");
      const masterRel = book.accessType === "trial" ? "excerpt.md" : "text.md";
      if (!formats.md && present.has(masterRel)) formats.md = vurl(masterRel);
      const vols = idx.files.filter((f) => /^book_vol\d+\.(pdf|epub)$/i.test(f));
      if (vols.length && !formats.volumes) {
        formats.volumes = vols.map((f, i) => ({
          id: `vol${i + 1}`,
          label: `Volumi ${i + 1}`,
          url: vurl(f),
        }));
      }
      for (const f of book.files ?? []) {
        const bn = path.basename(f.path);
        if (!present.has(bn)) continue;
        const url = vurl(bn);
        if (f.format === "audio" && !formats.audio) formats.audio = url;
        else if (f.format === "audio-zip" && !formats.audioZip) formats.audioZip = url;
        else if (f.format === "epub" && !formats.epub) formats.epub = url;
        else if (f.format === "pdf" && !formats.pdf) formats.pdf = url;
        else if (f.format === "md" && !formats.md) formats.md = url;
      }
    }
  }

  /* ── hints: media files that exist but won't be published ── */
  const MEDIA_RE = /\.(md|epub|pdf|mp3)$/i;
  for (const fname of corpusEntries) {
    const fpath = path.join(variantSrcDir, fname);
    if (fs.statSync(fpath).isDirectory()) {
      if (/^audio/i.test(fname) && fname !== "audio" && !audioVariantRe.test(fname))
        console.log(
          `  ⚠ ${book.id}: folder "${fname}" looks like an audio variant — rename to audio_<id>/ (with chapters.json) to publish it`
        );
      continue;
    }
    if (publishedSrc.has(fname)) continue;
    if (/\.audio\.zip$/i.test(fname) || /\.audio\.chapters\.json$/i.test(fname)) continue;
    if (!MEDIA_RE.test(fname)) continue;
    if (/^(cover|text\.md|excerpt\.md|master)/i.test(fname) || /^book(\.|_)/i.test(fname)) continue;
    console.log(
      `  ⚠ ${book.id}: "${fname}" is not published — rename to book_<id>.${fname.split(".").pop()} to make it an edition`
    );
  }

  relatedCache.set(book.id, computeRelated(book));
  coverFiles.set(book.id, coverFile);
  audioFlags.set(book.id, !!(formats.audio || formats.audioZip));

  /* tiered rights payload for the UI */
  const r = book.rights ?? {};
  const rights = {
    license: r.license,
    licenseLabel: LICENSES[r.license]?.label ?? r.license,
    ...(LICENSES[r.license]?.deedUrl ? { licenseDeed: LICENSES[r.license].deedUrl } : {}),
    verification: r.verification,
    verificationLabel: VERIFICATIONS[r.verification]?.label ?? r.verification,
    ...(r.notes ? { notes: r.notes } : {}),
    ...(r.sources?.length ? { sources: r.sources } : {}),
  };

  fs.writeFileSync(
    path.join(API_OUT, "books", `${book.id}.json`),
    JSON.stringify({
      id: book.id,
      title: book.title,
      authorId: book.authorId,
      authorName: author.name,
      epochId: book.epochId ?? null,
      isFeatured: !!book.isFeatured,
      libraryId: book._libraryId ?? null,
      tags: book.tags,
      publicationYear: book.publicationYear,
      synopsis: book.synopsis,
      accessType: book.accessType,
      rightsStatus: book.rightsStatus,
      rights,
      availability: book.availability ?? "full-text",
      channel: book.channel ?? "main",
      collectionIds: book.collectionIds ?? [],
      translator: book.translator,
      /* bibliographic extras (all optional) */
      ...(book.subtitle ? { subtitle: book.subtitle } : {}),
      ...(book.altTitles?.length ? { altTitles: book.altTitles } : {}),
      ...(book.originalTitle ? { originalTitle: book.originalTitle } : {}),
      ...(book.originalLanguage ? { originalLanguage: book.originalLanguage } : {}),
      ...((book.language && book.language !== "sq") ? { language: book.language } : {}),
      ...(book.isbn ? { isbn: book.isbn } : {}),
      ...(book.ageGroup ? { ageGroup: book.ageGroup } : {}),
      ...(book.coverCredit ? { coverCredit: book.coverCredit } : {}),
      ...(book.narrator ? { narrator: book.narrator } : {}),
      ...((textStats.get(book.id)) ?? {}),
      cover: `/content/books/${book.id}/${coverFile}`,
      coverThumb: `/content/books/${book.id}/${coverFile}`,
      formats,
      ...(editionsOut.length ? { editions: editionsOut } : {}),
      relatedIds: relatedCache.get(book.id),
    }, null, 2)
  );
}

/* S3-proxy libraries: book content (pdf/epub/md/audio/zips/covers aside)
   is served at runtime from R2 via /api/s3-proxy/… — don't ship it as
   static assets. Keeps dist small and avoids Workers's 25 MiB per-asset
   upload limit. Only images (covers) remain. */
const KEEP_BOOK_IMAGE = /\.(jpe?g|png|svg|webp)$/i;
function stripBookContent(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      stripBookContent(full);
      if (fs.readdirSync(full).length === 0) fs.rmdirSync(full);
    } else if (!KEEP_BOOK_IMAGE.test(entry.name)) {
      fs.rmSync(full);
    }
  }
}
for (const b of verifiedBooks) {
  if (!proxyS3ByLibId.has(b._libraryId)) continue;
  stripBookContent(path.join(CONTENT_OUT, "books", b.id));
}

/* light index */
const authorIndex = new Map(
  catalog.authors.map((a) => [
    a.id,
    { name: a.name, portrait: authorPortrait.get(a.id), dates: a.dates },
  ])
);
fs.writeFileSync(
  path.join(API_OUT, "books", "index.json"),
  JSON.stringify({
    items: verifiedBooks.map((b) => ({
      id: b.id,
      title: b.title,
      authorId: b.authorId,
      authorName: authorIndex.get(b.authorId).name,
      epochId: b.epochId ?? null,
      tags: b.tags,
      publicationYear: b.publicationYear,
      isFeatured: !!b.isFeatured,
      accessType: b.accessType,
      availability: b.availability ?? "full-text",
      channel: b.channel ?? "main",
      collectionIds: b.collectionIds ?? [],
      libraryId: b._libraryId ?? null,
      rights: {
        license: b.rights?.license ?? "unknown",
        verification: b.rights?.verification ?? "pending",
      },
      hasAudio: audioFlags.get(b.id) === true ||
        (b.files ?? []).some((f) => f.format === "audio"),
      coverThumb: `/content/books/${b.id}/${coverFiles.get(b.id) ?? 'cover.svg'}`,
      ...(b.subtitle ? { subtitle: b.subtitle } : {}),
      ...(b.altTitles?.length ? { altTitles: b.altTitles } : {}),
      ...(b.language && b.language !== "sq" ? { language: b.language } : {}),
      ...(b.ageGroup ? { ageGroup: b.ageGroup } : {}),
      ...(textStats.get(b.id)?.readingMinutes ? { readingMinutes: textStats.get(b.id).readingMinutes } : {}),
    })),
  }, null, 2)
);

/* author detail files */
for (const a of catalog.authors) {
  fs.writeFileSync(
    path.join(API_OUT, "authors", `${a.id}.json`),
    JSON.stringify({
      ...a,
      portrait: authorPortrait.get(a.id),
      bookIds: bookIdsByAuthor.get(a.id) ?? [],
    }, null, 2)
  );
}

/* featured / discovery payload — merged from all libraries that have a
   featured.json. Each library nominates its own hero books, selected books,
   and featured authors; results are concatenated and deduped in library order.
     hero.count + hero.bookIds          → auto-stacking shelf on the landing page
     selectedBooks.count + .bookIds     → "Kryevepra të zgjedhura" carousel
     authors.count + .authorIds         → "Zërat kryesorë" carousel
   Counts truncate the id lists; every id must exist and be published. */
const featuredCfgs = LIBRARIES
  .map((root) => path.join(root, "featured.json"))
  .filter((p) => fs.existsSync(p))
  .map((p) => readJson(p, "featured.json"));

const FEATURED_CAP = 6; // max items contributed per library per section

const takeCount = (section, label) => {
  const ids = section?.bookIds ?? section?.authorIds ?? [];
  const count = section?.count;
  if (count !== undefined && (!Number.isInteger(count) || count < 0))
    fail(`featured.json: ${label}.count must be a non-negative integer`);
  const limit = typeof count === "number" ? count : FEATURED_CAP;
  return ids.slice(0, limit);
};

const dedup = (arr) => [...new Set(arr)];

/* hero stack — merge all libraries, fall back to isFeatured books */
let heroIds = dedup(featuredCfgs.flatMap((cfg) => takeCount(cfg.hero, "hero")));
if (!heroIds.length)
  heroIds = verifiedBooks.filter((b) => b.isFeatured).map((b) => b.id);
for (const id of heroIds)
  if (!verifiedBooks.some((b) => b.id === id))
    fail(`featured.json: hero book "${id}" is not published`);

/* selected books carousel — merged */
const selectedBookIds = dedup(featuredCfgs.flatMap((cfg) => takeCount(cfg.selectedBooks, "selectedBooks")));
for (const id of selectedBookIds)
  if (!verifiedBooks.some((b) => b.id === id))
    fail(`featured.json: selected book "${id}" is not published`);

/* featured authors — merged, fall back to isFeatured authors */
let featuredAuthorIds = dedup(featuredCfgs.flatMap((cfg) => takeCount(cfg.authors, "authors")));
if (!featuredAuthorIds.length)
  featuredAuthorIds = catalog.authors.filter((a) => a.isFeatured).map((a) => a.id);
for (const id of featuredAuthorIds) {
  if (!authorById.has(id))
    fail(`featured.json: unknown author "${id}"`);
}

fs.writeFileSync(
  path.join(API_OUT, "featured.json"),
  JSON.stringify({
    heroBookIds: heroIds,
    ...(selectedBookIds.length ? { selectedBookIds } : {}),
    featuredAuthorIds,
    epochIds: catalog.epochs.map((e) => e.id),
  }, null, 2)
);

/* search index */
fs.writeFileSync(
  path.join(API_OUT, "search-index.json"),
  JSON.stringify({
    books: verifiedBooks.map((b) => ({
      id: b.id,
      text: [b.title, ...(b.subtitle ? [b.subtitle] : []), ...(b.altTitles ?? []), authorIndex.get(b.authorId).name, b.synopsis, b.translator ?? "", b.originalTitle ?? "", ...(b.tags ?? []), String(b.publicationYear)].filter(Boolean).join(" "),
    })),
    authors: catalog.authors.map((a) => ({ id: a.id, text: [a.name, a.dates, a.bio, ...(a.altNames ?? [])].join(" ") })),
    epochs: catalog.epochs.map((e) => ({ id: e.id, text: [e.title, e.years, e.description].join(" ") })),
  }, null, 2)
);

/* manifest — bump version each build */
let version = 1;
try {
  const prev = JSON.parse(fs.readFileSync(path.join(API_OUT, "manifest.json"), "utf8"));
  version = prev.version + 1;
} catch { /* first build */ }
fs.writeFileSync(
  path.join(API_OUT, "manifest.json"),
  JSON.stringify({
    version,
    builtAt: new Date().toISOString(),
    counts: {
      epochs: catalog.epochs.length,
      authors: catalog.authors.length,
      books: verifiedBooks.length,
    },
  }, null, 2)
);

/* summary */
console.log("─────────────── build:content ───────────────");
console.log(`epochs:   ${catalog.epochs.length}`);
console.log(`authors:  ${catalog.authors.length}`);
console.log(`books:    ${verifiedBooks.length} published (+${pending.length} withheld)`);
console.log(`formats:  ${[...audioFlags.values()].filter(Boolean).length} audiobooks · ${verifiedBooks.length} texts published from masters`);

/* ── S3 proxy URL rewriting ────────────────────────────────────────
   For libraries with s3.proxy=true, rewrite all /content/… URLs in the
   generated JSON to go through /api/s3-proxy/{bucket}/… so the Worker
   handles S3 authentication at runtime. */
if (proxyS3ByLibId.size) {
  // Build lookup: book/author ID → their library's S3 config
  const proxyS3ByItemId = new Map();
  for (const b of verifiedBooks) {
    const s3 = proxyS3ByLibId.get(b._libraryId);
    if (s3) proxyS3ByItemId.set(b.id, s3);
  }
  for (const a of catalog.authors) {
    const s3 = proxyS3ByLibId.get(a._libraryId);
    if (s3) proxyS3ByItemId.set(a.id, s3);
  }

  const PROXY_EXTS = new Set([".md", ".epub", ".pdf", ".mp3", ".m4a", ".wav", ".zip", ".ogg", ".flac"]);
  const rewriteUrl = (url, itemId) => {
    if (typeof url !== "string" || !url.startsWith("/content/")) return url;
    // Only proxy large binaries — images are cached locally
    const ext = url.split("?")[0].split(".").pop()?.toLowerCase();
    if (ext && !PROXY_EXTS.has(`.${ext}`)) return url;
    // If we know which item this belongs to, use its library's bucket
    const s3 = itemId ? proxyS3ByItemId.get(itemId) : null;
    const bucket = s3?.bucket ?? [...proxyS3ByLibId.values()][0]?.bucket;
    if (!bucket) return url;
    // Transform build path to S3 key: books/{author}--{book}/file.pdf → authors/{author}/books/{book}/file.pdf
    let s3Path = url;
    const bookMatch = url.match(/^\/content\/books\/([^/]+)--([^/]+)\/([^/]+)$/);
    if (bookMatch) {
      const [, authorId, bookSlug, fileName] = bookMatch;
      s3Path = `/content/authors/${authorId}/books/${bookSlug}/${fileName}`;
    }
    return `/api/s3-proxy/${encodeURIComponent(bucket)}${s3Path}`;
  };
  const rewriteObj = (obj, itemId) => {
    if (!obj || typeof obj !== "object") return obj;
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === "string" && v.startsWith("/content/")) {
        obj[k] = rewriteUrl(v, itemId);
      } else if (Array.isArray(v)) {
        v.forEach((item, i) => {
          if (typeof item === "string" && item.startsWith("/content/")) {
            v[i] = rewriteUrl(item, itemId);
          } else if (item && typeof item === "object") {
            rewriteObj(item, itemId);
          }
        });
      } else if (v && typeof v === "object") {
        rewriteObj(v, itemId);
      }
    }
  };

  let rewriteCount = 0;
  const apiFiles = fs.readdirSync(API_OUT, { recursive: true })
    .filter((f) => f.endsWith(".json"));
  for (const relPath of apiFiles) {
    const absPath = path.join(API_OUT, relPath);
    try {
      const raw = fs.readFileSync(absPath, "utf8");
      const data = JSON.parse(raw);
      const before = JSON.stringify(data);
      // Extract item ID from filename (e.g., "gjon-buzuku--meshtari.json" → "gjon-buzuku--meshtari")
      const itemId = path.basename(relPath, ".json");
      rewriteObj(data, itemId);
      if (JSON.stringify(data) !== before) {
        fs.writeFileSync(absPath, JSON.stringify(data, null, 2));
        rewriteCount++;
      }
    } catch { /* skip malformed */ }
  }
  if (rewriteCount) {
    console.log(`s3-proxy: rewrote content URLs in ${rewriteCount} API files`);
    for (const [libId, s3] of proxyS3ByLibId.entries())
      console.log(`  → ${libId}: /api/s3-proxy/${encodeURIComponent(s3.bucket)}/content/…`);
  }
}

if (warnings.length) {
  console.log("warnings:");
  for (const w of warnings) console.log(`  ⚠ ${w}`);
}
console.log(`api tree: ${API_OUT.replace(ROOT + "/", "")}/  (version ${version})`);
