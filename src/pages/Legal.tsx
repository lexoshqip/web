import { Link } from "react-router-dom";
import { Scale, ShieldCheck } from "lucide-react";
import { SectionTitle } from "@/components/ui";

export default function Legal() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <SectionTitle
        title="Të drejtat & Ligjore"
        subtitle="Si punojmë, çfarë publikojmë dhe si funksionon procedura e heqjes së përmbajtjes"
      />

      <div className="mt-10 space-y-10 text-[15px] leading-relaxed text-ink-soft">
        {/* 1 */}
        <section>
          <h2 className="flex items-center gap-2 font-display text-xl font-bold text-ink">
            <ShieldCheck className="size-5 text-brand" /> Puna në mirëbesim
          </h2>
          <p className="mt-3">
            LexoShqip është një arkiv kulturor jofitimprurës, i ndërtuar dhe kuruar me punë
            vullnetare në <strong className="text-ink">mirëbesim të plotë</strong>. Çdo vepër
            që publikohet është hulumtuar paraprakisht nga ekipi i redaksisë për të përcaktuar
            statusin e saj ligjor. Nuk kemi asnjë interes ekonomik nga shpërndarja e
            përmbajtjes: pa reklama, pa gjurmues, pa abonime.
          </p>
        </section>

        {/* 2 */}
        <section>
          <h2 className="flex items-center gap-2 font-display text-xl font-bold text-ink">
            <Scale className="size-5 text-brand" /> Çfarë publikojmë
          </h2>
          <p className="mt-3">Në platformë publikohen vetëm vepra që bien në njërën nga tri kategoritë:</p>
          <ol className="mt-3 list-decimal space-y-2 pl-5">
            <li>
              <strong className="text-ink">Domain publik</strong> — vepra të autorëve të
              ndarë nga jeta mbi 70 vjet, sipas legjislacionit të aplikueshëm të të drejtave
              të autorit.
            </li>
            <li>
              <strong className="text-ink">Licenca të hapura</strong> — vepra të botuara
              me licenca Creative Commons ose të tjera të lira, të deklaruara nga
              digjitalizuesi i autorizuar.
            </li>
            <li>
              <strong className="text-ink">Leje e shprehur</strong> — vepra bashkëkohore të
              përfshira me miratimin e shkruar të autorit apo të trashëgimtarëve të tyre.
            </li>
          </ol>
          <p className="mt-3">
            Faqja e secilit libër shfaq publikisht licencën, nivelin e verifikimit dhe
            burimet nga erdhi teksti — provën e hulumtit tonë.
          </p>
        </section>

        {/* 3 */}
        <section id="heqja" className="scroll-mt-20">
          <h2 className="font-display text-xl font-bold text-ink">
            Procedura e njoftimit për heqje (takedown)
          </h2>
          <p className="mt-3">
            Nëse besoni se një përmbajtje e publikuar në LexoShqip shkel të drejtat tuaja
            autoriale ose të një të treti që ju përfaqësoni, na dërgoni njoftim te{" "}
            <a href="mailto:info@lexoshqip.org" className="font-medium text-brand hover:underline">
              info@lexoshqip.org
            </a>{" "}
            duke përfshirë:
          </p>
          <ul className="mt-3 space-y-2 pl-5">
            {[
              "Emrin dhe të dhënat tuaja të kontaktit;",
              "Përshkrimin e veprës që mbroni dhe provën e lidhjes me të drejtat (autor / trashëgimtar / letrar);",
              "URL-në e saktë të faqes në LexoShqip ku gjendet përmbajtja;",
              "Deklaratën e mirëbesimit se përdorimi nuk është i autorizuar nga titullari i të drejtave.",
            ].map((t) => (
              <li key={t} className="flex gap-3">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" />
                {t}
              </li>
            ))}
          </ul>
          <p className="mt-3">
            <strong className="text-ink">Angazhimi ynë:</strong> konfirmojmë marrjen brenda
            48 orësh dhe <strong className="text-ink">pezullojmë ose heqim përmbajtjen brenda
            5 ditësh pune</strong> derisa shqyrtimi të përfundojë. Nëse njoftimi rezulton i
            pabazë, përmbajtja mund të rikthehet me shpjegim. Kurrë nuk kërkojmë gjyq për ta
            hequr diçka — mirëbesimi funksionon në të dyja drejtimet.
          </p>
        </section>

        {/* 4 */}
        <section>
          <h2 className="font-display text-xl font-bold text-ink">Mos-komercializmi</h2>
          <p className="mt-3">
            Platforma nuk shet produkte, nuk shfaq reklama, nuk mbledh të dhëna personale dhe
            nuk përfiton nga veprat e publikuara. Të gjitha shkarkimet dhe transmetimet janë
            falas, për qëllime edukative e kulturore, personale dhe jokomerciale.
          </p>
        </section>

        {/* 5 */}
        <section>
          <h2 className="font-display text-xl font-bold text-ink">Kufizimi i përgjegjësisë</h2>
          <p className="mt-3">
            Materiali ofrohet «siç është», bazuar në hulumtimin e mirëbesimshëm të ekipit.
            LexoShqip nuk është këshilltar ligjor dhe nuk garanton statusin juridik absolut
            të secilës vepër jashtë burimeve të deklaruara. Lidhjet drejt sajteve të treta
            (arkiva, botues, dyqane) janë ofruar si informacion — përmbajtja e tyre nuk është
            nën kontrollin tonë. Korrekturet dhe sqarimet janë gjithmonë të mirëseardhura.
          </p>
        </section>

        <section className="rounded-2xl border border-parchment-deep bg-parchment/60 p-6 text-center">
          <p className="text-sm text-muted">
            Ky dokument mund të përditësohet me zhvillimin e platformës. Versioni aktual
            mbahet gjithmonë publikisht në këtë faqe.
          </p>
          <LinkToBook />
        </section>
      </div>
    </div>
  );
}

function LinkToBook() {
  return (
    <Link to="/books/lexo-shqip" className="mt-3 inline-block text-sm font-medium text-brand hover:underline">
      Mëso më shumë: «LexoShqip» — pse dhe si u ndërtua →
    </Link>
  );
}
