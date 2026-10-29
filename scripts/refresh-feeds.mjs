import { readFile, writeFile, mkdir } from "node:fs/promises";
import { sources } from "../src/catalog.ts";
import {
  parseFeedDocument,
  latestPublication,
  feedFreshness,
  deduplicateArticles,
} from "../src/source-utils.ts";
import { feedArticle } from "./feed-content.mjs";
const pipelineVersion = 4;
const contentVersion = 2;
const fullOnly = process.argv.includes("--full-only");
let previous = { articles: [], statuses: [] };
try {
  previous = JSON.parse(await readFile("public/data/edition.json", "utf8"));
} catch {}
if (
  fullOnly &&
  sources.some((s) => !previous.statuses.some((old) => old.id === s.id))
)
  throw new Error("A complete existing edition is required for --full-only");
const now = new Date().toISOString();
async function refresh(source) {
  const old = previous.statuses.find((s) => s.id === source.id);
  const cached = previous.articles
    .filter((a) => a.sourceId === source.id || a.alsoIn?.includes(source.id))
    .map((a) =>
      a.contentDetails
        ? a
        : {
            ...a,
            contentDetails: {
              availability: a.full ? "full" : "preview",
              authorization: a.full ? "permitted" : "unverified",
              method: "legacy-feed",
              retrievedAt:
                old?.lastSuccess || old?.checked || previous.generatedAt,
              completeness: a.full ? "publisher-body" : "excerpt",
            },
          },
    );
  if (fullOnly && !source.full) return { articles: cached, status: old };
  try {
    const headers = {
      "User-Agent": "Fylogia RSS Reader (+https://fylogia.com/)",
    };
    if (
      previous.pipelineVersion === pipelineVersion &&
      (!source.full || old?.contentVersion === contentVersion) &&
      cached.length &&
      old?.etag
    )
      headers["If-None-Match"] = old.etag;
    if (
      previous.pipelineVersion === pipelineVersion &&
      (!source.full || old?.contentVersion === contentVersion) &&
      cached.length &&
      old?.lastModified
    )
      headers["If-Modified-Since"] = old.lastModified;
    const response = await fetch(source.url, {
      signal: AbortSignal.timeout(12000),
      headers,
    });
    if (response.status === 304 && cached.length)
      return {
        articles: cached,
        status: {
          ...old,
          id: source.id,
          ok: true,
          checked: now,
          lastSuccess: now,
          consecutiveFailures: 0,
          notModified: true,
          freshness: feedFreshness(old.latestPublished || ""),
        },
      };
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const declared = Number(response.headers.get("content-length"));
    if (declared > 8_000_000) throw new Error("Feed exceeds size limit");
    const xml = await response.text();
    const parsed = parseFeedDocument(xml);
    const latest = latestPublication(parsed.items);
    const articles = parsed.items
      .slice(0, source.validatedAt ? 8 : 18)
      .map((item) => feedArticle(item, source))
      .filter((a) => a.url && a.title);
    if (!articles.length) throw new Error("No readable entries");
    console.log(`${source.name}: ${articles.length} entries`);
    return {
      articles,
      status: {
        id: source.id,
        ok: true,
        count: articles.length,
        fullCount: articles.filter((a) => a.full).length,
        contentVersion: source.full ? contentVersion : undefined,
        bodyCount: parsed.items.filter((i) => i["content:encoded"] || i.content)
          .length,
        feedEntries: parsed.items.length,
        checked: now,
        lastSuccess: now,
        latestPublished: latest,
        freshness: feedFreshness(latest),
        consecutiveFailures: 0,
        etag: response.headers.get("etag") || undefined,
        lastModified: response.headers.get("last-modified") || undefined,
      },
    };
  } catch (error) {
    console.warn(`${source.name}: ${error.message}`);
    return {
      articles: cached,
      status: {
        id: source.id,
        ok: false,
        count: 0,
        fullCount: 0,
        retainedCount: cached.length,
        checked: now,
        lastSuccess: old?.lastSuccess || (old?.ok ? old.checked : undefined),
        latestPublished: old?.latestPublished || "",
        freshness: feedFreshness(old?.latestPublished || ""),
        consecutiveFailures: (old?.consecutiveFailures || 0) + 1,
        error: error.message,
      },
    };
  }
}
// Limit both overall concurrency and per-host pressure. No browser proxy,
// authentication or paid backend is used to bypass publisher restrictions.
const results = new Array(sources.length);
let cursor = 0;
const hosts = new Map();
async function worker() {
  while (cursor < sources.length) {
    const index = cursor++;
    const source = sources[index];
    const host = new URL(source.url).hostname;
    while ((hosts.get(host) || 0) >= 2)
      await new Promise((r) => setTimeout(r, 50));
    hosts.set(host, (hosts.get(host) || 0) + 1);
    try {
      results[index] = await refresh(source);
      // A single bounded retry handles transient DNS, connection and 5xx errors.
      // Access denials are respected rather than retried or proxied.
      if (
        !results[index].status.ok &&
        !/^HTTP (4\d\d)/.test(results[index].status.error || "")
      ) {
        await new Promise((r) => setTimeout(r, 500));
        results[index] = await refresh(source);
      }
    } finally {
      hosts.set(host, hosts.get(host) - 1);
    }
  }
}
await Promise.all(Array.from({ length: 6 }, worker));
const merged = deduplicateArticles(
  results.map((r) => ({
    id: r.status.id,
    articles: r.articles,
    source: sources.find((s) => s.id === r.status.id),
  })),
);
merged.articles.sort((a, b) =>
  (b.published || "").localeCompare(a.published || ""),
);
if (!results.some((r) => r.status.ok) || !merged.articles.length)
  throw new Error("No content available; refusing empty edition");
const output = {
  pipelineVersion,
  generatedAt: now,
  articles: merged.articles,
  statuses: results.map((r) => r.status),
  duplicatesRemoved: merged.duplicatesRemoved,
};
const json = JSON.stringify(output);
if (Buffer.byteLength(json) > 20 * 1024 * 1024)
  throw new Error("Edition exceeds 20 MiB safety budget");
await mkdir("public/data", { recursive: true });
await writeFile("public/data/edition.json", json);
console.log(
  `Published ${merged.articles.length} articles; ${results.filter((r) => r.status.ok).length}/${sources.length} feeds healthy; ${merged.duplicatesRemoved} duplicate entries merged`,
);
