import test from "node:test";
import assert from "node:assert/strict";
import {
  categories,
  sources,
  subcategories,
  interestGroups,
} from "../src/catalog.ts";
import { topicMatchesText } from "../src/interest-taxonomy.ts";
import {
  recommendSources,
  sourceMatches,
  withCurrentCategories,
} from "../src/source-utils.ts";
import { feedArticle } from "../scripts/feed-content.mjs";
test("organized interests cover every category once and preserve existing preference labels", () => {
  const grouped = interestGroups.flatMap((g) => g.categories);
  assert.equal(new Set(grouped).size, grouped.length);
  assert.deepEqual([...grouped].sort(), [...categories].sort());
  for (const old of [
    "Technology",
    "Apple",
    "AI",
    "Smart Home",
    "3D Printing",
    "World News",
    "Healthy Food",
    "Photography",
  ])
    assert.ok(categories.includes(old));
  for (const topic of [
    "Operating systems",
    "Linux",
    "Windows",
    "PC hardware",
    "Open source",
  ])
    assert.ok(subcategories.Computing.includes(topic));
  for (const topic of [
    "Civil engineering",
    "Construction",
    "Materials",
    "Facades",
  ])
    assert.ok(subcategories.Engineering.includes(topic));
  assert.ok(subcategories.Marine.includes("Diving"));
  assert.ok(subcategories["History & Culture"].includes("Archaeology"));
});
test("topic priorities match complete words, aliases and literal punctuation", () => {
  assert.equal(
    topicMatchesText("AI", "The reporter said it was raining"),
    false,
  );
  assert.equal(topicMatchesText("Mac", "Machine learning research"), false);
  assert.equal(topicMatchesText("Mac", "MacBook Pro review"), true);
  assert.equal(
    topicMatchesText("Operating systems", "Linux gets an update"),
    true,
  );
  assert.equal(topicMatchesText("C++", "C++ release"), true);
  assert.equal(topicMatchesText("C++", "C plus release"), false);
  assert.equal(topicMatchesText("Open source", "Open-source software"), true);
  assert.equal(topicMatchesText("Facades", "A new façade material"), true);
});
test("recommendations represent niche interests and prioritize matching healthy topics", () => {
  const picks = recommendSources(
    sources,
    {
      interests: [
        "Technology",
        "Science",
        "Space",
        "Marine",
        "History & Culture",
      ],
      topics: ["Diving"],
      region: "Worldwide",
    },
    [],
    12,
  );
  for (const c of ["Marine", "History & Culture"])
    assert.ok(picks.some((s) => s.categories.includes(c)));
  assert.ok(picks.some((s) => s.id === "padi-blog"));
  const linux = recommendSources(
    sources,
    { interests: ["Computing"], topics: ["Linux"], region: "Worldwide" },
    [],
    4,
  );
  assert.ok(linux.some((s) => s.id === "fedora-magazine"));
  assert.ok(
    sourceMatches(
      sources.find((s) => s.id === "fedora-magazine"),
      "Linux",
      "Computing",
      "All regions",
      "All content",
    ),
  );
  const blocked = recommendSources(
    sources,
    { interests: ["Marine"], region: "Worldwide" },
    [{ id: "padi-blog", ok: false }],
    20,
  );
  assert.ok(!blocked.some((s) => s.id === "padi-blog"));
});
test("new category labels are available for old saved articles without altering their content or metadata", () => {
  const old = {
    id: "legacy",
    sourceId: "fedora-magazine",
    categories: ["Technology"],
    content: "<p>Downloaded original text</p>",
    full: true,
  };
  const copy = withCurrentCategories(
    old,
    new Map(sources.map((s) => [s.id, s])),
  );
  assert.ok(copy.categories.includes("Computing"));
  assert.deepEqual(old.categories, ["Technology"]);
  assert.equal(copy.content, old.content);
  assert.equal(copy.id, old.id);
  assert.equal(copy.full, true);
  const duplicateLabels = withCurrentCategories(
    { ...old, categories: ["Technology", "Technology"] },
    new Map(sources.map((s) => [s.id, s])),
  );
  assert.ok(duplicateLabels.categories.includes("Computing"));
});
test("OSI full-feed text requires a verified staff byline and preserves its CC credit without media", () => {
  const source = sources.find((s) => s.id === "open-source-initiative");
  const item = {
    title: "Source test",
    link: "https://opensource.org/blog/test",
    "dc:creator": "Jordan Maris",
    pubDate: "Thu, 29 Oct 2026 08:00:00 GMT",
    "content:encoded":
      "<h2>Original heading</h2><p>" +
      "Publisher prose retained for reading. ".repeat(50) +
      "</p><figure><img src='https://opensource.org/photo.jpg'><figcaption>Photo credit</figcaption></figure>",
  };
  const article = feedArticle(item, source);
  assert.equal(article.full, true);
  assert.match(article.content, /CC BY 4.0/);
  assert.match(article.content, /Original heading/);
  assert.doesNotMatch(article.content, /<img/);
  assert.equal(article.image, "");
  assert.equal(
    feedArticle({ ...item, "dc:creator": "Guest contributor" }, source).full,
    false,
  );
  assert.equal(
    feedArticle({ ...item, link: "https://attacker.example/blog/test" }, source)
      .full,
    false,
  );
  assert.equal(
    feedArticle(
      {
        ...item,
        "content:encoded":
          item["content:encoded"] + "<p>All rights reserved</p>",
      },
      source,
    ).full,
    false,
  );
});
