import { test, expect } from "@playwright/test";
import { defaults, sources } from "../src/catalog";
async function fixture(page: any) {
  await page.addInitScript(
    (p: any) => {
      localStorage.setItem("folio.v1.preferences", JSON.stringify(p));
    },
    { ...defaults, complete: true, interests: ["Space"], sourceIds: ["nasa"] },
  );
}
test("For You loads complete followed-source slices while Explore loads the full original edition", async ({
  page,
}) => {
  test.skip(
    process.env.FYLOGIA_PAGES_RUNTIME === "0",
    "Requires static Pages capability headers",
  );
  await fixture(page);
  const full: string[] = [],
    slices: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "GET" && r.url().includes("/data/edition.json"))
      full.push(r.url());
    if (r.url().includes("/data/source-files/")) slices.push(r.url());
  });
  await page.goto("./");
  await expect(page.locator(".story").first()).toBeVisible();
  expect(slices.length).toBeGreaterThan(0);
  expect(full).toEqual([]);
  const body = await page.request.get(new URL(slices[0]).pathname);
  const data = await body.json();
  expect(
    data.articles.some((a: any) => a.full && a.content.length > 1000),
  ).toBe(true);
  await page.goto("explore");
  await expect(page.locator(".story").first()).toBeVisible();
  expect(full.length).toBeGreaterThan(0);
});
test.describe("network-failure fixture", () => {
  // A browser route must receive the deliberately failed request; an installed
  // worker may otherwise serve the real successful slice before interception.
  // Worker-controlled news and offline behavior retain their separate tests.
  test.use({ serviceWorkers: "block" });
  test("unavailable source slices fall back to the preserved full edition without losing real stories", async ({
    page,
  }) => {
    test.skip(
      process.env.FYLOGIA_PAGES_RUNTIME === "0",
      "Requires static Pages capability headers",
    );
    await fixture(page);
    await page.route("**/data/source-files/*.json", (r) =>
      r.fulfill({ status: 503, body: "Temporarily unavailable" }),
    );
    const original = page.waitForResponse(
      (r) =>
        r.request().method() === "GET" &&
        r.url().includes("/data/edition.json") &&
        r.ok(),
    );
    await page.goto("./");
    await original;
    await expect(page.locator(".story").first()).toBeVisible();
    await page
      .locator(".story")
      .filter({ has: page.locator(".content-label.complete") })
      .first()
      .locator(".story-open")
      .click();
    await expect(page.locator(".article-body")).not.toBeEmpty();
  });
});
test("every indexed source preserves its contributing stories, attribution, and body bytes", async ({
  request,
}) => {
  test.skip(
    process.env.FYLOGIA_PAGES_RUNTIME === "0",
    "Requires source slices built for Pages",
  );
  const index = await (await request.get("data/source-index.json")).json();
  const full = await (await request.get("data/edition.json")).json();
  expect(index.sources.map((source: { id: string }) => source.id)).toEqual(
    sources.map((source) => source.id),
  );
  expect(index.generatedAt).toBe(full.generatedAt);
  // Include a combined feed entry to cover alternate-source ownership as well as ordinary full text.
  const ids = new Set([
    "nasa",
    "global-voices",
    ...(
      full.articles.find((a: any) => a.feedContexts?.length > 1)
        ?.feedContexts || []
    ).map((c: any) => c.sourceId),
  ]);
  for (const id of ids) {
    const source = index.sources.find((s: any) => s.id === id);
    if (!source) continue;
    const shard = await (await request.get("data/" + source.file)).json();
    const expected = full.articles.filter(
      (a: any) =>
        a.sourceId === id ||
        a.alsoIn?.includes(id) ||
        a.feedContexts?.some((c: any) => c.sourceId === id),
    );
    expect(shard.articles).toEqual(expected);
  }
});
test("archived Daily Editions retrieve stories from sources no longer followed", async ({
  page,
}) => {
  test.skip(
    process.env.FYLOGIA_PAGES_RUNTIME === "0",
    "Requires static Pages capability headers",
  );
  const full = await (await page.request.get("data/edition.json")).json();
  const article = full.articles.find(
    (a: any) => a.sourceId === "nasa" && a.full,
  );
  expect(article).toBeTruthy();
  await page.addInitScript(
    ({ prefs, article }) => {
      localStorage.setItem("folio.v1.preferences", JSON.stringify(prefs));
      localStorage.setItem(
        "folio.v1.dailyEditions",
        JSON.stringify([
          {
            id: "archived-source-regression",
            day: "2026-01-01",
            createdAt: "2026-01-01T12:00:00Z",
            region: "Worldwide",
            stories: [
              {
                id: article.id,
                title: article.title,
                source: article.source,
                section: "Space",
                full: true,
              },
            ],
          },
        ]),
      );
      // A linked device may initially hold only a saved story's bibliography.
      localStorage.setItem(
        "folio.v1.saved",
        JSON.stringify([
          { ...article, content: "", excerpt: "", image: undefined },
        ]),
      );
    },
    {
      prefs: {
        ...defaults,
        complete: true,
        interests: ["World News"],
        sourceIds: ["bbc-world"],
      },
      article,
    },
  );
  await page.goto("./");
  await page.locator(".daily-archive summary").click();
  await page.getByRole("button", { name: "2026-01-01 · 1 stories" }).click();
  await expect(
    page.getByRole("button", { name: "Start reading", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Start reading", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: article.title, exact: true }),
  ).toBeVisible();
  await expect(page.locator(".article-body")).not.toBeEmpty();
});
