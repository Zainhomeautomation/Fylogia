import { parseFeedDocument } from "./source-utils";
import DOMPurify from "dompurify";
import type { Article, Source } from "./catalog";
import { safeUrl } from "./storage";
const array = (v: unknown): any[] => (!v ? [] : Array.isArray(v) ? v : [v]);
const value = (v: any): string =>
  typeof v === "string" ? v : String(v?.["#text"] || "");
export function plain(html: string) {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: [] });
}
export async function loadCustom(
  source: Source,
  converter: boolean,
): Promise<Article[]> {
  let items: any[];
  try {
    const res = await fetch(source.url, {
      signal: AbortSignal.timeout(12000),
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    if (xml.length > 3_000_000) throw new Error("Feed too large");
    items = parseFeedDocument(xml).items;
  } catch {
    if (!converter)
      throw new Error(
        "This feed blocks direct browser access. Enable the optional public feed converter below, or import its RSS/Atom file.",
      );
    const res = await fetch(
      "https://api.rss2json.com/v1/api.json?rss_url=" +
        encodeURIComponent(source.url),
      { signal: AbortSignal.timeout(20000) },
    );
    if (!res.ok || !res.headers.get("content-type")?.includes("json"))
      throw new Error(
        "The optional feed converter is unavailable or blocking this request. Import the RSS/Atom file instead.",
      );
    const data = await res.json();
    if (data.status !== "ok")
      throw new Error(
        data.message || "The public converter could not load this feed.",
      );
    items = data.items;
  }
  return parseItems(items, source);
}
export function parseFeedFile(xml: string, source: Source) {
  if (xml.length > 3_000_000) throw new Error("Feed file exceeds 3 MB");
  return parseItems(parseFeedDocument(xml).items, source);
}
function parseItems(items: any[], source: Source): Article[] {
  const result = items
    .slice(0, 40)
    .map((item) => {
      const url = safeUrl(
        value(item.link) ||
          array(item.link).find(
            (l) => !l["@_rel"] || l["@_rel"] === "alternate",
          )?.["@_href"] ||
          "",
      );
      const content = value(
        item["content:encoded"] ||
          item.content ||
          item.description ||
          item.summary,
      );
      const excerpt = plain(content).slice(0, 600);
      const date = new Date(
        value(item.pubDate || item.published || item.pubDate || item.updated),
      );
      return {
        id: url,
        sourceId: source.id,
        source: source.name,
        title: plain(value(item.title)),
        url,
        published: Number.isNaN(date.getTime()) ? "" : date.toISOString(),
        categories: source.categories,
        region: source.region,
        image: safeUrl(
          item.thumbnail ||
            item.enclosure?.link ||
            array(item["media:thumbnail"])[0]?.["@_url"] ||
            content.match(/<img[^>]+src=["']([^"']+)/i)?.[1] ||
            "",
        ),
        excerpt,
        content: `<p>${DOMPurify.sanitize(excerpt)}</p>`,
        full: false,
      };
    })
    .filter((a) => a.url && a.title);
  if (!result.length) throw new Error("No readable RSS/Atom entries found");
  return result;
}
