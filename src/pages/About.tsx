import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ArrowRight, BookOpen, Building2, Globe, HeartHandshake, Library, Smartphone, Sparkles, Sprout, Users } from "lucide-react";
import { SectionTitle } from "@/components/ui";
import AuthorLinks from "@/components/AuthorLinks";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  photo?: string;
  links?: { label: string; url: string; kind?: string }[];
}

const TEAM: TeamMember[] = [
  {
    id: "elton-kola",
    name: "Elton Kola",
    role: "Themelues · Inxhinier software",
    bio: "25+ vjet eksperiencë në inxhinieri softuerike, duke krijuar dhe përmirësuar platforma online e aplikacione mobile. Pasion për librat dhe dijen. Kjo nismë është një dhuratë që do t'u lërë fëmijëve, nipave dhe mbesave që vijnë. Ndërtuar mbi punë vullnetare — hajde, bashkohu me ne.",
    photo: "/team/elton-kola.jpg",
    links: [
      { label: "eltonkola.com", url: "https://eltonkola.com", kind: "website" },
      { label: "LinkedIn", url: "https://www.linkedin.com/in/eltonkola", kind: "social" },
    ],
  },
  {
    id: "eltjon-mirashi",
    name: "Eltjon Mirashi",
    role: "Jurist · E Drejta Ndërkombëtare & Pajtueshmëria",
    bio: "Doktoraturë në të drejtë ndërkombëtare dhe specialist i pajtueshmërisë ICT me mbi katër vjet eksperiencë në MSC Mediterranean Shipping Company. Ekspert i standardeve ISO/IEC 27001, ISO 22301 dhe sigurisë kibernetike. Në LexoShqip kujdeset për sigurinë juridike të platformës: verifikimin e të drejtave të autorit, pajtueshmërinë me legjislacionin e domenin publik, dhe mbrojtjen e kontribuesve.",
    photo: "/team/eltjon-mirashi.jpg",
    links: [
      { label: "LinkedIn", url: "https://www.linkedin.com/in/eltjon-mirashi-608b54b2/", kind: "social" },
    ],
  },
];

export default function About() {
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    const timer = setTimeout(() => {
      const el = document.querySelector(hash);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
    return () => clearTimeout(timer);
  }, [hash]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
      <SectionTitle
        title="Kush jemi"
        subtitle="Rreth nesh — njerëzit pas bibliotekës së hapur të letërsisë shqipe"
      />

      <div className="prose-parchment mt-8 space-y-5 text-lg leading-relaxed text-ink-soft">
        <p>
          <strong className="text-ink">LexoShqip</strong> lindi nga një pyetje e thjeshtë:
          pse tekstet më të bukura të gjuhës sonë gjenden ose në skane të prishura, ose pas
          faqeve piratike? Mijëra fëmijë shqiptarë lindin çdo vit jashtë atdheut — dhe libri i
          parë që u vjen në dorë është në një gjuhë tjetër. Ne duam ta ndryshojmë këtë.
        </p>
        <p>
          Jemi një organizatë jo-fitimprurëse, e ndërtuar tërësisht mbi punë vullnetare dhe
          pasion. Asnjë anëtar nuk merr pagë — gjithçka bëhet me dashuri ndaj gjuhës dhe kulturës
          shqipe, pa asnjë interes personal material. Platforma do të jetë gjithmonë falas, pa
          reklama, pa gjurmues.
        </p>
      </div>

      {/* 4 pillars */}
      <section className="mt-12">
        <h2 className="mb-6 font-display text-2xl font-bold text-ink">Katër shtyllat e projektit</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          {[
            {
              icon: Smartphone,
              num: "01",
              title: "Aplikacionet — Web & Mobile",
              body: "Platformë leximi e hapur: faqja web dhe aplikacionet Android/iOS janë falas, me kod burimor të hapur (open-source) dhe të vetëhostueshme. Çdo institucion mund të nisë instancën e vet.",
            },
            {
              icon: Library,
              num: "02",
              title: "Biblioteka Publike",
              body: "Vepra të letërsisë shqipe në domain publik — autorë të vdekur para vitit 1956. Kuruar me kujdes: çdo vepër ka burim të deklaruar, licencë të verifikuar dhe tekst të pastër.",
            },
            {
              icon: Sprout,
              num: "03",
              title: "Autorë të Rinj",
              body: "Autorë bashkëkohorë shqiptarë që publikojnë me leje të drejtpërdrejtë. LexoShqip vepron si platformë mbajtëse — autori ruan të gjitha të drejtat dhe mund të heqë veprën kur të dojë.",
            },
            {
              icon: Globe,
              num: "04",
              title: "Libraria e Lirë Online",
              body: "Libra shqip të disponueshëm lirisht në internet, të grumbulluar nga burime të treta si FLOSSK. Drejtuar nga komuniteti — çdo material hiqet brenda 7 ditësh pune me kërkesë të justifikuar.",
            },
          ].map(({ icon: Icon, num, title, body }) => (
            <div key={num} className="flex gap-4 rounded-xl border border-parchment-deep bg-surface p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft">
                <Icon className="size-5 text-brand" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted">{num}</p>
                <p className="mt-0.5 font-display font-bold text-ink">{title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* target audience */}
      <section className="mt-12">
        <h2 className="mb-6 font-display text-2xl font-bold text-ink">Për kë?</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: BookOpen, k: "Lexues", v: "Lexues të thjeshtë, dashamirës librash dhe studentë që kërkojnë tekste të qarta" },
            { icon: Sprout, k: "Autorë & Shkrimtarë", v: "Autorë të rinj që duan ta çojnë veprën te lexuesi pa ndërmjetës" },
            { icon: Users, k: "Mësues & Akademikë", v: "Profesorë, hulumtues dhe kurikula shkollore që kanë nevojë për tekste origjinale" },
            { icon: Building2, k: "Biblioteka & Institucione", v: "Biblioteka publike, shkolla dhe institucione kulturore që duan arkiv dixhital" },
            { icon: Globe, k: "Diaspora", v: "Shqiptarë jashtë atdheut dhe fëmijët e tyre, kudo në botë" },
            { icon: Sparkles, k: "Zhvillues & Komunitet", v: "Kontribues teknikë, vullnetarë dhe organizata që duan të ndërtojnë mbi platformën tonë" },
          ].map(({ icon: Icon, k, v }) => (
            <div key={k} className="rounded-xl border border-parchment-deep bg-surface p-4">
              <Icon className="size-5 text-brand" />
              <p className="mt-2 font-display text-sm font-bold">{k}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">{v}</p>
            </div>
          ))}
        </div>
      </section>

      {/* values strip */}
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          { icon: Sprout, k: "Për brezat", v: "Një dhuratë për fëmijët, nipat e mbesat — kudo ku lindin shqiptarë" },
          { icon: HeartHandshake, k: "Vullnetarizëm i pastër", v: "Ndërtuar mbi kontribute falas: transkriptime, zëra, korrekturë — pa interes personal" },
          { icon: Sparkles, k: "Hapur si kodi", v: "Kodi dhe të dhënat janë publike në GitHub — askush s'është peng" },
        ].map(({ icon: Icon, k, v }) => (
          <div key={k} className="rounded-xl border border-parchment-deep bg-surface p-5">
            <Icon className="size-6 text-brand" />
            <p className="mt-3 font-display font-bold">{k}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">{v}</p>
          </div>
        ))}
      </div>

      {/* collaboration anchor */}
      <section id="bashkepunimi" className="mt-14 scroll-mt-20 rounded-2xl bg-gradient-to-br from-brand to-brand-dark p-8 text-white">
        <Building2 className="mb-3 size-8 opacity-90" />
        <h2 className="font-display text-2xl font-bold sm:text-3xl">Bashkëpunim institucional</h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-white/85">
          Jeni bibliotekë, shtëpi botuese, institucion kulturor ose organizatë arsimore? LexoShqip
          ofron mundësi bashkëpunimi të ndryshme — nga ngritja e arkivit tuaj dixhital, te
          licencimi i softuerit tonë për instancën tuaj, te partneritete kuratoriale për
          koleksione specifike. Na shkruani dhe gjejmë formën e duhur.
        </p>
        <a
          href="mailto:info@lexoshqip.org?subject=Bashkëpunim institucional"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-brand transition-transform hover:-translate-y-0.5"
        >
          Na shkruani
          <ArrowRight className="size-4" />
        </a>
      </section>

      {/* ekipi */}
      <section className="mt-16">
        <SectionTitle title="Ekipi" subtitle="Ata që mbajnë dritën ndezur" />
        <div className="mt-8 grid gap-6">
          {TEAM.map((p) => (
            <div
              key={p.id}
              className="flex flex-col gap-5 rounded-2xl border border-parchment-deep bg-surface p-6 shadow-sm sm:flex-row sm:gap-7"
            >
              {p.photo ? (
                <img
                  src={p.photo}
                  alt={`Portreti i ${p.name}`}
                  className="aspect-[3/4] w-32 shrink-0 self-start rounded-xl border-2 border-parchment-deep object-cover sm:w-40"
                />
              ) : (
                <div className="grid aspect-[3/4] w-32 shrink-0 place-items-center rounded-xl border-2 border-parchment-deep bg-parchment font-display text-3xl font-bold text-brand sm:w-40">
                  {p.name.charAt(0)}
                </div>
              )}
              <div className="min-w-0">
                <p className="font-display text-xl font-bold">{p.name}</p>
                <p className="text-sm font-medium text-brand">{p.role}</p>
                <p className="mt-3 max-w-2xl leading-relaxed text-muted">{p.bio}</p>
                {p.links && <AuthorLinks links={p.links} className="mt-4" />}
              </div>
            </div>
          ))}
          {/* ftesa: vendi yt */}
          <a
            href="mailto:info@lexoshqip.org?subject=Dëshiroj të kontribuoj si vullnetar"
            className="group flex items-center justify-center rounded-2xl border-2 border-dashed border-parchment-deep px-6 py-8 text-center transition-colors hover:border-brand"
          >
            <div>
              <p className="font-display text-lg font-bold text-muted transition-colors group-hover:text-brand">
                Vendin tënd këtu?
              </p>
              <p className="mt-1 text-sm text-muted">Bashkohu si vullnetar →</p>
            </div>
          </a>
        </div>
      </section>
    </div>
  );
}
