import FlexSearch from "flexsearch";
import type {
  Author,
  AuthorIndexItem,
  Book,
  BookFilter,
  BookIndexItem,
  BookSort,
  Collection,
  Epoch,
  FeaturedPayload,
  Library,
  Manifest,
  Paged,
  SearchResults,
} from "./types";
// re-export for convenience
export type { Library } from "./types";

/**
 * The ONLY data entry point of the app (spec §4).
 * Fetches the generated static JSON API under /api and does
 * filtering / sorting / pagination in memory.
 */

const BASE = import.meta.env.BASE_URL ?? "/";

const cache = new Map<string, Promise<unknown>>();

function fetchJson<T>(path: string): Promise<T> {
  const key = BASE + path;
  let p = cache.get(key);
  if (!p) {
    p = fetch(key).then((res) => {
      if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
      return res.json() as Promise<T>;
    });
    cache.set(key, p);
    p.catch(() => cache.delete(key));
  }
  return p as Promise<T>;
}

export const getManifest = () => fetchJson<Manifest>("api/manifest.json");
export const getEpochs = () =>
  fetchJson<{ items: Epoch[] }>("api/epochs.json").then((d) => d.items);
export const getCollections = () =>
  fetchJson<{ items: Collection[] }>("api/collections.json").then((d) => d.items);
export const getLibraries = () =>
  fetchJson<{ items: Library[] }>("api/libraries.json").then((d) => d.items);
export const getLibrary = (id: string) =>
  getLibraries().then((libs) => {
    const lib = libs.find((l) => l.id === id);
    if (!lib) throw new Error(`Library not found: ${id}`);
    return lib;
  });
export const getBooksIndex = () =>
  fetchJson<{ items: BookIndexItem[] }>("api/books/index.json").then((d) => d.items);
export const getAuthorsIndex = () =>
  fetchJson<{ items: AuthorIndexItem[] }>("api/authors/index.json").then((d) => d.items);
export const getFeaturedPayload = () =>
  fetchJson<FeaturedPayload>("api/featured.json");

const bookCache = new Map<string, Promise<Book>>();
export function getBook(id: string): Promise<Book> {
  let p = bookCache.get(id);
  if (!p) {
    p = fetchJson<Book>(`api/books/${id}.json`);
    bookCache.set(id, p);
    p.catch(() => bookCache.delete(id));
  }
  return p;
}

export function getAuthor(id: string): Promise<Author> {
  return fetchJson<Author>(`api/authors/${id}.json`);
}

/* ---------------- filtering / sorting / paging ---------------- */

function sortItems(items: BookIndexItem[], sort?: BookSort) {
  const s = [...items];
  switch (sort) {
    case "title":
      return s.sort((a, b) => a.title.localeCompare(b.title, "sq"));
    case "year-desc":
      return s.sort((a, b) => b.publicationYear - a.publicationYear);
    case "year":
      return s.sort((a, b) => a.publicationYear - b.publicationYear);
    default:
      return s;
  }
}

export async function listBooks(filter: BookFilter = {}): Promise<Paged<BookIndexItem>> {
  const all = await getBooksIndex();
  const q = filter.q?.trim().toLocaleLowerCase("sq") ?? "";
  const channel = filter.channel ?? "main";
  let items = all.filter(
    (b) =>
      (channel === "all" || (b.channel ?? "main") === channel) &&
      (!filter.hasAudio || !!b.hasAudio) &&
      (!filter.availFilter ||
        (filter.availFilter === "missing"
          ? b.availability === "metadata-only"
          : b.availability !== "metadata-only")) &&
      (!filter.collectionId || (b.collectionIds ?? []).includes(filter.collectionId)) &&
      (!filter.epoch || b.epochId === filter.epoch) &&
      (!filter.authorId || b.authorId === filter.authorId) &&
      (!filter.libraryId || b.libraryId === filter.libraryId) &&
      (!filter.tag || b.tags.includes(filter.tag)) &&
      (!q ||
        b.title.toLocaleLowerCase("sq").includes(q) ||
        b.authorName.toLocaleLowerCase("sq").includes(q))
  );
  items = sortItems(items, filter.sort);
  const pageSize = Math.max(1, Math.min(50, filter.pageSize ?? 24));
  const total = items.length;
  const page = Math.max(1, Math.min(Math.ceil(total / pageSize) || 1, filter.page ?? 1));
  return { items: items.slice((page - 1) * pageSize, page * pageSize), page, pageSize, total };
}

/* ---------------- search (metadata-only, spec §3) ---------------- */

interface SearchIndexFile {
  books: { id: string; text: string }[];
  authors: { id: string; text: string }[];
  epochs: { id: string; text: string }[];
}

let searchPromise: Promise<{
  booksIndex: FlexSearchIndex;
  authorsIndex: FlexSearchIndex;
  epochsIndex: FlexSearchIndex;
}> | null = null;

interface FlexSearchIndex {
  add(id: number, text: string): void;
  search(q: string, opts?: { limit?: number }): number[];
}

async function loadSearchIndexes() {
  const [idx, books, authors] = await Promise.all([
    fetchJson<SearchIndexFile>("api/search-index.json"),
    getBooksIndex(),
    getAuthorsIndex(),
  ]);
  const make = (): FlexSearchIndex => new (FlexSearch as any).Index({ tokenize: "forward" });
  const booksIndex = make();
  const authorsIndex = make();
  const epochsIndex = make();
  for (const it of idx.books) booksIndex.add(hashId(it.id), it.text);
  for (const it of idx.authors) authorsIndex.add(hashId(it.id), it.text);
  for (const it of idx.epochs) epochsIndex.add(hashId(it.id), it.text);
  // keep id maps so numeric flexsearch ids resolve back to slugs
  (booksIndex as any)._mapById = new Map(books.map((b) => [hashId(b.id), b]));
  (authorsIndex as any)._mapById = new Map(authors.map((a) => [hashId(a.id), a]));
  (epochsIndex as any)._mapById = new Map(idx.epochs.map((e) => [hashId(e.id), e.id]));
  return { booksIndex, authorsIndex, epochsIndex };
}

function hashId(id: string): number {
  let h = 5381;
  for (let i = 0; i < id.length; i++) h = ((h << 5) + h + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export async function searchMetadata(q: string, limitPerType = 8): Promise<SearchResults> {
  const query = q.trim();
  if (query.length < 2) return { books: [], authors: [], epochs: [] };
  if (!searchPromise) searchPromise = loadSearchIndexes();
  const idx = await searchPromise;

  const pick = <T>(index: FlexSearchIndex, limit: number): T[] => {
    const map = (index as any)._mapById as Map<number, T>;
    return index.search(query, { limit }).flatMap((h) => {
      const v = map.get(h);
      return v ? [v] : [];
    });
  };

  const epochs = await getEpochs();
  const epochMap = new Map(epochs.map((e) => [e.id, e]));
  return {
    books: pick<BookIndexItem>(idx.booksIndex, limitPerType),
    authors: pick<AuthorIndexItem>(idx.authorsIndex, limitPerType),
    epochs: pick<string>(idx.epochsIndex, limitPerType)
      .map((id) => epochMap.get(id))
      .filter((e): e is Epoch => !!e),
  };
}

/* ---------------- landing payload ---------------- */

export interface LandingData {
  heroBooks: BookIndexItem[];
  selectedBooks: BookIndexItem[];
  featuredAuthors: AuthorIndexItem[];
  epochs: Epoch[];
}

export async function getFeatured(): Promise<LandingData> {
  const [payload, books, authors, allEpochs] = await Promise.all([
    getFeaturedPayload(),
    getBooksIndex(),
    getAuthorsIndex(),
    getEpochs(),
  ]);
  const bookMap = new Map(books.map((b) => [b.id, b]));
  const authorMap = new Map(authors.map((a) => [a.id, a]));
  const epochOrder = new Map(allEpochs.map((e, i) => [e.id, i]));
  const pickBooks = (ids: string[]) =>
    ids.flatMap((id) => (bookMap.has(id) ? [bookMap.get(id)!] : []));
  return {
    heroBooks: pickBooks(payload.heroBookIds),
    selectedBooks: pickBooks(payload.selectedBookIds ?? []),
    featuredAuthors: payload.featuredAuthorIds
      .flatMap((id) => (authorMap.has(id) ? [authorMap.get(id)!] : []))
      .sort((a, b) => (epochOrder.get(a.epochId ?? "") ?? 0) - (epochOrder.get(b.epochId ?? "") ?? 0)),
    epochs: payload.epochIds
      .map((id) => allEpochs.find((e) => e.id === id))
      .filter((e): e is Epoch => !!e),
  };
}
