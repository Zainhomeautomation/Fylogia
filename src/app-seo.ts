const labels: Record<string, string> = {
  explore: "Explore",
  local: "Local News",
  regional: "Regional News",
  world: "World News",
  latest: "Latest News",
  categories: "Categories",
  sources: "My Sources",
  saved: "Saved Articles",
  offline: "Offline Library",
  magazines: "Magazine Library",
  history: "Reading History",
  settings: "Settings",
};
export function updateAppSeo(section: string) {
  const home = section === "home" && !location.search;
  const title = home
    ? "Fylogia — Your World, One Page at a Time."
    : (labels[section] || "Reading library") + " — Fylogia";
  const description = home
    ? "Your World, One Page at a Time. Fylogia is your personal news and magazine reader, with real sources and a library that stays yours."
    : "Your personal Fylogia " +
      (labels[section] || "reading library").toLowerCase() +
      ". Preferences, saved reading and offline libraries are not public search pages.";
  const canonical =
    "https://fylogia.com/" + (section === "home" ? "" : section);
  const meta = (selector: string, content: string) => {
    const el = document.querySelector<HTMLMetaElement>(selector);
    if (el) el.content = content;
  };
  document.title = title;
  meta('meta[name="description"]', description);
  meta('meta[property="og:description"]', description);
  meta(
    'meta[name="robots"]',
    home ? "index,follow,max-image-preview:large" : "noindex,follow,noarchive",
  );
  meta('meta[property="og:title"]', title);
  meta('meta[property="og:url"]', canonical);
  const link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (link) link.href = canonical;
}
