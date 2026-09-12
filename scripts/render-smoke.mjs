/**
 * render-smoke.mjs — mounts the real <App/> at a route inside jsdom
 * (esbuild-bundled, one React copy) and fails loudly if anything throws
 * or if expected markers are missing from the rendered HTML.
 *
 * Usage: node scripts/render-smoke.mjs [route] [marker1,marker2,...]
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { JSDOM } from "jsdom";
import esbuild from "esbuild";

const ROOT = process.cwd();
const ROUTE = process.argv[2] ?? "/";
const MARKERS = (process.argv[3] ?? "Letërsia shqipe,Koleksione,Shiko koleksionet").split(",");

/* ---------- browser-ish globals ---------- */
const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`, {
  url: `http://localhost${ROUTE}`,
  pretendToBeVisual: true,
});
global.window = dom.window;
global.document = dom.window.document;
global.localStorage = dom.window.localStorage;
global.HTMLElement ??= dom.window.HTMLElement;
global.SVGElement ??= dom.window.SVGElement;
global.Element ??= dom.window.Element;
global.Node ??= dom.window.Node;
global.CustomEvent ??= dom.window.CustomEvent;
global.getComputedStyle ??= dom.window.getComputedStyle;
global.requestAnimationFrame ??= ((cb) => setTimeout(() => cb(Date.now()), 16));
global.cancelAnimationFrame ??= clearTimeout;
const mmStub = () => ({
  matches: false, media: "", onchange: null,
  addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {},
  dispatchEvent() { return false; },
});
global.matchMedia ??= mmStub;
dom.window.matchMedia = mmStub;
global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
global.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };

try { global.navigator = dom.window.navigator; } catch { /* node ≥21 read-only */ }

const errors = [];
dom.window.addEventListener("error", (e) => errors.push(e.error ?? e.message));
process.on("unhandledRejection", (r) => errors.push(r));

/* ---------- fetch shim backed by public/api ---------- */
global.fetch = async (url) => {
  const u = String(url);
  if (u.includes("/api/") || u.includes("/content/")) {
    const rel = u.split("://localhost")[1]?.split("?")[0] ?? u;
    const file = path.join(ROOT, "public", rel);
    const ok = fs.existsSync(file);
    const body = ok ? fs.readFileSync(file, "utf8") : "";
    return { ok, status: ok ? 200 : 404, json: async () => JSON.parse(body || "{}"), text: async () => body };
  }
  throw new Error(`unexpected external fetch: ${u}`);
};

/* ---------- bundle the app (single file, one React copy) ---------- */
const outdir = path.join(ROOT, "node_modules", ".tmp", "smoke");
fs.rmSync(outdir, { recursive: true, force: true });
/* mimic Vite's `?url` imports (e.g., pdf worker): resolve to a URL string */
const urlShim = {
  name: "url-shim",
  setup(build) {
    build.onResolve({ filter: /\?url$/ }, (args) => ({
      path: args.path,
      namespace: "url-shim",
    }));
    build.onLoad({ filter: /.*/, namespace: "url-shim" }, (args) => {
      const rel = args.path.replace(/\?url$/, "");
      const abs = path.join(ROOT, "node_modules", rel);
      return {
        contents: `export default ${JSON.stringify(fs.existsSync(abs) ? pathToFileURL(abs).href : rel)}`,
        loader: "js",
      };
    });
  },
};

await esbuild.build({
  entryPoints: [path.join(ROOT, "src/App.tsx")],
  bundle: true,
  format: "esm",
  platform: "browser",
  jsx: "automatic",
  alias: { "@": path.join(ROOT, "src") },
  plugins: [urlShim],
  packages: "external",
  define: { "process.env.NODE_ENV": '"development"' },
  banner: { js: "if (!import.meta.env) import.meta.env = { BASE_URL: '/', MODE: 'development', DEV: true, PROD: false };" },
  outfile: path.join(outdir, "app.mjs"),
  logLevel: "error",
});

/* ---------- mount ---------- */
const { MemoryRouter } = await import("react-router-dom");
const React = (await import("react")).default;
const { createRoot } = await import("react-dom/client");
const { default: App } = await import(pathToFileURL(path.join(outdir, "app.mjs")).href);

const root = createRoot(document.getElementById("root"));
root.render(
  React.createElement(MemoryRouter, { initialEntries: [ROUTE] }, React.createElement(App))
);

/* flush effects, lazy data promises, transitions */
await new Promise((r) => setTimeout(r, 1800));

const html = document.getElementById("root").innerHTML;

let failed = false;
if (errors.length) {
  console.error("CAPTURED ERRORS:");
  for (const e of errors) console.error(e?.stack || e);
  failed = true;
}
for (const m of MARKERS) {
  const hit = html.includes(m);
  console.log(`${hit ? "✓" : "✗ MISSING"}  ${m}`);
  if (!hit) failed = true;
}
console.log(failed ? "\nSMOKE FAILED" : `\nSMOKE OK (${html.length} chars rendered, route ${ROUTE})`);
fs.writeFileSync(path.join(outdir, "last.html"), html);
process.exit(failed ? 1 : 0);
