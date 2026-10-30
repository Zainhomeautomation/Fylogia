import type { Article, Preferences, Source } from "./catalog";
import { sportsSourceTopics } from "./sports-sources.ts";

// Keep the original Football / Formula 1 preference tokens for existing users.
export const sports = [
  {
    id: "football",
    topic: "Football",
    name: "Football (Soccer)",
    detail:
      "Premier League · Champions League · La Liga · Serie A · Bundesliga · Ligue 1 · World Cup · International & women’s football",
    pattern:
      /soccer|uefa|fifa|premier league|la liga|serie a|bundesliga|ligue 1|champions league|football/i,
  },
  {
    id: "basketball",
    topic: "Basketball",
    name: "Basketball",
    detail: "NBA · WNBA · EuroLeague · FIBA · International basketball",
    pattern: /\b(?:nba|wnba|fiba|basketball|euroleague)\b/i,
  },
  {
    id: "motorsport",
    topic: "Formula 1",
    name: "Formula 1 & Motorsport",
    detail: "Formula 1 · MotoGP · Formula E · WRC · Motorsport",
    pattern:
      /\b(?:f1|formula one|formula 1|motogp|formula e|wrc|nascar|indycar|motorsport)\b/i,
  },
  {
    id: "tennis",
    topic: "Tennis",
    name: "Tennis",
    detail: "ATP · WTA · Grand Slams",
    pattern: /\b(?:tennis|atp|wta|wimbledon|roland garros)\b/i,
  },
  {
    id: "american-football",
    topic: "American Football",
    name: "American Football",
    detail: "NFL · College football",
    pattern:
      /\b(?:nfl|ncaaf|fbs|american football|college football|super bowl|touchdown|quarterback|gridiron)\b/i,
  },
  {
    id: "baseball",
    topic: "Baseball",
    name: "Baseball",
    detail: "MLB · International baseball",
    pattern: /\b(?:baseball|mlb|world series)\b/i,
  },
  {
    id: "cricket",
    topic: "Cricket",
    name: "Cricket",
    detail: "IPL · International cricket · World Cup",
    pattern: /\b(?:cricket|ipl|t20|ashes|icc|odi)\b/i,
  },
  {
    id: "golf",
    topic: "Golf",
    name: "Golf",
    detail: "PGA Tour · DP World Tour · Major championships",
    pattern: /\b(?:golf|pga|dp world tour|ryder cup)\b/i,
  },
  {
    id: "combat",
    topic: "Combat Sports",
    name: "Combat Sports",
    detail: "Boxing · MMA · UFC",
    pattern: /\b(?:boxing|mma|ufc|boxer|heavyweight)\b/i,
  },
  {
    id: "cycling",
    topic: "Cycling",
    name: "Cycling",
    detail: "Tour de France · Professional cycling",
    pattern:
      /\b(?:cycling|cyclist|tour de france|giro d.italia|vuelta|mountain bik\w*)\b/i,
  },
  {
    id: "rugby",
    topic: "Rugby",
    name: "Rugby",
    detail: "International rugby · Major leagues",
    pattern: /\b(?:rugby|six nations|all blacks)\b/i,
  },
  {
    id: "athletics",
    topic: "Athletics & Olympics",
    name: "Athletics & Olympics",
    detail: "Track and field · Olympic sports · Running",
    pattern:
      /\b(?:athletics|olympic\w*|track and field|marathon|sprinter|running)\b/i,
  },
  {
    id: "water",
    topic: "Swimming & Water Sports",
    name: "Swimming & Water Sports",
    detail: "Swimming · Surfing · Sailing",
    pattern:
      /\b(?:swimming|swimmer|surfing|surfer|sailing|sailor|regatta|water polo)\b/i,
  },
  {
    id: "outdoor",
    topic: "Outdoor & Adventure Sports",
    name: "Outdoor & Adventure Sports",
    detail: "Hiking · Climbing · Skiing · Outdoor adventure",
    pattern:
      /\b(?:hiking|climbing|skiing|snowboard\w*|mountaineer\w*|trail running)\b/i,
  },
] as const;
export type SportId = (typeof sports)[number]["id"];
export type SportSelection = SportId | "all" | "other";
export const primarySports = sports.slice(0, 4);
export function sportForTopic(topic: string) {
  return sports.find(
    (s) =>
      s.topic === topic ||
      s.name === topic ||
      s.id === topic ||
      (s.id === "motorsport" && topic === "Motorsport"),
  );
}
export function sportLabel(topic: string) {
  return sportForTopic(topic)?.name || topic;
}
export function selectedSports(topics: readonly string[] = []) {
  return [
    ...new Set(
      topics
        .map((t) => sportForTopic(t)?.id)
        .filter((id): id is SportId => !!id),
    ),
  ];
}
const existingScopes: Record<string, readonly string[]> = {
  "motorsport-com": ["Formula 1"],
  autosport: ["Formula 1"],
  "the-race": ["Formula 1"],
  "cycling-weekly": ["Cycling"],
  cyclingnews: ["Cycling"],
  "runners-world": ["Athletics & Olympics"],
  "sailing-world": ["Swimming & Water Sports"],
};
export function topicsForSportsSource(id: string): readonly string[] {
  return sportsSourceTopics[id] || existingScopes[id] || [];
}
export function sourceSports(source: Pick<Source, "topics">) {
  return selectedSports(source.topics);
}
export function articleSports(
  article: Article,
  custom: Source[] = [],
): SportId[] {
  const ids = new Set([
    article.sourceId,
    ...(article.alsoIn || []),
    ...(article.feedContexts || []).map((c) => c.sourceId),
  ]);
  const scoped = selectedSports(
    [...ids].flatMap(
      (id) =>
        sportsSourceTopics[id] ||
        existingScopes[id] ||
        custom.find((s) => s.id === id)?.topics ||
        [],
    ),
  );
  if (scoped.length) return scoped;
  if (!article.categories.includes("Sports")) return [];
  const text =
    article.title +
    " " +
    article.excerpt +
    " " +
    article.url.replaceAll("-", " ");
  const american =
    sports[4].pattern.test(text) ||
    /\/(?:nfl|ncaaf|college-football|high-school-football)(?:\/|$)/i.test(
      article.url,
    ) ||
    /\/(?:college|high-school)\/[^?#]*\/football(?:\/|$)/i.test(article.url);
  const basketball = sports[1].pattern.test(text);
  return sports
    .filter(
      (s) =>
        (s.id === "american-football" ? american : s.pattern.test(text)) &&
        !(s.id === "football" && (american || basketball)),
    )
    .map((s) => s.id);
}
export function matchesSport(
  article: Article,
  selection: SportSelection,
  custom: Source[] = [],
) {
  if (selection === "all") return true;
  const ids = articleSports(article, custom);
  return selection === "other"
    ? ids.some((id) => !primarySports.some((s) => s.id === id))
    : ids.includes(selection);
}
export function sportsPreferenceMatches(
  article: Article,
  prefs: Partial<Pick<Preferences, "topics" | "customSources">>,
) {
  const chosen = selectedSports(prefs.topics);
  return (
    !chosen.length ||
    !article.categories.includes("Sports") ||
    articleSports(article, prefs.customSources).some((id) =>
      chosen.includes(id),
    )
  );
}

// Broad, established coverage first; retain a specialist European option.
export function sportsRecommendationBoost(id: string) {
  return (
    (
      {
        "espn-nba": 3,
        "bbc-sport-basketball": 2,
        "bbc-sport-football": 2,
        "espn-soccer": 2,
        eurohoops: 1,
        "guardian-basketball": 1,
      } as Record<string, number>
    )[id] || 0
  );
}
