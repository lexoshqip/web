import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ePub, { type Book as EpubBook, type Rendition } from "epubjs";
import type { ReaderProps } from "./ReaderPage";
import { THEME_CLASSES, type ThemeName } from "./ReaderPage";

const THEME_CSS: Record<string, { body: Record<string, string> }> = {
  light: { body: { background: "#ffffff", color: "#241f1a" } },
  sepia: { body: { background: "#f6eed9", color: "#43382a" } },
  dark: { body: { background: "#191713", color: "#f0ead9" } },
};

export default function EpubReader({ url, theme, fontSize, saved, onProgress, setToolbarRight, spread = "scroll" }: ReaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<EpubBook | null>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const latestCfiRef = useRef("");
  const prevUrlRef = useRef("");
  /* stable ref to the current page-turn function — lets toolbar / side buttons
     always call the latest version without re-registering effects */
  const navigateRef = useRef<(dir: "next" | "prev") => void>(() => {});

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    /* a new book (url change) starts from its saved position; a mode switch
       keeps the current reading position instead of jumping back */
    if (prevUrlRef.current !== url) {
      latestCfiRef.current = "";
      prevUrlRef.current = url;
    }

    const book = ePub(url);
    bookRef.current = book;
    const isScroll = spread === "scroll";
    /* pass explicit pixel dimensions so epubjs stage.size() gets a real number
       from the start; if el hasn't been painted yet fall back to "100%" */
    const w = el.clientWidth || "100%";
    const h = el.clientHeight || "100%";
    const rendition = book.renderTo(el, {
      width: w,
      height: isScroll ? undefined : h,
      manager: isScroll ? "continuous" : "default",
      flow: isScroll ? "scrolled" : "paginated",
      spread: spread === "spread" ? "constant" : "none",
      /* epubjs iframes default to sandbox="allow-same-origin" and swallow the
         content's scripts ("Blocked script execution in 'about:srcdoc'"); this
         restores normal EPUB rendering */
      allowScriptedContent: true,
    });

    /* rendition.spread() sets the divisor eagerly and clamps minSpreadWidth to
       a real number — without it two-page mode waits for an 800px-wide stage */
    if (spread === "spread") rendition.spread("constant", 1);
    renditionRef.current = rendition;

    for (const [name, rules] of Object.entries(THEME_CSS)) {
      rendition.themes.register(name, rules);
    }
    rendition.themes.select(theme);
    rendition.themes.fontSize(`${fontSize}%`);

    let cancelled = false;
    book.ready
      .then(() => {
        const restore = latestCfiRef.current || saved?.position;
        return restore ? rendition.display(restore) : rendition.display();
      })
      .then(() => {
        /* after first paint, force the layout to recompute with real pixel dimensions;
           this ensures the spread divisor is calculated correctly (avoids a 0-width
           stage on first paint giving divisor=1 even in "constant" spread mode) */
        if (!cancelled && spread === "spread") {
          rendition.resize(el.clientWidth, el.clientHeight);
        }
      })
      .catch(() => {
        if (!cancelled) void rendition.display();
      });

    /* loc.start.percentage only becomes real once locations are generated —
       without this it stays 0 forever. Fire-and-forget: first paint stays fast;
       after generation we re-display the current position so "relocated" fires
       with accurate book-level percentages. */
    book.ready
      .then(() => book.locations.generate(1600))
      .then(() => {
        if (cancelled) return;
        try {
          const cur = rendition.currentLocation() as { start?: { cfi?: string } };
          if (cur?.start?.cfi) void rendition.display(cur.start.cfi);
        } catch {
          /* nothing rendered yet — next page turn will report percentages */
        }
      })
      .catch(() => {});

    const spineCount = (book.spine as { items?: unknown[] })?.items?.length ?? 0;
    const onRelocated = (loc: any) => {
      if (loc?.start?.cfi) latestCfiRef.current = String(loc.start.cfi);
      const idx = typeof loc?.start?.index === "number" ? loc.start.index : 0;
      /* chapter position from the spine index; whole-book % from locations */
      const chapterPct =
        spineCount > 1 ? Math.min(1, Math.max(0, idx / (spineCount - 1))) : undefined;
      let pct =
        typeof loc?.start?.percentage === "number" ? loc.start.percentage : NaN;
      if (!Number.isFinite(pct)) pct = chapterPct ?? 0; // fallback until locations finish generating
      onProgress({
        position: String(loc?.start?.cfi ?? ""),
        percent: pct,
        ...(chapterPct !== undefined ? { chapterPercent: chapterPct } : {}),
        updatedAt: Date.now(),
      });
    };
    rendition.on("relocated", onRelocated);

    const navigate = (dir: "next" | "prev") => {
      dir === "next" ? rendition.next() : rendition.prev();
    };

    /* expose navigate to toolbar / side buttons via a stable ref */
    navigateRef.current = navigate;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") navigate("next");
      if (e.key === "ArrowLeft") navigate("prev");
    };
    document.addEventListener("keyup", onKey);

    const ro = new ResizeObserver(() => {
      if (!rendition) return;
      try {
        rendition.resize(el.clientWidth, el.clientHeight);
      } catch {
        /* resize can fail before EPUB content is fully loaded */
      }
    });
    ro.observe(el);

    return () => {
      cancelled = true;
      navigateRef.current = () => {};
      document.removeEventListener("keyup", onKey);
      ro.disconnect();
      try { rendition.destroy(); } catch { /* already torn down */ }
      try { book.destroy(); } catch { /* already torn down */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, spread]);

  // live theme / font updates without re-init
  useEffect(() => {
    const r = renditionRef.current;
    if (!r) return;
    r.themes.select(theme);
    /* registered body rules lose to publisher inline styles on already-loaded
       sections — !important overrides win immediately, and re-displaying the
       current position repaints any stale pages */
    const THEME_OVERRIDES: Record<ThemeName, [string, string][]> = {
      light: [["color", "#241f1a"], ["background-color", "#ffffff"]],
      sepia: [["color", "#43382a"], ["background-color", "#f6eed9"]],
      dark: [["color", "#f0ead9"], ["background-color", "#191713"]],
    };
    for (const [prop, value] of THEME_OVERRIDES[theme]) {
      r.themes.override(prop, value, true);
    }
    r.themes.fontSize(`${fontSize}%`);
    // repaint current spread so the new theme is visible without paging
    try {
      const loc = r.currentLocation() as { start?: { cfi?: string } };
      if (loc?.start?.cfi) void r.display(loc.start.cfi).catch(() => {});
    } catch {
      /* not ready yet */
    }
  }, [theme, fontSize]);

  /* page navigation lives in the toolbar's right zone — only in paginated modes */
  useEffect(() => {
    if (!setToolbarRight) return;
    if (spread === "scroll") {
      setToolbarRight(null);
      return () => setToolbarRight(null);
    }
    setToolbarRight(
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => navigateRef.current("prev")}
          className="grid size-9 place-items-center rounded-lg bg-(--r-btn) text-(--r-muted) transition hover:text-(--r-accent)"
          aria-label="Para"
        >
          <ChevronLeft className="size-5" />
        </button>
        <button
          onClick={() => navigateRef.current("next")}
          className="grid size-9 place-items-center rounded-lg bg-(--r-btn) text-(--r-muted) transition hover:text-(--r-accent)"
          aria-label="Tjetra"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>
    );
    return () => setToolbarRight(null);
  }, [setToolbarRight, spread]);

  const isPaginated = spread !== "scroll";

  return (
    <div className={`flex h-full w-full flex-col ${THEME_CLASSES[theme]}`}>
      <div
        className={`relative flex min-h-0 flex-1 justify-center ${
          isPaginated ? "items-center px-10 py-5" : ""
        }`}
      >
        {/* hover-visible side nav — live in the padding margin so they never overlap epub text */}
        {isPaginated && (
          <>
            <button
              onClick={() => navigateRef.current("prev")}
              aria-label="Para"
              className="absolute left-1 top-1/2 z-10 -translate-y-1/2 grid size-9 place-items-center rounded-full bg-(--r-panel)/80 text-(--r-muted) opacity-20 shadow-md backdrop-blur-sm transition-opacity hover:opacity-100"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              onClick={() => navigateRef.current("next")}
              aria-label="Tjetra"
              className="absolute right-1 top-1/2 z-10 -translate-y-1/2 grid size-9 place-items-center rounded-full bg-(--r-panel)/80 text-(--r-muted) opacity-20 shadow-md backdrop-blur-sm transition-opacity hover:opacity-100"
            >
              <ChevronRight className="size-5" />
            </button>
          </>
        )}

        <div
          ref={containerRef}
          className={[
            "h-full",
            spread === "spread" ? "w-full" : "w-full max-w-(--r-measure)",
            isPaginated ? "overflow-hidden rounded-sm shadow-[0_2px_40px_-6px_rgba(0,0,0,0.22)]" : "overflow-y-auto",
          ].join(" ")}
        />
      </div>
    </div>
  );
}
