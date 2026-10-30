import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  sources,
  categories,
  subcategories,
  interestGroups,
} from "../src/catalog.ts";
import { lifestyleSources } from "../src/lifestyle-sources.ts";
import { recommendSources } from "../src/source-utils.ts";
import { normalizeInterestSearch } from "../src/interest-taxonomy.ts";
import { streamPublication } from "../server/publication-stream.mjs";
const added = [
  "Men’s Fashion",
  "Women’s Fashion",
  "Watches & Jewelry",
  "Luxury & Lifestyle",
  "Nature & Environment",
  "Home & Garden",
];
test("additive taxonomy retains old interests and gives new categories real attributed feed entries", async () => {
  assert.equal(categories.length, 32);
  assert.equal(
    normalizeInterestSearch("Men’s Fashion"),
    normalizeInterestSearch("MEN'S FASHION"),
  );
  assert.equal(new Set(sources.map((s) => s.id)).size, sources.length);
  assert.equal(new Set(sources.map((s) => s.url)).size, sources.length);
  assert.equal(interestGroups[0].name, "Technology & Computing");
  const edition = JSON.parse(
    await readFile("public/data/edition.json", "utf8"),
  );
  for (const category of added) {
    assert.ok(subcategories[category].length >= 4);
    const ids = lifestyleSources
      .filter((s) => s.categories.includes(category))
      .map((s) => s.id);
    assert.ok(ids.length >= 2);
    const articles = edition.articles.filter((a) => ids.includes(a.sourceId));
    assert.ok(articles.length > 0, category);
    for (const a of articles) {
      assert.ok(Number.isFinite(Date.parse(a.published)));
      assert.ok(a.source && a.title && a.url.startsWith("https://"));
      assert.equal(a.full, false);
    }
  }
  assert.ok(lifestyleSources.every((s) => !s.full));
});
test("fashion recommendations represent both interests without mislabeling article rights", () => {
  const selected = recommendSources(
    sources,
    { interests: ["Men’s Fashion", "Women’s Fashion"], region: "Worldwide" },
    [],
    50,
  );
  assert.ok(selected.some((s) => s.categories.includes("Men’s Fashion")));
  assert.ok(selected.some((s) => s.categories.includes("Women’s Fashion")));
});
const publication = {
  url: "https://magazine.raspberrypi.com/issue.pdf",
  hosts: ["magazine.raspberrypi.com", "storage.raspberrypi.com"],
  filename: "HackSpace-75.pdf",
};
test("publication stream follows only trusted HTTPS redirects and strips private credentials", async () => {
  let count = 0;
  const response = await streamPublication(
    new Request("https://fylogia.com/edition?url=https://evil.test", {
      headers: {
        Range: "bytes=0-4",
        Cookie: "private",
        Authorization: "secret",
      },
    }),
    publication,
    async (url, options) => {
      assert.equal(options.headers.get("Cookie"), null);
      assert.equal(options.headers.get("Authorization"), null);
      assert.equal(options.headers.get("Range"), "bytes=0-4");
      if (count++ === 0)
        return new Response(null, {
          status: 302,
          headers: { Location: "https://storage.raspberrypi.com/public.pdf" },
        });
      assert.equal(url, "https://storage.raspberrypi.com/public.pdf");
      return new Response("%PDF-", {
        status: 206,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Range": "bytes 0-4/100",
          "Set-Cookie": "private",
        },
      });
    },
  );
  assert.equal(response.status, 206);
  assert.equal(await response.text(), "%PDF-");
  assert.equal(response.headers.get("Set-Cookie"), null);
});
test("publication stream rejects unsafe redirects, mutations, malformed ranges and non-PDF responses", async () => {
  for (const target of [
    "http://storage.raspberrypi.com/a",
    "https://storage.raspberrypi.com:444/a",
    "https://evil.test/a",
    "https://user:secret@storage.raspberrypi.com/a",
  ]) {
    let calls = 0;
    const response = await streamPublication(
      new Request("https://fylogia.com/pdf"),
      publication,
      async () => {
        calls++;
        return new Response(null, {
          status: 302,
          headers: { Location: target },
        });
      },
    );
    assert.equal(response.status, 502);
    assert.equal(calls, 1);
  }
  const noFetch = () => {
    throw Error("Unexpected fetch");
  };
  assert.equal(
    (
      await streamPublication(
        new Request("https://fylogia.com/pdf", { method: "POST" }),
        publication,
        noFetch,
      )
    ).status,
    405,
  );
  assert.equal(
    (
      await streamPublication(
        new Request("https://fylogia.com/pdf", {
          headers: { Range: "bytes=1-2,4-5" },
        }),
        publication,
        noFetch,
      )
    ).status,
    416,
  );
  assert.equal(
    (
      await streamPublication(
        new Request("https://fylogia.com/pdf"),
        publication,
        async () =>
          new Response("login", { headers: { "Content-Type": "text/html" } }),
      )
    ).status,
    502,
  );
  const head = await streamPublication(
    new Request("https://fylogia.com/pdf", { method: "HEAD" }),
    publication,
    async () =>
      new Response(null, {
        headers: { "Content-Type": "application/pdf", "Content-Length": "100" },
      }),
  );
  assert.equal(await head.text(), "");
  assert.equal(head.headers.get("Content-Length"), "100");
});

test("HEAD obtains size through a one-byte GET for publishers with GET-signed storage redirects", async () => {
  let cancelled = false;
  const response = await streamPublication(
    new Request("https://fylogia.com/pdf", { method: "HEAD" }),
    publication,
    async (_, options) => {
      assert.equal(options.method, "GET");
      assert.equal(options.headers.get("Range"), "bytes=0-0");
      return new Response(
        new ReadableStream({
          cancel() {
            cancelled = true;
          },
        }),
        {
          status: 206,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Range": "bytes 0-0/67420095",
            "Content-Length": "1",
          },
        },
      );
    },
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Length"), "67420095");
  assert.equal(response.headers.get("Content-Range"), null);
  assert.equal(await response.text(), "");
  assert.equal(cancelled, true);
});
