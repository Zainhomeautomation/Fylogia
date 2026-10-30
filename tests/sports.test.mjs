import test from "node:test";
import assert from "node:assert/strict";
import { sources, defaults, subcategories } from "../src/catalog.ts";
import {
  sports,
  sportForTopic,
  selectedSports,
  articleSports,
  matchesSport,
} from "../src/sports-taxonomy.ts";
import { sportsSources } from "../src/sports-sources.ts";
import { sportsPublications } from "../src/sports-publications.ts";
import {
  articleMatchesLibrary,
  recommendSources,
  deduplicateArticles,
} from "../src/source-utils.ts";
import { createDailyMagazine } from "../src/daily-magazine.ts";
const story = (sourceId, title = "A publisher story") => ({
  id: "https://publisher.test/" + sourceId,
  url: "https://publisher.test/" + sourceId,
  sourceId,
  source: sourceId,
  title,
  excerpt: "A short publisher-provided preview.",
  content: "<p>A short publisher-provided preview.</p>",
  categories: ["Sports"],
  region: "Worldwide",
  full: false,
  published: new Date().toISOString(),
});
test("fourteen unique sports retain legacy preference tokens and distinct football codes", () => {
  assert.equal(sports.length, 14);
  assert.equal(new Set(sports.map((s) => s.id)).size, 14);
  assert.equal(subcategories.Sports.length, 14);
  assert.ok(subcategories.Sports.includes("Football"));
  assert.ok(subcategories.Sports.includes("Formula 1"));
  assert.deepEqual(
    selectedSports(["Football", "Football (Soccer)", "Formula 1 & Motorsport"]),
    ["football", "motorsport"],
  );
  assert.equal(sportForTopic("Basketball").id, "basketball");
  assert.deepEqual(
    articleSports(
      story("custom", "NFL football quarterback scores a touchdown"),
    ),
    ["american-football"],
  );
  assert.ok(
    !articleSports(
      story("custom", "Basketball Champions League FIBA final"),
    ).includes("football"),
  );
  assert.doesNotThrow(() =>
    articleSports({
      ...story("custom", "Football"),
      url: "https://publisher.test/%invalid",
    }),
  );
});
test("specific publisher feeds classify names without requiring a sport keyword in headlines", () => {
  assert.deepEqual(
    articleSports(story("bbc-sport-football", "Arsenal chase a late winner")),
    ["football"],
  );
  assert.deepEqual(
    articleSports(story("espn-nba", "Mitchell leads late rally")),
    ["basketball"],
  );
  assert.deepEqual(articleSports(story("autosport", "Antonelli takes pole")), [
    "motorsport",
  ]);
  assert.ok(matchesSport(story("bbc-sport-cricket"), "other"));
  assert.ok(!matchesSport(story("espn-nba"), "other"));
  assert.ok(!matchesSport(story("custom", "Unclassified headline"), "other"));
  assert.ok(
    matchesSport(
      { ...story("private-feed"), title: "No keyword" },
      "basketball",
      [{ id: "private-feed", topics: ["Basketball"] }],
    ),
  );
});
test("For You and Daily Edition exclude unrelated sports while retaining other followed interests", () => {
  const prefs = {
    ...defaults,
    complete: true,
    interests: ["Sports", "Space"],
    topics: ["Football", "Basketball"],
    sourceIds: ["bbc-sport-football", "espn-nba", "bbc-sport-cricket", "nasa"],
  };
  const football = story("bbc-sport-football"),
    basketball = story("espn-nba"),
    cricket = story("bbc-sport-cricket"),
    space = { ...story("nasa"), categories: ["Space"] };
  assert.ok(articleMatchesLibrary(football, prefs));
  assert.ok(articleMatchesLibrary(basketball, prefs));
  assert.ok(!articleMatchesLibrary(cricket, prefs));
  assert.ok(articleMatchesLibrary(space, prefs));
  const edition = createDailyMagazine(
    [football, basketball, cricket, space],
    prefs,
  );
  assert.deepEqual(
    new Set(edition.stories.map((s) => s.id)),
    new Set([football.id, basketball.id, space.id]),
  );
  assert.ok(articleMatchesLibrary(cricket, { ...prefs, topics: [] }));
});
test("recommendations represent both priority sports and respect source failures", () => {
  const picks = recommendSources(
    sources,
    {
      interests: ["Sports"],
      topics: ["Football", "Basketball"],
      region: "Worldwide",
    },
    [],
    6,
  );
  assert.ok(picks.some((s) => s.topics?.includes("Football")));
  assert.ok(picks.some((s) => s.topics?.includes("Basketball")));
  assert.ok(picks.some((s) => s.id === "espn-nba"));
  assert.ok(!picks.some((s) => s.topics?.includes("Cricket")));
  const failed = picks.find((s) => s.topics?.includes("Basketball"));
  const next = recommendSources(
    sources,
    { interests: ["Sports"], topics: ["Basketball"], region: "Worldwide" },
    [{ id: failed.id, ok: false }],
    6,
  );
  assert.ok(!next.some((s) => s.id === failed.id));
});
test("curated sports feeds are bounded, dated, distinct and conservative about full article rights", () => {
  assert.ok(sportsSources.length > 0);
  for (const sport of sports)
    assert.ok(
      sources.some((source) =>
        (source.topics || []).some(
          (topic) => sportForTopic(topic)?.id === sport.id,
        ),
      ),
      sport.name,
    );
  assert.ok(
    sportsSources.every(
      (s) =>
        s.url.startsWith("https:") &&
        s.site.startsWith("https:") &&
        Number.isFinite(Date.parse(s.validatedAt)) &&
        !s.full,
    ),
  );
  assert.equal(new Set(sources.map((s) => s.id)).size, sources.length);
  assert.equal(new Set(sources.map((s) => s.url)).size, sources.length);
  assert.equal(sportsPublications.length, 12);
  assert.ok(sportsPublications.some((p) => p.name === "SLAM"));
  assert.ok(sportsPublications.every((p) => !("url" in p) && !("issue" in p)));
});
test("duplicate feed contexts preserve both sport classification and personalized access", () => {
  const a = story("bbc-sport", "A cross-sport report"),
    b = { ...a, sourceId: "bbc-sport-basketball" };
  const d = deduplicateArticles([
    {
      id: a.sourceId,
      articles: [a],
      source: { categories: ["Sports"], region: "Worldwide" },
    },
    {
      id: b.sourceId,
      articles: [b],
      source: { categories: ["Sports"], region: "Worldwide" },
    },
  ]);
  assert.equal(d.articles.length, 1);
  assert.ok(articleSports(d.articles[0]).includes("basketball"));
  assert.ok(
    articleMatchesLibrary(d.articles[0], {
      sourceIds: [b.sourceId],
      region: "Worldwide",
      topics: ["Basketball"],
    }),
  );
});

test("general-feed college and NFL URLs cannot enter the soccer view", () => {
  for (const url of [
    "https://www.si.com/college/tcu/football/tcu-kansas-football-how-to-watch-tv-streaming-2026",
    "https://sports.yahoo.com/nfl/football-preview",
    "https://www.espn.com/college-football/story/_/id/123/report",
  ]) {
    const a = {
      ...story("sports-illustrated", "How to Watch TCU vs. Kansas Football"),
      url,
    };
    assert.deepEqual(articleSports(a), ["american-football"]);
    assert.equal(matchesSport(a, "football"), false);
  }
});
test("individual sports never erase a separately followed Cars or Health interest", () => {
  const car = {
    ...story(
      "road-track",
      "VW Suspends ID.Golf EV Development Amid Financial Pressures: Report",
    ),
    categories: ["Cars", "Sports"],
  };
  const health = {
    ...story("runners-world", "Nutrition advice for runners"),
    categories: ["Health", "Sports"],
  };
  const prefs = {
    ...defaults,
    interests: ["Sports", "Cars", "Health"],
    topics: ["Football"],
    sourceIds: ["road-track", "runners-world", "bbc-sport-football"],
  };
  assert.ok(articleMatchesLibrary(car, prefs));
  assert.ok(articleMatchesLibrary(health, prefs));
  const daily = createDailyMagazine(
    [car, health, story("bbc-sport-football")],
    prefs,
  );
  assert.ok(daily.stories.some((s) => s.id === car.id));
  assert.ok(daily.stories.some((s) => s.id === health.id));
  assert.equal(
    articleMatchesLibrary(car, { ...prefs, interests: ["Sports"] }),
    false,
  );
  assert.equal(
    articleMatchesLibrary(health, { ...prefs, interests: ["Sports"] }),
    false,
  );
  const selected = recommendSources(
    sources.filter((s) =>
      ["runners-world", "bbc-sport-football"].includes(s.id),
    ),
    { ...prefs, interests: ["Sports", "Health"] },
    [],
    2,
  );
  assert.ok(selected.some((s) => s.id === "runners-world"));
  assert.ok(selected.some((s) => s.id === "bbc-sport-football"));
});
test("broad Outside feeds retain article-level cycling as well as outdoor coverage", () => {
  const article = story(
    "outside",
    "Time to Get Off the E-Mountain Bike Fence and Onto the Trail",
  );
  assert.ok(articleSports(article).includes("cycling"));
  assert.ok(articleSports(article).includes("outdoor"));
  assert.ok(matchesSport(article, "cycling"));
  assert.ok(
    articleMatchesLibrary(article, {
      sourceIds: ["outside"],
      region: "Worldwide",
      topics: ["Cycling"],
    }),
  );
  assert.equal(
    articleMatchesLibrary(article, {
      sourceIds: ["outside"],
      region: "Worldwide",
      topics: ["Football"],
    }),
    false,
  );
});
