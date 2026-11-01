import { categories, sources } from "./catalog.ts";
import { localSourceIds } from "./news-geography.ts";
export const siteOrigin = "https://fylogia.com";
export const slogan = "Your World, One Page at a Time.";
export const homeTitle = "Fylogia — " + slogan;
export const homeDescription =
  "Your World, One Page at a Time. Fylogia is your personal news and magazine reader, with real sources and a library that stays yours.";
export const appSections: Record<string, string> = {
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
export const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const descriptions: Record<string, string> = {
  Technology:
    "Explore computing, connected devices and the ideas shaping everyday technology. Compare publisher sources and build a reading library around the subjects you follow.",
  Apple:
    "Follow Apple's products, platforms and developer ecosystem through independent publications and official sources. Choose the Apple coverage that fits your interests without treating every product rumour as a confirmed announcement.",
  AI: "Find sources covering artificial intelligence, research and its practical uses. Fylogia brings publisher attribution and original links together so you can follow the evidence and read further at the source.",
  "Smart Home":
    "Discover home automation, connected devices and practical smart-home projects. Follow specialist publishers and open-source communities while keeping your chosen sources under your control.",
  "3D Printing":
    "Explore additive manufacturing, desktop fabrication and making. Build a source collection for printer developments, materials and projects, with original publisher links for further reading.",
  Science:
    "Read across scientific research, discoveries and the people doing the work. Follow institutional and independent sources, with full-text availability distinguished from publisher previews inside the reader.",
  Space:
    "Explore astronomy, exploration and space technology through agency and specialist sources. Original publisher credits and links stay attached to stories; permission varies for individual photographs and articles.",
  Aviation:
    "Follow civil aviation, aircraft and the wider world of flight. Choose specialist publications and read further through clearly attributed publisher links.",
  Travel:
    "Find travel ideas, destination reporting and practical perspectives from travel publishers. Gather the sources you enjoy into a personal magazine without confusing publisher previews with complete articles.",
  Cars: "Explore automotive technology, design and transport. Follow the publishers that match your interests and keep original reporting and source attribution close to each story.",
  Economy:
    "Compare economic reporting, policy analysis and the forces affecting everyday life. This collection helps you choose sources; it does not offer personalised financial advice.",
  Business:
    "Follow companies, industries and the changing world of work. Build a business reading list from identifiable publishers rather than mistaking aggregated coverage for Fylogia's own reporting.",
  Politics:
    "Explore political reporting and public policy from multiple publisher sources. Select your regional preferences in the application and follow original links for context and complete reporting.",
  "World News":
    "Discover international reporting and perspectives from publishers around the world. Fylogia identifies the original source and separates worldwide coverage from the app's optional local and regional views.",
  Health:
    "Find health reporting and research-focused publications. Use original sources for context; the reader and its source directory are not a substitute for individual medical advice.",
  "Healthy Food":
    "Explore food, nutrition and everyday healthy eating through publisher sources. Keep practical ideas and research reporting in one personal library while checking original context and authorship.",
  Cooking:
    "Discover recipes, food culture and the craft of cooking. Follow the publications you enjoy; recipes and photography remain subject to their publishers' rights and access conditions.",
  Sports:
    "Follow football, basketball, motorsport and a wider range of sports. Choose individual sports in Fylogia and keep news articles separate from the library's original magazine editions.",
  Gaming:
    "Explore games, the people making them and the platforms they run on. Build a reading list from specialist publishers with direct links to the original coverage.",
  Photography:
    "Discover photographic practice, equipment and visual storytelling. Publisher photographs retain their own rights; inclusion in a feed does not make an image freely reusable.",
  Entertainment:
    "Explore film, television, music and culture through recognisable publishers. Fylogia helps organise your reading while keeping original reporting credited to its source.",
  Computing:
    "Follow operating systems, software and the practical side of computing. Find technical communities and publications, then select sources for your own reading library.",
  Architecture:
    "Explore buildings, spaces and architectural practice. Follow design publications and preserve the connection between projects, editorial photography and their original publishers.",
  Engineering:
    "Discover engineering practice, manufacturing and applied technology. Read institutional and specialist sources and explore the original editions available in the magazine library.",
  "History & Culture":
    "Explore history, heritage and cultural perspectives through publisher sources. Save thoughtful reading and follow original links for the full context behind a subject.",
  Marine:
    "Follow the marine world, boating and maritime interests. Choose specialist sources and keep credited publisher coverage distinct from complete digital publications.",
  "Men’s Fashion":
    "Explore menswear, style and the publications covering them. Follow publisher articles and visit official magazine sites for edition access; article collections are not complete magazine issues.",
  "Women’s Fashion":
    "Discover fashion reporting, designers and style publications. The directory links to original publishers and does not promise free access to their complete digital editions.",
  "Watches & Jewelry":
    "Explore watchmaking, jewellery and design through specialist publications. Source links help you continue reading with the original publisher and its access conditions.",
  "Luxury & Lifestyle":
    "Explore design, style and considered living through publisher sources. Select the coverage you enjoy without confusing a source listing with permission to reproduce an entire publication.",
  "Nature & Environment":
    "Follow wildlife, conservation and environmental reporting. Compare original sources and build a reading collection around the natural world.",
  "Home & Garden":
    "Discover gardens, interiors and practical ideas for the home. Follow specialist publishers and save reading while respecting the rights attached to their words and images.",
  Fashion:
    "Explore menswear, womenswear, watches and lifestyle publications in one directory. Visit the individual subject collections or continue with official publishers; complete magazine access is listed separately.",
};
const magazineIds = new Set([
  "popular-science",
  "smithsonian-magazine",
  "scientific-american",
  "architectural-digest",
  "vogue",
  "elle",
  "gq",
  "wallpaper",
  "fourfourtwo",
  "autosport",
  "runners-world",
  "outside",
]);
export interface DiscoveryPage {
  path: string;
  name: string;
  title: string;
  description: string;
  kind: "hub" | "news" | "magazines";
  category?: string;
  sourceIds: string[];
  parent?: string;
  intro: string;
  action: string;
}
const make = (
  path: string,
  name: string,
  kind: DiscoveryPage["kind"],
  intro: string,
  sourceIds: string[],
  category?: string,
  parent?: string,
): DiscoveryPage => ({
  path,
  name,
  kind,
  intro,
  sourceIds,
  category,
  parent,
  title: name + " — Fylogia",
  description:
    intro.split(/(?<=\.) /)[0] +
    " Explore Fylogia's attributed publisher directory.",
  action:
    category && category !== "Fashion"
      ? (kind === "magazines" ? "magazines" : "explore") +
        "?category=" +
        encodeURIComponent(category)
      : kind === "magazines"
        ? "magazines"
        : category === "Fashion"
          ? "categories"
          : "explore",
});
const categorySources = (category: string) =>
  sources.filter((s) =>
    category === "Fashion"
      ? s.categories.some((c) =>
          [
            "Men’s Fashion",
            "Women’s Fashion",
            "Watches & Jewelry",
            "Luxury & Lifestyle",
          ].includes(c),
        )
      : s.categories.includes(category),
  );
const newsRoot = make(
  "discover/news",
  "News sources & categories",
  "news",
  "Explore news sources by subject, from technology and science to travel, fashion and sport. Fylogia is an independent reader and aggregator, not the original reporter of these publishers' stories.",
  sources.map((s) => s.id),
  undefined,
  "discover",
);
const magazineRoot = make(
  "discover/magazines",
  "Magazines & original editions",
  "magazines",
  "Explore original digital editions and official magazine publishers. A publisher's article feed is not a complete magazine issue; the library labels original PDFs and publisher-only access separately.",
  [...magazineIds],
  undefined,
  "discover",
);
export const discoveryPages: DiscoveryPage[] = [
  make(
    "discover",
    "Discover news & magazines",
    "hub",
    "Find a reading collection for your world: technology, Apple, AI, science, travel, fashion, sport and more. Fylogia is a free, open-source reader with magazine-style pages, optional offline downloads and a library stored on your device.",
    [],
    undefined,
  ),
  newsRoot,
  magazineRoot,
  ...[...categories, "Fashion"]
    .map((c) =>
      make(
        "discover/news/" + slug(c),
        c + " news & sources",
        "news",
        descriptions[c],
        categorySources(c).map((s) => s.id),
        c,
        newsRoot.path,
      ),
    )
    .filter((p) => p.sourceIds.length),
  ...[...categories, "Fashion"]
    .map((c) =>
      make(
        "discover/magazines/" + slug(c),
        c + " magazines & publications",
        "magazines",
        "Find " +
          c.toLowerCase() +
          " publications, publisher articles and any original editions listed in Fylogia's magazine library. Full digital issues are available only where explicitly identified; otherwise continue with the official publisher.",
        categorySources(c)
          .filter((s) => magazineIds.has(s.id))
          .map((s) => s.id),
        c,
        magazineRoot.path,
      ),
    )
    .filter(
      (p) =>
        p.sourceIds.length ||
        [
          "Technology",
          "Space",
          "Science",
          "Engineering",
          "3D Printing",
          "Computing",
          "Photography",
        ].includes(p.category || ""),
    ),
  make(
    "discover/news/local",
    "Local News",
    "news",
    "Discover how Fylogia finds local reporting using an approximate country only when you open Local News. The public directory is the same for every visitor; no GPS, personal library or country lookup is needed to browse it.",
    [
      ...new Set(
        [
          "OM",
          "CY",
          "DE",
          "US",
          "GB",
          "IN",
          "NZ",
          "IE",
          "PK",
          "CA",
          "KE",
        ].flatMap((c) => localSourceIds(c)),
      ),
    ],
    undefined,
    newsRoot.path,
  ),
  make(
    "discover/news/regional",
    "Regional News",
    "news",
    "Choose Worldwide, Middle East, EU, North America, Asia or India in Fylogia. Your editorial region is separate from optional approximate-country Local News and does not change automatically when you travel.",
    sources.filter((s) => s.region !== "Worldwide").map((s) => s.id),
    undefined,
    newsRoot.path,
  ),
];
// Local and regional public guides link to the existing private/personalised app views.
for (const p of discoveryPages) {
  if (p.path.endsWith("/local")) p.action = "local";
  if (p.path.endsWith("/regional")) p.action = "regional";
  if (p.path.endsWith("/world-news")) p.action = "world";
}
export function discoverySources(page: DiscoveryPage) {
  return sources.filter((s) => page.sourceIds.includes(s.id));
}
export function pageSchema(page?: DiscoveryPage) {
  const website = {
    "@type": "WebSite",
    "@id": siteOrigin + "/#website",
    name: "Fylogia",
    url: siteOrigin + "/",
    inLanguage: "en",
    description: homeDescription,
    publisher: { "@id": siteOrigin + "/#organization" },
  };
  const organization = {
    "@type": "Organization",
    "@id": siteOrigin + "/#organization",
    name: "Fylogia",
    url: siteOrigin + "/",
    logo: {
      "@type": "ImageObject",
      url: siteOrigin + "/icons/icon-512.png",
      width: 512,
      height: 512,
    },
    slogan,
    sameAs: ["https://github.com/Zainhomeautomation/Fylogia"],
    description:
      "An open-source news and magazine reading project operated from Oman.",
  };
  const graph: unknown[] = [website, organization];
  if (page) {
    const ancestors = [
      { name: "Fylogia", path: "" },
      ...page.path.split("/").map((_, i, arr) => {
        const path = arr.slice(0, i + 1).join("/");
        const found = discoveryPages.find((p) => p.path === path);
        return { name: found?.name || page.name, path };
      }),
    ];
    graph.push(
      {
        "@type": "BreadcrumbList",
        itemListElement: ancestors.map((a, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: a.name,
          item: siteOrigin + "/" + a.path,
        })),
      },
      {
        "@type": "CollectionPage",
        "@id": siteOrigin + "/" + page.path,
        url: siteOrigin + "/" + page.path,
        name: page.name,
        description: page.intro,
        inLanguage: "en",
        isPartOf: { "@id": siteOrigin + "/#website" },
        publisher: { "@id": siteOrigin + "/#organization" },
        mainEntity: {
          "@type": "ItemList",
          itemListElement: discoverySources(page)
            .slice(0, 18)
            .map((s, i) => ({
              "@type": "ListItem",
              position: i + 1,
              item: { "@type": "WebSite", name: s.name, url: s.site },
            })),
        },
      },
    );
  }
  return { "@context": "https://schema.org", "@graph": graph };
}
