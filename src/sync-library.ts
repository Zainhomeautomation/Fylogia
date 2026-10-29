import type { Article, Preferences, Source } from "./catalog.ts";
import type { LibraryData } from "./library-data.ts";
import type { DailyMagazine } from "./daily-magazine.ts";
import {
  validateSyncValue,
  deviceLocalUrl,
  type SyncValue,
  type SyncRecord,
} from "./sync-protocol.ts";
export type Projection = Map<string, SyncValue>;
const settings = [
  "theme",
  "reading",
  "region",
  "fontSize",
  "complete",
] as const;
export function bibliographic(a: Article): Record<string, unknown> {
  return {
    id: a.id,
    url: a.url,
    title: a.title,
    source: a.source,
    sourceId: a.sourceId,
    published: a.published,
    categories: [...a.categories],
    region: a.region,
    ...(a.author ? { author: a.author } : {}),
  };
}
export function projectLibrary(data: LibraryData): Projection {
  const map: Projection = new Map();
  const privateSources = new Set(
    data.preferences.customSources
      .filter((s) => deviceLocalUrl(s.url, true) || deviceLocalUrl(s.site))
      .map((s) => s.id),
  );
  const privateArticles = new Set(
    [...data.saved, ...data.history, ...data.custom]
      .filter((a) => deviceLocalUrl(a.url))
      .map((a) => a.id),
  );
  for (const key of settings) map.set("setting:" + key, data.preferences[key]);
  for (const [prefix, values] of [
    ["interest", data.preferences.interests],
    ["topic", data.preferences.topics],
    ["source", data.preferences.sourceIds],
  ] as const)
    for (const id of values)
      if (prefix !== "source" || !privateSources.has(id))
        map.set(prefix + ":" + id, true);
  for (const s of data.preferences.customSources)
    if (!privateSources.has(s.id))
      map.set("custom:" + s.id, {
        id: s.id,
        name: s.name,
        url: s.url,
        site: s.site,
        categories: [...s.categories],
        region: s.region,
      });
  for (const kind of ["saved", "history"] as const)
    for (const a of data[kind])
      if (!privateArticles.has(a.id))
        map.set(kind + ":" + a.id, bibliographic(a));
  for (const [id, value] of Object.entries(data.progress))
    if (
      !privateArticles.has(id) &&
      (!/^https?:/i.test(id) || !deviceLocalUrl(id))
    )
      map.set("progress:" + id, value);
  for (const [id, v] of Object.entries(data.magazineReading || {})) {
    map.set("magazine-progress:" + id, v.page);
    map.set("magazine-bookmark:" + id, v.bookmark);
  }
  for (const e of data.dailyEditions) {
    // An issue with a private link remains whole on its original device.
    if (
      e.stories.some(
        (s) =>
          privateArticles.has(s.id) ||
          (/^https?:/i.test(s.id) && deviceLocalUrl(s.id)),
      )
    )
      continue;
    map.set("daily:" + e.id, {
      id: e.id,
      day: e.day,
      createdAt: e.createdAt,
      region: e.region,
      stories: e.stories.map((s) => ({ ...s })),
    });
  }
  for (const [key, value] of map) validateSyncValue(key, value);
  return map;
}
export const sameValue = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
function prefixEntries(map: Map<string, SyncValue | null>, prefix: string) {
  return [...map]
    .filter(([key, value]) => key.startsWith(prefix + ":") && value !== null)
    .map(([key, value]) => [key.slice(prefix.length + 1), value] as const);
}
export function materializeLibrary(
  map: Map<string, SyncValue | null>,
  original: LibraryData,
  clocks = new Map<string, number>(),
): LibraryData {
  const prefs = { ...original.preferences };
  for (const key of settings) {
    const value = map.get("setting:" + key);
    if (value !== undefined && value !== null)
      (prefs as unknown as Record<string, unknown>)[key] = value;
  }
  prefs.interests = prefixEntries(map, "interest").map(([id]) => id);
  prefs.topics = prefixEntries(map, "topic").map(([id]) => id);
  const privateSources = original.preferences.customSources.filter((s) =>
    deviceLocalUrl(s.url, true),
  );
  prefs.sourceIds = [
    ...new Set([
      ...prefixEntries(map, "source").map(([id]) => id),
      ...privateSources
        .filter((s) => original.preferences.sourceIds.includes(s.id))
        .map((s) => s.id),
    ]),
  ];
  prefs.customSources = [
    ...privateSources,
    ...prefixEntries(map, "custom").map(
      ([, v]) => ({ ...(v as object), custom: true }) as Source,
    ),
  ];
  // A local permitted body always remains local; remote metadata never overwrites it.
  const bodies = new Map<string, Article>();
  for (const a of [
    ...original.custom,
    ...original.history,
    ...original.saved,
  ]) {
    const old = bodies.get(a.id);
    if (
      !old ||
      (a.full && !old.full) ||
      (a.full === old.full && a.content.length > old.content.length)
    )
      bodies.set(a.id, a);
  }
  const hydrate = (value: SyncValue): Article => {
    const meta = value as unknown as Article,
      local = bodies.get(meta.id);
    if (local?.content || local?.excerpt) return local;
    return {
      ...meta,
      content: "",
      excerpt: "",
      full: false,
      contentDetails: {
        availability: "unavailable",
        authorization: "unverified",
        method: "legacy-feed",
        completeness: "unknown",
        retrievedAt: new Date().toISOString(),
      },
    };
  };
  const saved = [
    ...original.saved.filter((a) => deviceLocalUrl(a.url)),
    ...prefixEntries(map, "saved").map(([, v]) => hydrate(v!)),
  ];
  const history = prefixEntries(map, "history")
    .sort(
      ([a], [b]) =>
        (clocks.get("history:" + b) || 0) - (clocks.get("history:" + a) || 0) ||
        original.history.findIndex((x) => x.id === a) -
          original.history.findIndex((x) => x.id === b),
    )
    .slice(0, 150)
    .map(([, v]) => hydrate(v!));
  const progress = Object.fromEntries(prefixEntries(map, "progress")) as Record<
    string,
    number
  >;
  const privateArticleIds = new Set(
    [...original.saved, ...original.history, ...original.custom]
      .filter((a) => deviceLocalUrl(a.url))
      .map((a) => a.id),
  );
  const privateIssues = original.dailyEditions.filter((e) =>
    e.stories.some(
      (s) =>
        privateArticleIds.has(s.id) ||
        (/^https?:/i.test(s.id) && deviceLocalUrl(s.id)),
    ),
  );
  const dailyEditions = [
    ...privateIssues,
    ...prefixEntries(map, "daily")
      .map(([, v]) => v as unknown as DailyMagazine)
      .filter((e) => !privateIssues.some((p) => p.id === e.id)),
  ]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 30);
  const magazineReading: LibraryData["magazineReading"] = {};
  for (const [id, value] of prefixEntries(map, "magazine-progress"))
    magazineReading[id] = {
      page: Number(value),
      bookmark: Number(map.get("magazine-bookmark:" + id)) || 0,
    };
  return {
    magazineReading,
    preferences: prefs,
    saved,
    history: [
      ...original.history.filter((a) => deviceLocalUrl(a.url)),
      ...history,
    ].slice(0, 150),
    progress: {
      ...Object.fromEntries(
        Object.entries(original.progress).filter(([id]) =>
          [...original.saved, ...original.history, ...original.custom].some(
            (a) => a.id === id && deviceLocalUrl(a.url),
          ),
        ),
      ),
      ...progress,
    },
    dailyEditions,
    custom: original.custom,
  };
}
export function initialMerge(
  local: Projection,
  remote: SyncRecord[],
  prefs: Preferences,
): Map<string, SyncValue | null> {
  const merged = new Map(remote.map((r) => [r.key, r.value]));
  if (!remote.length) return new Map(local);
  for (const [key, value] of local) {
    const kind = key.slice(0, key.indexOf(":"));
    if (kind === "setting") {
      if (!merged.has(key)) merged.set(key, value);
    } else if (["interest", "topic", "source", "custom"].includes(kind)) {
      if (prefs.complete) merged.set(key, value);
    } else if (kind === "progress")
      merged.set(key, Math.max(Number(merged.get(key)) || 0, Number(value)));
    else if (kind === "daily") {
      if (!merged.get(key)) merged.set(key, value);
      else if (!sameValue(merged.get(key), value)) {
        // Keep both independently assembled issues instead of discarding one.
        const signature = JSON.stringify(value);
        let hash = 2166136261;
        for (let n = 0; n < signature.length; n++)
          hash = Math.imul(hash ^ signature.charCodeAt(n), 16777619);
        const id =
          (value as Record<string, unknown>).id +
          "-local-" +
          (hash >>> 0).toString(16);
        merged.set("daily:" + id, { ...(value as object), id });
      }
    } else merged.set(key, value);
  }
  // Converter/proxy choice is intentionally device-local, never propagated.
  return merged;
}
