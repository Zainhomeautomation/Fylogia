import test from "node:test";
import assert from "node:assert/strict";
import {
  createDailyMagazine,
  normalizeDailyMagazines,
  dailyPreferenceKey,
} from "../src/daily-magazine.ts";
import { defaults } from "../src/catalog.ts";
const now = new Date("2026-10-29T12:00:00Z");
const prefs = {
  ...defaults,
  complete: true,
  sourceIds: ["nasa", "eff"],
  interests: ["Space"],
  region: "Worldwide",
};
const article = (id, extra = {}) => ({
  id,
  title: "Space exploration",
  source: "NASA",
  sourceId: "nasa",
  published: now.toISOString(),
  categories: ["Space"],
  region: "Worldwide",
  image: "",
  url: "https://www.nasa.gov/" + id,
  content: "Publisher body",
  excerpt: "Publisher preview",
  full: false,
  ...extra,
});
test("daily selection favors fresh, permitted, relevant stories without selecting unfollowed or wrong-region stories", () => {
  const edition = createDailyMagazine(
    [
      article("preview"),
      article("full", { full: true }),
      article("old", { published: "2020-01-01", full: true }),
      article("unfollowed", { sourceId: "other" }),
      article("europe", { region: "Europe" }),
    ],
    { ...prefs, region: "United States" },
    now,
  );
  assert.equal(edition.stories[0].id, "full");
  assert.ok(
    !edition.stories.some((s) => s.id === "unfollowed" || s.id === "europe"),
  );
  assert.equal(edition.stories.length, 2);
  assert.ok(
    !edition.stories.some((s) => s.id === "old"),
    "old publication must not be presented as today’s news",
  );
  assert.equal(edition.stories[0].section, "Space");
});
test("daily metadata is deterministic, bounded, unique and contains no publisher body or image", () => {
  const input = Array.from({ length: 40 }, (_, i) =>
    article(String(i), { sourceId: i % 2 ? "eff" : "nasa" }),
  );
  const a = createDailyMagazine([...input, input[0]], prefs, now),
    b = createDailyMagazine([...input].reverse(), prefs, now);
  assert.deepEqual(a, b);
  assert.equal(a.stories.length, 30);
  assert.equal(new Set(a.stories.map((s) => s.id)).size, 30);
  assert.deepEqual(Object.keys(a.stories[0]).sort(), [
    "full",
    "id",
    "section",
    "source",
    "title",
  ]);
  assert.ok(a.stories.slice(0, 6).some((s) => Number(s.id) % 2 === 0));
  assert.ok(a.stories.slice(0, 6).some((s) => Number(s.id) % 2 === 1));
  assert.equal(
    dailyPreferenceKey(prefs),
    dailyPreferenceKey({
      ...prefs,
      sourceIds: [...prefs.sourceIds].reverse(),
      theme: "light",
    }),
  );
  assert.notEqual(
    dailyPreferenceKey(prefs),
    dailyPreferenceKey({ ...prefs, region: "Europe" }),
  );
});
test("daily metadata validation strips unknown payloads and rejects duplicate or oversized editions", () => {
  const a = createDailyMagazine([article("one")], prefs, now);
  assert.deepEqual(
    normalizeDailyMagazines([
      {
        ...a,
        content: "not metadata",
        stories: a.stories.map((s) => ({ ...s, content: "no body" })),
      },
    ]),
    [a],
  );
  assert.throws(() =>
    normalizeDailyMagazines([{ ...a, stories: [a.stories[0], a.stories[0]] }]),
  );
  assert.throws(() => normalizeDailyMagazines(Array(31).fill(a)));
  assert.throws(() => normalizeDailyMagazines([{ ...a, day: "not a day" }]));
  assert.deepEqual(normalizeDailyMagazines([]), []);
});
