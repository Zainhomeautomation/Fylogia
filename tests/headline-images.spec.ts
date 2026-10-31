import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { defaults, type Article } from "../src/catalog";

test.use({ serviceWorkers: "block" });

async function setup(page: Page) {
  const image = "https://images.example.test/headline-recovery-fixture.png";
  const articles: Article[] = Array.from({ length: 5 }, (_, i) => ({
    id: `original-headline-fixture-${i}`,
    url: `https://example.test/original-headline-fixture-${i}`,
    title: `Original headline photo test ${i + 1}`,
    source: "Original test publisher",
    sourceId: "original-photo-fixture",
    categories: ["Technology"],
    region: "Worldwide",
    published: new Date().toISOString(),
    excerpt: "Original test content; this transport fixture is not real news.",
    content: "<p>Original article for image recovery regression testing.</p>",
    full: false,
    image,
  }));
  await page.addInitScript(
    ({ articles, prefs }) => {
      localStorage.setItem("folio.v1.preferences", JSON.stringify(prefs));
      localStorage.setItem("folio.v1.saved", JSON.stringify(articles));
      localStorage.setItem(
        "folio.v1.progress",
        JSON.stringify({ [articles[0].id]: 0.5 }),
      );
    },
    {
      articles,
      prefs: {
        ...defaults,
        complete: true,
        theme: "navy",
        sourceIds: ["nasa"],
      },
    },
  );
  return { image, articles };
}
async function savedState(page: Page) {
  return page.evaluate(() =>
    ["preferences", "saved", "progress"].map((k) =>
      localStorage.getItem("folio.v1." + k),
    ),
  );
}

test("failed original headline photos recover on reconnection and Refresh without moving the layout or changing the library", async ({
  page,
}) => {
  const { image } = await setup(page);
  const bytes = await readFile("public/icons/icon-192.png");
  let available = false,
    requests = 0;
  await page.route(image, (route) => {
    requests++;
    return available
      ? route.fulfill({
          body: bytes,
          contentType: "image/png",
          headers: { "Cache-Control": "no-store" },
        })
      : route.fulfill({
          status: 503,
          body: "Original temporary-outage fixture",
          headers: { "Cache-Control": "no-store" },
        });
  });
  await page.goto("./saved");
  const lead = page.locator(".story.lead"),
    grid = page.locator(".story-grid .story").first();
  await expect(lead.locator(".type-art")).toBeVisible();
  await grid.scrollIntoViewIfNeeded();
  await expect(grid.locator(".type-art")).toBeVisible();
  const before = await savedState(page),
    headline = await grid.locator("h2").boundingBox();
  available = true;
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(grid.locator("img")).toBeVisible();
  await expect
    .poll(() =>
      grid
        .locator("img")
        .evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0),
    )
    .toBe(true);
  expect(await grid.locator("img").getAttribute("src")).toBe(image);
  const after = await grid.locator("h2").boundingBox();
  expect(Math.abs(after!.y - headline!.y)).toBeLessThan(2);
  await expect(lead.locator("img")).toHaveAttribute("fetchpriority", "high");
  await expect(lead.locator("img")).toHaveAttribute("decoding", "async");
  const recoveredRequests = requests;
  await page
    .getByRole("button", { name: "Refresh edition", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Refresh edition", exact: true }),
  ).toBeEnabled();
  await expect(grid.locator("img")).toBeVisible();
  expect(requests).toBe(recoveredRequests);
  expect(await savedState(page)).toEqual(before);
});

test("publisher-denied photos keep an honest fallback with bounded explicit retries", async ({
  page,
}) => {
  const { image } = await setup(page);
  let requests = 0;
  await page.route(image, (route) => {
    requests++;
    return route.fulfill({
      status: 403,
      body: "Original publisher-denial fixture",
      headers: { "Cache-Control": "no-store" },
    });
  });
  await page.goto("./saved");
  const lead = page.locator(".story.lead");
  await expect(lead.locator(".type-art")).toBeVisible();
  const before = requests;
  await page.waitForTimeout(400);
  expect(requests).toBe(before);
  await page
    .getByRole("button", { name: "Refresh edition", exact: true })
    .click();
  await expect.poll(() => requests).toBeGreaterThan(before);
  await expect(lead.locator(".type-art")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Refresh edition", exact: true }),
  ).toBeEnabled();
  const retried = requests;
  await page.waitForTimeout(400);
  expect(requests).toBe(retried);
  await expect(lead.locator("h2")).toHaveText("Original headline photo test 1");
});
