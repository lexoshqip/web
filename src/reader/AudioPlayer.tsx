import { useEffect, useRef } from "react";
import { useAudioPlayer } from "@/lib/player";
import PlayerPanel from "@/components/PlayerPanel";
import type { ReaderProps } from "./ReaderPage";

/**
 * Full-page audio route — deep links land here. Playback itself lives in the
 * global AudioProvider; this view just registers the book and renders the
 * shared PlayerPanel inside the reader theme.
 */
export default function AudioPlayer({ saved, onProgress, audioBook, audioEdition }: ReaderProps) {
  const player = useAudioPlayer();
  const activeId = player?.book?.id ?? null;
  const loadedRef = useRef(false);

  /* register this book unless another one is actively loaded */
  useEffect(() => {
    if (!player || !audioBook) return;
    const edChapters =
      audioEdition?.audioChapters
        ? (() => {
            try {
              return JSON.parse(audioEdition.audioChapters) as import("@/lib/player").AudioChapter[];
            } catch {
              return undefined;
            }
          })()
        : undefined;
    if (activeId && activeId !== audioBook.id) return; // conflict UI below
    if (!loadedRef.current) {
      loadedRef.current = true;
      player.loadBook(audioBook, {
        seekTo: Number(saved?.position) || 0,
        ...(edChapters ? { chapters: edChapters, editionId: audioEdition!.id } : {}),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, audioBook, audioEdition]);

  /* drive the toolbar progress line (db persistence is handled by the provider) */
  const sec = Math.floor(player?.time ?? -1);
  useEffect(() => {
    if (!player || sec < 0 || !player.duration || activeId !== audioBook?.id) return;
    onProgress({
      position: String(sec),
      percent: player.time / player.duration,
      label: `${fmt(player.time)} / ${fmt(player.duration)}`,
      updatedAt: Date.now(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sec]);

  if (!player || !audioBook) return null;

  /* another audiobook is currently loaded globally */
  if (activeId && activeId !== audioBook.id) {
    return (
      <div className="grid h-full place-items-center px-6 text-center">
        <div>
          <p className="text-sm text-(--r-muted)">Po dëgjohet tani:</p>
          <p className="mt-1 font-semibold text-(--r-text)">{player.book?.title}</p>
          <button
            onClick={() => {
              loadedRef.current = true;
              const edChapters = audioEdition?.audioChapters;
              player.loadBook(
                audioBook,
                edChapters
                  ? {
                      seekTo: Number(saved?.position) || 0,
                      chapters: JSON.parse(edChapters),
                      editionId: audioEdition!.id,
                    }
                  : { seekTo: Number(saved?.position) || 0 }
              );
            }}
            className="mt-4 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            Kalu te ky libër
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <PlayerPanel />
    </div>
  );
}

function fmt(s: number): string {
  if (!Number.isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}
