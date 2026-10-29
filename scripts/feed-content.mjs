import {
  cleanFeedArticle,
  cleanLicensedFeed,
  cleanGlobalVoices,
  feedText,
} from "./article-content.mjs";
import { sanitizePublisherContent } from "./sanitize-content.mjs";
import { parseHTML } from "linkedom";
import {
  feedArray as arr,
  feedValue as str,
  publicUrl as safe,
} from "../src/source-utils.ts";
const text = (value) => feedText(str(value));
export function feedArticle(
  item,
  source,
  retrievedAt = new Date().toISOString(),
) {
  const links = arr(item.link);
  const url = safe(
    str(item.link) ||
      links.find((x) => !x["@_rel"] || x["@_rel"] === "alternate")?.["@_href"],
  );
  const raw = str(
    item["content:encoded"] || item.content || item.description || item.summary,
  );
  const image = safe(
    arr(item["media:content"]).find(
      (x) =>
        x["@_url"] &&
        (x["@_medium"] === "image" ||
          String(x["@_type"] || "").startsWith("image/") ||
          (!x["@_medium"] &&
            !x["@_type"] &&
            /\.(?:jpe?g|png|webp|gif|avif)(?:[?#]|$)/i.test(x["@_url"]))),
    )?.["@_url"] ||
      arr(item["media:thumbnail"])[0]?.["@_url"] ||
      arr(item.enclosure).find((x) =>
        String(x["@_type"]).startsWith("image"),
      )?.["@_url"] ||
      raw.match(/<img[^>]+src=["']([^"']+)/i)?.[1],
    url,
  );
  const author =
    text(item["dc:creator"] || item.author?.name) ||
    (source.id === "homeassistant" ? "Home Assistant contributors" : "");
  const bodySupplied = !!(
    item["content:encoded"] ||
    item.content ||
    (source.fullBodyField === "description" && item.description)
  );
  const extracted =
    source.full &&
    !!(
      item["content:encoded"] ||
      item.content ||
      (source.fullBodyField === "description" && item.description)
    )
      ? source.id === "global-voices"
        ? cleanGlobalVoices(raw, url, text(item["dc:creator"]))
        : [
              "mit-ai",
              "homeassistant",
              "eff",
              "fedora-magazine",
              "mozilla-hacks",
            ].includes(source.id)
          ? cleanLicensedFeed(raw, {
              sourceId: source.id,
              url,
              author,
              subtitle: source.id === "mit-ai" ? text(item.description) : "",
            })
          : cleanFeedArticle(raw, text(item.title))
      : "";
  const cleaned = extracted ? sanitizePublisherContent(extracted, url) : "";
  const paragraphs = cleaned
    ? parseHTML(
        "<html><body>" + cleaned + "</body></html>",
      ).document.querySelectorAll("p")
    : [];
  const opening = [...paragraphs]
    .slice(
      [
        "global-voices",
        "mit-ai",
        "homeassistant",
        "eff",
        "fedora-magazine",
        "mozilla-hacks",
      ].includes(source.id)
        ? 1
        : 0,
    )
    .map((p) => text(p.innerHTML))
    .find((p) => p.length > 40);
  const excerpt = (
    opening || text(item.description || item.summary || cleaned || raw)
  ).slice(0, 600);
  const date = new Date(
    str(item.pubDate || item.published || item.updated || item["dc:date"]),
  );
  return {
    id: url,
    contentDetails: {
      availability: cleaned
        ? "full"
        : item["schema:isAccessibleForFree"] === false
          ? "subscription"
          : bodySupplied
            ? "body-unverified"
            : excerpt
              ? "preview"
              : "unavailable",
      authorization: cleaned ? "permitted" : "unverified",
      method:
        item["content:encoded"] || item.content
          ? "rss-content"
          : item.description
            ? "rss-description"
            : "rss-summary",
      retrievedAt,
      completeness: cleaned
        ? "publisher-body"
        : bodySupplied
          ? "unknown"
          : "excerpt",
    },
    sourceId: source.id,
    offlineImagesAllowed:
      source.id === "nasa" &&
      !/APOD|copyright|©|&copy;|&#169;/i.test(text(item.title) + raw),
    source: source.name,
    author,
    contentOrigin: cleaned ? "publisher-feed" : "publisher-preview",
    previewReason: cleaned
      ? undefined
      : !source.full
        ? "Full-text republication permission has not been verified for this source."
        : !bodySupplied
          ? "This feed supplies an excerpt rather than a full article body."
          : "This item could not be verified for complete in-app republication.",
    title: text(item.title),
    url,
    published: Number.isNaN(date.getTime()) ? "" : date.toISOString(),
    categories: source.categories,
    region: source.region,
    image: [
      "global-voices",
      "mit-ai",
      "homeassistant",
      "eff",
      "fedora-magazine",
      "mozilla-hacks",
    ].includes(source.id)
      ? ""
      : image,
    excerpt,
    content:
      cleaned ||
      `<p>${excerpt.replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</p>`,
    full: !!cleaned,
  };
}
