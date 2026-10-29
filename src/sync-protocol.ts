// Shared private API contract. Publisher content is deliberately not representable.
export type SyncValue = string | number | boolean | Record<string, unknown>;
export interface SyncRecord {
  key: string;
  value: SyncValue | null;
  changedAt: number;
  writer: string;
  revision: number;
  baseRevision: number;
}
export interface SyncMutation {
  key: string;
  value: SyncValue | null;
  changedAt: number;
  baseRevision: number;
  opId: string;
}
export const MAX_RECORD_BYTES = 100_000;
export const MAX_REQUEST_BYTES = 128 * 1024;
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid object");
  return value as Record<string, unknown>;
}
function only(value: Record<string, unknown>, keys: string[]) {
  if (Object.keys(value).some((k) => !keys.includes(k)))
    throw new Error("Unsupported metadata field");
}
function text(value: unknown, max = 2000, empty = false): string {
  if (
    typeof value !== "string" ||
    value.length > max ||
    (!empty && !value.trim()) ||
    Array.from(value).some(
      (c) => c.charCodeAt(0) < 32 && ![9, 10, 13].includes(c.charCodeAt(0)),
    )
  )
    throw new Error("Invalid text");
  return value;
}
function texts(value: unknown, max = 100): string[] {
  if (!Array.isArray(value) || value.length > max)
    throw new Error("Invalid list");
  return value.map((v) => text(v));
}
export function deviceLocalUrl(value: string, feed = false): boolean {
  try {
    const u = new URL(value);
    return Boolean(
      u.username ||
      u.password ||
      (feed && (u.search || u.hash)) ||
      [...u.searchParams.keys()].some((key) =>
        /^(?:access[-_]?token|refresh[-_]?token|token|api[-_]?key|key|secret|password|auth|authorization|signature|sig|x-amz-.+)$/i.test(
          key,
        ),
      ),
    );
  } catch {
    return true;
  }
}
function url(value: unknown, https = false, feed = false): string {
  const s = text(value, 4000);
  const u = new URL(s);
  if (
    deviceLocalUrl(s, feed) ||
    !(https ? ["https:"] : ["https:", "http:"]).includes(u.protocol)
  )
    throw new Error("Invalid URL");
  return s;
}
function article(value: unknown): Record<string, unknown> {
  const v = object(value);
  only(v, [
    "id",
    "url",
    "title",
    "source",
    "sourceId",
    "published",
    "categories",
    "region",
    "author",
  ]);
  const result: Record<string, unknown> = {
    id: text(v.id),
    url: url(v.url),
    title: text(v.title, 1000),
    source: text(v.source, 200),
    sourceId: text(v.sourceId, 200),
    published: text(v.published, 100, true),
    categories: texts(v.categories, 100),
    region: text(v.region, 100),
  };
  if (v.author !== undefined) result.author = text(v.author, 2000, true);
  if (
    result.published &&
    !Number.isFinite(Date.parse(result.published as string))
  )
    throw new Error("Invalid publication date");
  return result;
}
export function validateSyncValue(
  key: unknown,
  value: unknown,
): SyncValue | null {
  const name = text(key, 2100),
    colon = name.indexOf(":"),
    kind = name.slice(0, colon),
    id = name.slice(colon + 1);
  if (
    colon < 1 ||
    !id ||
    ["__proto__", "constructor", "prototype"].includes(id) ||
    (id.startsWith("http") && deviceLocalUrl(id))
  )
    throw new Error("Invalid record key");
  if (
    ![
      "setting",
      "interest",
      "topic",
      "source",
      "custom",
      "saved",
      "history",
      "progress",
      "magazine-progress",
      "magazine-bookmark",
      "daily",
    ].includes(kind)
  )
    throw new Error("Unsupported record");
  if (
    kind === "setting" &&
    !["theme", "reading", "region", "fontSize", "complete"].includes(id)
  )
    throw new Error("Unsupported preference");
  if (value === null) return null;
  let result: SyncValue;
  if (["interest", "topic", "source"].includes(kind)) {
    text(id, 2000);
    if (value !== true) throw new Error("Invalid selection");
    result = true;
  } else if (kind === "setting") {
    if (id === "theme") {
      if (!["navy", "dark", "light", "system"].includes(value as string))
        throw new Error("Invalid theme");
      result = value as string;
    } else if (id === "reading") {
      if (!["pages", "scroll"].includes(value as string))
        throw new Error("Invalid mode");
      result = value as string;
    } else if (id === "fontSize") {
      if (!Number.isInteger(value) || Number(value) < 16 || Number(value) > 26)
        throw new Error("Invalid font size");
      result = value as number;
    } else if (id === "complete") {
      if (typeof value !== "boolean") throw new Error("Invalid completion");
      result = value;
    } else result = text(value, 100);
  } else if (kind === "saved" || kind === "history") {
    result = article(value);
    if (result.id !== id) throw new Error("Mismatched article");
  } else if (["magazine-progress", "magazine-bookmark"].includes(kind)) {
    if (!Number.isInteger(value) || Number(value) < 0 || Number(value) > 100000)
      throw new Error("Invalid magazine page");
    result = value as number;
  } else if (kind === "progress") {
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < 0 ||
      value > 1
    )
      throw new Error("Invalid progress");
    result = value;
  } else if (kind === "custom") {
    const v = object(value);
    only(v, ["id", "name", "url", "site", "categories", "region"]);
    if (v.id !== id) throw new Error("Mismatched source");
    result = {
      id: text(v.id),
      name: text(v.name, 200),
      url: url(v.url, true, true),
      site: url(v.site),
      categories: texts(v.categories, 100),
      region: text(v.region, 100),
    };
  } else {
    const v = object(value);
    only(v, ["id", "day", "createdAt", "region", "stories"]);
    if (
      v.id !== id ||
      !/^\d{4}-\d{2}-\d{2}$/.test(text(v.day, 10)) ||
      !Number.isFinite(Date.parse(text(v.createdAt, 100)))
    )
      throw new Error("Invalid edition");
    if (!Array.isArray(v.stories) || v.stories.length > 30)
      throw new Error("Invalid edition stories");
    const stories = v.stories.map((s) => {
      const a = object(s);
      only(a, ["id", "title", "source", "section", "full"]);
      if (typeof a.full !== "boolean") throw new Error("Invalid content label");
      if (
        typeof a.id === "string" &&
        a.id.startsWith("http") &&
        deviceLocalUrl(a.id)
      )
        throw new Error("Private article identifiers cannot be synced");
      return {
        id: text(a.id),
        title: text(a.title, 1000),
        source: text(a.source, 200),
        section: text(a.section, 200),
        full: a.full,
      };
    });
    if (new Set(stories.map((s) => s.id)).size !== stories.length)
      throw new Error("Duplicate story");
    result = {
      id: text(v.id, 100),
      day: v.day,
      createdAt: v.createdAt,
      region: text(v.region, 100),
      stories,
    };
  }
  if (
    new TextEncoder().encode(JSON.stringify(result)).length > MAX_RECORD_BYTES
  )
    throw new Error("Metadata exceeds sync limit");
  return result;
}
export function validateMutations(value: unknown, now: number): SyncMutation[] {
  if (!Array.isArray(value) || value.length > 10)
    throw new Error("Too many changes");
  const seen = new Set<string>();
  return value.map((input) => {
    const v = object(input);
    only(v, ["key", "value", "changedAt", "baseRevision", "opId"]);
    const key = text(v.key, 2100),
      opId = text(v.opId, 40);
    if (
      !/^[0-9a-f-]{36}$/.test(opId) ||
      seen.has(key) ||
      !Number.isSafeInteger(v.baseRevision) ||
      Number(v.baseRevision) < 0 ||
      !Number.isSafeInteger(v.changedAt) ||
      Number(v.changedAt) <= 0 ||
      Number(v.changedAt) > now + 300000
    )
      throw new Error("Invalid change clock");
    seen.add(key);
    return {
      key,
      value: validateSyncValue(key, v.value),
      changedAt: Number(v.changedAt),
      baseRevision: Number(v.baseRevision),
      opId,
    };
  });
}
