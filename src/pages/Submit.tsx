import { Link } from "react-router-dom";
import {
  ArrowLeft,
  BookOpenCheck,
  CheckCircle2,
  CreativeCommons,
  FileText,
  Mail,
  PenLine,
  SearchCheck,
  Send,
  ShoppingBag,
} from "lucide-react";
import { SectionTitle } from "@/components/ui";

const STEPS = [
  {
    icon: <PenLine className="size-5" />,
    title: "1. Dërgo veprën tënde",
    text: "Manuskripti në format .md, .epub ose .pdf (pranohen edhe .docx), bashkë me një biografi të shkurtër dhe kontaktin tënd.",
  },
  {
    icon: <SearchCheck className="size-5" />,
    title: "2. Rishikimi redaktorial",
    text: "Ekipi i kuratorëve e lexon veprën dhe komunikohet me ty për çdo detaj — statusi: dorëzuar → në shqyrtim.",
  },
  {
    icon: <CheckCircle2 className="size-5" />,
    title: "3. Miratimi & licenca",
    text: "Zgjedh formatin e licencës (lexim i kufizuar ose Creative Commons) dhe vepra publikohet në formatet që ke dorëzuar (EPUB, PDF, Markdown) me kopertinë të dedikuar.",
  },
  {
    icon: <Send className="size-5" />,
    title: "4. Publikimi",
    text: "Vepra del live në portal, e aksesueshme falas për mijëra lexues — e plotë ose si fragment promocional, sipas zgjedhjes sate.",
  },
];

const LICENCA = [
  {
    icon: BookOpenCheck,
    title: "1 · Licencë leximi",
    text: "Libri lexohet falas online vetëm brenda platformës — i ngjashëm me huazimin e një libri në bibliotekë. Pa mundësi shkarkimi apo shpërndarjeje. Të drejtat mbeten plotësisht të juaja; ju vendosni sa kohë qëndron.",
  },
  {
    icon: CreativeCommons,
    title: "2 · Creative Commons",
    text: "Publikoni veprën me një licencë CC të zgjedhur nga ju (p.sh. BY-SA ose BY-NC) — duke lejuar gjithashtu shkarkimin e shpërndarjen me respekt të kushteve tuaja. Zgjedhja është plotësisht e juaja.",
  },
];

export default function Submit() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <Link
        to="/emerging"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-brand"
      >
        <ArrowLeft className="size-4" /> Autorë të Rinj
      </Link>

      <div className="text-center">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-parchment-deep bg-surface px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand">
          Programi «Autorë të Rinj»
        </p>
        <h1 className="font-display text-3xl font-extrabold sm:text-5xl">
          Skena jote. Lexuesit tanë.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-ink-soft">
          Nëse je një autor i ri shqiptar, LexoShqip të fton të publikosh veprën tënde —
          të plotë ose si <strong>fragment promocional</strong> — falas, pranë klasikëve
          të letërsisë shqipe.
        </p>
      </div>

      {/* pse & si funksionojnë licencat */}
      <section className="mt-14">
        <SectionTitle
          title="Pse dhe me cilën licencë"
          subtitle="Nuk është e nevojshme që vepra të kalojë në Public Domain — ju zgjidhni"
        />
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {LICENCA.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-parchment-deep bg-surface p-7 shadow-sm">
              <Icon className="size-8 text-brand" />
              <h2 className="mt-4 font-display text-xl font-bold">{title}</h2>
              <p className="mt-3 leading-relaxed text-muted">{text}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-gold/40 bg-gold/10 p-7">
          <div className="flex items-start gap-4">
            <ShoppingBag className="size-7 shrink-0 text-gold" />
            <div>
              <h2 className="font-display text-lg font-bold">Shitjet nuk humbasin — përkundrazi</h2>
              <p className="mt-2 leading-relaxed text-ink-soft">
                Pranë librit tuaj vendosim <strong>lidhje direkte ku lexuesit mund ta blejnë
                me një klikim versionin e printuar fizik ose ebook-in zyrtar</strong>. Leximi
                falas online ka historikisht rritur — jo ulur — shitjet e kopjeve fizike.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* rruga */}
      <section className="mt-14">
        <SectionTitle title="Rruga e dorëzimit" subtitle="Katër hapa nga manuskripti te rafti publik" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {STEPS.map((s) => (
            <div key={s.title} className="rounded-2xl border border-parchment-deep bg-surface p-6">
              <span className="mb-3 grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">
                {s.icon}
              </span>
              <h2 className="font-display text-lg font-bold">{s.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{s.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-parchment-deep bg-parchment/60 p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold">
            <FileText className="size-5 text-gold" /> Çfarë pranohen
          </h2>
          <ul className="mt-3 space-y-1.5 text-sm text-ink-soft">
            <li>• Prozë, poezi, dramë, ese — në gjuhën shqipe</li>
            <li>• Vepra të plota <em>ose</em> fragmente premtuese (kapitull/e provë)</li>
            <li>• Vetëm vepra origjinale, me të drejtat autorore që i përkasin ty</li>
          </ul>
          <div className="mt-6 border-t border-parchment-deep pt-5 text-center">
            <p className="text-sm font-medium text-ink">
              Ngarkimi online hapet në fazën tjetër të platformës.
            </p>
            <p className="mt-1 text-sm text-muted">
              Deri atëherë, dërgo manuskriptin dhe pyetjet e tua:
            </p>
            <a
              href="mailto:info@lexoshqip.org?subject=Dor%C3%ABzim%20vepre%20%E2%80%94%20Autor%C3%AB%20t%C3%AB%20Rinj"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 font-semibold text-white transition-colors hover:bg-brand-dark"
            >
              <Mail className="size-4" /> info@lexoshqip.org
            </a>
          </div>
        </div>
      </section>

      <p className="mt-10 text-center text-sm text-muted">
        Dëshiron më shumë kontekst?{" "}
        <Link to="/books" className="font-medium text-brand hover:underline">
          Shiko si duken veprat e publikuara
        </Link>
        .
      </p>
    </div>
  );
}
