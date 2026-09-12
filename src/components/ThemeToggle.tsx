import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const KEY = "lexoshqip-ui-theme";

function current(): "light" | "dark" {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/** Light/dark UI toggle. Persists to localStorage; defaults to system preference. */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">(current);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(KEY, theme);
  }, [theme]);

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label={theme === "dark" ? "Aktivo temën e ndritshme" : "Aktivo temën e errët"}
      title={theme === "dark" ? "Dritë" : "Errësirë"}
      className="grid size-9 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-parchment hover:text-brand"
    >
      {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  );
}
