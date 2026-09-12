import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import { getBooksIndex, getEpochs } from "@/lib/data";
import type { BookIndexItem, Epoch } from "@/lib/types";
import BookCard from "@/components/BookCard";
import { Chip, EmptyState, SectionTitle } from "@/components/ui";
import type { AuthorIndexItem } from "@/lib/types";
import { getAuthorsIndex } from "@/lib/data";

/** Simple horizontal lifespan timeline for the authors of an epoch. */
function Timeline({
  epoch,
  authors,
}: {
  epoch: Epoch;
  authors: AuthorIndexItem[];
}) {
  const [start, end] = useMemo(() => {
    const [s, e] = epoch.years.split("–").map((n) => parseInt(n, 10));
    return [s || 1500, e || new Date().getFullYear()];
  }, [epoch.years]);
  const span = end - start;

  const details = useMemo(
    () =>
      authors
        .map((a) => ({
          ...a,
          born: a.dates.match(/\d{4}/)?.[0],
          died: a.dates.match(/\d{4}/g)?.[1],
        }))
        .sort((a, b) => Number(a.born ?? 9999) - Number(b.born ?? 9999)),
    [authors]
  );

  const LIMIT = 10;
  const [expanded, setExpanded] = useState(false);

  if (!details.length) return null;

  const visible = expanded || details.length <= LIMIT ? details : details.slice(0, LIMIT);
  const canCollapse = details.length > LIMIT;

  return (
    <div className="rounded-2xl border border-parchment-deep bg-surface p-6">
      <p className="mb-5 text-xs font-semibold uppercase tracking-wider text-muted">
        Kohëvizat e autorëve
      </p>
      <div className="space-y-3">
        {visible.map((a) => {
          const b = Number(a.born ?? start);
          const d = Number(a.died ?? Math.min(end, b + 70));
          const left = ((Math.max(b, start) - start) / span) * 100;
          const width = Math.max(((Math.min(d, end) - Math.max(b, start)) / span) * 100, 1.5);
          return (
            <div key={a.id} className="flex items-center gap-3">
              <Link to={`/authors/${a.id}`} className="w-36 shrink-0 truncate text-sm font-medium hover:text-brand">
                {a.name}
              </Link>
              <div className="relative h-2.5 flex-1 rounded-full bg-paper">
                <div
                  className="absolute inset-y-0 rounded-full bg-brand/80 transition-all"
                  style={{ left: `${left}%`, width: `${width}%` }}
                  title={`${b}–${d}`}
                />
              </div>
              <span className="w-24 shrink-0 text-right text-xs text-muted">{a.dates}</span>
            </div>
          );
        })}
      </div>
      {canCollapse && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-brand"
        >
          {expanded ? (
            <><ChevronUp className="size-3.5" /> Shfaq më pak</>
          ) : (
            <><ChevronDown className="size-3.5" /> Shfaq të gjitha ({details.length})</>
          )}
        </button>
      )}
    </div>
  );
}

export default function EpochDetail() {
  const { id } = useParams<{ id: string }>();
  const [epoch, setEpoch] = useState<Epoch | null>(null);
  const [books, setBooks] = useState<BookIndexItem[]>([]);
  const [authors, setAuthors] = useState<AuthorIndexItem[]>([]);
  const [tag, setTag] = useState<string>("");
  const [avail, setAvail] = useState<"" | "digitized" | "missing">("");

  useEffect(() => {
    if (!id) return;
    getEpochs().then((es) => setEpoch(es.find((e) => e.id === id) ?? null));
    getAuthorsIndex().then(setAuthors).catch(console.error);
    getBooksIndex()
      .then((items) =>
        setBooks(
          items
            .filter((b) => b.epochId === id && (b.channel ?? "main") === "main")
            .sort((a, b) => (a.publicationYear ?? 9999) - (b.publicationYear ?? 9999))
        )
      )
      .catch(console.error);
  }, [id]);

  if (!epoch)
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center sm:px-6">
        <p className="text-2xl font-semibold">Epoka nuk u gjet.</p>
        <Link to="/epochs" className="mt-3 inline-block text-brand hover:underline">
          Shiko të gjitha epokat
        </Link>
      </div>
    );

  const tags = [...new Set(books.flatMap((b) => b.tags))];
  const filtered = books
    .filter((b) => !tag || b.tags.includes(tag))
    .filter((b) =>
      !avail ||
      (avail === "missing" ? b.availability === "metadata-only" : b.availability !== "metadata-only")
    );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Link to="/epochs" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-brand">
        <ArrowLeft className="size-4" /> Të gjitha epokat
      </Link>

      {/* banner */}
      <div className="relative overflow-hidden rounded-3xl border border-parchment-deep shadow-lg">
        <img
          src={epoch.coverImage}
          alt=""
          className="h-64 w-full object-cover sm:h-80 lg:h-[26rem]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/5" />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-x-0 bottom-0 p-6 sm:p-10"
        >
          <span className="mb-3 inline-block rounded-full bg-white/15 px-4 py-1.5 font-display text-sm italic text-white ring-1 ring-white/30 backdrop-blur-md">
            {epoch.years}
          </span>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-white drop-shadow-sm sm:text-5xl">
            {epoch.title}
          </h1>
        </motion.div>
      </div>

      <p className="mx-auto mt-6 max-w-3xl leading-relaxed text-ink-soft">{epoch.description}</p>

      {authors.filter((a) => a.epochId === epoch.id || (a.epochIds ?? []).includes(epoch.id)).length > 0 && (
        <div className="mt-8">
          <Timeline epoch={epoch} authors={authors.filter((a) => a.epochId === epoch.id || (a.epochIds ?? []).includes(epoch.id))} />
        </div>
      )}

      <section className="mt-12">
        <SectionTitle title={`Veprat e epokës (${filtered.length})`} />
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {tags.length > 1 && (
            <>
              <Chip active={!tag} onClick={() => setTag("")}>Të gjitha</Chip>
              {tags.map((t) => (
                <Chip key={t} active={tag === t} onClick={() => setTag(tag === t ? "" : t)}>
                  {t}
                </Chip>
              ))}
            </>
          )}
          <div className="inline-flex overflow-hidden rounded-lg border border-parchment-deep text-sm font-medium">
            {(["", "digitized", "missing"] as const).map((opt, i) => (
              <button
                key={opt}
                onClick={() => setAvail(opt)}
                className={`px-3 py-1.5 transition-colors ${i > 0 ? "border-l border-parchment-deep" : ""} ${
                  avail === opt ? "bg-brand text-white" : "bg-paper text-ink-soft hover:bg-parchment"
                }`}
              >
                {opt === "" ? "Të gjitha" : opt === "digitized" ? "Me tekst" : "Pa tekst"}
              </button>
            ))}
          </div>
        </div>
        {filtered.length === 0 ? (
          <EmptyState message="Nuk ka vepra në këtë nënzhanr." />
        ) : (
          <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {filtered.map((b) => (
              <BookCard key={b.id} book={b} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
