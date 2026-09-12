import { Play, RotateCcw, RotateCw, Volume2, VolumeX, X } from "lucide-react";
import { PLAYBACK_SPEEDS, useAudioPlayer } from "@/lib/player";

/**
 * Full transport UI shared by the popup panel and the /read/:id/audio route.
 * Styled through the --r-* variables; wrap it in `.audio-surface` (popup) or
 * a reader theme scope (route).
 */
export default function PlayerPanel({ onClose }: { onClose?: () => void }) {
  const player = useAudioPlayer();
  if (!player?.book) return null;

  const book = player.book;
  const chapters = player.chapters;
  const cover = book.cover;

  return (
    <div className="flex h-full flex-col">
      {/* header */}
      <div className="flex shrink-0 items-start justify-between gap-2 px-4 pt-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{book.title}</p>
          <p className="truncate text-xs text-(--r-muted)">{book.authorName}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="grid size-7 shrink-0 place-items-center rounded-full text-(--r-muted) transition-colors hover:bg-(--r-row-hover) hover:text-(--r-accent)"
            aria-label="Mbyll"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* album art */}
        {cover && (
          <div className="mx-auto mt-3 w-36 overflow-hidden rounded-lg shadow-lg">
            <img src={cover} alt="" className="aspect-square w-full object-cover" />
          </div>
        )}
        {!cover && (
          <div className="mx-auto mt-3 grid w-36 aspect-square place-items-center rounded-lg bg-(--r-btn) text-2xl font-bold text-(--r-accent)">
            {book.title.slice(0, 1)}
          </div>
        )}

        {/* chapter list */}
        {chapters.length > 1 && (
          <div className="mt-3 px-4 pb-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-(--r-muted)">Kapitujt</p>
            <div className="space-y-1">
              {chapters.map((ch, i) => {
                const active = i === player.chapterIndex;
                return (
                  <button
                    key={ch.file}
                    onClick={() => player.setChapter(i)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      active
                        ? "bg-(--r-active-bg) font-medium text-(--r-accent)"
                        : "text-(--r-text) hover:bg-(--r-row-hover)"
                    }`}
                  >
                    <span className="w-5 text-right tabular-nums opacity-60">{i + 1}.</span>
                    <span className="flex-1 truncate">{ch.title}</span>
                    {ch.duration > 0 && (
                      <span className="tabular-nums opacity-50">{fmt(ch.duration)}</span>
                    )}
                    {active && player.playing && <span className="text-xs">♪</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* transport controls */}
      <div className="shrink-0 border-t border-(--r-border) bg-(--r-panel) px-4 py-3">
        <input
          type="range"
          min={0}
          max={player.duration || 0}
          step={1}
          value={Math.min(player.time, player.duration || 0)}
          onChange={(e) => player.seek(Number(e.target.value))}
          className="mb-1 w-full accent-(--r-accent)"
          aria-label="Seek"
        />
        <div className="mb-2 flex justify-between text-xs tabular-nums text-(--r-muted)">
          <span>{fmt(player.time)}</span>
          <span>{fmt(player.duration)}</span>
        </div>

        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => player.skip(-15)}
            className="grid size-9 place-items-center rounded-full bg-(--r-btn) text-(--r-muted) transition-colors hover:text-(--r-accent)"
            aria-label="-15 sekonda"
          >
            <RotateCcw className="size-4" />
          </button>
          <button
            onClick={player.toggle}
            className="grid size-14 place-items-center rounded-full bg-brand text-white shadow-lg transition-transform hover:scale-105"
            aria-label={player.playing ? "Ndalo" : "Luaj"}
          >
            {player.playing ? <PauseGlyph /> : <Play className="size-7 translate-x-0.5 fill-current" />}
          </button>
          <button
            onClick={() => player.skip(15)}
            className="grid size-9 place-items-center rounded-full bg-(--r-btn) text-(--r-muted) transition-colors hover:text-(--r-accent)"
            aria-label="+15 sekonda"
          >
            <RotateCw className="size-4" />
          </button>
        </div>

        <div className="mt-3 flex items-center justify-center gap-4">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => player.setMuted(!player.muted)}
              aria-label="Volume"
              className="text-(--r-muted) hover:text-(--r-accent)"
            >
              {player.muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={player.muted ? 0 : player.volume}
              onChange={(e) => {
                player.setVolume(Number(e.target.value));
                player.setMuted(Number(e.target.value) === 0);
              }}
              className="w-16 accent-(--r-accent)"
              aria-label="Niveli i zërit"
            />
          </div>
          <select
            value={player.speed}
            onChange={(e) => player.setSpeed(Number(e.target.value))}
            className="rounded-md border border-(--r-border) bg-(--r-btn) px-1.5 py-0.5 text-xs text-(--r-text)"
            aria-label="Shpejtësia"
          >
            {PLAYBACK_SPEEDS.map((sp) => (
              <option key={sp} value={sp}>
                {sp}×
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );

  function PauseGlyph() {
    return (
      <svg viewBox="0 0 24 24" className="size-7 fill-current" aria-hidden>
        <rect x="5" y="4" width="5" height="16" rx="1" />
        <rect x="14" y="4" width="5" height="16" rx="1" />
      </svg>
    );
  }
}

function fmt(s: number): string {
  if (!Number.isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}
