import { useCallback, useEffect, useState } from "react";

const sections = new Set([
  "home",
  "explore",
  "local",
  "regional",
  "world",
  "latest",
  "categories",
  "sources",
  "saved",
  "offline",
  "magazines",
  "history",
  "settings",
]);
const base = import.meta.env.BASE_URL;
function currentSection() {
  const section = location.pathname.slice(base.length).replace(/\/$/, "");
  return sections.has(section) ? section : "home";
}

/** Section URLs work on reload and browser back, including offline shell fallback. */
export function useSectionRoute() {
  const [section, setSection] = useState(currentSection);
  useEffect(() => {
    const restore = () => setSection(currentSection());
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);
  const navigate = useCallback((next: string) => {
    if (!sections.has(next)) return;
    const path = base + (next === "home" ? "" : next);
    if (location.pathname !== path) history.pushState(null, "", path);
    setSection(next);
  }, []);
  return [section, navigate] as const;
}
