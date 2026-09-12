import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { BookOpen, Users } from "lucide-react";
import type { AuthorIndexItem, Epoch, Library } from "@/lib/types";

export function AuthorCard({ author }: { author: AuthorIndexItem }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 280, damping: 24 }}
      className="h-full"
    >
      <Link
        to={`/authors/${author.id}`}
        className="group block h-full overflow-hidden rounded-xl border border-parchment-deep bg-surface shadow-sm transition-shadow hover:shadow-md"
      >
        <div className="relative">
          <img
            src={author.portrait}
            alt={`Portreti i ${author.name}`}
            loading="lazy"
            className="aspect-[3/4] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-4">
            <h3 className="line-clamp-2 font-display text-[15px] font-bold leading-tight text-white drop-shadow-sm">
              {author.name}
            </h3>
            <p className="mt-0.5 text-xs text-white/75">{author.dates}</p>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-white/60">
              {author.bookCount} {author.bookCount === 1 ? "veprë" : "vepra"}
            </p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export function LibraryCard({ library, active = false }: { library: Library; active?: boolean }) {
  return (
    <motion.div whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 300, damping: 22 }}>
      <Link
        to={`/libraries/${library.id}`}
        className="group flex flex-col gap-3 rounded-xl border border-parchment-deep bg-surface p-5 shadow-sm transition-shadow hover:shadow-md"
        style={active ? { outline: `2px solid ${library.accent}`, outlineOffset: "2px" } : undefined}
      >
        <div className="flex items-center gap-3">
          {/* logo or accent square */}
          {library.logoUrl ? (
            <img
              src={library.logoUrl}
              alt={`${library.name} logo`}
              className="size-12 rounded-xl object-cover shadow-sm"
            />
          ) : (
            <div
              className="grid size-12 shrink-0 place-items-center rounded-xl text-[13px] font-bold text-white shadow-sm"
              style={{ backgroundColor: library.brandColor ?? library.accent }}
            >
              {library.name.slice(0, 2).toUpperCase()}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-display text-[15px] font-bold leading-snug group-hover:text-brand">
                {library.name}
              </h3>
            </div>
            <p className="mt-0.5 line-clamp-1 text-xs text-muted">{library.maintainer ?? ""}</p>
          </div>
        </div>

        <p className="line-clamp-2 text-sm leading-relaxed text-ink-soft">
          {library.description}
        </p>

        <div className="flex items-center gap-4 text-[11px] text-muted">
          <span className="inline-flex items-center gap-1">
            <BookOpen className="size-3.5" />
            {library.bookCount} {library.bookCount === 1 ? "libër" : "libra"}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="size-3.5" />
            {library.authorCount} {library.authorCount === 1 ? "autor" : "autorë"}
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

export function EpochCard({ epoch, bookCount }: { epoch: Epoch; bookCount?: number }) {
  return (
    <motion.div whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 300, damping: 22 }}>
      <Link
        to={`/epochs/${epoch.id}`}
        className="group block overflow-hidden rounded-3xl border border-parchment-deep bg-surface shadow-sm transition-shadow duration-300 hover:shadow-xl"
      >
        <div className="relative overflow-hidden">
          <img
            src={epoch.coverImage}
            alt={epoch.title}
            loading="lazy"
            className="aspect-[16/9] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5">
            <h3 className="font-display text-xl font-bold tracking-tight text-white drop-shadow-sm">
              {epoch.title}
            </h3>
            <span className="shrink-0 rounded-full bg-white/15 px-3 py-1 font-display text-xs italic text-white ring-1 ring-white/25 backdrop-blur-md">
              {epoch.years}
            </span>
          </div>
        </div>
        <div className="p-5">
          <p className="line-clamp-2 text-sm leading-relaxed text-ink-soft">{epoch.description}</p>
          {typeof bookCount === "number" && (
            <p className="mt-2 text-xs text-muted">
              {bookCount} {bookCount === 1 ? "veprë" : "vepra"}
            </p>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
