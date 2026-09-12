import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BookMarked, ChevronRight } from "lucide-react";
import { getBooksIndex, getCollections } from "@/lib/data";
import type { BookIndexItem, Collection } from "@/lib/types";
import { SectionTitle } from "@/components/ui";

const ICONS: Record<string, ReactNode> = {
  albaniana: <LandmarkIcon />,
  "klasike-perkthyer": <BookMarked className="size-6" />,
  femije: <KidsIcon />,
};

export default function Collections() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [books, setBooks] = useState<BookIndexItem[]>([]);

  useEffect(() => {
    getCollections().then(setCollections).catch(console.error);
    getBooksIndex().then(setBooks).catch(console.error);
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <SectionTitle
        title="Koleksione"
        subtitle="Raftet tematike të bibliotekës — përtej epokave dhe autorëve"
      />
      <div className="grid gap-5 md:grid-cols-3">
        {collections.map((col) => {
          const count = books.filter((b) => (b.collectionIds ?? []).includes(col.id)).length;
          return (
            <motion.div
              key={col.id}
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
            >
              <Link
                to={`/collections/${col.id}`}
                className="group block overflow-hidden rounded-3xl border border-parchment-deep bg-surface shadow-sm transition-shadow duration-300 hover:shadow-xl"
              >
                <div className="relative overflow-hidden">
                  {col.coverImage ? (
                    <img
                      src={col.coverImage}
                      alt={col.title}
                      loading="lazy"
                      className="aspect-[16/9] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                  ) : (
                    <div className="aspect-[16/9] w-full grid place-items-center bg-brand-soft text-brand">
                      {ICONS[col.id] ?? <BookMarked className="size-10" />}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <h2 className="font-display text-xl font-bold tracking-tight text-white drop-shadow-sm">
                      {col.title}
                    </h2>
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-sm leading-relaxed text-ink-soft">{col.description}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand">
                    {count} tituj <ChevronRight className="size-4" />
                  </span>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function LandmarkIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6 fill-none stroke-current" strokeWidth="2" aria-hidden>
      <path d="M3 21h18M5 21V10m14 11V10M3 10l9-7 9 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function KidsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6 fill-none stroke-current" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="8" r="5" />
      <path d="M9 7h.01M15 7h.01M9.5 13c1.5 1.2 3.5 1.2 5 0" strokeLinecap="round" />
    </svg>
  );
}
