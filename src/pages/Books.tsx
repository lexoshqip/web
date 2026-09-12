import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { listBooks, getEpochs, getBooksIndex, getLibraries } from "@/lib/data";
import type { BookIndexItem, BookSort, Epoch, Library } from "@/lib/types";
import BookCard from "@/components/BookCard";
import { LibraryCard } from "@/components/Cards";
import { EmptyState, Pagination, SectionTitle } from "@/components/ui";
import { FilterX, Headphones } from "lucide-react";

const SEL =
  "rounded-lg border border-parchment-deep bg-paper px-3 py-2 text-sm font-medium text-ink outline-none transition-colors focus:border-brand";

const SORTS: { value: BookSort; label: string }[] = [
  { value: "year", label: "Viti ↑" },
  { value: "year-desc", label: "Viti ↓" },
  { value: "title", label: "Titulli A–Z" },
];

export default function Books() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const epoch = params.get("epoch") ?? "";
  const tag = params.get("tag") ?? "";
  const authorId = params.get("authorId") ?? "";
  const libraryId = params.get("library") ?? "";
  const audioOnly = params.get("audio") === "1";
  const avail = (params.get("avail") ?? "") as "" | "digitized" | "missing";
  const channel = (params.get("channel") as "main" | "emerging" | null) ?? "main";
  const sort = (params.get("sort") as BookSort) || "year";
  const page = Number(params.get("page") ?? 1);

  const [books, setBooks] = useState<BookIndexItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [epochs, setEpochs] = useState<Epoch[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [libraries, setLibraries] = useState<Library[]>([]);

  useEffect(() => {
    getEpochs().then(setEpochs).catch(console.error);
    getLibraries().then(setLibraries).catch(console.error);
    getBooksIndex().then((items) =>
      setTags([...new Set(items.flatMap((b) => b.tags))].sort((a, b) => a.localeCompare(b, "sq")))
    );
  }, []);

  const filter = useMemo(
    () => ({
      q,
      epoch: epoch || undefined,
      tag: tag || undefined,
      authorId: authorId || undefined,
      libraryId: libraryId || undefined,
      sort,
      page,
      hasAudio: audioOnly || undefined,
      availFilter: avail || undefined,
      channel,
    }),
    [q, epoch, tag, authorId, libraryId, sort, page, audioOnly, avail, channel]
  );

  useEffect(() => {
    let live = true;
    listBooks(filter)
      .then((r) => {
        if (!live) return;
        setBooks(r.items);
        setTotal(r.total);
      })
      .catch(console.error);
    return () => {
      live = false;
    };
  }, [filter]);

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (!v) next.delete(k);
      else next.set(k, v);
    }
    if (!("page" in patch)) next.delete("page");
    setParams(next, { replace: true });
  };

  const totalPages = Math.ceil(total / 24);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <SectionTitle
        title="Katalogu i librave"
        subtitle={`${total} vepra`}
      />

      {/* library cards */}
      {libraries.length > 0 && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {libraries.map((lib) => (
            <LibraryCard key={lib.id} library={lib} active={libraryId === lib.id} />
          ))}
        </div>
      )}

      {/* filters — compact toolbar */}
      <div className="mb-8 flex flex-wrap items-center gap-2 rounded-xl border border-parchment-deep bg-surface p-3">
        <select
          value={epoch}
          onChange={(e) => update({ epoch: e.target.value || null })}
          className={SEL}
          aria-label="Filtro sipas epokës"
        >
          <option value="">Epoka · Të gjitha</option>
          {epochs.map((e) => (
            <option key={e.id} value={e.id}>{e.title}</option>
          ))}
        </select>

        <select
          value={tag}
          onChange={(e) => update({ tag: e.target.value || null })}
          className={SEL}
          aria-label="Filtro sipas zhanrit"
        >
          <option value="">Zhanri · Të gjitha</option>
          {tags.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select
          value={channel}
          onChange={(e) => update({ channel: e.target.value === "main" ? null : e.target.value })}
          className={SEL}
          aria-label="Kanali"
        >
          <option value="main">Kanonike</option>
          <option value="all">Të gjitha veprat</option>
          <option value="emerging">Autorë të rinj</option>
        </select>

        {libraries.length > 1 && (
          <select
            value={libraryId}
            onChange={(e) => update({ library: e.target.value || null })}
            className={SEL}
            aria-label="Filtro sipas bibliotekës"
          >
            <option value="">Biblioteka · Të gjitha</option>
            {libraries.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        )}

        <button
          onClick={() => update({ audio: audioOnly ? null : "1" })}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            audioOnly
              ? "border-brand bg-brand text-white"
              : "border-parchment-deep bg-paper text-ink-soft hover:border-brand/50"
          }`}
          aria-pressed={audioOnly}
        >
          <Headphones className="size-4" /> Audio
        </button>

        <div className="inline-flex overflow-hidden rounded-lg border border-parchment-deep text-sm font-medium">
          {(["", "digitized", "missing"] as const).map((opt, i) => (
            <button
              key={opt}
              onClick={() => update({ avail: opt || null })}
              className={`px-3 py-2 transition-colors ${i > 0 ? "border-l border-parchment-deep" : ""} ${
                avail === opt ? "bg-brand text-white" : "bg-paper text-ink-soft hover:bg-parchment"
              }`}
            >
              {opt === "" ? "Të gjitha" : opt === "digitized" ? "Me tekst" : "Pa tekst"}
            </button>
          ))}
        </div>

        <select
          value={sort}
          onChange={(e) => update({ sort: e.target.value })}
          className={`${SEL} ml-auto`}
          aria-label="Renditja"
        >
          {SORTS.map((st) => (
            <option key={st.value} value={st.value}>{st.label}</option>
          ))}
        </select>

        {authorId && (
          <button onClick={() => update({ authorId: null })} className="rounded-lg bg-brand-soft px-3 py-2 text-sm font-medium text-brand">
            Autor #{authorId} ×
          </button>
        )}

        {(epoch || tag || authorId || audioOnly || avail || q || libraryId || channel !== "main") && (
          <button
            onClick={() =>
              update({ epoch: null, tag: null, authorId: null, q: null, audio: null, avail: null, channel: null, library: null })
            }
            title="Pastro filtrat"
            aria-label="Pastro filtrat"
            className="grid size-[38px] shrink-0 place-items-center rounded-lg border border-parchment-deep bg-paper text-muted transition-colors hover:border-brand hover:text-brand"
          >
            <FilterX className="size-4" />
          </button>
        )}
      </div>

      {!books ? (
        <GridSkeleton />
      ) : books.length === 0 ? (
        <EmptyState message="Asnjë libër me këto filtra." hint="Provoni një epokë ose zhanër tjetër." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {books.map((b) => (
              <BookCard key={b.id} book={b} />
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onPage={(p) => update({ page: String(p) })} />
        </>
      )}
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[5/8] w-full rounded-xl bg-parchment-deep/60" />
          <div className="mt-3 h-4 w-3/4 rounded bg-parchment-deep/60" />
        </div>
      ))}
    </div>
  );
}
