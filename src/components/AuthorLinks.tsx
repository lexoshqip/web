import {
  AtSign,
  Facebook,
  Globe,
  HeartHandshake,
  Instagram,
  Linkedin,
  Link2,
  Music2,
  ShoppingBag,
  Twitter,
  Youtube,
} from "lucide-react";
import type { AuthorLink } from "@/lib/types";

/* icon per hostname, falling back to the declared kind */
function iconFor(link: AuthorLink) {
  let host = "";
  try {
    host = new URL(link.url).hostname.replace(/^www\./, "");
  } catch {
    /* validated at build time — never happens */
  }
  if (host.includes("instagram")) return Instagram;
  if (host.includes("facebook")) return Facebook;
  if (host.includes("twitter") || host === "x.com") return Twitter;
  if (host.includes("youtube")) return Youtube;
  if (host.includes("tiktok")) return Music2;
  if (host.includes("linkedin")) return Linkedin;
  if (host.includes("amazon") || host.includes("bookdepository")) return ShoppingBag;
  if (link.kind === "social") return AtSign;
  if (link.kind === "shop") return ShoppingBag;
  if (link.kind === "support") return HeartHandshake;
  if (link.kind === "website") return Globe;
  return Link2;
}

/** Row of external link pills for an author (website · social · shop…).
      Shows nothing when the author has no links. */
export default function AuthorLinks({
  links,
  className = "",
}: {
  links?: AuthorLink[];
  className?: string;
}) {
  if (!links?.length) return null;
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {links.map((l) => {
        const Icon = iconFor(l);
        return (
          <a
            key={l.url}
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            title={l.url}
            className="inline-flex items-center gap-1.5 rounded-lg border border-parchment-deep bg-surface px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:border-brand hover:text-brand"
          >
            <Icon className="size-4 shrink-0" />
            {l.label}
          </a>
        );
      })}
    </div>
  );
}
