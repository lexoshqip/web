import { Link } from "react-router-dom";
import { BookOpen, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto grid max-w-7xl place-items-center px-4 py-28 text-center sm:px-6">
      <p className="font-display text-7xl font-extrabold text-brand/20">404</p>
      <h1 className="mt-2 font-display text-2xl font-bold">Faqja nuk u gjet</h1>
      <p className="mt-2 max-w-md text-sm text-muted">
        Ndoshta faqja është zhvendosur, ose libri që kërkon nuk është publikuar ende.
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 font-semibold text-white transition-colors hover:bg-brand-dark"
        >
          <Home className="size-4" /> Kryefaqja
        </Link>
        <Link
          to="/books"
          className="inline-flex items-center gap-2 rounded-xl border border-parchment-deep bg-surface px-5 py-2.5 font-semibold text-ink-soft transition-colors hover:border-brand hover:text-brand"
        >
          <BookOpen className="size-4" /> Katalogu
        </Link>
      </div>
    </div>
  );
}
