import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, Landmark, ShieldCheck } from "lucide-react";
import { getAuthor, getBooksIndex, getEpochs } from "@/lib/data";
import type { Author as AuthorType, BookIndexItem, Epoch } from "@/lib/types";
import BookCard from "@/components/BookCard";
import AuthorLinks from "@/components/AuthorLinks";
import { EmptyState } from "@/components/ui";

export default function AuthorDetail() {
  const { id } = useParams<{ id: string }>();
  const [author, setAuthor] = useState<AuthorType | null>(null);
  const [missing, setMissing] = useState(false);
  const [books, setBooks] = useState<BookIndexItem[]>([]);
  const [epochs, setEpochs] = useState<Epoch[]>([]);

  useEffect(() => {
    if (!id) return;
    setAuthor(null);
    setMissing(false);
    getAuthor(id)
      .then(setAuthor)
      .catch(() => setMissing(true));
    getBooksIndex().then(setBooks).catch(console.error);
    getEpochs().then(setEpochs).catch(console.error);
  }, [id]);

  if (missing)
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center sm:px-6">
        <p className="text-2xl font-semibold">Autori nuk u gjet.</p>
        <Link to="/authors" className="mt-3 inline-block text-brand hover:underline">
          Shiko të gjithë autorët
        </Link>
      </div>
    );
  if (!author) return <div className="mx-auto max-w-7xl animate-pulse px-4 py-10 sm:px-6"><div className="h-64 rounded-xl bg-parchment-deep/50" /></div>;

  const epoch = epochs.find((e) => e.id === author.epochId);
  const authorBooks = books
    .filter((b) => author.bookIds.includes(b.id))
    .sort((a, b) => a.publicationYear - b.publicationYear);


  const places = [
    author.bornPlace && `Lindur në ${author.bornPlace}`,
    author.diedPlace && `vdiq në ${author.diedPlace}`,
  ].filter(Boolean) as string[];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Link to="/authors" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-brand">
        <ArrowLeft className="size-4" /> Të gjithë autorët
      </Link>

      <div className="grid gap-8 md:grid-cols-[220px_1fr]">
        <div>
          <img
            src={author.portrait}
            alt={`Portreti i ${author.name}`}
            className="w-full max-w-[220px] rounded-2xl border border-parchment-deep shadow-md"
          />
          {author.portraitCredit && (
            <p className="mt-1 max-w-[220px] text-xs leading-snug text-muted">{author.portraitCredit}</p>
          )}
          <AuthorLinks links={author.links} className="mt-4" />
          {author.wikipedia && (
            <div className="mt-2">
              <a
                href={author.wikipedia}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-parchment-deep bg-surface px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:border-brand hover:text-brand"
              >
                Wikipedia <ExternalLink className="size-3.5" />
              </a>
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            {epoch && (
              <Link to={`/epochs/${epoch.id}`} className="inline-flex items-center gap-1.5 rounded-full bg-parchment px-3 py-1 text-sm font-medium text-ink-soft hover:text-brand">
                <Landmark className="size-3.5" /> {epoch.title}
              </Link>
            )}
            <span className="font-display italic text-gold">{author.dates}</span>
            <span className="inline-flex items-center gap-1 text-xs text-muted">
              <ShieldCheck className="size-3.5 text-brand" /> vepra me të drejta të hapura
            </span>
          </div>

          <h1 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl">{author.name}</h1>
          {author.altNames?.length ? (
            <p className="mt-1 text-sm italic text-muted">njohur edhe si {author.altNames.join(", ")}</p>
          ) : null}
          {places.length > 0 && (
            <p className="mt-1 text-sm text-muted">{places.join(" · ")}</p>
          )}
          <p className="mt-4 max-w-3xl leading-relaxed text-ink-soft">{author.bio}</p>

          <section className="mt-10">
            <h2 className="mb-5 font-display text-2xl font-bold">
              Veprat ({authorBooks.length})
            </h2>
            {authorBooks.length === 0 ? (
              <EmptyState message="Nuk ka vepra të publikuara ende për këtë autor." hint="Do të shtohen gjatë kurimit manual." />
            ) : (
              <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
                {authorBooks.map((b) => (
                  <BookCard key={b.id} book={b} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
