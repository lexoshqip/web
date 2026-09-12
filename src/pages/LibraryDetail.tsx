import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, ExternalLink, Mail, ShieldAlert, Users } from "lucide-react";
import { getLibrary } from "@/lib/data";
import type { Library } from "@/lib/types";

export default function LibraryDetail() {
  const { id } = useParams<{ id: string }>();
  const [library, setLibrary] = useState<Library | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    getLibrary(id)
      .then(setLibrary)
      .catch(() => setNotFound(true));
  }, [id]);

  if (notFound) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center">
        <p className="text-lg font-semibold text-ink">Biblioteka nuk u gjet.</p>
        <Link to="/zbulo" className="mt-4 inline-flex items-center gap-1 text-sm text-brand hover:underline">
          Kthehu te Zbulo <ArrowRight className="size-4" />
        </Link>
      </div>
    );
  }

  if (!library) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-8 h-4 w-48 animate-pulse rounded bg-parchment-deep/60" />
        <div className="h-8 w-72 animate-pulse rounded bg-parchment-deep/60" />
        <div className="mt-4 h-4 w-full animate-pulse rounded bg-parchment-deep/60" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Link to="/zbulo" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-brand">
        <ArrowLeft className="size-4" /> Zbulo
      </Link>

      {/* banner */}
      <div className="relative overflow-hidden rounded-3xl border border-parchment-deep shadow-lg">
        <img
          src={library.bannerUrl ?? ""}
          alt=""
          aria-hidden
          className="h-72 w-full object-cover sm:h-96"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/5" />
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-5 p-6 sm:p-10">
          {library.logoUrl ? (
            <img
              src={library.logoUrl}
              alt={`${library.name} logo`}
              className="size-20 shrink-0 object-contain drop-shadow-lg sm:size-24"
            />
          ) : (
            <div
              className="grid size-20 shrink-0 place-items-center text-xl font-bold text-white drop-shadow-lg sm:size-24"
              style={{ backgroundColor: library.brandColor ?? library.accent }}
            >
              {library.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            {library.maintainer && (
              <p className="text-sm text-white/65">{library.maintainer}</p>
            )}
            <h1 className="font-display text-5xl font-extrabold tracking-tight text-white drop-shadow-sm sm:text-6xl">
              {library.name}
            </h1>
          </div>
        </div>
      </div>

      <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-ink-soft">{library.description}</p>

      {/* stats + browse button */}
      <div className="mb-10 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 rounded-xl border border-parchment-deep bg-surface px-5 py-3">
          <BookOpen className="size-5 text-muted" />
          <div>
            <p className="font-display text-xl font-bold text-ink">{library.bookCount}</p>
            <p className="text-xs text-muted">{library.bookCount === 1 ? "libër" : "libra"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-parchment-deep bg-surface px-5 py-3">
          <Users className="size-5 text-muted" />
          <div>
            <p className="font-display text-xl font-bold text-ink">{library.authorCount}</p>
            <p className="text-xs text-muted">{library.authorCount === 1 ? "autor" : "autorë"}</p>
          </div>
        </div>
        <Link
          to={`/books?library=${library.id}&channel=all`}
          className="ml-auto inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark"
        >
          Shfaq të gjithë librat <ArrowRight className="size-4" />
        </Link>
      </div>

      {/* policy */}
      {library.policy && (
        <section className="mb-8 rounded-xl border border-parchment-deep bg-surface p-6">
          <h2 className="mb-3 font-display text-lg font-bold text-ink">Politika e koleksionit</h2>
          <p className="leading-relaxed text-ink-soft">{library.policy}</p>
        </section>
      )}

      {/* contact */}
      {library.contact && (library.contact.email || library.contact.takedownEmail) && (
        <section className="mb-8 rounded-xl border border-parchment-deep bg-surface p-6">
          <h2 className="mb-4 font-display text-lg font-bold text-ink">Kontakt</h2>
          <div className="flex flex-col gap-3">
            {library.contact.email && (
              <a
                href={`mailto:${library.contact.email}`}
                className="inline-flex items-center gap-2 text-sm text-brand hover:underline"
              >
                <Mail className="size-4" />
                {library.contact.email}
              </a>
            )}
            {library.contact.takedownEmail && library.contact.takedownEmail !== library.contact.email && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-4 dark:bg-amber-900/20">
                <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Kërkesë heqjeje (Takedown)</p>
                  <p className="mt-0.5 text-sm text-amber-700 dark:text-amber-400">
                    Nëse jeni titullar i të drejtave dhe dëshironi heqjen e materialit, na kontaktoni:{" "}
                    <a href={`mailto:${library.contact.takedownEmail}`} className="font-semibold underline">
                      {library.contact.takedownEmail}
                    </a>
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* external links */}
      {library.links && library.links.length > 0 && (
        <section className="mb-8 rounded-xl border border-parchment-deep bg-surface p-6">
          <h2 className="mb-4 font-display text-lg font-bold text-ink">Burime dhe lidhje</h2>
          <ul className="flex flex-col gap-2">
            {library.links.map((lnk) => (
              <li key={lnk.url}>
                <a
                  href={lnk.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-brand hover:underline"
                >
                  <ExternalLink className="size-3.5 shrink-0" />
                  {lnk.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* website */}
      {library.website && (
        <p className="text-sm text-muted">
          Website:{" "}
          <a href={library.website} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
            {library.website}
          </a>
        </p>
      )}
    </div>
  );
}
