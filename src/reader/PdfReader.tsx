import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize } from "lucide-react";
import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { ReaderProps } from "./ReaderPage";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export default function PdfReader({ url, fontSize, saved, onProgress, onFontSizeChange, setToolbarRight, spread = "single" }: ReaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvas2Ref = useRef<HTMLCanvasElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<pdfjs.PDFDocumentProxy | null>(null);
  const taskRef = useRef<pdfjs.RenderTask | null>(null);
  const task2Ref = useRef<pdfjs.RenderTask | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(() => Number(saved?.position) || 1);

  /* track the scroller's actual dimensions */
  const [scrollerSize, setScrollerSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const measure = () => setScrollerSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* load document */
  useEffect(() => {
    let cancelled = false;
    pdfjs.getDocument({ url }).promise.then((doc) => {
      if (cancelled) { void doc.destroy(); return; }
      docRef.current = doc;
      setTotalPages(doc.numPages);
      const restore = Number(saved?.position) || 1;
      setPage(Math.min(Math.max(1, restore), doc.numPages));
    }).catch(console.error);
    return () => {
      cancelled = true;
      taskRef.current?.cancel();
      task2Ref.current?.cancel();
      void docRef.current?.destroy();
      docRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  /* render a single page onto a canvas */
  const renderPage = useCallback(async (
    doc: pdfjs.PDFDocumentProxy, pageNum: number,
    canvas: HTMLCanvasElement, cancelled: () => boolean
  ) => {
    const p = await doc.getPage(pageNum);
    if (cancelled()) return;
    const dpr = window.devicePixelRatio || 1;
    const base = p.getViewport({ scale: 1 });
    const availW = scrollerSize.w - 32;
    const availH = scrollerSize.h - 32;
    const divider = spread === "spread" ? 2 : 1;
    const fit = Math.min((availW / divider) / base.width, Math.max(0.2, availH) / base.height);
    const zoom = Math.min(3, Math.max(0.5, fontSize / 100));
    const viewport = p.getViewport({ scale: fit * zoom * dpr });
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.width = `${viewport.width / dpr}px`;
    canvas.style.height = `${viewport.height / dpr}px`;
    const task = p.render({ canvasContext: ctx, viewport });
    task.promise.catch(() => {});
    return task;
  }, [scrollerSize, fontSize, spread]);

  /* render current page(s) */
  useEffect(() => {
    const doc = docRef.current;
    if (!doc || page < 1 || page > doc.numPages) return;
    if (scrollerSize.w === 0 || scrollerSize.h === 0) return;

    let cancelled = false;
    const cancel = () => cancelled;
    taskRef.current?.cancel();
    task2Ref.current?.cancel();

    const page2 = spread === "spread" ? Math.min(page + 1, doc.numPages) : 0;

    (async () => {
      const t1 = await renderPage(doc, page, canvasRef.current!, cancel);
      if (!cancelled && t1) taskRef.current = t1;
      if (page2 > 0 && canvas2Ref.current) {
        const t2 = await renderPage(doc, page2, canvas2Ref.current, cancel);
        if (!cancelled && t2) task2Ref.current = t2;
      }
    })();

    onProgress({
      position: String(page),
      percent: totalPages ? page / totalPages : 0,
      label: spread === "spread" && page2 > 0
        ? `Faqet ${page}–${page2}/${totalPages}`
        : `Faqja ${page}${totalPages ? `/${totalPages}` : ""}`,
      updatedAt: Date.now(),
    });

    return () => { cancelled = true; };
  }, [page, totalPages, scrollerSize, spread, renderPage, onProgress]);

  useEffect(() => {
    const step = spread === "spread" ? 2 : 1;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setPage((p) => Math.min(p + step, totalPages));
      if (e.key === "ArrowLeft") setPage((p) => Math.max(p - step, 1));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [totalPages, spread]);

  const prevPage = useCallback(
    () => setPage((p) => Math.max(1, p - (spread === "spread" ? 2 : 1))),
    [spread]
  );
  const nextPage = useCallback(
    () => setPage((p) => Math.min(p + (spread === "spread" ? 2 : 1), totalPages)),
    [spread, totalPages]
  );
  const resetFit = useCallback(() => onFontSizeChange?.(100), [onFontSizeChange]);

  /* toolbar */
  useEffect(() => {
    if (!setToolbarRight) return;
    setToolbarRight(
      <div className="flex items-center gap-1.5">
        <button
          onClick={prevPage}
          disabled={page <= 1}
          className="grid size-9 place-items-center rounded-lg bg-(--r-btn) text-(--r-muted) transition hover:text-(--r-accent) disabled:opacity-40"
          aria-label="Faqja e mëparshme"
        >
          <ChevronLeft className="size-5" />
        </button>
        <span className="hidden min-w-[3.5rem] text-center text-sm font-medium tabular-nums text-(--r-text) sm:inline">
          {spread === "spread" && Math.min(page + 1, totalPages) > page
            ? `${page}–${Math.min(page + 1, totalPages)} / ${totalPages || "…"}`
            : `${page} / ${totalPages || "…"}`
          }
        </span>
        <button
          onClick={nextPage}
          disabled={page >= totalPages}
          className="grid size-9 place-items-center rounded-lg bg-(--r-btn) text-(--r-muted) transition hover:text-(--r-accent) disabled:opacity-40"
          aria-label="Faqja tjetër"
        >
          <ChevronRight className="size-5" />
        </button>
        <button
          onClick={resetFit}
          className="hidden size-9 place-items-center rounded-lg bg-(--r-btn) text-(--r-muted) transition hover:text-(--r-accent) sm:grid"
          aria-label="Përshtat në ekran"
          title="Përshtat në ekran"
        >
          <Maximize className="size-4" />
        </button>
      </div>
    );
    return () => setToolbarRight(null);
  }, [page, totalPages, spread, prevPage, nextPage, setToolbarRight, resetFit]);

  return (
    <div ref={scrollerRef} className="relative h-full w-full overflow-auto bg-black/30">
      <div className="flex min-h-full items-start justify-center gap-1 p-4">
        <canvas ref={canvasRef} className="rounded shadow-xl" />
        {spread === "spread" && <canvas ref={canvas2Ref} className="rounded shadow-xl" />}
      </div>
    </div>
  );
}
