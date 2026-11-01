import type { Article } from "./catalog.ts";
export type NewsSort = "latest" | "oldest" | "relevant";
const value = (v: unknown): string =>
  typeof v === "string"
    ? v
    : String((v as { "#text"?: unknown })?.["#text"] || "");
/** Parse publisher timestamps deterministically; a clock without a zone is ambiguous. */
export function normalizedDate(input: string) {
  const s = input.trim().replace(/\s*\([^)]*\)\s*$/, "");
  if (!s) return "";
  const calendar = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (calendar) {
    const [y, m, d] = calendar.slice(1).map(Number);
    const check = new Date(Date.UTC(y, m - 1, d));
    if (
      check.getUTCFullYear() !== y ||
      check.getUTCMonth() !== m - 1 ||
      check.getUTCDate() !== d
    )
      return "";
  }
  const dayOnly = /^\d{4}-\d{2}-\d{2}$/.test(s);
  if (!dayOnly && !/(?:Z|[+-]\d{2}:?\d{2}|GMT|UTC|[ECMP][SD]T)\s*$/i.test(s))
    return "";
  const time = Date.parse(dayOnly ? s + "T00:00:00Z" : s);
  return Number.isFinite(time) ? new Date(time).toISOString() : "";
}
export function feedDates(item: Record<string, unknown>) {
  // Atom updated is a revision date, never a substitute for published.
  const raw = value(item.pubDate || item.published || item["dc:date"]);
  const published = normalizedDate(raw);
  const updatedAt = normalizedDate(value(item.updated));
  return {
    published: published && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : published,
    ...(updatedAt ? { updatedAt } : {}),
    ...(!published
      ? {
          publicationDateStatus: raw
            ? ("invalid" as const)
            : ("missing" as const),
        }
      : {}),
    ...(/^\d{4}-\d{2}-\d{2}$/.test(raw)
      ? { publicationPrecision: "date" as const }
      : {}),
  };
}
export function publicationTime(
  article: Pick<Article, "published">,
  now = Date.now(),
) {
  const iso = normalizedDate(article.published);
  const time = Date.parse(iso);
  return Number.isFinite(time) &&
    time >= Date.UTC(1900, 0, 1) &&
    time <= now + 300000
    ? time
    : undefined;
}
export function chronological(
  articles: Article[],
  sort: "latest" | "oldest",
  now = Date.now(),
) {
  return [...articles].sort((a, b) => {
    const x = publicationTime(a, now),
      y = publicationTime(b, now);
    if (x === undefined || y === undefined)
      return x === y ? a.id.localeCompare(b.id) : x === undefined ? 1 : -1;
    return (sort === "oldest" ? x - y : y - x) || a.id.localeCompare(b.id);
  });
}
export function newsDay(
  article: Pick<Article, "published"> &
    Partial<Pick<Article, "publicationPrecision">>,
  now = new Date(),
) {
  if (
    article.publicationPrecision === "date" ||
    /^\d{4}-\d{2}-\d{2}$/.test(article.published)
  ) {
    if (publicationTime(article, now.getTime()) === undefined)
      return "Date unavailable";
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const before = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 1,
    );
    const yesterday = `${before.getFullYear()}-${String(before.getMonth() + 1).padStart(2, "0")}-${String(before.getDate()).padStart(2, "0")}`;
    const day = article.published.slice(0, 10);
    return day > today
      ? "Date unavailable"
      : day === today
        ? "Today"
        : day === yesterday
          ? "Yesterday"
          : "Earlier";
  }
  const time = publicationTime(article, now.getTime());
  if (time === undefined) return "Date unavailable";
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(start);
  yesterday.setDate(yesterday.getDate() - 1);
  return time >= start.getTime()
    ? "Today"
    : time >= yesterday.getTime()
      ? "Yesterday"
      : "Earlier";
}
export function publishedLabel(
  article: Pick<Article, "published" | "publicationPrecision">,
) {
  const time = publicationTime(article);
  if (time === undefined) return "Publication date unavailable";
  const dateOnly =
    article.publicationPrecision === "date" ||
    /^\d{4}-\d{2}-\d{2}$/.test(article.published);
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(dateOnly ? { timeZone: "UTC" } : {}),
    ...(!dateOnly
      ? ({ hour: "numeric", minute: "2-digit", timeZoneName: "short" } as const)
      : {}),
  }).format(time);
}
