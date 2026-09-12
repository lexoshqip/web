import { motion } from "framer-motion";
import {
  Apple,
  BellRing,
  BookOpen,
  Headphones,
  Play,
  Search,
  ShieldCheck,
  WifiOff,
} from "lucide-react";

/* Store links — set href when the apps are published */
const STORES = [
  { store: "App Store", href: null as string | null, icon: <Apple className="size-7" /> },
  { store: "Google Play", href: null as string | null, icon: <Play className="size-7" /> },
];

const FEATURES = [
  {
    icon: <WifiOff className="size-6" />,
    title: "Bibliotekë offline",
    text: "Shkarko veprat e preferuara dhe lexoji pa internet — në autobus, plazh apo mal.",
  },
  {
    icon: <BookOpen className="size-6" />,
    title: "Reader i plotë",
    text: "EPUB, PDF dhe Markdown — me tema ditë/sepia/natë dhe kontroll të shkronjave.",
  },
  {
    icon: <Headphones className="size-6" />,
    title: "Audiobooks",
    text: "Dëgjo veprat me shpejtësi të rregullueshme; pozicioni ruhet vetë.",
  },
  {
    icon: <ShieldCheck className="size-6" />,
    title: "Pa llogari, 100% private",
    text: "Progresi dhe biblioteka jote mbeten vetëm në pajisjen tënde — asnjë regjistrim i nevojshëm.",
  },
  {
    icon: <Search className="size-6" />,
    title: "Kërkim i menjëhershëm",
    text: "Gjej tituj, autorë e epoka që në dy shkronja — pa pritur rrjetin.",
  },
  {
    icon: <BellRing className="size-6" />,
    title: "Vepra të reja në kohë reale",
    text: "Njoftim sa herë kuratorët publikojnë një titull të ri ose një autor të rinj.",
  },
];

export default function AppPage() {
  return (
    <>
      {/* ---------- hero (full-bleed, strong red) ---------- */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#9e1b1b] via-[#7d1414] to-[#430a0a]">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-white/5" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-16 size-80 rounded-full bg-gold/15 blur-3xl" />
        <img
          src="/brand/logo-text.png"
          alt=""
          className="pointer-events-none absolute -bottom-6 right-4 w-64 rotate-[-12deg] opacity-[0.14] sm:w-80 lg:right-16 lg:w-96"
        />

        <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[1.75fr_1fr] lg:pb-20 lg:pt-16">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <img
              src="/brand/logo-solid.png"
              alt="Logo i LexoShqip"
              className="mb-5 size-16 rounded-2xl shadow-lg ring-1 ring-white/30"
            />
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 py-1.5 text-sm font-medium text-white backdrop-blur">
              <ShieldCheck className="size-4" /> iOS & Android · Falas · Pa reklama · Pa llogari
            </p>
            <h1 className="font-display text-4xl font-extrabold leading-tight text-white sm:text-6xl">
              Arkivi i plotë,
              <br />
              <span className="text-[#f0c869]">në xhepin tënd.</span>
            </h1>
            <p className="mt-6 max-w-xl text-xl leading-relaxed text-white/90">
              Aplikacioni LexoShqip sjell gjithë bibliotekën — klasikët, autorët e rinj
              dhe audiobook-et — kudo që shkon.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              {STORES.map((st) => (
                st.href ? (
                  <a
                    key={st.store}
                    href={st.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Download on ${st.store}`}
                    className={STORE_CLS}
                  >
                    {st.icon}
                    <span>
                      <small className="block text-[11px] uppercase tracking-wide opacity-75">Download on</small>
                      {st.store}
                    </span>
                  </a>
                ) : (
                  <div key={st.store} className={`${STORE_CLS} cursor-not-allowed opacity-50`} title="Duke ardhur së shpejti">
                    {st.icon}
                    <span>
                      <small className="block text-[11px] uppercase tracking-wide opacity-75">Duke ardhur</small>
                      {st.store}
                    </span>
                  </div>
                )
              ))}
            </div>
          </motion.div>

          {/* phone mockup */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="mx-auto w-48"
            aria-hidden
          >
            <div className="rounded-[1.6rem] border-[3px] border-black/50 bg-black p-1 shadow-2xl">
              <div className="relative aspect-[9/19] overflow-hidden rounded-[1.15rem] bg-paper">
                {/* status bar */}
                <div className="flex items-center justify-between bg-brand px-3 py-1.5 text-[8px] font-semibold text-white">
                  <span>9:41</span>
                  <span>LexoShqip</span>
                  <span>▂▄▆</span>
                </div>
                {/* reader body */}
                <div className="flex h-full flex-col items-center px-3 pb-3 pt-2">
                  <img
                    src="/content/books/bageti-e-bujqesi/cover.svg"
                    alt=""
                    className="w-24 rounded-md border border-parchment-deep shadow-md"
                  />
                  <p className="mt-2 font-display text-[11px] font-bold text-ink">Bagëti e Bujqësi</p>
                  <p className="text-[9px] text-muted">Naim Frashëri · 1886</p>
                  <div className="mt-2 w-full space-y-1">
                    <div className="h-1.5 w-full rounded bg-parchment-deep/70" />
                    <div className="h-1.5 w-11/12 rounded bg-parchment-deep/70" />
                    <div className="h-1.5 w-4/5 rounded bg-parchment-deep/70" />
                  </div>
                  {/* audio dock */}
                  <div className="mt-auto w-full rounded-lg bg-brand/95 px-2 py-1.5">
                    <div className="flex items-center gap-1.5">
                      <Play className="size-3 fill-white text-white" />
                      <span className="h-1 flex-1 rounded-full bg-white/50" />
                    </div>
                    <div className="mt-1 flex justify-center gap-2">
                      {[0.75, 1, 1.5].map((sp) => (
                        <span key={sp} className={`rounded px-1 text-[7px] ${sp === 1 ? "bg-white/90 text-brand" : "text-white/70"}`}>
                          {sp}×
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ---------- features ---------- */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <section className="py-14">
          <h2 className="mb-8 text-center font-display text-2xl font-bold sm:text-3xl">
            Gjithçka që do nga një aplikacion letrar
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-parchment-deep bg-surface p-6 shadow-sm">
                <span className="mb-3 grid size-11 place-items-center rounded-xl bg-brand-soft text-brand">
                  {f.icon}
                </span>
                <h3 className="font-display text-lg font-bold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

      {/* beta strip removed */}
      </div>
    </>
  );
}

const STORE_CLS =
  "inline-flex items-center gap-3 rounded-xl border border-white/30 bg-black/70 px-6 py-3 text-white shadow-lg transition-colors hover:bg-black";
