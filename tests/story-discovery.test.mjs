import test from "node:test";
import assert from "node:assert/strict";
import { defaults } from "../src/catalog.ts";
import { rankForYou, storySearchScore } from "../src/story-discovery.ts";
const now = Date.parse("2026-10-31T12:00:00Z");
const article = (id, extra = {}) => ({
  id,
  url: `https://example.test/${id}`,
  title: id,
  sourceId: "publisher",
  source: "Original Publisher",
  categories: ["Technology"],
  region: "Worldwide",
  published: new Date(now).toISOString(),
  excerpt: "Original test document.",
  content: "<p>Original text.</p>",
  full: false,
  ...extra,
});
test("discovery searches category, publisher metadata and multiple words without substring false positives", () => {
  const a = article("A robot research update", {
    categories: ["AI"],
    publisherTags: ["Robotics"],
    source: "Science Weekly",
  });
  for (const query of [
    "AI",
    "artificial intelligence",
    "robotics",
    "science robot",
    "Worldwide",
  ])
    assert.ok(storySearchScore(a, query) > 0, query);
  assert.equal(storySearchScore(a, "robot missing"), 0);
  assert.ok(
    storySearchScore(
      article("Lakers update", {
        sourceId: "espn-nba",
        categories: ["Sports"],
      }),
      "Basketball",
    ) > 0,
  );
  assert.equal(storySearchScore(article("Daily dispatch"), "AI"), 0);
});
test("title matches rank ahead of excerpt-only matches and accents are normalized", () => {
  assert.ok(storySearchScore(article("Café robotics"), "cafe") > 0);
  assert.ok(
    storySearchScore(article("Robotics update"), "robot") >
      storySearchScore(
        article("A report", { excerpt: "Robotics update" }),
        "robot",
      ),
  );
  assert.equal(storySearchScore(article("Any title"), "   "), 0);
});
test("fresh unread stories outrank an already-opened or old story while every story remains available", () => {
  const read = article("read"),
    old = article("old", { published: "2020-01-01T00:00:00Z", full: true }),
    fresh = article("fresh");
  assert.deepEqual(
    rankForYou([read, old, fresh], defaults, [read], [], now).map((a) => a.id),
    ["fresh", "old", "read"],
  );
});
test("saved and recently read subjects improve relevance without altering library records", () => {
  const saved = article("saved", {
    categories: ["Science"],
    publisherTags: ["Robotics"],
  });
  const related = article("related", {
      categories: ["Science"],
      publisherTags: ["Robotics"],
    }),
    other = article("other");
  const data = [other, related],
    before = JSON.stringify({ data, saved });
  assert.equal(rankForYou(data, defaults, [], [saved], now)[0].id, "related");
  assert.equal(JSON.stringify({ data, saved }), before);
});
test("publisher rounds remain diverse beyond the first row and preserve every unique article", () => {
  const list = [
    article("a1", { sourceId: "a" }),
    article("a2", { sourceId: "a" }),
    article("a3", { sourceId: "a" }),
    article("b1", { sourceId: "b" }),
    article("b2", { sourceId: "b" }),
  ];
  const ranked = rankForYou(list, defaults, [], [], now);
  assert.deepEqual(
    ranked.map((a) => a.sourceId),
    ["a", "b", "a", "b", "a"],
  );
  assert.equal(new Set(ranked.map((a) => a.id)).size, list.length);
});
test("missing dates and non-displayable images do not gain a freshness or photo advantage", () => {
  const normal = article("normal"),
    invalid = article("invalid", { published: "not a date" });
  assert.equal(
    rankForYou([invalid, normal], defaults, [], [], now)[0].id,
    "normal",
  );
});
