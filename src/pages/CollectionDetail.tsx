import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { getBooksIndex, getCollections } from "@/lib/data";
import type { BookIndexItem, Collection } from "@/lib/types";
import BookCard from "@/components/BookCard";
import { EmptyState } from "@/components/ui";

export default function CollectionDetail() {
  const { id } = useParams<{ id: string }>();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [books, setBooks] = useState<BookIndexItem[]>([]);

  useEffect(() => {
    if (!id) return;
    getCollections().then((cols) => setCollection(cols.find((k) => k.id === id) ?? null));
    getBooksIndex()
      .then((items) => {
        /* emerging works stay in their hub, not on collection shelves */
        setBooks(items.filter((b) => (b.collectionIds ?? []).includes(id) && (b.channel ?? "main") === "main"));
      })
      .catch(console.error);
  }, [id]);

  if (!collection)
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center sm:px-6">
        <p className="text-2xl font-semibold">Koleksioni nuk u gjet.</p>
        <Link to="/collections" className="mt-3 inline-block text-brand hover:underline">
          Shiko të gjitha koleksionet
        </Link>
      </div>
    );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Link to="/zbulo" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-brand">
        <ArrowLeft className="size-4" /> Zbulo
      </Link>

      {/* banner */}
      <div className="relative overflow-hidden rounded-3xl border border-parchment-deep shadow-lg">
        <img
          src={collection.coverImage}
          alt=""
          className="h-64 w-full object-cover sm:h-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/5" />
        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10">
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-white drop-shadow-sm sm:text-5xl">
            {collection.title}
          </h1>
        </div>
      </div>

      <p className="mx-auto mt-6 max-w-3xl leading-relaxed text-ink-soft">{collection.description}</p>
      <p className="mt-1 text-sm text-muted">{books.length} tituj</p>

      <div className="mt-10">

      {books.length === 0 ? (
        <EmptyState message="Nuk ka tituj në këtë koleksion." hint="Do të plotësohet gjatë kurimit." />
      ) : (
        <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {books.map((b) => (
            <BookCard key={b.id} book={b} />
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
