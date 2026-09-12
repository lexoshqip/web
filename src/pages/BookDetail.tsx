import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookmarkPlus,
  BookmarkCheck,
  BookOpen,
  Clock,
  Download,
  FileCode,
  Headphones,
  Landmark,
  ScrollText,
  Star,
} from "lucide-react";
import { getBook, getEpochs, getCollections } from "@/lib/data";
import { getProgress, PROGRESS_EVENT } from "@/lib/db";
import { useLibrary } from "@/lib/store";
import { useAudioPlayer } from "@/lib/player";
import type { Book, BookEdition, Collection, Epoch, FormatKind } from "@/lib/types";
import BookCard from "@/components/BookCard";
import { SectionTitle } from "@/components/ui";
import { FormatChips } from "@/components/BookCard";
import { RightsBadge, RightsPanel } from "@/components/Rights";

const FORMAT_META: Record<FormatKind, { label: string; hint: string; icon: React.ComponentType<{ className?: string }> }> = {
  epub: { label: "EPUB", hint: "Lexues e-books", icon: BookOpen },
  pdf: { label: "PDF", hint: "Shtyp & ruaj", icon: ScrollText },
  md: { label: "Markdown", hint: "Burimi kryesor", icon: FileCode },
  audio: { label: "Audio", hint: "Dëgjo versionin", icon: Headphones },
};

const FormatIcon = ({ fmt, className }: { fmt: FormatKind; className?: string }) => {
  const Icon = FORMAT_META[fmt]?.icon ?? BookOpen;
  return <Icon className={className} />;
};

export default function BookDetail() {
  const { id } = useParams<{ id: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const [missing, setMissing] = useState(false);
  const [epochs, setEpochs] = useState<Epoch[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  /* the format+edition the user last read/listened to on this device */
  const [resume, setResume] = useState<{
    fmt: FormatKind;
    percent: number;
    editionId?: string;
  } | null>(null);

  const favorites = useLibrary((s) => s.favorites);
  const toggleFavorite = useLibrary((s) => s.toggleFavorite);
  const ratings = useLibrary((s) => s.ratings);
  const setRating = useLibrary((s) => s.setRating);
  const player = useAudioPlayer();

  /* audio opens the global popup player, resuming the saved position.
     An optional edition selects that narration's chapters + progress slot. */
  const listenNow = (e: React.MouseEvent, ed?: BookEdition) => {
    if (!player || !book) return;
    e.preventDefault();
    const key = `${book.id}:audio${ed ? `:${ed.id}` : ""}`;
    let chapters: import("@/lib/player").AudioChapter[] | undefined;
    if (ed?.audioChapters) {
      try {
        chapters = JSON.parse(ed.audioChapters);
      } catch {
        /* malformed manifest — fall back to the book default */
      }
    }
    getProgress(key)
      .then((p) => {
        player.loadBook(book, {
          autoplay: true,
          seekTo: p ? Number(p.position) || 0 : 0,
          ...(chapters ? { chapters, editionId: ed!.id } : {}),
        });
        player.setPanelOpen(true);
      })
      .catch(() => {
        player.loadBook(book, {
          autoplay: true,
          ...(chapters ? { chapters, editionId: ed!.id } : {}),
        });
        player.setPanelOpen(true);
      });
  };

  useEffect(() => {
    if (!id) return;
    setBook(null);
    setMissing(false);
    getBook(id)
      .then(setBook)
      .catch(() => setMissing(true));
    getEpochs().then(setEpochs).catch(console.error);
    getCollections().then(setCollections).catch(console.error);
  }, [id]);

  /* bump whenever any reader/player writes progress — keeps the CTA live
     (e.g. the popup audio player saves while this page stays mounted) */
  const [resumeTick, setResumeTick] = useState(0);
  useEffect(() => {
    const onSaved = () => setResumeTick((t) => t + 1);
    window.addEventListener(PROGRESS_EVENT, onSaved);
    return () => window.removeEventListener(PROGRESS_EVENT, onSaved);
  }, []);

  useEffect(() => {
    if (!id || !book) return;
    const fmts = (Object.keys(book.formats) as FormatKind[]).filter(
      (f) => book.formats[f]
    );
    /* base slots + one slot per edition variant */
    const keys: { fmt: FormatKind; editionId?: string }[] = fmts.map((f) => ({ fmt: f }));
    for (const ed of book.editions ?? [])
      keys.push({ fmt: ed.format, editionId: ed.id });
    if (!keys.length) return;
    let cancelled = false;
    Promise.all(
      keys.map(({ fmt, editionId }) =>
        getProgress(`${id}:${fmt}${editionId ? `:${editionId}` : ""}`).then(
          (p) => ({ fmt, editionId, p })
        )
      )
    )
      .then((rows) => {
        if (cancelled) return;
        const touched = rows.filter((r) => r.p);
        if (!touched.length) return;
        const latest = touched.reduce((a, b) =>
          (b.p?.updatedAt ?? 0) > (a.p?.updatedAt ?? 0) ? b : a
        );
        setResume({
          fmt: latest.fmt,
          percent: latest.p!.percent,
          ...(latest.editionId ? { editionId: latest.editionId } : {}),
        });
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [id, book, resumeTick]);

  if (missing)
    return (
      <Shell>
        <Empty404 />
      </Shell>
    );
  if (!book)
    return (
      <Shell>
        <DetailSkeleton />
      </Shell>
    );

  const epoch = epochs.find((e) => e.id === book.epochId);
  const isFav = favorites.includes(book.id);
  const myRating = ratings[book.id] ?? 0;
  const KNOWN = new Set<string>(["md", "epub", "pdf", "audio"]);
  const formats = (Object.entries(book.formats) as [FormatKind, string][])
    .filter(([k]) => KNOWN.has(k));
  /* primary CTA resumes the last-used format, else falls back to the first */
  const primaryFmt = resume?.fmt ?? formats[0]?.[0];
  const primaryEd = resume?.editionId;
  const primaryLabel =
    primaryFmt == null
      ? ""
      : primaryFmt === "audio"
        ? "Dëgjo online"
        : `Lexo online · ${FORMAT_META[primaryFmt]?.label ?? primaryFmt.toUpperCase()}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Link to="/books" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-brand">
        <ArrowLeft className="size-4" /> Kthehu te katalogu
      </Link>

      <div className="grid gap-10 lg:grid-cols-[300px_1fr]">
        {/* cover column */}
        <div>
          <img
            src={book.cover}
            alt={`Kopertina e librit ${book.title}`}
            className="w-full rounded-xl border border-parchment-deep shadow-lg"
          />
          <div className="mt-4 space-y-2 text-center text-xs text-muted">
            {book.coverCredit && <p className="mx-auto max-w-[300px] leading-snug">{book.coverCredit}</p>}
            <RightsBadge rights={book.rights} />
          </div>
        </div>

        {/* info column */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {epoch && (
              <Link to={`/epochs/${epoch.id}`} className="inline-flex items-center gap-1.5 rounded-full bg-parchment px-3 py-1 font-medium text-ink-soft hover:text-brand">
                <Landmark className="size-3.5" /> {epoch.title}
              </Link>
            )}
            <span className="font-display italic text-gold">{book.publicationYear}</span>
            {book.readingMinutes != null && (
              <span className="inline-flex items-center gap-1 text-xs text-muted">
                <Clock className="size-3.5" /> ≈ {book.readingMinutes} min lexim
              </span>
            )}
            {book.ageGroup && (
              <span className="rounded-full border border-parchment-deep px-2.5 py-0.5 text-[11px] font-medium text-muted">
                {book.ageGroup}
              </span>
            )}
            {book.language && (
              <span className="rounded-full border border-parchment-deep px-2.5 py-0.5 text-[11px] font-medium uppercase text-muted">
                {book.language}
              </span>
            )}
            {book.accessType === "trial" && (
              <span className="rounded-full bg-brand px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                Fragment / Provë
              </span>
            )}
          </div>

          <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight sm:text-4xl">
            {book.title}
          </h1>
          {book.subtitle && (
            <p className="mt-1 font-display text-lg italic text-ink-soft">{book.subtitle}</p>
          )}
          <Link
            to={`/authors/${book.authorId}`}
            className="mt-2 inline-block text-lg font-medium text-ink-soft hover:text-brand"
          >
            {book.authorName}
          </Link>
          {book.translator && (
            <p className="mt-1 text-sm italic text-muted">Përktheu: {book.translator}</p>
          )}
          {book.originalTitle && (
            <p className="mt-0.5 text-sm text-muted">
              Titulli origjinal: «{book.originalTitle}»
              {book.originalLanguage ? ` (${book.originalLanguage.toUpperCase()})` : ""}
            </p>
          )}

          <p className="mt-5 max-w-3xl leading-relaxed text-ink-soft">{book.synopsis}</p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {book.tags.map((t) => (
              <Link
                key={t}
                to={`/books?tag=${encodeURIComponent(t)}`}
                className="rounded-full border border-parchment-deep bg-surface px-3 py-1 text-sm text-ink-soft transition-colors hover:border-brand hover:text-brand"
              >
                {t}
              </Link>
            ))}
            {(book.collectionIds ?? []).map((cid) => {
              const col = collections.find((k) => k.id === cid);
              return col ? (
                <Link
                  key={cid}
                  to={`/collections/${cid}`}
                  className="rounded-full bg-gold/15 px-3 py-1 text-sm font-medium text-gold transition-colors hover:bg-gold/25"
                >
                  {col.title}
                </Link>
              ) : null;
            })}
          </div>

          {/* actions */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {formats.length > 0 && (
              <Link
                to={`/read/${book.id}/${primaryFmt}${primaryEd ? `/${primaryEd}` : ""}`}
                onClick={primaryFmt === "audio" ? listenNow : undefined}
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark"
              >
                <BookOpen className="size-5" />
                {primaryLabel}
              </Link>
            )}
            <button
              onClick={() => toggleFavorite(book.id)}
              className={`inline-flex items-center gap-2 rounded-xl border px-5 py-3 font-semibold transition-colors ${
                isFav
                  ? "border-brand bg-brand-soft text-brand"
                  : "border-parchment-deep bg-surface text-ink-soft hover:border-brand hover:text-brand"
              }`}
            >
              {isFav ? <BookmarkCheck className="size-4" /> : <BookmarkPlus className="size-4" />}
              {isFav ? "Në favorite" : "Shto në favorite"}
            </button>
            <StarRating rating={myRating} onChange={(s) => setRating(book.id, s)} />
            {resume && (
              <Link
                to={`/read/${book.id}/${resume.fmt}${resume.editionId ? `/${resume.editionId}` : ""}`}
                onClick={resume.fmt === "audio" ? listenNow : undefined}
                className="inline-flex items-center gap-2 rounded-xl border border-gold/60 bg-gold/10 px-5 py-3 text-sm font-semibold text-gold"
              >
                {resume.fmt === "audio" ? "Vazhdo dëgjimin" : "Vazhdo leximin"} ·{" "}
                {Math.round(resume.percent * 100)}%
              </Link>
            )}
          </div>
          {formats.length === 0 && (
            <div className="mt-4 rounded-xl border border-parchment-deep bg-parchment/60 p-5">
              <p className="font-medium text-ink">Ky titull është ende pa tekst digjital.</p>
              <p className="mt-1 text-sm text-muted">
                Regjistrimi bibliografik do të plotësohet me tekstin origjinal pas skanimit,
                redaktimit dhe verifikimit juridik.
              </p>
            </div>
          )}

          {/* downloads */}
          {formats.length > 0 && (
            <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-2">
            {formats.map(([fmt, url]) => {
              const eds = (book.editions ?? []).filter((ed) => ed.format === fmt);
              const versions: Array<{ key: string; label: string; url: string; editionId?: string; ed?: BookEdition }> = [
                ...(url
                  ? [{
                      key: `${fmt}-base`,
                      label: eds.length ? "Origjinali" : (FORMAT_META[fmt]?.label ?? fmt.toUpperCase()),
                      url,
                      editionId: undefined,
                    }]
                  : []),
                ...eds.map((ed) => ({ key: ed.id, label: ed.label || ed.id, url: ed.url, editionId: ed.id, ed })),
              ];
              return (
                <div key={fmt} className="sm:col-span-1 sm:col-start-auto col-span-full">
                  {/* format header */}
                  <div className="flex items-center gap-3 px-1 pb-2">
                    <span className="grid size-9 place-items-center rounded-lg bg-parchment text-ink-soft">
                      <FormatIcon fmt={fmt} className="size-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{FORMAT_META[fmt]?.label ?? fmt.toUpperCase()}</p>
                      <p className="text-xs text-muted">{FORMAT_META[fmt]?.hint}</p>
                    </div>
                  </div>

                  {/* every version is an equal row */}
                  <div className="divide-y divide-parchment-deep overflow-hidden rounded-xl border border-parchment-deep bg-surface">
                    {versions.map((v) => (
                      <div key={v.key} className="flex items-center justify-between px-4 py-2">
                        <Link
                          to={`/read/${book.id}/${fmt}${v.editionId ? `/${v.editionId}` : ""}`}
                          onClick={fmt === "audio" ? (e) => listenNow(e, v.ed) : undefined}
                          className="truncate py-1 text-sm font-medium transition-colors hover:text-brand"
                          title={v.url.split("/").pop()}
                        >
                          {v.label}
                        </Link>
                        <div className="ml-3 flex shrink-0 items-center">
                          <Link
                            to={`/read/${book.id}/${fmt}${v.editionId ? `/${v.editionId}` : ""}`}
                            onClick={fmt === "audio" ? (e) => listenNow(e, v.ed) : undefined}
                            className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-brand hover:bg-brand-soft"
                          >
                            {fmt === "audio" ? "Dëgjo" : "Lexo"}
                          </Link>
                          <a
                            href={v.url}
                            download
                            className="grid size-8 place-items-center rounded-lg text-ink-soft hover:bg-parchment"
                            aria-label={`Shkarko ${v.label}`}
                          >
                            <Download className="size-4" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          )}

          {formats.length > 0 && (
            <div className="mt-6 flex items-center gap-2 text-xs text-muted">
              <span>Formatet:</span>
              <FormatChips formats={book.formats} />
            </div>
          )}

          {/* narrator / isbn — small bibliographic print */}
          {(book.narrator || book.isbn) && (
            <p className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
              {book.narrator && (
                <span className="inline-flex items-center gap-1.5">
                  <Headphones className="size-3.5" /> Tregojnë: {book.narrator}
                </span>
              )}
              {book.isbn && <span>ISBN {book.isbn}</span>}
            </p>
          )}

          {/* license tier + provenance (where the text came from) */}
          <RightsPanel rights={book.rights} />
        </div>
      </div>

      {/* related */}
      {book.relatedIds.length > 0 && (
        <section className="mt-16">
          <SectionTitle title="Libra të lidhur" subtitle="Nga i njëjti autor apo epokë" />
          <RelatedGrid ids={book.relatedIds} />
        </section>
      )}
    </div>
  );
}

function RelatedGrid({ ids }: { ids: string[] }) {
  const [books, setBooks] = useState<Book[]>([]);
  useEffect(() => {
    Promise.all(ids.map((id) => getBook(id).catch(() => null)))
      .then((rs) => setBooks(rs.filter((b): b is Book => !!b)))
      .catch(console.error);
  }, [ids]);

  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
      {books.map((b) => (
        <BookCard key={b.id} book={b} />
      ))}
    </div>
  );
}

function StarRating({ rating, onChange }: { rating: number; onChange: (stars: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-parchment-deep bg-surface px-4 py-3">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          onClick={() => onChange(rating === s ? 0 : s)}
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          aria-label={`Vlerëso ${s} yll`}
          className="transition-transform hover:scale-110"
        >
          <Star
            className={`size-5 transition-colors ${
              s <= (hover || rating)
                ? "fill-gold text-gold"
                : "fill-transparent text-parchment-deep"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">{children}</div>;
}

function Empty404() {
  return (
    <div className="grid place-items-center py-24 text-center">
      <p className="text-2xl font-semibold">Libri nuk u gjet.</p>
      <Link to="/books" className="mt-3 text-brand hover:underline">Shko te katalogu</Link>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid animate-pulse gap-10 lg:grid-cols-[300px_1fr]">
      <div className="aspect-[5/8] w-full rounded-xl bg-parchment-deep/60" />
      <div className="space-y-4 py-4">
        <div className="h-8 w-2/3 rounded bg-parchment-deep/60" />
        <div className="h-5 w-1/3 rounded bg-parchment-deep/60" />
        <div className="h-24 w-full rounded bg-parchment-deep/60" />
        <div className="h-12 w-64 rounded bg-parchment-deep/60" />
      </div>
    </div>
  );
}
