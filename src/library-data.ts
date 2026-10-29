import {
  defaults,
  type Article,
  type Preferences,
  type Source,
} from "./catalog";

export interface LibraryData {
  preferences: Preferences;
  saved: Article[];
  history: Article[];
  progress: Record<string, number>;
  custom: Article[];
}
export type LibraryKey = keyof LibraryData;
export const libraryKeys: LibraryKey[] = [
  "preferences",
  "saved",
  "history",
  "progress",
  "custom",
];
export function emptyLibrary(): LibraryData {
  return {
    preferences: structuredClone(defaults),
    saved: [],
    history: [],
    progress: {},
    custom: [],
  };
}
const strings = (v: unknown): v is string[] =>
  Array.isArray(v) &&
  v.length <= 5000 &&
  v.every((x) => typeof x === "string" && x.length <= 2000);
function url(v: unknown, https = false): v is string {
  if (typeof v !== "string") return false;
  try {
    const u = new URL(v);
    return (
      !u.username &&
      !u.password &&
      (https
        ? u.protocol === "https:"
        : ["http:", "https:"].includes(u.protocol))
    );
  } catch {
    return false;
  }
}
function source(v: unknown): Source {
  const s = v as Source;
  if (
    !s ||
    typeof s.id !== "string" ||
    !s.id ||
    typeof s.name !== "string" ||
    !strings(s.categories) ||
    !url(s.url, true)
  )
    throw new Error("Invalid source");
  return {
    id: s.id,
    name: s.name,
    url: s.url,
    site: url(s.site) ? s.site : new URL(s.url).origin,
    categories: s.categories,
    region: typeof s.region === "string" ? s.region : "Worldwide",
    custom: true,
  };
}
function articles(v: unknown): Article[] {
  if (!Array.isArray(v) || v.length > 5000) throw new Error("Invalid articles");
  return v.map((a) => {
    if (
      !a ||
      ![
        "id",
        "title",
        "source",
        "sourceId",
        "content",
        "excerpt",
        "published",
        "region",
      ].every((k) => typeof a[k] === "string") ||
      !a.id ||
      !strings(a.categories) ||
      !url(a.url) ||
      typeof a.full !== "boolean"
    )
      throw new Error("Invalid article");
    return {
      id: a.id,
      title: a.title,
      source: a.source,
      sourceId: a.sourceId,
      content: a.content,
      excerpt: a.excerpt,
      published: a.published,
      region: a.region,
      categories: a.categories,
      url: a.url,
      full: a.full,
      ...(Array.isArray(a.feedContexts) &&
      a.feedContexts.length <= 5000 &&
      a.feedContexts.every(
        (c: any) =>
          c &&
          typeof c.sourceId === "string" &&
          strings(c.categories) &&
          typeof c.region === "string",
      )
        ? {
            feedContexts: a.feedContexts.map((c: any) => ({
              sourceId: c.sourceId,
              categories: c.categories,
              region: c.region,
            })),
          }
        : {}),
      ...(strings(a.alsoIn) ? { alsoIn: a.alsoIn } : {}),
      ...(Number.isInteger(a.duplicateCount) &&
      a.duplicateCount > 1 &&
      a.duplicateCount < 5000
        ? { duplicateCount: a.duplicateCount }
        : {}),
      ...(typeof a.author === "string" && a.author.length <= 2000
        ? { author: a.author }
        : {}),
      ...(["publisher-feed", "publisher-preview"].includes(a.contentOrigin)
        ? { contentOrigin: a.contentOrigin }
        : {}),
      ...(typeof a.previewReason === "string" && a.previewReason.length <= 2000
        ? { previewReason: a.previewReason }
        : {}),
      ...(url(a.image, true) ? { image: a.image } : {}),
      ...(typeof a.offlineImagesAllowed === "boolean"
        ? {
            offlineImagesAllowed:
              a.offlineImagesAllowed && a.sourceId === "nasa",
          }
        : {}),
    };
  });
}
export function normalizeLibraryValue(
  key: LibraryKey,
  value: unknown,
): LibraryData[LibraryKey] {
  if (key === "preferences") {
    const p = value as Preferences;
    if (
      !p ||
      !strings(p.interests) ||
      !strings(p.sourceIds) ||
      !Array.isArray(p.customSources) ||
      p.customSources.length > 500 ||
      !["system", "light", "dark", "navy"].includes(p.theme) ||
      (p.topics !== undefined && !strings(p.topics))
    )
      throw new Error("Invalid preferences");
    return {
      ...defaults,
      complete: p.complete === true,
      interests: p.interests,
      sourceIds: p.sourceIds,
      customSources: p.customSources.map(source),
      theme: p.theme,
      topics: p.topics || [],
      region: typeof p.region === "string" ? p.region : "Worldwide",
      fontSize: Math.min(26, Math.max(16, Number(p.fontSize) || 19)),
      reading: p.reading === "scroll" ? "scroll" : "pages",
      converter: p.converter === true,
    };
  }
  if (key === "progress") {
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error("Invalid progress");
    const entries = Object.entries(value);
    if (
      entries.length > 20000 ||
      entries.some(
        ([k, v]) =>
          ["__proto__", "constructor", "prototype"].includes(k) ||
          typeof v !== "number" ||
          !Number.isFinite(v) ||
          v < 0 ||
          v > 1,
      )
    )
      throw new Error("Invalid progress");
    return Object.fromEntries(entries);
  }
  const result = articles(value);
  return key === "history" ? result.slice(0, 150) : result;
}
export function parseLibrary(value: unknown): LibraryData {
  const data = value as LibraryData & { version: number };
  if (!data || data.version !== 1)
    throw new Error("Unsupported library backup");
  const result = Object.fromEntries(
    libraryKeys.map((key) => [
      key,
      normalizeLibraryValue(
        key,
        key === "progress" ? data[key] || {} : data[key],
      ),
    ]),
  ) as unknown as LibraryData;
  result.preferences.complete = true;
  return result;
}
