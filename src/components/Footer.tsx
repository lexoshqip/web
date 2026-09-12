import { Link } from "react-router-dom";
import {
  FileText,
  HeartHandshake,
  Landmark,
  Lock,
  Mail,
  Scale,
} from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-parchment-deep bg-parchment">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <img src="/brand/logo-solid.png" alt="" className="size-8 object-contain" />
            <span className="font-display text-lg font-bold">
              Lexo<span className="text-brand">Shqip</span>
            </span>
          </div>
          <p className="text-sm leading-relaxed text-ink-soft">
            Arkiv i hapur i letërsisë shqipe — ruajtur për brezat e ardhshëm. Lexo online, dëgjo si audiobook, ose shkarko EPUB, PDF ose MD — sipas çfarë ofron secila vepër.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6 text-sm md:justify-items-center">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
              Shfletim
            </p>
            <ul className="space-y-2 text-ink-soft">
              <li><Link to="/books" className="hover:text-brand">Të gjithë librat</Link></li>
              <li><Link to="/authors" className="hover:text-brand">Autorët</Link></li>
              <li><Link to="/epochs" className="hover:text-brand">Epokat</Link></li>
              <li><Link to="/favorites" className="hover:text-brand">Biblioteka ime</Link></li>
              <li><Link to="/burimet" className="hover:text-brand">Burimet</Link></li>
              <li><Link to="/aplikacioni" className="hover:text-brand">Aplikacioni</Link></li>
            </ul>
          </div>
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
              Pjesëmarrje
            </p>
            <ul className="space-y-2 text-ink-soft">
              <li><Link to="/submit" className="inline-flex items-center gap-1 hover:text-brand"><Landmark className="size-3.5" /> Publiko librin tënd</Link></li>
              <li><Link to="/rreth-nesh" className="inline-flex items-center gap-1 hover:text-brand"><HeartHandshake className="size-3.5" /> Rreth nesh</Link></li>
              <li><Link to="/legal" className="inline-flex items-center gap-1 hover:text-brand"><Scale className="size-3.5" /> Ligjore</Link></li>
              <li><Link to="/tos" className="inline-flex items-center gap-1 hover:text-brand"><FileText className="size-3.5" /> Kushtet e Përdorimit</Link></li>
              <li><Link to="/privatesia" className="inline-flex items-center gap-1 hover:text-brand"><Lock className="size-3.5" /> Privatësia</Link></li>
              <li><a href="mailto:kontakt@lexoshqip.org" className="inline-flex items-center gap-1 hover:text-brand"><Mail className="size-3.5" /> Kontakt</a></li>
            </ul>
          </div>
        </div>

        <div className="text-sm text-ink-soft md:justify-self-end">
          <p className="mb-2 font-medium text-ink">Misioni</p>
          <p className="leading-relaxed">
            Mbledhim, ruajmë dhe sjellim librat shqip në një vend të vetëm — për të mbrojtur
            gjuhën dhe kulturën shqiptare për brezat e ardhshëm. Çdo vepër ruhet me tekstin
            origjinal dhe status të qartë të të drejtave, e lirë për t'u lexuar, dëgjuar dhe shkarkuar.
          </p>
        </div>
      </div>

      <div className="border-t border-parchment-deep/70 py-4">
        <p className="text-center text-xs text-muted">
          © {new Date().getFullYear()} <span className="font-medium">lexoshqip.org</span> ·
          biblioteka e hapur e letërsisë shqipe · ndërtuar me punë vullnetare
        </p>
      </div>
    </footer>
  );
}
