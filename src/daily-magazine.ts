import { applePreferenceScore } from "./apple-taxonomy.ts";
import type { Article, Preferences } from "./catalog";
import { articleMatchesLibrary } from "./source-utils.ts";
import { topicMatchesText } from "./interest-taxonomy.ts";
export interface DailyStory {
  id: string;
  title: string;
  source: string;
  section: string;
  full: boolean;
}
export interface DailyMagazine {
  id: string;
  day: string;
  createdAt: string;
  region: string;
  stories: DailyStory[];
}
export function localDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function dailyPreferenceKey(prefs: Preferences) {
  const text = JSON.stringify([
    ...[prefs.interests, prefs.topics, prefs.sourceIds].map((a) =>
      [...a].sort(),
    ),
    prefs.region,
    prefs.reading,
  ]);
  let hash = 2166136261;
  for (const char of text)
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(36);
}
// A bounded, deterministic selection of real followed stories. No generated prose.
export function createDailyMagazine(
  articles: Article[],
  prefs: Preferences,
  now = new Date(),
): DailyMagazine {
  const day = localDay(now);
  const score = (a: Article) => {
    const age = Math.max(
      0,
      (now.getTime() - Date.parse(a.published)) / 86400000,
    );
    return (
      (Number.isFinite(age) ? 18 / (1 + age / 2) : 0) +
      (a.full ? (prefs.reading === "pages" ? 9 : 7) : 0) +
      (a.image ? 2 : 0) +
      applePreferenceScore(a, prefs) * 8 +
      a.categories.filter((c) => prefs.interests.includes(c)).length * 3 +
      prefs.topics.filter((t) => topicMatchesText(t, a.title + " " + a.excerpt))
        .length *
        4
    );
  };
  const ranked = [
    ...new Map(
      articles
        .filter((a) => articleMatchesLibrary(a, prefs))
        .map((a) => [a.id, a]),
    ).values(),
  ]
    .map((article) => ({ article, score: score(article) }))
    .sort(
      (a, b) => b.score - a.score || a.article.id.localeCompare(b.article.id),
    );
  const chosen: Article[] = [],
    deferred: Article[] = [];
  const counts = new Map<string, number>();
  for (const { article } of ranked) {
    const count = counts.get(article.sourceId) || 0;
    if (count < 3) {
      chosen.push(article);
      counts.set(article.sourceId, count + 1);
    } else deferred.push(article);
  }
  const selection = [...chosen, ...deferred].slice(0, 30);
  const section = (a: Article) =>
    prefs.interests.find((c) => a.categories.includes(c)) ||
    a.categories[0] ||
    "Perspective";
  const lead = selection[0];
  const sections = new Map<string, Article[]>();
  for (const a of selection.slice(1)) {
    const key = section(a);
    sections.set(key, [...(sections.get(key) || []), a]);
  }
  const ordered = lead ? [lead, ...[...sections.values()].flat()] : [];
  return {
    id: `${day}-${dailyPreferenceKey(prefs)}`,
    day,
    createdAt: now.toISOString(),
    region: prefs.region,
    stories: ordered.map((a) => ({
      id: a.id,
      title: a.title,
      source: a.source,
      section: section(a),
      full: a.full,
    })),
  };
}
export function normalizeDailyMagazines(value: unknown): DailyMagazine[] {
  if (!Array.isArray(value) || value.length > 30)
    throw new Error("Invalid daily editions");
  return value.map((entry) => {
    const str = (v: unknown, max = 2000): v is string =>
      typeof v === "string" && v.length > 0 && v.length <= max;
    if (
      !entry ||
      !str(entry.id, 100) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(entry.day) ||
      !str(entry.createdAt, 100) ||
      !Number.isFinite(Date.parse(entry.createdAt)) ||
      !str(entry.region, 100) ||
      !Array.isArray(entry.stories) ||
      entry.stories.length > 30
    )
      throw new Error("Invalid daily edition");
    const stories: DailyStory[] = entry.stories.map((s: DailyStory) => {
      if (
        !s ||
        !str(s.id) ||
        !str(s.title, 1000) ||
        !str(s.source, 200) ||
        !str(s.section, 200)
      )
        throw new Error("Invalid daily story");
      return {
        id: s.id,
        title: s.title,
        source: s.source,
        section: s.section,
        full: s.full === true,
      };
    });
    if (new Set(stories.map((s) => s.id)).size !== stories.length)
      throw new Error("Duplicate daily story");
    return {
      id: entry.id,
      day: entry.day,
      createdAt: entry.createdAt,
      region: entry.region,
      stories,
    };
  });
}
