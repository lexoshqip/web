import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getBook } from "./data";
import { setProgress } from "./db";
import type { Book } from "./types";

export interface AudioChapter {
  file: string;
  title: string;
  duration: number;
}

const SNAPSHOT_KEY = "lexoshqip-audio-last";
const SPEEDS = [0.75, 1, 1.25, 1.5, 2];
export const PLAYBACK_SPEEDS = SPEEDS;

/** chapters from the JSON manifest, or a synthetic single chapter for one-file audiobooks */
export function parseChapters(book: Book): AudioChapter[] {
  const raw = book.formats?.audioChapters;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as AudioChapter[];
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch {
      /* fall through to single-file */
    }
  }
  const single = book.formats?.audio;
  return single ? [{ file: single, title: book.title, duration: 0 }] : [];
}

interface PlayerApi {
  book: Book | null;
  chapters: AudioChapter[];
  chapterIndex: number;
  editionId: string | null;
  playing: boolean;
  time: number;
  duration: number;
  speed: number;
  volume: number;
  muted: boolean;
  /** loads a book (skips if it is already the active one); paused unless autoplay */
  loadBook: (
    book: Book,
    opts?: {
      chapterIndex?: number;
      seekTo?: number;
      autoplay?: boolean;
      /** alternate-audio-edition chapter list, overriding the book default */
      chapters?: AudioChapter[];
      editionId?: string;
    }
  ) => void;
  toggle: () => void;
  seek: (t: number) => void;
  skip: (delta: number) => void;
  setChapter: (index: number, autoplay?: boolean) => void;
  setSpeed: (v: number) => void;
  setVolume: (v: number) => void;
  setMuted: (v: boolean) => void;
  panelOpen: boolean;
  setPanelOpen: (v: boolean) => void;
}

const PlayerContext = createContext<PlayerApi | null>(null);

export function useAudioPlayer(): PlayerApi | null {
  return useContext(PlayerContext);
}

interface Snapshot {
  bookId: string;
  editionId?: string;
  chapterIndex: number;
  time: number;
}

function readSnapshot(): Snapshot | null {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Snapshot;
    return s.bookId ? s : null;
  } catch {
    return null;
  }
}

export function AudioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  /* applied once metadata for the pending src is loaded */
  const pendingSeek = useRef<number | null>(null);
  const wantPlay = useRef(false);
  const lastSave = useRef(0);

  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<AudioChapter[]>([]);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [editionId, setEditionId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeedState] = useState(1);
  const [volume, setVolumeState] = useState(1);
  const [muted, setMutedState] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  const chapter: AudioChapter | undefined = chapters[chapterIndex];

  /* restore last session — book + edition + chapter + position, always paused */
  useEffect(() => {
    const snap = readSnapshot();
    if (!snap) return;
    let cancelled = false;
    getBook(snap.bookId)
      .then((b) => {
        if (cancelled || !b.formats?.audio) return;
        let list: AudioChapter[] = [];
        if (snap.editionId) {
          const ed = b.editions?.find(
            (e) => e.id === snap.editionId && e.format === "audio"
          );
          if (ed?.audioChapters) {
            try {
              list = JSON.parse(ed.audioChapters) as AudioChapter[];
            } catch {
              /* fall back to default chapters below */
            }
          }
        }
        if (!list.length) {
          list = parseChapters(b);
          if (!list.length || snap.editionId) return; // edition vanished from content
        }
        const ci = Math.min(Math.max(0, snap.chapterIndex), list.length - 1);
        pendingSeek.current = Math.max(0, snap.time);
        setBook(b);
        setEditionId(snap.editionId ?? null);
        setChapters(list);
        setChapterIndex(ci);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  /* src follows chapter changes; play/seek intents are honoured once metadata lands */
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !chapter) return;
    const absolute = new URL(chapter.file, window.location.href).href;
    if (el.src !== absolute) {
      el.src = chapter.file;
      el.load();
    } else if (pendingSeek.current != null) {
      el.currentTime = pendingSeek.current;
      pendingSeek.current = null;
    }
  }, [chapter]);

  const persist = useCallback(
    (t: number, d: number, force = false) => {
      if (!book) return;
      const now = Date.now();
      if (!force && now - lastSave.current < 5000) return;
      lastSave.current = now;
      try {
        localStorage.setItem(
          SNAPSHOT_KEY,
          JSON.stringify({
            bookId: book.id,
            chapterIndex,
            time: t,
            ...(editionId ? { editionId } : {}),
          })
        );
      } catch {
        /* private mode etc. */
      }
      void setProgress(
        `${book.id}:audio${editionId ? `:${editionId}` : ""}`,
        {
          position: String(t),
          percent: d ? t / d : 0,
          label: `${fmt(t)} / ${fmt(d)}`,
          updatedAt: now,
        }
      );
    },
    [book, chapterIndex, editionId]
  );

  const onLoadedMetadata = () => {
    const el = audioRef.current;
    if (!el) return;
    setDuration(el.duration || 0);
    if (pendingSeek.current != null) {
      el.currentTime = pendingSeek.current;
      pendingSeek.current = null;
    }
    if (wantPlay.current) {
      wantPlay.current = false;
      void el.play().catch(() => setPlaying(false));
    }
  };

  const onEnded = () => {
    if (chapterIndex < chapters.length - 1) {
      pendingSeek.current = 0;
      wantPlay.current = true;
      setChapterIndex(chapterIndex + 1);
    } else {
      setPlaying(false);
      persist(0, 0, true);
    }
  };

  const loadBook = useCallback<PlayerApi["loadBook"]>(
    (b, opts = {}) => {
      const list = opts.chapters ?? parseChapters(b);
      if (!list.length) return;
      const edId = opts.editionId ?? null;
      if (book?.id === b.id && editionId === edId) {
        /* same book+edition already loaded — just navigate if asked */
        if (opts.chapterIndex != null && opts.chapterIndex !== chapterIndex) {
          pendingSeek.current = opts.seekTo ?? 0;
          wantPlay.current = !!opts.autoplay;
          setChapterIndex(opts.chapterIndex);
        }
        return;
      }
      pendingSeek.current = opts.seekTo ?? 0;
      wantPlay.current = !!opts.autoplay;
      setEditionId(edId);
      setBook(b);
      setChapters(list);
      setChapterIndex(Math.min(Math.max(0, opts.chapterIndex ?? 0), list.length - 1));
      setTime(pendingSeek.current ?? 0);
      setDuration(list[Math.min(opts.chapterIndex ?? 0, list.length - 1)]?.duration ?? 0);
    },
    [book, chapterIndex, editionId]
  );

  const toggle = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) void el.play().catch(() => {});
    else el.pause();
  }, []);

  const seek = useCallback((t: number) => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = Math.min(Math.max(t, 0), el.duration || Number.MAX_SAFE_INTEGER);
    setTime(el.currentTime);
  }, []);

  const skip = useCallback(
    (delta: number) => {
      const el = audioRef.current;
      if (!el) return;
      seek(el.currentTime + delta);
    },
    [seek]
  );

  const setChapter = useCallback(
    (index: number, autoplay = true) => {
      const clamped = Math.min(Math.max(0, index), chapters.length - 1);
      pendingSeek.current = 0;
      wantPlay.current = autoplay;
      setChapterIndex(clamped);
      setTime(0);
      setDuration(chapters[clamped]?.duration ?? 0);
    },
    [chapters]
  );

  useEffect(() => {
    const el = audioRef.current;
    if (el) {
      el.playbackRate = speed;
      el.volume = muted ? 0 : volume;
    }
  }, [speed, volume, muted, chapter]);

  /* lock-screen / media-key integration */
  useEffect(() => {
    if (!("mediaSession" in navigator) || !book) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: chapter?.title ?? book.title,
      artist: book.authorName ?? undefined,
      album: book.title,
      artwork: book.cover ? [{ src: book.cover, sizes: "512x512" }] : [],
    });
  }, [book, chapter]);

  const api: PlayerApi = {
    book,
    chapters,
    chapterIndex,
    editionId,
    playing,
    time,
    duration,
    speed,
    volume,
    muted,
    loadBook,
    toggle,
    seek,
    skip,
    setChapter,
    setSpeed: setSpeedState,
    setVolume: setVolumeState,
    setMuted: setMutedState,
    panelOpen,
    setPanelOpen,
  };

  return (
    <PlayerContext.Provider value={api}>
      {children}
      <audio
        ref={audioRef}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => {
          setPlaying(false);
          const el = audioRef.current;
          if (el) persist(el.currentTime, el.duration || 0, true);
        }}
        onLoadedMetadata={onLoadedMetadata}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          setTime(el.currentTime);
          persist(el.currentTime, el.duration || 0);
        }}
        onEnded={onEnded}
      />
    </PlayerContext.Provider>
  );
}

function fmt(s: number): string {
  if (!Number.isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}
