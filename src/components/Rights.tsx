import { BadgeCheck, Link2, Scale, ShieldCheck } from "lucide-react";
import type { VerificationId } from "@/lib/types";
import type { BookRights } from "@/lib/types";

const VERIFICATION_STYLE: Record<
  VerificationId,
  { icon: React.ComponentType<{ className?: string }>; cls: string }
> = {
  juridical: {
    icon: ShieldCheck,
    cls: "border-emerald-600/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  "source-declared": {
    icon: BadgeCheck,
    cls: "border-sky-600/30 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  },
  pending: {
    icon: Scale,
    cls: "border-parchment-deep bg-parchment text-muted",
  },
};

/** Compact pill summarizing a book's rights tier, e.g.
    «Domain publik · Verifikuar juridikisht» or «Sipas burimit». */
export function RightsBadge({
  rights,
  className = "",
}: {
  rights?: Pick<BookRights, "license" | "licenseLabel" | "verification" | "verificationLabel"> | null;
  className?: string;
}) {
  const v = rights?.verification ?? "source-declared";
  const style = VERIFICATION_STYLE[v];
  const Icon = style.icon;
  const licensePart = rights?.license === "unknown" ? null : rights?.licenseLabel ?? "Domain publik";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${style.cls} ${className}`}
    >
      <Icon className="size-3.5 shrink-0" />
      {licensePart ? `${licensePart} · ${rights?.verificationLabel}` : rights?.verificationLabel}
    </span>
  );
}

/** Full provenance card: license tier, verification level, notes and source links. */
export function RightsPanel({ rights }: { rights?: BookRights }) {
  if (!rights) return null;
  return (
    <div className="mt-8 rounded-2xl border border-parchment-deep bg-surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 font-display text-lg font-bold">
          <Scale className="size-5 text-brand" /> Të drejtat & burimi
        </h2>
        <RightsBadge rights={rights} />
      </div>

      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        <strong>
          {rights.licenseDeed ? (
            <a
              href={rights.licenseDeed}
              target="_blank"
              rel="noopener noreferrer"
              title="Teksti zyrtar i licencës (deed)"
              className="text-brand hover:underline"
            >
              {rights.licenseLabel} ↗
            </a>
          ) : (
            rights.licenseLabel
          )}
        </strong>{" "}
        — statusi i verifikimit:{" "}
        <strong>{rights.verificationLabel}</strong>.
        {rights.verification === "source-declared" &&
          " Statusin e të drejtave e deklaron burimi i mëposhtëm; verifikimi juridik i plotë mund të jetë ende në rrugë."}
        {rights.verification === "pending" &&
          " Kjo vepër pret verifikimin juridik përpara se teksti të publikohet."}
      </p>

      {rights.notes && (
        <p className="mt-2 text-sm leading-relaxed text-muted">{rights.notes}</p>
      )}

      {!!rights.sources?.length && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
            Burimet nga ku u mor vepra
          </p>
          <ul className="space-y-1.5">
            {rights.sources.map((s) => (
              <li key={s.url}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
                >
                  <Link2 className="size-3.5 shrink-0" /> {s.name}
                </a>
                {s.note && <span className="ml-2 text-xs text-muted">{s.note}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
