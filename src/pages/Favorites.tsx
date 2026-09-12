import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, BookOpen, History, Trash2 } from "lucide-react";
import { getBook } from "@/lib/data";
import { getAllProgress, progressKey } from "@/lib/db";
import { useLibrary } from "@/lib/store";
import type { Book, ReadingProgress } from "@/lib/types";
import BookCard from "@/components/BookCard";
import { EmptyState, SectionTitle } from "@/components/ui";

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "tani";
  if (mins < 60) return `${mins} min më parë`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} orë më parë`;
  return `${Math.floor(hours / 24)} ditë më parë`;
}

export default function Favorites() {
  const favorites = useLibrary((s) => s.favorites);
  const history = useLibrary((s) => s.history);
  const clearHistory = useLibrary((s) => s.clearHistory);

  const [favBooks, setFavBooks] = useState<Book[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, ReadingProgress>>({});

  useEffect(() => {
    Promise.all(favorites.map((id) => getBook(id).catch(() => null)))
      .then((rs) => setFavBooks(rs.filter((b): b is Book => !!b)))
      .catch(console.error);
  }, [favorites]);

  useEffect(() => {
    getAllProgress().then(setProgressMap).catch(console.error);
  }, [history]);

  const [resolvedHistory, setResolvedHistory] = useState<Book[]>([]);
  useEffect(() => {
    const ids = [...new Set(history.map((h) => h.bookId))];
    Promise.all(ids.map((id) => getBook(id).catch(() => null)))
      .then((rs) => setResolvedHistory(rs.filter((b): b is Book => !!b)))
      .catch(console.error);
  }, [history]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <SectionTitle title="Biblioteka ime" subtitle="Favoritet dhe historiku i leximit ruhen vetëm në pajisjen tënde" />

      <section className="mb-14">
        <h2 className="mb-5 flex items-center gap-2 font-display text-2xl font-bold">
          <Bookmark className="size-5 text-brand" /> Të preferuara ({favBooks.length})
        </h2>
        {favBooks.length === 0 ? (
          <EmptyState
            message="Nuk ke libra të preferuar."
            hint="Shtyp zemrën në kopertinën e çdo libri për ta ruajtur këtu."
          />
        ) : (
          <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {favBooks.map((b) => (
              <BookCard key={b.id} book={b} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
            <History className="size-5 text-brand" /> Historiku i leximit
          </h2>
          {history.length > 0 && (
            <button
              onClick={clearHistory}
              className="inline-flex items-center gap-1.5 rounded-lg border border-parchment-deep bg-surface px-3 py-1.5 text-sm text-muted transition-colors hover:border-brand hover:text-brand"
            >
              <Trash2 className="size-3.5" /> Fshi historikun
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <EmptyState message="Historiku është bosh." hint="Hap një libër për të filluar leximin." />
        ) : (
          <ul className="divide-y divide-parchment-deep/70 overflow-hidden rounded-2xl border border-parchment-deep bg-surface">
            {history.map((h) => {
              const book = resolvedHistory.find((b) => b.id === h.bookId);
              const prog = progressMap[progressKey(h.bookId, h.format)];
              return (
                <li key={`${h.bookId}:${h.format}`} className="flex items-center gap-4 px-4 py-3 sm:px-6">
                  {book && (
                    <img
                      src={book.coverThumb ?? book.cover}
                      alt=""
                      className="hidden h-16 w-11 rounded object-cover sm:block"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{book?.title ?? h.bookId}</p>
                    <p className="text-xs text-muted">
                      Format {h.format.toUpperCase()} · {timeAgo(h.at)}
                      {prog ? ` · ${Math.round(prog.percent * 100)}%` : ""}
                    </p>
                  </div>
                  <Link
                    to={`/read/${h.bookId}/${h.format}`}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-parchment px-3.5 py-2 text-sm font-semibold text-ink transition-colors hover:bg-brand hover:text-white"
                  >
                    <BookOpen className="size-4" /> Vazhdo
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
