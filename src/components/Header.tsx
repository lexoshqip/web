import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import {
  BookOpen,
  Bookmark,
  Compass,
  Menu,
  Smartphone,
  Sprout,
  Users,
  X,
} from "lucide-react";
import SearchBar from "./SearchBar";
import ThemeToggle from "./ThemeToggle";

const NAV = [
  { to: "/books", label: "Libra", icon: BookOpen },
  { to: "/authors", label: "Autorë", icon: Users },
  { to: "/zbulo", label: "Zbulo", icon: Compass },
  { to: "/emerging", label: "Autorë të Rinj", icon: Sprout },
  { to: "/aplikacioni", label: "App", icon: Smartphone },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
      isActive
        ? "bg-brand-soft text-brand"
        : "text-ink-soft hover:bg-parchment hover:text-ink"
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-parchment-deep bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:gap-3 sm:px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <img src="/brand/logo-solid.png" alt="" className="size-9 object-contain" />
          <span className="font-display text-xl font-bold tracking-tight">
            Lexo<span className="text-brand">Shqip</span>
          </span>
        </Link>

        <nav className="ml-1 hidden items-center gap-0.5 lg:flex">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkCls}>
              <item.icon className="size-4 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* right cluster: search · biblioteka ime · theme */}
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden w-60 xl:block">
            <SearchBar />
          </div>

          <NavLink to="/favorites" className={({ isActive }) => `${linkCls({ isActive })} hidden md:inline-flex`}>
            <Bookmark className="size-4 shrink-0" />
            Biblioteka ime
          </NavLink>

          <ThemeToggle />

          <button
            className="grid size-9 shrink-0 place-items-center rounded-lg text-ink-soft hover:bg-parchment xl:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-parchment-deep px-4 pb-4 pt-2 xl:hidden">
          <div className="mb-3">
            <SearchBar />
          </div>
          <nav className="flex flex-col gap-1">
            {[...NAV, { to: "/favorites", label: "Biblioteka ime" }].map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-[15px] font-medium ${
                    isActive ? "bg-brand-soft text-brand" : "text-ink-soft hover:bg-parchment"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
