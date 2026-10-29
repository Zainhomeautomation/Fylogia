import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  projectLibrary,
  materializeLibrary,
  initialMerge,
} from "../src/sync-library.ts";
const edition = JSON.parse(
  readFileSync(new URL("../public/data/edition.json", import.meta.url)),
);
const a = edition.articles.find((a) => a.full);
const prefs = {
  complete: true,
  interests: ["Space"],
  topics: [],
  sourceIds: [a.sourceId],
  customSources: [],
  reading: "pages",
  theme: "navy",
  region: "Worldwide",
  fontSize: 19,
  converter: true,
};
const data = () => ({
  preferences: structuredClone(prefs),
  saved: [a],
  history: [a],
  progress: { [a.id]: 0.4 },
  custom: [],
  magazineReading: {},
  dailyEditions: [],
});
test("cloud projection contains only bibliographic records and never permitted publisher bodies or images", () => {
  const projection = projectLibrary(data()),
    json = JSON.stringify([...projection]);
  assert.ok(!json.includes(a.content));
  assert.ok(!json.includes('"image"'));
  assert.ok(!json.includes('"excerpt"'));
  assert.ok(!json.includes("converter"));
  assert.equal(projection.get("saved:" + a.id).title, a.title);
});
test("remote metadata preserves a local full body and converter preference", () => {
  const original = data(),
    map = projectLibrary(original);
  map.set("setting:theme", "light");
  const merged = materializeLibrary(map, original);
  assert.equal(merged.saved[0], a);
  assert.equal(merged.saved[0].content, a.content);
  assert.equal(merged.preferences.theme, "light");
  assert.equal(merged.preferences.converter, true);
});
test("new-device saved links remain honest metadata with no manufactured text or offline images", () => {
  const original = data(),
    map = projectLibrary(original);
  original.saved = [];
  original.history = [];
  const merged = materializeLibrary(map, original);
  assert.equal(merged.saved[0].content, "");
  assert.equal(merged.saved[0].full, false);
  assert.equal(merged.saved[0].image, undefined);
});
test("initial merge unions explicit selections, keeps cloud appearance and furthest progress", () => {
  const local = projectLibrary(data()),
    remote = [
      { key: "setting:theme", value: "light" },
      { key: "source:other", value: true },
      { key: "progress:" + a.id, value: 0.8 },
    ];
  const result = initialMerge(local, remote, prefs);
  assert.equal(result.get("setting:theme"), "light");
  assert.equal(result.get("source:other"), true);
  assert.equal(result.get("source:" + a.sourceId), true);
  assert.equal(result.get("progress:" + a.id), 0.8);
  const fresh = initialMerge(local, remote, { ...prefs, complete: false });
  assert.equal(fresh.has("source:" + a.sourceId), false);
});
test("tombstones remove memberships and saved links while history uses event clocks", () => {
  const original = data(),
    map = projectLibrary(original);
  map.set("saved:" + a.id, null);
  map.set("source:" + a.sourceId, null);
  const result = materializeLibrary(map, original);
  assert.equal(result.saved.length, 0);
  assert.deepEqual(result.preferences.sourceIds, []);
  assert.equal(original.saved.length, 1);
});

test("public magazine pages and bookmarks remain separate metadata records", () => {
  const original = data();
  original.magazineReading = { nasa: { page: 12, bookmark: 8 } };
  const map = projectLibrary(original);
  assert.equal(map.get("magazine-progress:nasa"), 12);
  assert.equal(map.get("magazine-bookmark:nasa"), 8);
  const roundTrip = materializeLibrary(map, original);
  assert.deepEqual(roundTrip.magazineReading, original.magazineReading);
});

test("independently assembled daily issues and local previews survive first-device merge", () => {
  const original = data();
  original.saved = [
    { ...a, full: false, content: "", excerpt: "Publisher-supplied preview" },
  ];
  original.history = [];
  const map = projectLibrary(original);
  assert.equal(
    materializeLibrary(map, original).saved[0].excerpt,
    "Publisher-supplied preview",
  );
  const issue = {
    id: "2026-10-29-test",
    day: "2026-10-29",
    createdAt: "2026-10-29T00:00:00Z",
    region: "Worldwide",
    stories: [
      {
        id: a.id,
        title: a.title,
        source: a.source,
        section: "Space",
        full: true,
      },
    ],
  };
  const local = new Map([["daily:" + issue.id, issue]]),
    remote = [{ key: "daily:" + issue.id, value: { ...issue, stories: [] } }];
  const merged = initialMerge(local, remote, prefs);
  assert.equal(merged.size, 2);
  assert.deepEqual(merged.get("daily:" + issue.id).stories, []);
  assert.ok([...merged.values()].some((v) => v.stories.length === 1));
});

test("private feed queries and signed article links remain local and are rejected as cloud URLs", async () => {
  const { validateSyncValue } = await import("../src/sync-protocol.ts");
  const original = data();
  const feed = {
    id: "private-feed",
    name: "Private feed",
    url: "https://example.org/rss?token=private-value",
    site: "https://example.org",
    region: "Worldwide",
    categories: ["Space"],
    custom: true,
  };
  const privateSite = {
    ...feed,
    id: "private-site",
    url: "https://example.org/feed",
    site: "https://example.org/?token=private-value",
  };
  original.preferences.customSources = [feed, privateSite];
  original.preferences.sourceIds.push(feed.id, privateSite.id);
  const signed = {
    ...a,
    id: "signed",
    url: "https://example.org/story?access_token=private-value",
  };
  original.saved.push(signed);
  original.progress.signed = 0.75;
  const map = projectLibrary(original);
  assert.ok(!JSON.stringify([...map]).includes("private-value"));
  assert.equal(map.has("source:" + feed.id), false);
  assert.equal(map.has("progress:signed"), false);
  const merged = materializeLibrary(map, original);
  assert.ok(merged.preferences.customSources.some((s) => s.id === feed.id));
  assert.ok(merged.preferences.sourceIds.includes(feed.id));
  assert.ok(
    merged.preferences.customSources.some((s) => s.id === privateSite.id),
  );
  assert.ok(merged.saved.some((s) => s.id === signed.id));
  assert.equal(merged.progress.signed, 0.75);
  assert.throws(() =>
    validateSyncValue("custom:" + feed.id, {
      id: feed.id,
      name: feed.name,
      url: feed.url,
      site: feed.site,
      categories: feed.categories,
      region: feed.region,
    }),
  );
  assert.throws(() =>
    validateSyncValue("saved:signed", {
      id: "signed",
      url: signed.url,
      title: a.title,
      source: a.source,
      sourceId: a.sourceId,
      published: a.published,
      categories: a.categories,
      region: a.region,
    }),
  );
});

test("daily edition metadata cannot indirectly carry signed article identifiers", async () => {
  const { validateSyncValue } = await import("../src/sync-protocol.ts");
  const original = data(),
    secretId = "https://example.org/story?access_token=private-value";
  const issue = {
    id: "2026-10-29-private",
    day: "2026-10-29",
    createdAt: "2026-10-29T00:00:00Z",
    region: "Worldwide",
    stories: [
      {
        id: secretId,
        title: "Private story",
        source: "Custom",
        section: "Space",
        full: false,
      },
      {
        id: a.id,
        title: a.title,
        source: a.source,
        section: "Space",
        full: true,
      },
    ],
  };
  original.dailyEditions = [issue];
  assert.throws(() => validateSyncValue("daily:" + issue.id, issue));
  for (const id of [
    "HTTPS://example.org/story?access_token=private",
    "https://example.org/story#access_token=private",
  ])
    assert.throws(() =>
      validateSyncValue("daily:" + issue.id, {
        ...issue,
        stories: [{ ...issue.stories[0], id }],
      }),
    );
  const projection = projectLibrary(original);
  assert.ok(!JSON.stringify([...projection]).includes("private-value"));
  assert.equal(projection.has("daily:" + issue.id), false);
  assert.equal(
    materializeLibrary(projection, original).dailyEditions[0].stories.length,
    2,
  );
  assert.equal(original.dailyEditions[0].stories.length, 2);
});
