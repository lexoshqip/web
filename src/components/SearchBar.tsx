import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen, Loader2, Search, User, Landmark } from "lucide-react";
import { searchMetadata } from "@/lib/data";
import type { SearchResults } from "@/lib/types";

const EMPTY: SearchResults = { books: [], authors: [], epochs: [] };

export default function SearchBar() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults(EMPTY);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        setResults(await searchMetadata(q));
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setFocused(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const hasResults =
    results.books.length + results.authors.length + results.epochs.length > 0;

  return (
    <div ref={boxRef} className="relative">
      <div className="flex items-center gap-2 rounded-xl border border-parchment-deep bg-surface px-3 py-2 transition-colors focus-within:border-brand">
        <Search className="size-4 shrink-0 text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && q.trim()) {
              navigate(`/books?q=${encodeURIComponent(q.trim())}`);
              setFocused(false);
            }
          }}
          placeholder="Kërko libra, autorë, epoka…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
        />
        {loading && <Loader2 className="size-4 animate-spin text-muted" />}
      </div>

      {focused && q.trim().length >= 2 && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 max-h-96 overflow-auto rounded-xl border border-parchment-deep bg-surface p-2 shadow-xl">
          {!hasResults && !loading && (
            <p className="px-3 py-6 text-center text-sm text-muted">
              Asnjë rezultat për «{q}»
            </p>
          )}
          {results.books.length > 0 && (
            <Group icon={<BookOpen className="size-3.5" />} label="Libra">
              {results.books.map((b) => (
                <ResultRow key={b.id} to={`/books/${b.id}`} onGo={() => setFocused(false)}>
                  <span className="font-medium">{b.title}</span>
                  <span className="text-muted"> · {b.authorName}</span>
                </ResultRow>
              ))}
            </Group>
          )}
          {results.authors.length > 0 && (
            <Group icon={<User className="size-3.5" />} label="Autorë">
              {results.authors.map((a) => (
                <ResultRow key={a.id} to={`/authors/${a.id}`} onGo={() => setFocused(false)}>
                  <span className="font-medium">{a.name}</span>
                  <span className="text-muted"> · {a.dates}</span>
                </ResultRow>
              ))}
            </Group>
          )}
          {results.epochs.length > 0 && (
            <Group icon={<Landmark className="size-3.5" />} label="Epokat">
              {results.epochs.map((e) => (
                <ResultRow key={e.id} to={`/epochs/${e.id}`} onGo={() => setFocused(false)}>
                  <span className="font-medium">{e.title}</span>
                  <span className="text-muted"> · {e.years}</span>
                </ResultRow>
              ))}
            </Group>
          )}
        </div>
      )}
    </div>
  );
}

function Group({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-1 last:mb-0">
      <p className="flex items-center gap-1.5 px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
        {icon}
        {label}
      </p>
      {children}
    </div>
  );
}

function ResultRow({
  to,
  children,
  onGo,
}: {
  to: string;
  children: React.ReactNode;
  onGo: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onGo}
      className="block rounded-lg px-3 py-2 text-sm text-ink hover:bg-parchment"
    >
      {children}
    </Link>
  );
}
