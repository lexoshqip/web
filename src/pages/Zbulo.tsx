import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { getBooksIndex, getCollections, getEpochs, getLibraries } from "@/lib/data";
import type { BookIndexItem, Collection, Epoch, Library } from "@/lib/types";
import { EpochCard, LibraryCard } from "@/components/Cards";
import { SectionTitle } from "@/components/ui";

export default function Zbulo() {
  const [epochs, setEpochs] = useState<Epoch[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [books, setBooks] = useState<BookIndexItem[]>([]);
  const [libraries, setLibraries] = useState<Library[]>([]);

  useEffect(() => {
    getEpochs().then(setEpochs).catch(console.error);
    getCollections().then(setCollections).catch(console.error);
    getBooksIndex().then(setBooks).catch(console.error);
    getLibraries().then(setLibraries).catch(console.error);
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <SectionTitle
        title="Zbulo"
        subtitle="Shfleto letërsinë shqipe sipas epokës ose koleksionit"
      />

      {/* libraries */}
      {libraries.length > 0 && (
        <>
          <h2 className="mb-4 font-display text-xl font-bold text-ink">Bibliotekat</h2>
          <div className="mb-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {libraries.map((lib) => (
              <LibraryCard key={lib.id} library={lib} />
            ))}
          </div>
        </>
      )}

      {/* epochs */}
      <h2 className="mb-4 font-display text-xl font-bold text-ink">Epokat</h2>
      <div className="mb-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {epochs.map((e) => (
          <EpochCard key={e.id} epoch={e} />
        ))}
      </div>

      {/* collections */}
      <h2 className="mb-4 font-display text-xl font-bold text-ink">Koleksione</h2>
      <div className="grid gap-5 md:grid-cols-3">
        {collections.map((col) => {
          const count = books.filter((b) => (b.collectionIds ?? []).includes(col.id)).length;
          return (
            <motion.div key={col.id} whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 300, damping: 22 }}>
              <Link
                to={`/collections/${col.id}`}
                className="group block overflow-hidden rounded-3xl border border-parchment-deep bg-surface shadow-sm transition-shadow duration-300 hover:shadow-xl"
              >
                <div className="relative overflow-hidden">
                  <img
                    src={col.coverImage}
                    alt={col.title}
                    loading="lazy"
                    className="aspect-[16/9] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5">
                    <h3 className="font-display text-xl font-bold tracking-tight text-white drop-shadow-sm">
                      {col.title}
                    </h3>
                    <span className="shrink-0 rounded-full bg-white/15 px-3 py-1 font-display text-xs text-white ring-1 ring-white/25 backdrop-blur-md">
                      {count} tituj
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <p className="line-clamp-2 text-sm leading-relaxed text-ink-soft">{col.description}</p>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
