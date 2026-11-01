import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  discoveryPages,
  discoverySources,
  pageSchema,
  siteOrigin,
} from "../src/discovery-catalog.ts";
import { securityHeaders } from "../scripts/write-security-headers.mjs";
test("public collection routes have unique metadata and meaningful original content", () => {
  for (const key of ["path", "title", "description"])
    assert.equal(
      new Set(discoveryPages.map((p) => p[key])).size,
      discoveryPages.length,
      key,
    );
  for (const p of discoveryPages) {
    assert.match(p.path, /^discover(?:\/[a-z0-9-]+)*$/);
    assert.ok(p.intro.length > 100);
    assert.ok(
      p.kind === "hub" ||
        p.sourceIds.length ||
        [
          "Technology",
          "Space",
          "Science",
          "Engineering",
          "3D Printing",
          "Computing",
          "Photography",
        ].includes(p.category),
    );
    for (const s of discoverySources(p)) assert.match(s.site, /^https:\/\//);
  }
  for (const suffix of [
    "technology",
    "apple",
    "ai",
    "travel",
    "fashion",
    "sports",
    "local",
    "regional",
    "world-news",
  ])
    assert.ok(discoveryPages.some((p) => p.path === "discover/news/" + suffix));
});
test("structured data identifies the reader and publisher directories, never original news reporting", () => {
  const root = pageSchema();
  assert.ok(
    root["@graph"].some(
      (n) => n["@type"] === "WebSite" && n.url === siteOrigin + "/",
    ),
  );
  assert.ok(root["@graph"].some((n) => n["@type"] === "Organization"));
  for (const p of discoveryPages) {
    const data = pageSchema(p),
      json = JSON.stringify(data);
    assert.doesNotMatch(
      json,
      /"(?:NewsArticle|Article|NewsMediaOrganization)"|articleBody|datePublished|fictional/i,
    );
    assert.ok(
      data["@graph"].some(
        (n) =>
          n["@type"] === "CollectionPage" &&
          n.url === siteOrigin + "/" + p.path,
      ),
    );
    const b = data["@graph"].find((n) => n["@type"] === "BreadcrumbList");
    assert.equal(b.itemListElement.at(-1).item, siteOrigin + "/" + p.path);
  }
});
test("inert JSON-LD does not widen the executable inline script policy", () => {
  const template = "script-src {{FYLOGIA_INLINE_SCRIPT_HASHES}}";
  assert.equal(
    securityHeaders(
      template,
      '<script>theme()</script><script type="application/ld+json">{"name":"Fylogia"}</script>',
    ),
    securityHeaders(template, "<script>theme()</script>"),
  );
});
test("crawler source policy excludes content caches and exposes only the canonical sitemap", async () => {
  const robots = await readFile(
    new URL("../public/robots.txt", import.meta.url),
    "utf8",
  );
  assert.match(robots, /Disallow: \/data\//);
  assert.match(robots, /Disallow: \/api\//);
  assert.match(robots, /Sitemap: https:\/\/fylogia.com\/sitemap.xml/);
  assert.doesNotMatch(robots, /Disallow: \/(?:assets|discover|fonts|brand)\//);
});
