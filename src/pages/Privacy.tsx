import { Database, EyeOff, Smartphone } from "lucide-react";
import { SectionTitle } from "@/components/ui";

export default function Privacy() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <SectionTitle
        title="Politika e Privatësisë"
        subtitle="Versioni i shkurtër: nuk mbledim asgjë personale"
      />

      <div className="mt-10 grid gap-5 sm:grid-cols-3">
        {[
          { icon: EyeOff, t: "Asnjë gjurmues", v: "Pa analitikë, pa reklama, pa cookie-n e ndjekjes, pa profile përdoruesi." },
          { icon: Database, t: "Asnjë llogari", v: "Nuk kërkojmë emra, email-e apo fjalëkalime për të lexuar." },
          { icon: Smartphone, t: "Të dhënat qëndrojnë te ju", v: "Favorite dhe progresi ruhen vetëm në pajisjen tuaj." },
        ].map(({ icon: Icon, t, v }) => (
          <div key={t} className="rounded-2xl border border-parchment-deep bg-surface p-6">
            <Icon className="size-7 text-brand" />
            <p className="mt-3 font-display font-bold">{t}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">{v}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 space-y-9 text-[15px] leading-relaxed text-ink-soft">
        <section>
          <h2 className="font-display text-xl font-bold text-ink">Çfarë ruhet dhe ku</h2>
          <p className="mt-3">
            Të vetmet të dhëna që Shërbimi prek janë preferencat tuaja — librat e
            preferuar, pozicioni i fundit i leximit/dëgjimit, tema e ndriçimit — të cilat
            ruhen <strong className="text-ink">lokalizisht në pajisjen tuaj</strong>{" "}
            (ruajtje e integruar e browser-it/aplikacionit). Ato nuk ngjiten kurrë në një
            server tonin dhe mund t'i fshini çdo moment duke pastruar të dhënat e faqes ose
            ç-instaluar aplikacionin.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-ink">Kërkesat teknike të pashmangshme</h2>
          <p className="mt-3">
            Ofruesi i hostimit mund të regjistrojë përkohësisht të dhëna teknike standarde
            (adresa IP e anonimizuar, tipi i pajisjes) për sigurinë dhe funksionimin e
            shërbimit — praktikë e zakonshme, jashtë kontrollit tonë të drejtpërdrejtë. Ne
            nuk i përdorim këto të dhëna për profilizim.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-ink">Fëmijët</h2>
          <p className="mt-3">
            Përmbajtja është e përshtatshme për të gjitha moshat dhe — meqë nuk mbledhim asgjë
            — nuk përpunohen të dhëna të fëmijëve.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-ink">Kontakt & ndryshimet</h2>
          <p className="mt-3">
            Pyetje rreth privatësisë:{" "}
            <a href="mailto:info@lexoshqip.org" className="font-medium text-brand hover:underline">
              info@lexoshqip.org
            </a>
            . Ndryshimet e kësaj politike publikohen në këtë faqe; versioni aktual vlen për
            të gjitha sipërfaqet e platformës (web + aplikacione mobile).
          </p>
        </section>
      </div>
    </div>
  );
}
