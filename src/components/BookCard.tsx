import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { BookmarkCheck, BookmarkPlus, Clock, Headphones } from "lucide-react";
import { useLibrary } from "@/lib/store";
import type { Book, BookIndexItem } from "@/lib/types";

const LIBRARY_TAG: Record<string, string> = {
  "free-online": "Web",
  "personal": "PK",
  "emerging": "EM",
};

const FORMAT_LABEL: Record<string, string> = {
  epub: "EPUB",
  pdf: "PDF",
  md: "MD",
  audio: "Audiobook",
};

const KNOWN_FORMATS = new Set(Object.keys(FORMAT_LABEL));

export default function BookCard({ book }: { book: BookIndexItem }) {
  const reduceMotion = useReducedMotion();
  const favorites = useLibrary((s) => s.favorites);
  const toggleFavorite = useLibrary((s) => s.toggleFavorite);
  const isFav = favorites.includes(book.id);
  /* detail records carry `cover`; light index items carry `coverThumb` */
  const img =
    (book as Partial<Book>).coverThumb ?? (book as Partial<Book>).cover ?? "";

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 280, damping: 24 }}
      className="group relative"
    >
      <Link to={`/books/${book.id}`} className="block">
        <div className="relative overflow-hidden rounded-xl border border-parchment-deep bg-parchment shadow-sm transition-shadow group-hover:shadow-lg">
          <img
            src={img}
            alt={`Kopertina e librit ${book.title}`}
            loading="lazy"
            className="aspect-[5/8] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
          {book.accessType === "trial" && (
            <span className="absolute left-3 top-3 rounded-md bg-brand px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow">
              Fragment
            </span>
          )}
          {book.hasAudio && (
            <span className="absolute right-3 top-3 grid size-7 place-items-center rounded-full bg-ink/80 text-white shadow">
              <Headphones className="size-3.5" />
            </span>
          )}
          {book.availability === "metadata-only" && (
            <span className="absolute left-3 top-3 rounded-md bg-ink/80 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow">
              Do të digjitalizohet
            </span>
          )}
          {book.isFeatured && book.accessType !== "trial" && (
            <span className="absolute left-3 top-3 rounded-md bg-gold px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow">
              Zgjedhur
            </span>
          )}
        </div>
      </Link>

      <button
        onClick={(e) => {
          e.preventDefault();
          toggleFavorite(book.id);
        }}
        aria-label={isFav ? "Hiq nga favoritet" : "Shto në favoritet"}
        className={`absolute right-2 top-2 grid size-8 place-items-center rounded-full backdrop-blur transition-colors ${
          isFav ? "bg-brand text-white" : "bg-surface/85 text-ink-soft hover:text-brand"
        }`}
      >
        {isFav ? <BookmarkCheck className="size-4 fill-current" /> : <BookmarkPlus className="size-4" />}
      </button>

      <Link to={`/books/${book.id}`} className="mt-3 block flex-1 px-0.5">
        <h3 className="line-clamp-2 min-h-[2.75em] font-display text-[15px] font-bold leading-snug group-hover:text-brand">
          {book.title}
        </h3>
        <p className="mt-0.5 truncate text-sm text-muted">{book.authorName}</p>
        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted">
          <span>{book.publicationYear}</span>
          {book.readingMinutes != null && (
            <span className="inline-flex items-center gap-0.5">
              <Clock className="size-3" /> {book.readingMinutes}′
            </span>
          )}
          {book.tags.slice(0, 1).map((t) => (
            <span key={t} className="rounded-full bg-parchment-deep/60 px-2 py-0.5">
              {t}
            </span>
          ))}
          {book.libraryId && LIBRARY_TAG[book.libraryId] && (
            <span className="ml-auto rounded-full bg-sky-100 px-2 py-0.5 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
              {LIBRARY_TAG[book.libraryId]}
            </span>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

export function FormatChips({ formats }: { formats: Partial<Record<string, string>> }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {Object.keys(formats).filter((f) => KNOWN_FORMATS.has(f)).map((f) => (
        <span
          key={f}
          className="rounded border border-parchment-deep bg-paper px-1.5 py-0.5 font-mono text-[10px] uppercase text-ink-soft"
        >
          {FORMAT_LABEL[f] ?? f.toUpperCase()}
        </span>
      ))}
    </div>
  );
}
