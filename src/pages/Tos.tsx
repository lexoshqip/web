import { Mail } from "lucide-react";
import { SectionTitle } from "@/components/ui";

const SECTIONS: { id: string; title: string; body: React.ReactNode }[] = [
  {
    id: "pranimi",
    title: "1. Pranimi i kushteve",
    body: (
      <>
        Duke përdorur faqen <strong>lexoshqip.org</strong>, aplikacionet mobile LexoShqip
        ose çdo shërbim tjetër të platformës (së bashku, «Shërbimi»), ju pranoni këto Kushte
        Përdorimi. Nëse nuk i prani, mos e përdorni Shërbimin.
      </>
    ),
  },
  {
    id: "sherbimi",
    title: "2. Përshkrimi i shërbimit",
    body: (
      <>
        Shërbimi ofron një bibliotekë dixhitale jofitimprurëse me vepra të letërsisë
        shqipe: lexim online, shkarkime në formate MD/EPUB/PDF dhe audiobookë — në web
        e në aplikacione mobile. Nuk ka reklama, pagesa ose gjurmues.
      </>
    ),
  },
  {
    id: "llogarite",
    title: "3. Llogaritë dhe të dhënat tuaja",
    body: (
      <>
        Shërbimi <strong>nuk kërkon llogari përdoruesi</strong>. Preferencat tuaja
        (favorite, progresi i leximit/dëgjimit) ruhen <strong>vetëm në pajisjen tuaj</strong>
         — nuk transmetohen te ne. Shihni{" "}
        <a href="/privatesia" className="text-brand hover:underline">Politikën e Privatësisë</a>.
      </>
    ),
  },
  {
    id: "te-drejtat",
    title: "4. Përmbajtja dhe të drejtat e autorit",
    body: (
      <>
        Veprat e publikuara janë në domain publik, të licencuara me licenca të hapura
        (Creative Commons) ose të përfshira me leje të shprehur të titullarëve. Faqja e
        secilit libër deklaron publikisht regjimin ligjor dhe burimet. Përmbajtja mbrohet
        nga të drejtat e autorit ku këto ekzistojnë; titullarët mund ta heqin atë sipas{" "}
        <a href="/legal#heqja" className="text-brand hover:underline">procedurës sonë të njoftimit</a>.
      </>
    ),
  },
  {
    id: "perdorimi",
    title: "5. Përdorimi i pranueshëm",
    body: (
      <>
        Shkarkimet dhe dëgjimet janë për <strong>përdorim personal, jokomercial</strong>,
        brenda kushteve të licencës së secilës vepër. Kur ripublikoni përmbajtje me licencë
        CC-BY, duhet të citoni autorin dhe burimin. Është i ndaluar grumbullimi automatik i
        masës (scraping), anashkalimi i kufizimeve teknike të licencave apo rishitja e
        përmbajtjes.
      </>
    ),
  },
  {
    id: "garancite",
    title: "6. Garancitë",
    body: (
      <>
        Shërbimi ofrohet «siç është» («as is») pa garanci të nënshtruar. Ne përpiqemi për
        saktësi tekstuale e ligjore, por nuk garantojmë ndërprerje-zero të shërbimit,
        pajtueshmëri me çdo pajisje, ose status absolut juridik të secilës vepër jashtë
        burimeve të deklaruara në faqen e saj.
      </>
    ),
  },
  {
    id: "pergjegjesia",
    title: "7. Kufizimi i përgjegjësisë",
    body: (
      <>
        Sa më lejuar nga ligji, LexoShqip dhe kontributorët e tij nuk mbajnë përgjegjësi
        për dëmet indirekte që rrjedhin nga përdorimi i Shërbimit, përfshirë humbjen e
        të dhënave të ruajtura lokalisht në pajisjen tuaj (p.sh. progresi i leximit).
      </>
    ),
  },
  {
    id: "ndryshimet",
    title: "8. Ndryshimet e kushteve",
    body: (
      <>
        Mund t'i përditësojmë këto kushte me zhvillimin e platformës; versioni aktual jeton
        gjithmonë në këtë adresë dhe ndryshimet thelbësore njoftohen brenda aplikacioneve.
        Vazhdimi i përdorimit pas ndryshimeve do të thotë pranim i tyre.
      </>
    ),
  },
];

export default function Tos() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <SectionTitle
        title="Kushtet e Përdorimit"
        subtitle="Rregullat që udhëheqin përdorimin e platformës LexoShqip"
      />

      <div className="mt-10 space-y-9 text-[15px] leading-relaxed text-ink-soft">
        {SECTIONS.map((sec) => (
          <section key={sec.id} id={sec.id} className="scroll-mt-20">
            <h2 className="font-display text-xl font-bold text-ink">{sec.title}</h2>
            <p className="mt-3">{sec.body}</p>
          </section>
        ))}

        {/* 9 + kontakt */}
        <section id="ligji" className="scroll-mt-20">
          <h2 className="font-display text-xl font-bold text-ink">9. Ligji zbatues</h2>
          <p className="mt-3">
            Këto kushte rregullohen nga legjislacioni i Shteteve të Bashkuara të Amerikës,
            ku organizata jofitimprurëse e platformës po regjistrohet. Çdo kontest zgjidhet
            fillimisht me dialog të mirëbesimshëm.
          </p>
        </section>

        <section className="rounded-2xl border border-parchment-deep bg-parchment/60 p-6 text-center">
          <h2 className="font-display text-lg font-bold text-ink">10. Kontakt</h2>
          <a
            href="mailto:info@lexoshqip.org"
            className="mt-3 inline-flex items-center gap-2 font-medium text-brand hover:underline"
          >
            <Mail className="size-4" /> info@lexoshqip.org
          </a>
          <p className="mt-3 text-sm text-muted">
            Shihni edhe:{" "}
            <a href="/legal" className="hover:text-brand hover:underline">Të drejtat &amp; Ligjore</a>
            {" · "}
            <a href="/privatesia" className="hover:text-brand hover:underline">Politika e Privatësisë</a>
          </p>
        </section>
      </div>
    </div>
  );
}
