import { ChevronLeft, ChevronRight, SearchX } from "lucide-react";
import type { ReactNode } from "react";

export function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ message, hint }: { message: string; hint?: string }) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-parchment-deep bg-surface/60 px-6 py-16 text-center">
      <SearchX className="mb-3 size-8 text-muted" />
      <p className="font-medium text-ink-soft">{message}</p>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1
  );
  return (
    <nav className="mt-10 flex items-center justify-center gap-1.5" aria-label="Faqosja">
      <button
        disabled={page === 1}
        onClick={() => onPage(page - 1)}
        className="grid size-9 place-items-center rounded-lg border border-parchment-deep bg-surface text-ink-soft transition hover:border-brand hover:text-brand disabled:opacity-40"
        aria-label="Faqja e mëparshme"
      >
        <ChevronLeft className="size-4" />
      </button>
      {pages.map((p, i) => (
        <span key={p} className="flex items-center">
          {i > 0 && pages[i - 1] !== p - 1 && <span className="px-1 text-muted">…</span>}
          <button
            onClick={() => onPage(p)}
            aria-current={p === page ? "page" : undefined}
            className={`size-9 rounded-lg border text-sm font-medium transition ${
              p === page
                ? "border-brand bg-brand text-white"
                : "border-parchment-deep bg-surface text-ink-soft hover:border-brand hover:text-brand"
            }`}
          >
            {p}
          </button>
        </span>
      ))}
      <button
        disabled={page === totalPages}
        onClick={() => onPage(page + 1)}
        className="grid size-9 place-items-center rounded-lg border border-parchment-deep bg-surface text-ink-soft transition hover:border-brand hover:text-brand disabled:opacity-40"
        aria-label="Faqja tjetër"
      >
        <ChevronRight className="size-4" />
      </button>
    </nav>
  );
}

export function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "border-brand bg-brand text-white"
          : "border-parchment-deep bg-surface text-ink-soft hover:border-brand/50 hover:text-brand"
      }`}
    >
      {children}
    </button>
  );
}
