import test from "node:test";
import assert from "node:assert/strict";
import { sources, categories, regions } from "../src/catalog.ts";
import {
  parseFeedDocument,
  publicUrl,
  feedFreshness,
  latestPublication,
  canonicalStoryUrl,
  deduplicateArticles,
  recommendSources,
  sourceMatches,
} from "../src/source-utils.ts";
import { feedArticle } from "../scripts/feed-content.mjs";
const item =
  "<item><title>Story</title><link>https://publisher.example/story</link><pubDate>Thu, 29 Oct 2026 08:00:00 GMT</pubDate></item>";
test("curated directory preserves baseline sources with unique valid feeds and broad coverage", () => {
  assert.ok(sources.length >= 150 && sources.length <= 200);
  assert.equal(new Set(sources.map((s) => s.id)).size, sources.length);
  assert.equal(
    new Set(sources.map((s) => canonicalStoryUrl(s.url))).size,
    sources.length,
  );
  for (const id of [
    "nasa",
    "nasa-science",
    "bbc-world",
    "homeassistant",
    "mit-ai",
    "global-voices",
  ])
    assert.ok(sources.some((s) => s.id === id));
  for (const s of sources) {
    assert.equal(publicUrl(s.url), s.url);
    assert.ok(regions.includes(s.region));
    assert.ok(s.categories.every((c) => categories.includes(c)));
  }
  for (const c of categories)
    assert.ok(
      sources.some((s) => s.categories.includes(c)),
      c,
    );
});
test("RSS, Atom and RDF accept real entries; invalid inputs do not become feeds", () => {
  assert.equal(
    parseFeedDocument(
      `<rss><channel><title>News</title>${item}</channel></rss>`,
    ).items.length,
    1,
  );
  assert.equal(
    parseFeedDocument(
      '<feed><entry><title>Atom</title><link rel="alternate" href="https://publisher.example/atom"/></entry></feed>',
    ).items.length,
    1,
  );
  assert.equal(
    parseFeedDocument(
      `<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">${item}</rdf:RDF>`,
    ).items.length,
    1,
  );
  assert.equal(
    parseFeedDocument(
      `<rss version="2.0"xmlns:media="https://example.com"><channel>${item}</channel></rss>`,
    ).items.length,
    1,
  );
  for (const xml of [
    "<html><title>No</title></html>",
    "<!DOCTYPE rss><rss/>",
    "<rss><channel></rss>",
    "<rss><channel><item><title>No URL</title><link>javascript:alert(1)</link></item></channel></rss>",
  ])
    assert.throws(() => parseFeedDocument(xml));
  assert.equal(publicUrl("https://user:secret@example.com"), "");
  assert.equal(publicUrl("javascript:alert(1)"), "");
});
test("freshness rejects implausible future dates and identifies aging sources", () => {
  const now = Date.parse("2026-10-29T12:00:00Z");
  assert.equal(
    latestPublication(
      [{ pubDate: "2030-01-01" }, { pubDate: "2026-10-29" }],
      now,
    ),
    "2026-10-29T00:00:00.000Z",
  );
  assert.equal(feedFreshness("2026-10-28", now), "fresh");
  assert.equal(feedFreshness("2026-09-01", now), "aging");
  assert.equal(feedFreshness("2026-01-01", now), "stale");
  assert.equal(feedFreshness("", now), "unknown");
});
const article = (sourceId, url, full = false) => ({
  id: url,
  sourceId,
  url,
  full,
  title: "A sufficiently long editorial headline about a science discovery",
  published: "2026-10-29T08:00:00Z",
  content: "<p>Original text</p>",
});
test("deduplication favors authorized full text while retaining IDs and followed-source provenance", () => {
  const a = article(
    "preview",
    "https://www.publisher.example/story/?utm_source=rss#top",
  );
  const b = article("full", "https://publisher.example/story", true);
  const result = deduplicateArticles([
    { id: "preview", articles: [a] },
    { id: "full", articles: [b] },
  ]);
  assert.equal(result.duplicatesRemoved, 1);
  assert.equal(result.articles[0].id, b.id);
  assert.deepEqual(result.articles[0].alsoIn, ["preview"]);
  assert.equal(result.articles[0].duplicateCount, 2);
  assert.equal(
    canonicalStoryUrl(
      "http://www.publisher.example/story/?id=2&utm_medium=feed#x",
    ),
    "https://publisher.example/story?id=2",
  );
  assert.equal(
    deduplicateArticles([
      {
        id: "a",
        articles: [b, article("other", "https://other.example/story")],
      },
    ]).articles.length,
    2,
  );
});
test("recommendations honor interests, region and health; search covers all catalog entries", () => {
  const pool = [
    { id: "a", name: "A", categories: ["AI"], region: "Middle East" },
    { id: "b", name: "B", categories: ["AI"], region: "Worldwide", full: true },
    { id: "c", name: "C", categories: ["AI"], region: "Europe" },
    { id: "d", name: "D", categories: ["Cooking"], region: "Worldwide" },
  ];
  assert.deepEqual(
    recommendSources(
      pool,
      { interests: ["AI"], region: "Middle East" },
      [],
      2,
    ).map((s) => s.id),
    ["b", "a"],
  );
  assert.deepEqual(
    recommendSources(
      pool,
      { interests: ["AI"], region: "Middle East" },
      [{ id: "b", ok: false }],
      2,
    ).map((s) => s.id),
    ["a"],
  );
  const eff = sources.find((s) => s.id === "eff");
  assert.ok(
    sourceMatches(
      eff,
      "eff",
      "All categories",
      "All regions",
      "Full text capable",
    ),
  );
  assert.ok(
    !sourceMatches(eff, "eff", "All categories", "All regions", "Preview only"),
  );
});
test("new licensed feeds preserve prose and notices; exceptions and unverified bodies stay previews", () => {
  const prose =
    "<h2>Context</h2><p>" +
    "Original publisher text. ".repeat(35) +
    "</p><p>Final paragraph.</p>";
  for (const [id, license] of [
    ["eff", "by/4.0"],
    ["fedora-magazine", "by-sa/4.0"],
    ["mozilla-hacks", "by-sa/3.0"],
  ]) {
    const source = sources.find((s) => s.id === id);
    const entry = {
      title: "Story",
      link: source.site + "story/",
      "dc:creator": "Reporter",
      "content:encoded": prose,
      pubDate: "2026-10-29",
    };
    const a = feedArticle(entry, source);
    assert.ok(a.full, id);
    assert.ok(a.content.includes(license));
    assert.match(a.content, /Final paragraph/);
    assert.equal(
      feedArticle({ ...entry, link: "https://untrusted.example/story" }, source)
        .full,
      false,
    );
    assert.equal(
      feedArticle({ ...entry, "dc:creator": "" }, source).full,
      false,
    );
    assert.equal(
      feedArticle(
        { ...entry, "content:encoded": prose + "<p>All rights reserved.</p>" },
        source,
      ).full,
      false,
    );
    assert.equal(
      feedArticle(
        {
          ...entry,
          "content:encoded":
            prose +
            '<a href="https://creativecommons.org/licenses/by-nd/4.0/">License</a>',
        },
        source,
      ).full,
      false,
    );
    const description = {
      ...entry,
      "content:encoded": undefined,
      description: prose,
    };
    assert.equal(feedArticle(description, source).full, id === "eff");
  }
});

test("duplicate URL aliases cannot reappear after same-publisher headline merging", () => {
  const a = article("a", "https://publisher.example/original");
  const b = article("b", "https://publisher.example/alias");
  const c = { ...b, title: "A corrected shorter headline" };
  const result = deduplicateArticles([
    { id: "a", articles: [a] },
    { id: "b", articles: [b, c] },
  ]);
  assert.equal(result.articles.length, 1);
  assert.equal(result.duplicatesRemoved, 2);
});
