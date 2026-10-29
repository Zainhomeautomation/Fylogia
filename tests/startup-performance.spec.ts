import { test, expect } from "@playwright/test";
import { defaults } from "../src/catalog";
test("a saved light appearance applies before application JavaScript is available", async ({
  page,
}) => {
  await page.addInitScript(
    (p) => localStorage.setItem("folio.v1.preferences", JSON.stringify(p)),
    { ...defaults, theme: "light", complete: true },
  );
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/assets/*.js", async (r) => {
    await gate;
    await r.continue();
  });
  const navigation = page.goto("./", { waitUntil: "domcontentloaded" });
  try {
    await page.locator('link[rel="canonical"]').waitFor({ state: "attached" });
    expect(await page.locator("html").getAttribute("data-theme")).toBe("light");
    expect(
      await page.locator('meta[name="theme-color"]').getAttribute("content"),
    ).toBe("#f8f6ef");
  } finally {
    release();
    await navigation;
  }
  await expect(page.locator(".mobile-header")).toBeAttached();
});
test("onboarding keeps feed parsing and news loading off the first-interests critical path", async ({
  page,
}) => {
  const news: string[] = [],
    parser: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/data/edition.json")) news.push(r.url());
    if (/\/assets\/feeds-/.test(r.url())) parser.push(r.url());
  });
  await page.goto("./");
  await expect(
    page.getByRole("heading", { name: "What draws you in?" }),
  ).toBeVisible();
  expect(news).toEqual([]);
  expect(parser).toEqual([]);
  const response = page.waitForResponse(
    (r) =>
      r.request().method() === "GET" &&
      (r.url().includes("/data/edition.json") ||
        r.url().includes("/data/source-index.json")) &&
      r.ok(),
  );
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await response;
  expect(news.length).toBeGreaterThan(0);
  expect(parser).toEqual([]);
});
test("the editorial font is self-hosted and remains available offline", async ({
  page,
  context,
}) => {
  await page.goto("./");
  await page.evaluate(async () => {
    await document.fonts.ready;
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  const font = await page.evaluate(async () => {
    const url =
      location.origin +
      new URL(document.querySelector<HTMLLinkElement>('link[as="font"]')!.href)
        .pathname;
    const hit = await caches.match(url);
    return {
      cached: !!hit,
      loaded: document.fonts.check('600 16px "DM Sans"'),
    };
  });
  expect(font).toEqual({ cached: true, loaded: true });
  await context.setOffline(true);
  await page.reload();
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(() => document.fonts.check('600 16px "DM Sans"')),
  ).toBe(true);
  await expect(
    page.getByRole("heading", { name: "What draws you in?" }),
  ).toBeVisible();
});
