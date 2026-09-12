import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { useAudioPlayer } from "@/lib/player";
import PlayerPanel from "./PlayerPanel";

const POS_KEY = "lexoshqip-pill-pos";
const PILL = 56;
const PANEL_W = 344;
const PANEL_H = 580;
const MORPH_MS = 230;

type Pos = { x: number; y: number };
type Anim = "closed" | "opening" | "open" | "closing";

function clampPos(x: number, y: number): Pos {
  const maxX = Math.max(8, window.innerWidth - PILL - 8);
  const maxY = Math.max(8, window.innerHeight - PILL - 8);
  return { x: Math.min(Math.max(8, x), maxX), y: Math.min(Math.max(8, y), maxY) };
}

function readPos(): Pos | null {
  try {
    const raw = localStorage.getItem(POS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Pos;
    return typeof p.x === "number" && typeof p.y === "number" ? p : null;
  } catch {
    return null;
  }
}

/**
 * Floating audiobook pill — draggable anywhere, persists position. Clicking it
 * morphs the expanded player out of the pill's exact spot; closing reverses
 * the morph back into a freshly-popped pill.
 */
export default function MiniPlayer() {
  const player = useAudioPlayer();
  const { pathname } = useLocation();
  const pillRef = useRef<HTMLDivElement>(null);

  const [pos, setPos] = useState<Pos | null>(() => {
    const saved = readPos();
    return saved ? clampPos(saved.x, saved.y) : null;
  });
  const drag = useRef({ active: false, moved: false, sx: 0, sy: 0, ox: 0, oy: 0 });
  const [dragging, setDragging] = useState(false);

  /* morph state machine driven by the provider's panelOpen flag */
  const [anim, setAnim] = useState<Anim>("closed");
  const [pillPop, setPillPop] = useState(false);
  const animRef = useRef<Anim>("closed");
  animRef.current = anim;
  const origin = useRef({ x: 44, y: window.innerHeight - 44 });
  const closeTimer = useRef<number | undefined>(undefined);

  const book = player?.book;

  /* deep links still land on the full route */
  const ownRoute = !!book && pathname === `/read/${book.id}/audio`;

  useEffect(() => {
    const wantsOpen = !!player?.panelOpen && !ownRoute;
    if (wantsOpen && animRef.current === "closed") {
      window.clearTimeout(closeTimer.current);
      /* remember where to grow from — captured BEFORE the pill unmounts */
      const r = pillRef.current?.getBoundingClientRect();
      if (r) origin.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      setPillPop(false);
      setAnim("opening");
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setAnim("open"))
      );
    } else if (!wantsOpen && (animRef.current === "open" || animRef.current === "opening")) {
      setAnim("closing");
      closeTimer.current = window.setTimeout(() => {
        setAnim("closed");
        setPillPop(true);
      }, MORPH_MS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player?.panelOpen, ownRoute]);

  /* ESC closes the popup (except inside the reader, where ESC exits) */
  useEffect(() => {
    if (anim !== "open" && anim !== "opening") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector("[data-reader-root]")) {
        player?.setPanelOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [anim, player]);

  /* keep a restored position on-screen across resizes */
  useEffect(() => {
    if (!pos) return;
    const reposition = () => setPos(clampPos(pos.x, pos.y));
    window.addEventListener("resize", reposition);
    return () => window.removeEventListener("resize", reposition);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos?.x, pos?.y]);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  if (!player || !book || ownRoute) return null;

  const chapter = player.chapters[player.chapterIndex];
  const pct = player.duration ? (player.time / player.duration) * 100 : 0;

  /* ── drag handling ── */
  const startDrag = (e: React.PointerEvent) => {
    /* interactive controls handle their own clicks; the rest of the pill drags */
    if (e.button !== 0 || (e.target as HTMLElement).closest("button")) return;
    const rect = pillRef.current?.getBoundingClientRect();
    drag.current = {
      active: true,
      moved: false,
      sx: e.clientX,
      sy: e.clientY,
      ox: pos?.x ?? rect?.left ?? 16,
      oy: pos?.y ?? rect?.top ?? window.innerHeight - PILL - 16,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const moveDrag = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d.active) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) < 6) return;
    if (!d.moved) {
      d.moved = true;
      setDragging(true);
    }
    setPos(clampPos(d.ox + dx, d.oy + dy));
  };

  const endDrag = () => {
    const d = drag.current;
    if (!d.active) return;
    d.active = false;
    setDragging(false);
    if (d.moved) {
      setPos((p) => {
        if (p) localStorage.setItem(POS_KEY, JSON.stringify(p));
        return p;
      });
    } else {
      player.setPanelOpen(!player.panelOpen);
    }
  };

  /* ── morph geometry ── */
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const panelHeight = Math.min(PANEL_H, Math.round(vh * 0.8));
  const pillX = pos?.x ?? 16;
  const pillY = pos?.y ?? vh - PILL - 16;
  const finalLeft = Math.min(pillX, Math.max(8, vw - PANEL_W - 8));
  /* both anchors expressed as TOP so the transition never swaps properties */
  const finalTop =
    pillY > vh / 2
      ? /* above the pill */ Math.max(8, pillY - 10 - panelHeight)
      : /* below the pill */ pillY + PILL + 10;
  const initLeft = origin.current.x - PILL / 2;
  const initTop = origin.current.y - PILL / 2;

  const grown = anim === "open";
  const geom: React.CSSProperties = {
    left: grown ? finalLeft : initLeft,
    top: grown ? finalTop : initTop,
    width: grown ? PANEL_W : PILL,
    height: grown ? panelHeight : PILL,
    borderRadius: grown ? 16 : 28,
    opacity: grown ? 1 : 0,
  };

  return (
    <>
      {/* clearance for site pages; readers manage their own padding */}
      {!pathname.startsWith("/read/") && <div className="h-20" aria-hidden />}

      {/* expanding player panel */}
      {anim !== "closed" && (
        <div
          className="audio-surface fixed z-[70] overflow-hidden border border-black/10 bg-(--r-bg) text-(--r-text) shadow-2xl transition-all ease-out dark:border-white/10"
          style={{ ...geom, transitionDuration: `${MORPH_MS}ms` }}
          role="dialog"
          aria-label="Lexuesi i audiolibrave"
          aria-hidden={!grown}
        >
          <div
            className={`h-full transition-opacity duration-150 ${
              grown ? "opacity-100 delay-75" : "opacity-0"
            }`}
          >
            <PlayerPanel onClose={() => player.setPanelOpen(false)} />
          </div>
        </div>
      )}

      {/* draggable pill — yields while the panel is open */}
      {anim === "closed" && (
        <div
          ref={pillRef}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className={`fixed z-[60] touch-none select-none ${
            dragging ? "cursor-grabbing" : "cursor-grab"
          } ${pillPop ? "pill-pop" : ""}`}
          style={pos ? { left: pos.x, top: pos.y } : { left: 16, bottom: 16 }}
        >
          <div className="relative overflow-hidden rounded-full border border-black/10 bg-white/95 shadow-xl backdrop-blur dark:border-white/10 dark:bg-zinc-900/95">
            {/* progress hairline along the pill's top edge */}
            <div className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-brand/20">
              <div className="h-full rounded-full bg-brand transition-[width]" style={{ width: `${pct}%` }} />
            </div>

            <div className="flex items-center gap-2 p-1.5 pr-3">
              <div className="flex items-center gap-2.5 rounded-full" title={book.title}>
                {book.cover ? (
                  <img src={book.cover} alt="" className="size-10 rounded-full object-cover" draggable={false} />
                ) : (
                  <span className="grid size-10 place-items-center rounded-full bg-brand/10 text-sm font-semibold text-brand">
                    {book.title.slice(0, 1)}
                  </span>
                )}
                <span className="max-w-[130px] text-left sm:max-w-[200px]">
                  <span className="block truncate text-xs font-semibold">{book.title}</span>
                  <span className="block truncate text-[11px] opacity-60">
                    {chapter?.title ?? book.authorName}
                  </span>
                </span>
              </div>

              {player.chapters.length > 1 && (
                <>
                  <button
                    onClick={() => player.setChapter(player.chapterIndex - 1)}
                    disabled={player.chapterIndex <= 0}
                    className="grid size-8 place-items-center rounded-full text-black/60 transition hover:bg-black/5 disabled:opacity-30 dark:text-white/70 dark:hover:bg-white/10"
                    aria-label="Kapitulli i mëparshëm"
                  >
                    <SkipBack className="size-4 fill-current" />
                  </button>
                  <button
                    onClick={() => player.setChapter(player.chapterIndex + 1)}
                    disabled={player.chapterIndex >= player.chapters.length - 1}
                    className="grid size-8 place-items-center rounded-full text-black/60 transition hover:bg-black/5 disabled:opacity-30 dark:text-white/70 dark:hover:bg-white/10"
                    aria-label="Kapitulli tjetër"
                  >
                    <SkipForward className="size-4 fill-current" />
                  </button>
                </>
              )}

              <button
                onClick={player.toggle}
                className="grid size-10 place-items-center rounded-full bg-brand text-white shadow transition-transform hover:scale-105"
                aria-label={player.playing ? "Ndalo" : "Luaj"}
              >
                {player.playing ? (
                  <Pause className="size-5 fill-current" />
                ) : (
                  <Play className="size-5 translate-x-px fill-current" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
