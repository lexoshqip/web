import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlignJustify, ArrowLeft, BookOpen, Coffee, Columns2, Minus, Moon, Plus, Sun } from "lucide-react";
import { getBook } from "@/lib/data";
import { getProgress, setProgress } from "@/lib/db";
import { useLibrary } from "@/lib/store";
import type { Book, BookEdition, FormatKind, ReadingProgress } from "@/lib/types";
import EpubReader from "./EpubReader";
import PdfReader from "./PdfReader";
import MdReader from "./MdReader";
import AudioPlayer from "./AudioPlayer";

export type ThemeName = "light" | "sepia" | "dark";
export type PageWidth = "small" | "medium" | "large";
export type SpreadMode = "scroll" | "single" | "spread";

/* theme scopes set the --r-* custom properties consumed by all reader chrome */
export const THEME_CLASSES: Record<ThemeName, string> = {
  light: "reader-light",
  sepia: "reader-sepia",
  dark: "reader-dark",
};

/* width scopes set --r-measure, the reading-column max width */
export const WIDTH_CLASSES: Record<PageWidth, string> = {
  small: "reader-w-small",
  medium: "reader-w-medium",
  large: "reader-w-large",
};

export interface AudioChapter {
  file: string;
  title: string;
  duration: number;
}



export interface ReaderProps {
  url: string;
  theme: ThemeName;
  width: PageWidth;
  fontSize: number;
  saved: ReadingProgress | null;
  onProgress: (p: ReadingProgress) => void;
  /** pdf reader uses this so the toolbar ± acts as zoom reset */
  onFontSizeChange?: (size: number) => void;
  /** readers publish their page-navigation controls into the toolbar's right zone */
  setToolbarRight?: (node: ReactNode | null) => void;
  /** full book record — audio player needs it to register with the global provider */
  audioBook?: Book | null;
  /** selected alternate edition (audio editions carry their own chapters) */
  audioEdition?: BookEdition | null;
  chapters?: AudioChapter[];
  coverUrl?: string;
  zipUrl?: string;
  /** single or two-page spread (PDF/EPUB only) */
  spread?: SpreadMode;
}

const isFormat = (v: string | undefined): v is FormatKind =>
  v === "epub" || v === "pdf" || v === "md" || v === "audio";

/** progress slot — edition-aware so variant versions track separately */
const progressKeyStr = (bookId: string, format: string, editionId?: string) =>
  `${bookId}:${format}${editionId ? `:${editionId}` : ""}`;

export default function ReaderPage() {
  const { bookId, format, editionId } = useParams<{
    bookId: string;
    format: string;
    editionId?: string;
  }>();
  const [book, setBook] = useState<Book | null>(null);
  const [missing, setMissing] = useState(false);
  const [saved, setSaved] = useState<ReadingProgress | null>(null);
  const [live, setLive] = useState<ReadingProgress>({ position: null, percent: 0, updatedAt: 0 });
  const [toolbarRight, setToolbarRight] = useState<ReactNode>(null);
  const [theme, setTheme] = useState<ThemeName>(
    () => (localStorage.getItem("lexoshqip-theme") as ThemeName) || "sepia"
  );
  const [fontSize, setFontSize] = useState(() => Number(localStorage.getItem("lexoshqip-font")) || 100);
  const [width, setWidth] = useState<PageWidth>(
    () => (localStorage.getItem("lexoshqip-width") as PageWidth) || "medium"
  );
  const [spread, setSpread] = useState<SpreadMode>(
    () => (localStorage.getItem("lexoshqip-spread") as SpreadMode) || "scroll"
  );
  const addHistory = useLibrary((s) => s.addHistory);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => localStorage.setItem("lexoshqip-theme", theme), [theme]);
  useEffect(() => localStorage.setItem("lexoshqip-font", String(fontSize)), [fontSize]);
  useEffect(() => localStorage.setItem("lexoshqip-width", width), [width]);
  useEffect(() => localStorage.setItem("lexoshqip-spread", spread), [spread]);

  /* ESC leaves the reader — immersive mode still needs a keyboard exit */
  const navigate = useNavigate();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && bookId) navigate(`/books/${bookId}`);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [bookId, navigate]);

  useEffect(() => {
    if (!bookId || !isFormat(format)) return;
    setMissing(false);
    getBook(bookId)
      .then(async (b) => {
        const edition = editionId
          ? b.editions?.find((e) => e.id === editionId && e.format === format)
          : undefined;
        if (editionId && !edition) {
          setMissing(true);
          return;
        }
        if (!b.formats[format] && !edition) {
          setMissing(true);
          return;
        }
        setBook(b);
        addHistory(b.id, format);
        setSaved(await getProgress(progressKeyStr(b.id, format, edition?.id)));
      })
      .catch(() => setMissing(true));
  }, [bookId, format, editionId, addHistory]);

  const onProgress = useCallback(
    (p: ReadingProgress) => {
      setLive(p);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        if (bookId && format && isFormat(format))
          void setProgress(progressKeyStr(bookId, format, editionId), p);
      }, 600);
    },
    [bookId, format, editionId]
  );

  const url = useMemo(() => {
    if (!book || !isFormat(format)) return undefined;
    const edition = editionId
      ? book.editions?.find((e) => e.id === editionId && e.format === format)
      : undefined;
    return edition?.url ?? book.formats[format];
  }, [book, format, editionId]);

  const audioChapters = useMemo(() => {
    const raw = book?.formats?.audioChapters;
    if (!raw) return undefined;
    try { return JSON.parse(raw) as { file: string; title: string; duration: number }[]; }
    catch { return undefined; }
  }, [book]);

  if (!bookId || !isFormat(format) || missing)
    return (
      <div className={`${THEME_CLASSES[theme]} grid h-dvh place-items-center bg-(--r-bg) text-center text-(--r-text)`}>
        <div>
          <p className="text-xl font-semibold">Ky format i librit nuk është i disponueshëm.</p>
          <Link to={bookId ? `/books/${bookId}` : "/books"} className="mt-3 inline-block text-(--r-accent) hover:underline">
            Kthehu te libri
          </Link>
        </div>
      </div>
    );

  if (!book || !url)
    return (
      <div className={`${THEME_CLASSES[theme]} grid h-dvh place-items-center bg-(--r-bg)`}>
        <div className="size-10 animate-spin rounded-full border-4 border-(--r-border) border-t-(--r-accent)" />
      </div>
    );

  const props: ReaderProps = {
    url, theme, width, fontSize, saved, onProgress,
    onFontSizeChange: setFontSize,
    setToolbarRight,
    audioBook: book,
    audioEdition:
      format === "audio" && editionId
        ? book?.editions?.find((e) => e.id === editionId && e.format === "audio") ?? null
        : null,
    chapters: audioChapters,
    coverUrl: book?.cover,
    zipUrl: book?.formats?.audioZip,
    spread,
  };

  /* view controls — centered on desktop, tucked into the right zone on mobile */
  const viewControls = (
    <>
      {/* text size */}
      <button
        onClick={() => setFontSize((f) => Math.max(70, f - 10))}
        className="grid size-8 place-items-center rounded-lg bg-(--r-btn) text-(--r-muted) transition-colors hover:text-(--r-accent)"
        aria-label="Zvogëlo shkrimin"
      >
        <Minus className="size-4" />
      </button>
      <button
        onClick={() => setFontSize((f) => Math.min(180, f + 10))}
        className="grid size-8 place-items-center rounded-lg bg-(--r-btn) text-(--r-muted) transition-colors hover:text-(--r-accent)"
        aria-label="Zmadho shkrimin"
      >
        <Plus className="size-4" />
      </button>

      {/* page width (not relevant for pdf) */}
      {format !== "pdf" && (
        <div className="flex items-center rounded-lg border border-(--r-border) bg-(--r-btn) p-0.5" role="group" aria-label="Gjerësia e faqes">
          {([["small", 6, "Ngushtë"], ["medium", 10, "Mesme"], ["large", 14, "Gjerë"]] as const).map(
            ([v, span, label]) => (
              <button
                key={v}
                onClick={() => setWidth(v)}
                title={label}
                aria-label={label}
                aria-pressed={width === v}
                className={`grid size-7 place-items-center rounded-md transition-colors ${
                  width === v ? "bg-(--r-panel) text-(--r-accent)" : "text-(--r-muted) hover:text-(--r-text)"
                }`}
              >
                <WidthGlyph span={span} />
              </button>
            )
          )}
        </div>
      )}

      {/* spread mode (PDF/EPUB) */}
      {(format === "pdf" || format === "epub") && (
        <div className="flex items-center rounded-lg border border-(--r-border) bg-(--r-btn) p-0.5" role="group" aria-label="Paraqitja e faqeve">
          {format === "epub" && (
            <button
              onClick={() => setSpread("scroll")}
              title="Lëvizje e vazhdueshme"
              aria-label="Lëvizje e vazhdueshme"
              aria-pressed={spread === "scroll"}
              className={`grid size-7 place-items-center rounded-md transition-colors ${
                spread === "scroll" ? "bg-(--r-panel) text-(--r-accent)" : "text-(--r-muted) hover:text-(--r-text)"
              }`}
            >
              <AlignJustify className="size-4" />
            </button>
          )}
          <button
            onClick={() => setSpread("single")}
            title="Faqe e vetme"
            aria-label="Faqe e vetme"
            aria-pressed={spread === "single"}
            className={`grid size-7 place-items-center rounded-md transition-colors ${
              spread === "single" ? "bg-(--r-panel) text-(--r-accent)" : "text-(--r-muted) hover:text-(--r-text)"
            }`}
          >
            <BookOpen className="size-4" />
          </button>
          <button
            onClick={() => setSpread("spread")}
            title="Dy faqe"
            aria-label="Dy faqe"
            aria-pressed={spread === "spread"}
            className={`grid size-7 place-items-center rounded-md transition-colors ${
              spread === "spread" ? "bg-(--r-panel) text-(--r-accent)" : "text-(--r-muted) hover:text-(--r-text)"
            }`}
          >
            <Columns2 className="size-4" />
          </button>
        </div>
      )}

      {/* reader theme */}
      <div className="flex items-center rounded-lg border border-(--r-border) bg-(--r-btn) p-0.5" role="group" aria-label="Tema">
        {([["light", Sun, "Ditë"], ["sepia", Coffee, "Sepia"], ["dark", Moon, "Natë"]] as const).map(
          ([v, Icon, label]) => (
            <button
              key={v}
              onClick={() => setTheme(v)}
              title={label}
              aria-label={label}
              aria-pressed={theme === v}
              className={`grid size-7 place-items-center rounded-md transition-colors ${
                theme === v ? "bg-(--r-panel) text-(--r-accent)" : "text-(--r-muted) hover:text-(--r-text)"
              }`}
            >
              <Icon className="size-4" />
            </button>
          )
        )}
      </div>
    </>
  );

  return (
    <div
      data-reader-root
      className={`${THEME_CLASSES[theme]} ${WIDTH_CLASSES[width]} flex h-dvh flex-col bg-(--r-bg) text-(--r-text)`}
    >
      {/* toolbar — three zones on desktop: title / view controls / page nav */}
      <div className="relative flex h-14 shrink-0 items-center gap-2 border-b border-(--r-border) bg-(--r-panel) px-3 sm:px-5">
        <Link
          to={`/books/${book.id}`}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-(--r-muted) transition-colors hover:bg-(--r-row-hover) hover:text-(--r-accent)"
        >
          <ArrowLeft className="size-4" />
          <span className="hidden max-w-[28vw] truncate sm:inline">{book.title}</span>
        </Link>

        <span className="hidden rounded-md bg-(--r-btn) px-2 py-0.5 font-mono text-xs uppercase text-(--r-muted) md:inline">
          {format}
        </span>
        {editionId && (
          <span
            className="hidden max-w-[18ch] truncate rounded-md bg-(--r-btn) px-2 py-0.5 text-xs text-(--r-muted) md:inline"
            title={`Versioni: ${editionId}`}
          >
            {editionId.replace(/-/g, " ")}
          </span>
        )}
        {book.accessType === "trial" && (
          <span className="hidden rounded-md bg-brand px-2 py-0.5 text-[11px] font-semibold uppercase text-white sm:inline">
            Fragment
          </span>
        )}

        {/* center zone — view controls (desktop only; mobile keeps them right).
            Meaningless for audio, so the audio route skips them entirely. */}
        {format !== "audio" && (
          <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-2 md:flex">
            {viewControls}
          </div>
        )}

        {/* right zone — reader nav (+ view controls on mobile) */}
        <div className="ml-auto flex items-center gap-2">
          {toolbarRight}
          {format !== "audio" && (
            <div className="flex items-center gap-2 md:hidden">{viewControls}</div>
          )}
        </div>

        {/* reading progress line — book total, with optional secondary (chapter) line */}
        {typeof live.chapterPercent === "number" && (
          <div
            className="absolute bottom-[-1px] left-0 h-[2px] bg-(--r-accent)/40 transition-[width] duration-300"
            style={{ width: `${Math.round(live.chapterPercent * 100)}%` }}
            aria-hidden
          />
        )}
        <div
          className="absolute bottom-[-1px] left-0 h-0.5 bg-(--r-accent) transition-[width] duration-300"
          style={{ width: `${Math.round(live.percent * 100)}%` }}
          role="progressbar"
          aria-valuenow={Math.round(live.percent * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progresi i leximit"
        />
      </div>

      {/* content */}
      <div className={`min-h-0 flex-1 ${format === "epub" || format === "audio" ? "" : THEME_CLASSES[theme]}`}>
        {format === "epub" && <EpubReader {...props} />}
        {format === "pdf" && <PdfReader {...props} />}
        {format === "md" && <MdReader {...props} />}
        {format === "audio" && <AudioPlayer {...props} />}
      </div>
    </div>
  );
}

/** three bars whose span visualises the column width setting */
function WidthGlyph({ span }: { span: number }) {
  const half = span / 2;
  return (
    <svg viewBox="0 0 16 16" className="size-4 fill-none stroke-current" strokeWidth={1.6} strokeLinecap="round">
      <line x1={8 - half} y1="5" x2={8 + half} y2="5" />
      <line x1={8 - half} y1="8" x2={8 + half} y2="8" />
      <line x1={8 - half} y1="11" x2={8 + half} y2="11" />
    </svg>
  );
}
