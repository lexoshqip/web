import { Archive, BookOpen, ExternalLink, Globe, Landmark, LibraryBig, MessagesSquare, ScrollText } from "lucide-react";

const RESOURCES = [
  {
    icon: <Archive className="size-5" />,
    name: "Arkiva.me",
    desc: "Arkivë me libra shqip në format PDF.",
    url: "https://www.arkiva.me/PDF/Libra",
  },
  {
    icon: <MessagesSquare className="size-5" />,
    name: "Reddit r/albania — «Libra PDF/EPUB në gjuhën shqipe»",
    desc: "Temë komunitare me një koleksion të madh librash të ndarë falas.",
    url: "https://www.reddit.com/r/albania/comments/17wxh5d/libra_pdfepub_n%C3%AB_gjuh%C3%ABn_shqipe/",
  },
  {
    icon: <LibraryBig className="size-5" />,
    name: "FlipHTML5 — Bibliotekë digjitale",
    desc: "Rafte librash të kthyeshëm online, si bibliotekë virtuale.",
    url: "https://fliphtml5.com/bookcase/kkgnu?wmode=transparent&fbclid=IwAR29dOwnQVuqoe0C6fibW6XkIAcvSDG7k3EVBP79fbGeyvMH_APcM_DsnZM",
  },
  {
    icon: <BookOpen className="size-5" />,
    name: "Internet Archive — Libra shqip",
    desc: "Koleksioni i librave shqip në Internet Archive.",
    url: "https://archive.org/details/booksbylanguage_albanian?tab=collection",
  },
  {
    icon: <Globe className="size-5" />,
    name: "SA-KRA.ch",
    desc: "Faqe zvicerane me letërsi shqipe në internet.",
    url: "https://www.sa-kra.ch/literature.htm",
  },
  {
    icon: <ScrollText className="size-5" />,
    name: "ADSH — Universiteti i Shkodrës",
    desc: "Arkivi digjital i Universitetit «Luigj Gurakuqi», Shkodër.",
    url: "https://adsh.unishk.edu.al/",
  },
  {
    icon: <LibraryBig className="size-5" />,
    name: "«Zef Lush Marku» — Biblioteka ime",
    desc: "Biblioteka digjitale e shkollës «Zef Lush Marku» (Maqedonia e Veriut).",
    url: "https://zeflushmarku.edu.mk/bibliotekaime",
  },
  {
    icon: <BookOpen className="size-5" />,
    name: "FLOSSK — Libra të digjitalizuar",
    desc: "Libra shqip të digjitalizuar nga projekti FLOSSK (Kosovë) — botime të viteve 1950 me licencë të hapur CC BY-SA.",
    url: "https://books.flossk.org/librat/",
  },
  {
    icon: <BookOpen className="size-5" />,
    name: "Fletoret — Vepra letrare dixhitale",
    desc: "Nismë vullnetare e dixhitalizimit të veprave klasike shqipe — të plota, falas, në domenin publik.",
    url: "https://fletoret.com/",
  },
  {
    icon: <Landmark className="size-5" />,
    name: "Biblioteka Kombëtare e Shqipërisë",
    desc: "Biblioteka Kombëtare «Gjergj Fishta» — burimi i skaneve origjinale të trashëgimisë letrare shqipe.",
    url: "https://www.bksh.al",
  },
  {
    icon: <ScrollText className="size-5" />,
    name: "Biblioteka Digjitale e BKSH",
    desc: "Ajsi i Bibliotekës Kombëtare me koleksione digjitale: libra të vjetër e të rrallë shqip, revista dhe dokumente historike.",
    url: "https://bibliotekadigjitale.bksh.al/",
  },
];

export default function Resources() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
      <div className="text-center">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-parchment-deep bg-surface px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand">
          Burimet tona
        </p>
        <h1 className="font-display text-3xl font-extrabold sm:text-5xl">
          Nga i marrim librat?
        </h1>
        <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-ink-soft">
          Librat i marrim nga burime dhe faqe të ndryshme — të gjitha{" "}
          <strong>falas dhe/ose në domain publik</strong>. Ja një listë e tyre:
        </p>
      </div>

      <div className="mt-10 grid gap-4">
        {RESOURCES.map((r) => (
          <a
            key={r.url}
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-4 rounded-2xl border border-parchment-deep bg-surface p-5 transition-colors hover:border-brand/50"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
              {r.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 font-display font-bold text-ink group-hover:text-brand">
                {r.name}
                <ExternalLink className="size-4 shrink-0 text-muted transition-colors group-hover:text-brand" />
              </span>
              <span className="mt-1 block text-sm leading-relaxed text-ink-soft">{r.desc}</span>
              <span className="mt-1 block truncate text-xs text-muted">{r.url}</span>
            </span>
          </a>
        ))}
      </div>

      <p className="mt-10 text-center text-sm text-muted">
        Falë këtyre burimeve, letërsia shqipe mbetet e lirë dhe e aksesueshme për këdo.
      </p>
    </div>
  );
}
