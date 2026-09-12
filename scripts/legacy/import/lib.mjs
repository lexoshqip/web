/** Shared helpers for all LexoShqip import miners (Wikipedia, Wikidata, Gutenberg). */
import fsSync from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const CACHE = path.join(ROOT, ".cache", "import");
export const STAGING = path.join(ROOT, "corpus", "staging");
export const UA = { "User-Agent": "LexoShqip-miner/0.1 (curators@lexoshqip.example)" };

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Disk-cached text fetch: repeat runs are free and rate-limit-friendly. */
export async function cachedText(url, ttlMs = 7 * 864e5) {
  await fsSync.promises.mkdir(CACHE, { recursive: true });
  const f = path.join(CACHE, crypto.createHash("sha1").update(url).digest("hex"));
  try {
    const st = await fsSync.promises.stat(f);
    if (Date.now() - st.mtimeMs < ttlMs) return await fsSync.promises.readFile(f, "utf8");
  } catch {
    /* not cached — fetch below */
  }
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  const text = await res.text();
  await fsSync.promises.writeFile(f, text);
  return text;
}

let lastCall = 0;
/** Polite pacing: >=1.1s between network calls (cache hits bypass this). */
export async function throttle() {
  const gap = Date.now() - lastCall;
  if (gap < 1100) await sleep(1100 - gap);
  lastCall = Date.now();
}

export async function wikiApi(params, base = "https://sq.wikipedia.org/w/api.php") {
  await throttle();
  return JSON.parse(await cachedText(`${base}?${new URLSearchParams({ format: "json", ...params })}`));
}

export function slugify(name) {
  const map = { ë: "e", ç: "E", Ç: "C", á: "a", é: "e", í: "i", ó: "o", ú: "u" };
  return name
    .toLowerCase()
    .replace(/[ëçáéíóú]/g, (c) => map[c]?.toLowerCase() ?? c)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normName(name) {
  return name.toLowerCase().replace(/[ëç]/g, (c) => (c === "ë" ? "e" : "c")).replace(/\s+/g, " ").trim();
}

/** Internal wiki links from wikitext ([[Title]] / [[Title|label]]), main namespace only. */
export function parseWikiLinks(wikitext) {
  const out = new Set();
  for (const m of wikitext.matchAll(/\[\[([^\[\]|#]+)(?:\|[^\[\]]*)?\]\]/g)) {
    let t = m[1].trim();
    if (!t || t.includes(":")) continue; // skip Category:/File:/etc.
    if (/^(lista|kategoria|stamp|projekt)/i.test(t)) continue;
    out.add(t.replace(/_/g, " "));
  }
  return [...out];
}

/** Wikidata year from a P569/P570 datavalue like "+1846-03-25T00:00:00Z". */
export function claimYear(claims, prop) {
  const snak = claims?.[prop]?.[0]?.mainsnak;
  const t = snak?.datavalue?.value?.time;
  if (!t) return null;
  const y = parseInt(t.slice(1, 5), 10);
  return Number.isFinite(y) ? y : null;
}

export function isHuman(entity) {
  return entity?.claims?.P31?.some((s) => s.mainsnak?.datavalue?.value?.id === "Q5") ?? false;
}

/** Rough epoch suggestion from life dates; curators confirm/override at merge. */
export function suggestEpoch(born, died) {
  const d = died ?? (born ? born + 75 : null);
  if (d && d <= 1815) return "e-vjeter";
  const b = born ?? (d ? d - 70 : null);
  if (b === null) return null;
  if (d && d <= 1945 && b >= 1790) return d <= 1912 ? "rilindja" : b <= 1880 ? "rilindja" : "pavaresia";
  if (b >= 1870 && b <= 1905) return "pavaresia";
  if (b >= 1906 && b <= 1932) return "socialiste";
  return "bashkekohore";
}
