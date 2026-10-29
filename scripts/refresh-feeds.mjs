import {
  cleanFeedArticle,
  cleanGlobalVoices,
  feedText,
} from "./article-content.mjs";
import { parseHTML } from "linkedom";
import { XMLParser } from "fast-xml-parser";
import { readFile, writeFile, mkdir } from "node:fs/promises";
// Catalog is shared with the UI. Node's native TypeScript support strips interfaces.
import { sources } from "../src/catalog.ts";
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  processEntities: true,
  htmlEntities: true,
});
const arr = (x) => (!x ? [] : Array.isArray(x) ? x : [x]);
const str = (x) => (typeof x === "string" ? x : String(x?.["#text"] ?? ""));
const text = (x) => feedText(str(x));
const safe = (u) => {
  try {
    const url = new URL(String(u).replace(/&(?:amp|#0*38|#x0*26);/gi, "&"));
    return url.protocol === "https:"
      ? url.href
      : url.protocol === "http:"
        ? url.href.replace("http:", "https:")
        : "";
  } catch {
    return "";
  }
};
let previous = { articles: [], statuses: [] };
try {
  previous = JSON.parse(await readFile("public/data/edition.json", "utf8"));
} catch {}
const now = new Date().toISOString();
const results = await Promise.all(
  sources.map(async (source) => {
    try {
      const response = await fetch(source.url, {
        signal: AbortSignal.timeout(25000),
        headers: {
          "User-Agent":
            "Fylogia RSS Reader (+https://github.com/Zainhomeautomation/Fylogia)",
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const xml = await response.text();
      if (xml.length > 8_000_000) throw new Error("Feed exceeds size limit");
      const data = parser.parse(xml);
      const items = arr(
        data.rss?.channel?.item ?? data.feed?.entry ?? data["rdf:RDF"]?.item,
      );
      const articles = items
        .slice(0, 18)
        .map((item) => {
          const links = arr(item.link);
          const url = safe(
            str(item.link) ||
              links.find((x) => !x["@_rel"] || x["@_rel"] === "alternate")?.[
                "@_href"
              ],
          );
          const raw = str(
            item["content:encoded"] ||
              item.content ||
              item.description ||
              item.summary,
          );
          const image = safe(
            arr(item["media:content"]).find((x) => x["@_url"])?.["@_url"] ||
              arr(item["media:thumbnail"])[0]?.["@_url"] ||
              arr(item.enclosure).find((x) =>
                String(x["@_type"]).startsWith("image"),
              )?.["@_url"] ||
              raw.match(/<img[^>]+src=["']([^"']+)/i)?.[1],
          );
          const cleaned =
            source.full && !!(item["content:encoded"] || item.content)
              ? source.id === "global-voices"
                ? cleanGlobalVoices(raw, url, text(item["dc:creator"]))
                : cleanFeedArticle(raw, text(item.title))
              : "";
          const paragraphs = cleaned
            ? parseHTML(
                "<html><body>" + cleaned + "</body></html>",
              ).document.querySelectorAll("p")
            : [];
          const opening =
            paragraphs[source.id === "global-voices" ? 1 : 0]?.innerHTML;
          const excerpt = text(
            opening || cleaned || item.description || item.summary || raw,
          ).slice(0, 600);
          const date = new Date(
            str(
              item.pubDate || item.published || item.updated || item["dc:date"],
            ),
          );
          return {
            id: url,
            sourceId: source.id,
            offlineImagesAllowed:
              source.id === "nasa" &&
              !/APOD|copyright|©|&copy;|&#169;/i.test(text(item.title) + raw),
            source: source.name,
            title: text(item.title),
            url,
            published: Number.isNaN(date.getTime()) ? "" : date.toISOString(),
            categories: source.categories,
            region: source.region,
            image: source.id === "global-voices" ? "" : image,
            excerpt,
            content:
              cleaned ||
              `<p>${excerpt.replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</p>`,
            full: !!cleaned,
          };
        })
        .filter((x) => x.url && x.title);
      if (!articles.length) throw new Error("No usable entries");
      console.log(`${source.name}: ${articles.length} entries`);
      return {
        articles,
        status: {
          id: source.id,
          ok: true,
          count: articles.length,
          checked: now,
        },
      };
    } catch (error) {
      console.warn(`${source.name}: ${error.message}`);
      return {
        articles: previous.articles.filter((x) => x.sourceId === source.id),
        status: {
          id: source.id,
          ok: false,
          count: 0,
          checked: now,
          error: error.message,
        },
      };
    }
  }),
);
const articles = [
  ...new Map(results.flatMap((r) => r.articles).map((a) => [a.id, a])).values(),
].sort((a, b) => (b.published || "").localeCompare(a.published || ""));
if (!results.some((r) => r.status.ok) || !articles.length)
  throw new Error("No content available; refusing an empty edition");
await mkdir("public/data", { recursive: true });
await writeFile(
  "public/data/edition.json",
  JSON.stringify({
    generatedAt: now,
    articles,
    statuses: results.map((r) => r.status),
  }),
);
console.log(
  `Published ${articles.length} real articles; ${results.filter((r) => r.status.ok).length}/${sources.length} feeds healthy`,
);
