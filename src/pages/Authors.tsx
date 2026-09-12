import { useEffect, useMemo, useState } from "react";
import { getAuthorsIndex, getEpochs, getLibraries } from "@/lib/data";
import type { AuthorIndexItem, Epoch, Library } from "@/lib/types";
import { AuthorCard, LibraryCard } from "@/components/Cards";
import { EmptyState, SectionTitle } from "@/components/ui";
import { FilterX, Search } from "lucide-react";

export default function Authors() {
  const [authors, setAuthors] = useState<AuthorIndexItem[]>([]);
  const [epochs, setEpochs] = useState<Epoch[]>([]);
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [q, setQ] = useState("");
  const [epochId, setEpochId] = useState("");
  const [libraryId, setLibraryId] = useState("");
  const [sort, setSort] = useState<"name" | "books">("name");

  const SEL =
    "rounded-lg border border-parchment-deep bg-paper px-3 py-2 text-sm font-medium text-ink outline-none transition-colors focus:border-brand";

  useEffect(() => {
    getAuthorsIndex().then(setAuthors).catch(console.error);
    getEpochs().then(setEpochs).catch(console.error);
    getLibraries().then(setLibraries).catch(console.error);
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase("sq");
    return authors
      .filter(
        (a) =>
          (!epochId || a.epochId === epochId || (a.epochIds ?? []).includes(epochId)) &&
          (!libraryId || a.libraryId === libraryId) &&
          (!needle ||
            a.name.toLocaleLowerCase("sq").includes(needle) ||
            (a.altNames ?? []).some((n) => n.toLocaleLowerCase("sq").includes(needle)))
      )
      .sort((a, b) =>
        sort === "name"
          ? a.name.localeCompare(b.name, "sq")
          : b.bookCount - a.bookCount || a.name.localeCompare(b.name, "sq")
      );
  }, [authors, q, epochId, libraryId, sort]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <SectionTitle title="Autorët" subtitle={`${authors.length} zëra të letërsisë shqipe`} />

      {/* library cards */}
      {libraries.length > 0 && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {libraries.map((lib) => (
            <LibraryCard key={lib.id} library={lib} active={libraryId === lib.id} />
          ))}
        </div>
      )}

      <div className="mb-8 flex flex-wrap items-center gap-2 rounded-xl border border-parchment-deep bg-surface p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Kërko autor…"
            className="w-full max-w-xs rounded-lg border border-parchment-deep bg-paper py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-brand"
          />
        </div>

        <select
          value={epochId}
          onChange={(e) => setEpochId(e.target.value)}
          className={SEL}
          aria-label="Filtro sipas epokës"
        >
          <option value="">Epoka · Të gjitha</option>
          {epochs.map((e) => (
            <option key={e.id} value={e.id}>{e.title}</option>
          ))}
        </select>

        {libraries.length > 1 && (
          <select
            value={libraryId}
            onChange={(e) => setLibraryId(e.target.value)}
            className={SEL}
            aria-label="Filtro sipas bibliotekës"
          >
            <option value="">Biblioteka · Të gjitha</option>
            {libraries.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        )}

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as "name" | "books")}
          className={SEL}
          aria-label="Rendit autorët"
        >
          <option value="name">Renditja · Emri</option>
          <option value="books">Renditja · Veprat</option>
        </select>

        {(q || epochId || libraryId) && (
          <button
            onClick={() => { setQ(""); setEpochId(""); setLibraryId(""); }}
            title="Pastro filtrat"
            aria-label="Pastro filtrat"
            className="grid size-[38px] shrink-0 place-items-center rounded-lg border border-parchment-deep bg-paper text-muted transition-colors hover:border-brand hover:text-brand"
          >
            <FilterX className="size-4" />
          </button>
        )}

        <span className="ml-auto text-sm text-muted">{filtered.length} autorë</span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="Asnjë autor me këto kritere." />
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filtered.map((a) => (
            <AuthorCard key={a.id} author={a} />
          ))}
        </div>
      )}
    </div>
  );
}
