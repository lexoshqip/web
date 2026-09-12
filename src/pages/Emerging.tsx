import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sprout } from "lucide-react";
import { getAuthorsIndex, getBooksIndex } from "@/lib/data";
import type { AuthorIndexItem, BookIndexItem } from "@/lib/types";
import BookCard from "@/components/BookCard";
import { AuthorCard } from "@/components/Cards";
import { EmptyState, SectionTitle } from "@/components/ui";

/**
 * Agim hub — shows all authors and books from the agim library.
 */
export default function Emerging() {
  const [books, setBooks] = useState<BookIndexItem[]>([]);
  const [authors, setAuthors] = useState<AuthorIndexItem[]>([]);

  useEffect(() => {
    getBooksIndex()
      .then((items) => setBooks(items.filter((b) => b.libraryId === "agim")))
      .catch(console.error);
    getAuthorsIndex()
      .then((items) => setAuthors(items.filter((a) => a.libraryId === "agim")))
      .catch(console.error);
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-10 rounded-2xl bg-gradient-to-br from-[#5a3ea8]/15 to-parchment p-8 sm:p-12">
        <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#5a3ea8]">
          <Sprout className="size-3.5" /> Programi «Autorë të Rinj»
        </span>
        <h1 className="font-display text-3xl font-extrabold sm:text-4xl">Skena e re e letërsisë</h1>
        <p className="mt-3 max-w-2xl leading-relaxed text-ink-soft">
          Këtu botohen veprat e autorëve bashkëkohorë shqiptarë — me leje të drejtpërdrejtë të
          autorit, të ruajtura nga LexoShqip në emër të tyre. Çdo autor ruan të gjitha të drejtat
          e tij dhe mund të kërkojë heqjen e veprës në çdo kohë.
        </p>
        <a
          href="https://github.com/lexoshqip/agim"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#5a3ea8] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#4a2e98]"
        >
          Publiko veprën tënde
          <ArrowRight className="size-4" />
        </a>
      </div>

      {/* authors */}
      <SectionTitle
        title="Autorët"
        subtitle={authors.length ? `${authors.length} zëra bashkëkohorë` : undefined}
      />
      {authors.length === 0 ? (
        <EmptyState
          message="Autorët e parë janë duke ardhur."
          hint="Submetimet do të shfaqen këtu sapo të pranohen."
        />
      ) : (
        <div className="mb-12 grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {authors.map((a) => (
            <AuthorCard key={a.id} author={a} />
          ))}
        </div>
      )}

      {/* books */}
      <SectionTitle
        title="Veprat"
        subtitle={books.length ? `${books.length} vepra të publikuara` : undefined}
      />
      {books.length === 0 ? (
        <EmptyState
          message="Programi hapet së shpejti."
          hint="Veprat e autorëve të rinj do të shfaqen këtu — mos në mes të klasikëve."
        />
      ) : (
        <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {books.map((b) => (
            <BookCard key={b.id} book={b} />
          ))}
        </div>
      )}
    </div>
  );
}
