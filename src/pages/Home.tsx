import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Baby, BookMarked, BookOpen, Globe, Library, ShieldCheck, Smartphone } from "lucide-react";
import { getBooksIndex, getCollections, getFeatured, type LandingData } from "@/lib/data";
import type { BookIndexItem, Collection } from "@/lib/types";
import BookCard from "@/components/BookCard";
import { AuthorCard, EpochCard } from "@/components/Cards";
import Carousel from "@/components/Carousel";
import { SectionTitle } from "@/components/ui";

export default function Home() {
  const [data, setData] = useState<LandingData | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [allBooks, setAllBooks] = useState<BookIndexItem[]>([]);

  useEffect(() => {
    getFeatured().then(setData).catch(console.error);
    getCollections().then(setCollections).catch(console.error);
    getBooksIndex().then(setAllBooks).catch(console.error);
  }, []);

  return (
    <>
      {/* ---------------- hero (full-bleed, neutral) ---------------- */}
      <section className="relative overflow-hidden border-b border-parchment-deep bg-gradient-to-b from-[#f7f0e0] via-[#f1e7d2] to-[#e9ddc2] dark:border-black/40 dark:bg-gradient-to-br dark:from-[#2e261c] dark:via-[#241f1a] dark:to-[#14100c]">
        <div aria-hidden className="pointer-events-none absolute -left-24 top-10 size-80 rounded-full bg-gold/25 blur-3xl dark:bg-gold/15" />
        <div aria-hidden className="pointer-events-none absolute -right-16 bottom-0 size-80 rounded-full bg-brand/10 blur-3xl dark:bg-brand/20" />
        <BookOpen aria-hidden className="pointer-events-none absolute -right-6 top-8 size-56 rotate-12 text-parchment-deep/60 dark:text-white/[0.04]" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-2 lg:pb-20 lg:pt-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand-soft px-3 py-1 text-xs font-medium text-brand dark:border-white/20 dark:bg-white/10 dark:text-white/90">
              <ShieldCheck className="size-3.5" /> Letërsi shqipe · burime të hapura
            </p>
            <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight text-ink sm:text-5xl dark:text-[#f3ead8]">
              Letërsia shqipe,
              <br />
              <span className="text-brand dark:text-[#f0c869]">e lirë për këdo,</span> përgjithmonë.
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink-soft dark:text-white/80">
              Një arkiv i letërsisë shqipe — nga «Meshari» i vitit 1555 e deri sot. Lexo online, dëgjo si audiobook, shkarko EPUB/PDF/Markdown, ose zbulo autorë të rinj.
            </p>

            <div className="mt-8 flex items-center gap-3 overflow-x-auto pb-1 sm:overflow-visible">
              <Link
                to="/books"
                className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl bg-brand px-4 py-2.5 text-[15px] font-semibold text-white shadow-md transition-colors hover:bg-brand-dark"
              >
                <BookOpen className="size-4.5" />
                Fillo leximin
              </Link>
              <Link
                to="/authors"
                className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border border-parchment-deep bg-surface px-4 py-2.5 text-[15px] font-semibold text-ink-soft transition-colors hover:border-brand hover:text-brand dark:border-white/30 dark:bg-transparent dark:text-white dark:hover:bg-white/10"
              >
                Zbuloni autorët
                <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/aplikacioni"
                className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl bg-brand px-4 py-2.5 text-[15px] font-semibold text-white shadow-md transition-colors hover:bg-[#c02a2a]"
              >
                <Smartphone className="size-4" />
                Shkarko Aplikacionin
              </Link>
            </div>

            <dl className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
              {[
                ["1555", "viti i parë tekst shqip"],
                ["100%", "e lirë dhe e hapur"],
                ["4 formate", "MD · EPUB · PDF · Audio"],
              ].map(([k, v]) => (
                <div key={v}>
                  <dt className="font-display text-xl font-bold text-brand dark:text-[#f0c869]">{k}</dt>
                  <dd className="text-xs text-muted dark:text-white/65">{v}</dd>
                </div>
              ))}
            </dl>
          </motion.div>

          <AutoBookStack books={data?.heroBooks ?? []} />
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
      {/* ---------------- selected books carousel ---------------- */}
      <section className="py-4">
        <SectionTitle
          title="Kryevepra të zgjedhura"
          subtitle="Përzgjedhje e redaksisë nga thesari i letërsisë shqipe"
          action={
            <Link to="/books" className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
              Të gjithë librat <ArrowRight className="size-4" />
            </Link>
          }
        />
        {!data ? (
          <SkeletonGrid />
        ) : data.selectedBooks.length ? (
          <Carousel
            items={data.selectedBooks}
            ariaLabel="Kryevepra të zgjedhura"
            itemClassName="w-40 sm:w-44"
            render={(b) => <BookCard book={b} />}
          />
        ) : (
          /* fallback: featured books beyond the hero, as a grid */
          <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {data.heroBooks.slice(0, 10).map((b) => (
              <BookCard key={b.id} book={b} />
            ))}
          </div>
        )}
      </section>

      {/* ---------------- authors carousel ---------------- */}
      <section className="py-4">
        <SectionTitle
          title="Zërat kryesorë"
          subtitle="Autorët më të lexuar të platformës"
          action={
            <Link to="/authors" className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
              Të gjithë autorët <ArrowRight className="size-4" />
            </Link>
          }
        />
        {!data ? (
          <SkeletonGrid />
        ) : (
          <Carousel
            items={data.featuredAuthors}
            ariaLabel="Zërat kryesorë"
            render={(a) => <AuthorCard author={a} />}
          />
        )}
      </section>

      {/* ---------------- epochs ---------------- */}
      <section className="py-4">
        <SectionTitle
          title="Udhëtoni nëpër epoka"
          subtitle="Nga tekstet e para të shekullit XVI te modernizmi i viteve '30"
          action={
            <Link to="/zbulo" className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
              Zbulo më shumë <ArrowRight className="size-4" />
            </Link>
          }
        />
        {!data ? (
          <SkeletonGrid />
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {data.epochs.map((e) => (
              <EpochCard key={e.id} epoch={e} />
            ))}
          </div>
        )}
      </section>

      {/* ---------------- collections ---------------- */}
      <section className="py-4">
        <SectionTitle
          title="Koleksione"
          subtitle="Raftet tematike — më shumë se një kronologji"
          action={
            <Link to="/zbulo" className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
              Zbulo më shumë <ArrowRight className="size-4" />
            </Link>
          }
        />
        <div className="grid gap-5 md:grid-cols-3">
          {collections.map((k) => {
            const n = allBooks.filter((b) => (b.collectionIds ?? []).includes(k.id)).length;
            const ICON =
              k.id === "albaniana" ? <Globe className="size-10" /> :
              k.id === "femije" ? <Baby className="size-10" /> :
              <BookMarked className="size-10" />;
            return (
              <motion.div key={k.id} whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 300, damping: 22 }}>
                <Link
                  to={`/collections/${k.id}`}
                  className="group block overflow-hidden rounded-3xl border border-parchment-deep bg-surface shadow-sm transition-shadow duration-300 hover:shadow-xl"
                >
                  <div className="relative overflow-hidden">
                    {k.coverImage ? (
                      <img
                        src={k.coverImage}
                        alt={k.title}
                        loading="lazy"
                        className="aspect-[16/9] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      />
                    ) : (
                      <div className="aspect-[16/9] w-full grid place-items-center bg-brand-soft text-brand">
                        {ICON}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-5">
                      <h3 className="font-display text-xl font-bold tracking-tight text-white drop-shadow-sm">{k.title}</h3>
                    </div>
                  </div>
                  <div className="p-5">
                    <p className="text-sm leading-relaxed text-ink-soft">{k.description}</p>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand">
                      {n} tituj <ArrowRight className="size-4" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ---------------- mission strip ---------------- */}
      <section className="my-6 rounded-2xl bg-gradient-to-br from-brand to-brand-dark px-6 py-10 text-center text-white sm:px-12">
        <Library className="mx-auto mb-2 size-8 opacity-90" />
        <h2 className="mx-auto max-w-2xl font-display text-2xl font-bold sm:text-3xl">
          Çdo vepër ruhet me tekstin origjinal si burim kryesor
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-white/85">
          Secila vepër ruhet me tekstin origjinal MD si burim i përjetshëm, dhe
          ta arrijë ty siç të pëlqen — lexim online, EPUB, PDF ose
          audiobook, sipas materialeve që kemi për të.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/emerging"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-brand transition-transform hover:-translate-y-0.5"
          >
            Je autor i ri? Publiko këtu
            <ArrowRight className="size-4" />
          </Link>
          <Link
            to="/rreth-nesh#bashkepunimi"
            className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3 font-semibold text-white backdrop-blur-sm transition-transform hover:-translate-y-0.5"
          >
            Je institucion? Bashkëpuno me ne
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
      </div>
    </>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[5/8] w-full rounded-xl bg-parchment-deep/60" />
          <div className="mt-3 h-4 w-3/4 rounded bg-parchment-deep/60" />
          <div className="mt-2 h-3 w-1/2 rounded bg-parchment-deep/60" />
        </div>
      ))}
    </div>
  );
}

function AutoBookStack({ books }: { books: BookIndexItem[] }) {
  /* step is an UNBOUNDED counter — never wraps — so every cover can be
     given a deterministic key that changes exactly when it recycles
     around the belt (far-left → far-right), letting it fade in there
     instead of teleporting across the stage */
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = books.length;
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const vIdx = count ? ((step % count) + count) % count : 0;
  const offsetOf = (i: number) => {
    let off = ((i - vIdx) % count + count) % count;
    if (off > count / 2) off -= count;
    return off;
  };
  /* how many times this cover has recycled (key suffix → clean remount) */
  const lapsOf = (i: number) =>
    Math.max(0, Math.floor((step - i - 3) / count) + 1);

  useEffect(() => {
    if (paused || count < 2 || reduceMotion) return;
    const t = setInterval(() => setStep((s) => s + 1), 4200);
    return () => clearInterval(t);
  }, [paused, count, reduceMotion]);

  const jumpTo = (i: number) => {
    const k = ((i - vIdx) % count + count) % count;
    if (k) setStep((s) => s + k);
  };

  if (!count) return <div className="hidden lg:block" aria-hidden />;
  const current = books[vIdx];
  const spring = { type: "spring" as const, stiffness: 210, damping: 26 };

  return (
    <div
      className="relative mx-auto hidden h-[480px] w-full select-none lg:block"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* ambient glow tracks the active book */}
      <div
        key={`glow-${current.id}`}
        className="absolute left-1/2 top-24 size-64 -translate-x-1/2 rounded-full bg-brand/15 blur-3xl transition-colors duration-700"
      />

      <div className="absolute inset-x-0 top-8 h-[330px] [perspective:1200px]">
        {books.map((b, i) => {
          const off = offsetOf(i);
          if (Math.abs(off) > 2) return null;

          const centered = off === 0;
          const anim = {
            x: `calc(-50% + ${off * 128}px)`,
            scale: 1 - Math.abs(off) * 0.17,
            rotateY: off * -14,
            rotate: off * 3,
            opacity: centered ? 1 : Math.abs(off) === 1 ? 0.92 : 0.45,
            filter: `blur(${Math.abs(off) * 1.4}px)`,
            zIndex: 50 - Math.abs(off) * 10,
          };

          /* one shared spring → the whole row glides as a single conveyor */
          const transition = { ...spring, opacity: { duration: 0.5, ease: "easeOut" as const } };
          /* covers that just recycled fade in at the far edge (fresh key) */
          const initial = { opacity: 0 };

          const cover = (
            <img
              src={b.coverThumb}
              alt={`Kopertina e librit ${b.title}`}
              draggable={false}
              className="aspect-[5/8] w-full select-none rounded-md shadow-[14px_26px_40px_-10px_rgba(0,0,0,0.55)] ring-1 ring-black/10 dark:ring-white/15 transition-shadow duration-300 group-hover:shadow-[18px_32px_50px_-10px_rgba(0,0,0,0.7)]"
            />
          );

          if (centered) {
            return (
              <motion.div
                key={`${b.id}#${lapsOf(i)}`}
                initial={initial}
                animate={anim}
                transition={transition}
                style={{ left: "50%", transformStyle: "preserve-3d" }}
                className="group absolute top-0 w-48 focus:outline-none"
              >
                <Link to={`/books/${b.id}`} aria-label={`Hap ${b.title}`} title="Hap librin" className="block">
                  {cover}
                </Link>
              </motion.div>
            );
          }
          return (
            <motion.button
              key={`${b.id}#${lapsOf(i)}`}
              type="button"
              onClick={() => jumpTo(i)}
              aria-label={`Zgjidh ${b.title}`}
              initial={initial}
              animate={anim}
              transition={transition}
              style={{ left: "50%", transformStyle: "preserve-3d" }}
              className="group absolute top-0 w-48 cursor-pointer focus:outline-none"
            >
              {cover}
            </motion.button>
          );
        })}
      </div>

      {/* caption links to the open book */}
      <div className="absolute inset-x-0 bottom-[64px] z-20 text-center">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
          >
            <Link
              to={`/books/${current.id}`}
              className="font-display text-lg font-bold text-ink hover:text-brand dark:text-[#f3ead8] dark:hover:text-[#f0c869] hover:underline"
            >
              {current.title}
            </Link>
            <p className="text-sm text-muted dark:text-white/70">
              {current.authorName} · {current.publicationYear}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* dots jump directly */}
      <div className="absolute inset-x-0 bottom-[44px] z-20 flex justify-center gap-1.5">
        {books.map((b, i) => (
          <button
            key={b.id}
            onClick={() => jumpTo(i)}
            aria-label={`Libri ${i + 1}: ${b.title}`}
            className={`h-1.5 rounded-full transition-all ${
              i === vIdx ? "w-6 bg-brand dark:bg-[#f0c869]" : "w-1.5 bg-parchment-deep hover:bg-muted dark:bg-white/35 dark:hover:bg-white/60"
            }`}
          />
        ))}
      </div>

      {!reduceMotion && (
        <span className="absolute inset-x-0 bottom-6 z-20 block text-center text-[11px] uppercase tracking-widest text-muted dark:text-white/45">
          Kliko një kopertinë për ta hapur në qendër
        </span>
      )}
    </div>
  );
}
