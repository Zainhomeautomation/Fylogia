import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  feedDates,
  normalizedDate,
  publicationTime,
  chronological,
  newsDay,
} from "../src/news-chronology.ts";
import { defaults, sources } from "../src/catalog.ts";
import { createDailyMagazine } from "../src/daily-magazine.ts";
import {
  localArticle,
  regionalArticle,
  preferredCoverage,
  worldArticle,
} from "../src/news-geography.ts";
import {
  countryCodes,
  countryRegion,
  suggestedCountry,
} from "../src/countries.ts";
import { deduplicateArticles } from "../src/source-utils.ts";
import {
  normalizeLibraryValue as normalizeValue,
  emptyLibrary,
} from "../src/library-data.ts";
import { projectLibrary, materializeLibrary } from "../src/sync-library.ts";
import { validateSyncValue } from "../src/sync-protocol.ts";
const now = Date.parse("2026-11-01T12:00:00Z");
const article = (id, date, extra = {}) => ({
  id,
  url: "https://example.test/" + id,
  title: "Original publisher headline " + id,
  source: "Publisher",
  sourceId: "nasa",
  published: date,
  categories: ["World News"],
  region: "Worldwide",
  content: "<p>Publisher text.</p>",
  excerpt: "Publisher preview",
  full: false,
  ...extra,
});
test("chronology compares instants across time zones, with deterministic ties", () => {
  const a = article("a", "2026-11-01T10:00:00+04:00"),
    b = article("b", "2026-11-01T08:00:00Z"),
    c = article("c", "2026-11-01T06:30:00-04:00");
  assert.deepEqual(
    chronological([a, c, b], "latest", now).map((a) => a.id),
    ["c", "b", "a"],
  );
  assert.deepEqual(
    chronological([a, c, b], "oldest", now).map((a) => a.id),
    ["a", "b", "c"],
  );
  assert.deepEqual(
    chronological([article("z", b.published), b], "latest", now).map(
      (a) => a.id,
    ),
    ["b", "z"],
  );
});
test("retrieval and Atom updated never manufacture an original publication date", () => {
  const x = feedDates({
    published: "2026-10-31T08:00:00Z",
    updated: "2026-11-01T11:00:00Z",
  });
  assert.equal(x.published, "2026-10-31T08:00:00.000Z");
  assert.equal(x.updatedAt, "2026-11-01T11:00:00.000Z");
  assert.equal(feedDates({ updated: "2026-11-01T11:00:00Z" }).published, "");
  assert.equal(
    feedDates({ updated: "2026-11-01T11:00:00Z" }).publicationDateStatus,
    "missing",
  );
  assert.equal(
    feedDates({ "dc:date": "2026-10-31T12:00:00+02:00" }).published,
    "2026-10-31T10:00:00.000Z",
  );
  assert.equal(normalizedDate("2026-02-30T12:00:00Z"), "");
  assert.equal(normalizedDate("2026-11-01 08:00:00"), "");
  assert.equal(feedDates({ pubDate: "2026-10-31" }).published, "2026-10-31");
  assert.equal(
    feedDates({ pubDate: "2026-10-31" }).publicationPrecision,
    "date",
  );
});
test("missing, malformed and future dates stay at the end in both chronological modes", () => {
  const input = [
    article("future", "2099-01-01T00:00:00Z"),
    article("missing", ""),
    article("bad", "not a date"),
    article("valid", "2026-10-31T12:00:00Z"),
  ];
  for (const mode of ["latest", "oldest"])
    assert.equal(chronological(input, mode, now)[0].id, "valid");
  assert.equal(publicationTime(input[0], now), undefined);
  assert.equal(newsDay(input[0], new Date(now)), "Date unavailable");
});
test("calendar-day groups respect device time zone and 25-hour DST days", () => {
  const module = new URL("../src/news-chronology.ts", import.meta.url).href;
  const code = `import {newsDay} from ${JSON.stringify(module)};console.log(newsDay({published:'2026-11-01T00:30:00-04:00'},new Date('2026-11-02T01:00:00-05:00')))`;
  assert.equal(
    execFileSync(process.execPath, ["--input-type=module", "-e", code], {
      env: { ...process.env, TZ: "America/New_York" },
      encoding: "utf8",
    }).trim(),
    "Yesterday",
  );
  assert.equal(
    newsDay(article("same", new Date(now).toISOString()), new Date(now)),
    "Today",
  );
});
test("country coverage is explicit and regional news does not relabel global publishers as local", () => {
  assert.equal(countryCodes.size, 249);
  assert.equal(countryRegion("OM"), "Middle East");
  assert.equal(countryRegion("CY"), "Europe");
  assert.equal(countryRegion("GB"), "Europe");
  const oman = article("om", new Date(now).toISOString(), {
      sourceId: "oman-observer",
      region: "Middle East",
    }),
    cyprus = article("cy", oman.published, {
      sourceId: "cyprus-mail",
      region: "Europe",
    }),
    uk = article("gb", oman.published, {
      sourceId: "bbc-uk-national",
      region: "Europe",
    });
  assert.ok(localArticle(oman, "OM"));
  assert.ok(!localArticle(oman, "CY"));
  assert.ok(localArticle(cyprus, "CY"));
  assert.ok(regionalArticle(uk, "CY"));
  assert.ok(!regionalArticle(oman, "CY"));
  assert.ok(!preferredCoverage(uk, "OM"));
  assert.ok(
    worldArticle(article("world", oman.published, { sourceId: "bbc-world" })),
  );
  assert.ok(!worldArticle(oman));
  assert.equal(suggestedCountry(["ar-OM", "en-GB"]), "OM");
  assert.equal(suggestedCountry(["en"]), undefined);
});
test("all newly listed local feeds have current validation and no duplicate URLs", () => {
  const national = sources.filter((s) => s.countries?.length);
  assert.ok(national.some((s) => s.countries.includes("OM")));
  assert.ok(national.some((s) => s.countries.includes("CY")));
  assert.ok(national.some((s) => s.countries.includes("GB")));
  assert.equal(
    new Set(sources.map((s) => s.url.replace(/\/$/, ""))).size,
    sources.length,
  );
  for (const s of national)
    assert.ok(s.validatedAt || ["hindu"].includes(s.id));
});
test("duplicates retain the earliest valid original timestamp without losing permitted body text", () => {
  const a = article("one", "2026-10-31T08:00:00Z"),
    b = {
      ...a,
      published: "2026-11-01T10:00:00Z",
      full: true,
      content: "<p>Complete permitted body.</p>",
    };
  const merged = deduplicateArticles([
    { id: "a", articles: [a] },
    { id: "b", articles: [b] },
  ]);
  assert.equal(merged.articles.length, 1);
  assert.equal(merged.articles[0].published, a.published);
  assert.equal(merged.articles[0].content, b.content);
});
test("Daily Edition accepts only the correct publication day, not retrieval day or stale/future stories", () => {
  const today = article("today", new Date(now).toISOString()),
    yesterday = article("yesterday", "2026-10-31T08:00:00Z", {
      retrievedAt: new Date(now).toISOString(),
    }),
    missing = article("missing", ""),
    future = article("future", "2099-01-01T00:00:00Z");
  const e = createDailyMagazine(
    [yesterday, missing, future, today],
    { ...defaults, sourceIds: ["nasa"] },
    new Date(now),
  );
  assert.deepEqual(
    e.stories.map((s) => s.id),
    ["today"],
  );
});
test("country and ordering survive export normalization, sync and deletion without altering existing library", () => {
  const original = emptyLibrary();
  original.preferences = {
    ...defaults,
    complete: true,
    country: "OM",
    newsSort: "oldest",
  };
  original.progress = { kept: 0.4 };
  assert.equal(
    normalizeValue("preferences", original.preferences).country,
    "OM",
  );
  assert.throws(() =>
    normalizeValue("preferences", { ...defaults, country: "XX" }),
  );
  assert.throws(() => validateSyncValue("setting:country", "XX"));
  const projection = projectLibrary(original);
  assert.equal(projection.get("setting:country"), "OM");
  assert.equal(projection.get("setting:newsSort"), "oldest");
  projection.set("setting:country", "CY");
  const next = materializeLibrary(projection, original);
  assert.equal(next.preferences.country, "CY");
  assert.deepEqual(next.progress, original.progress);
  projection.set("setting:country", null);
  assert.equal(
    materializeLibrary(projection, original).preferences.country,
    undefined,
  );
  assert.deepEqual(normalizeValue("preferences", defaults), defaults);
});

test("date-only Daily Editions preserve publisher calendar days on both sides of UTC", () => {
  const daily = new URL("../src/daily-magazine.ts", import.meta.url).href;
  const catalog = new URL("../src/catalog.ts", import.meta.url).href;
  const code = `import {createDailyMagazine} from ${JSON.stringify(daily)};import {defaults} from ${JSON.stringify(catalog)};const a=${JSON.stringify(article("calendar", "2026-11-01"))};console.log(JSON.stringify([createDailyMagazine([a],{...defaults,interests:['World News'],sourceIds:['nasa']},new Date('2026-11-01T00:15:00')).stories.length,createDailyMagazine([a],{...defaults,interests:['World News'],sourceIds:['nasa']},new Date('2026-10-31T23:45:00')).stories.length]))`;
  for (const TZ of ["America/New_York", "Asia/Muscat", "Pacific/Auckland"])
    assert.deepEqual(
      JSON.parse(
        execFileSync(process.execPath, ["--input-type=module", "-e", code], {
          env: { ...process.env, TZ },
          encoding: "utf8",
        }),
      ),
      [1, 0],
    );
});
test("legacy tabs cannot advance the capable-settings cursor past unseen records", async () => {
  const { exchangeCursor } = await import("../src/sync-store.ts");
  assert.equal(exchangeCursor({ cursor: 10 }), 0);
  const modern = { cursor: 10, preferenceCursor: 10 };
  const legacy = { ...modern, cursor: 15 };
  assert.equal(exchangeCursor(legacy), 10);
  const caughtUp = { ...legacy, cursor: 18, preferenceCursor: 18 };
  assert.equal(exchangeCursor(caughtUp), 18);
  assert.equal(exchangeCursor({ ...caughtUp, cursor: 20 }), 18);
});
