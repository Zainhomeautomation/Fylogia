import { test, mockEdition } from "./edition-fixture";
import { expect, type Page } from "@playwright/test";
import { defaults } from "../src/catalog";

test.use({ storageState: { cookies: [], origins: [] } });

async function seed(page: Page) {
  const edition = await (await page.request.get("data/edition.json")).json();
  await mockEdition(page, {
    ...edition,
    articles: Array.from({ length: 16 }, (_, index) => ({
      id: `layout-${index}`,
      title: `Layout story ${index + 1}: a readable headline for every screen`,
      sourceId: "nasa",
      source: "NASA",
      url: `https://example.test/layout/${index}`,
      categories: ["Technology"],
      region: "Worldwide",
      published: new Date(Date.now() - index * 60_000).toISOString(),
      excerpt: "A concise publisher preview used to check responsive reading.",
      content: "<p>Fixture article copy for layout verification.</p>",
      full: false,
    })),
  });
  await page.addInitScript(
    (preferences) => {
      localStorage.setItem("folio.v1.preferences", JSON.stringify(preferences));
    },
    {
      ...defaults,
      complete: true,
      interests: ["Technology"],
      sourceIds: ["nasa"],
    },
  );
  await page.goto("./");
  await expect(page.locator(".news-book")).toBeVisible();
  await expect(page.locator(".news-book > .news-feed-surface")).toBeVisible();
}

test("automatic portrait scrolling and wide page mode retain the story anchor on resize", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page);
  const surface = page.locator(".news-book > .news-feed-surface");
  await expect(surface).toHaveClass(/scrolling-feed/);
  await expect(page.locator(".news-feed-list > [data-story-id]")).toHaveCount(
    16,
  );
  await expect(surface.locator(".feed-edge")).toHaveCount(0);
  await expect(
    page.locator(".feed-view-switch button[aria-pressed=true]"),
  ).toHaveText("Automatic");
  await page
    .locator('.news-feed-list [data-story-id="layout-8"]')
    .scrollIntoViewIfNeeded();
  await page.waitForTimeout(80);

  await page.setViewportSize({ width: 844, height: 390 });
  await expect(surface).not.toHaveClass(/scrolling-feed/);
  await expect(surface).toHaveAttribute("data-paper-spread", "2");
  await expect(surface.locator('[data-story-id="layout-8"]')).toHaveCount(1);
  await expect(surface.locator('[data-story-id="layout-8"]')).toBeInViewport();

  await page.setViewportSize({ width: 1024, height: 1366 });
  await expect(surface).toHaveClass(/scrolling-feed/);
  await expect(page.locator(".news-feed-list > [data-story-id]")).toHaveCount(
    16,
  );
  await expect(
    page.locator('.news-feed-list [data-story-id="layout-8"]'),
  ).toBeInViewport();
});

test("near-square unfolded-sized viewport gets a facing spread while narrow folded view scrolls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 412, height: 915 });
  await seed(page);
  const surface = page.locator(".news-book > .news-feed-surface");
  await expect(surface).toHaveClass(/scrolling-feed/);
  for (const viewport of [
    { width: 915, height: 412 },
    { width: 850, height: 900 },
    { width: 900, height: 850 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(surface).not.toHaveClass(/scrolling-feed/);
    await expect(surface).toHaveAttribute("data-paper-spread", "2");
    const bounds = await surface.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
  }
  await page.setViewportSize({ width: 412, height: 915 });
  await expect(surface).toHaveClass(/scrolling-feed/);
});

test("navigation is a full-screen overlay on desktop and mobile and closes by outside tap or Escape", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await seed(page);
  const sidebar = page.locator("#main-navigation");
  const main = page.locator("main");
  const before = await main.boundingBox();
  await expect(sidebar).toHaveAttribute("aria-hidden", "true");
  await expect(sidebar).toHaveAttribute("inert", "");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(sidebar).toHaveClass(/open/);
  await expect(sidebar).toBeVisible();
  expect((await main.boundingBox())?.width).toBe(before?.width);
  await page.getByRole("button", { name: "Close navigation overlay" }).click();
  await expect(sidebar).toHaveAttribute("aria-hidden", "true");

  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.keyboard.press("Escape");
  await expect(sidebar).toHaveAttribute("aria-hidden", "true");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(sidebar).toBeVisible();
  await page
    .getByRole("button", { name: "Close navigation", exact: true })
    .click();
  await expect(sidebar).toHaveAttribute("aria-hidden", "true");
});

test("paper stays warm cream with readable ink across light and dark themes", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1194, height: 834 });
  await seed(page);
  const sheet = page.locator(".news-book > .news-feed-surface");
  const bounds = await sheet.boundingBox();
  expect(bounds!.y).toBeLessThan(834 / 2);
  for (const theme of ["navy", "dark", "light"]) {
    await page.evaluate((value) => {
      document.documentElement.dataset.theme = value;
    }, theme);
    const colors = await sheet.evaluate((node) => ({
      background: getComputedStyle(node).backgroundColor,
      color: getComputedStyle(node).color,
    }));
    expect(colors.background).toBe("rgb(247, 242, 227)");
    expect(colors.color).toBe("rgb(32, 37, 31)");
    await expect(sheet.locator(".type-art").first()).toHaveCSS(
      "background-color",
      "rgb(232, 229, 214)",
    );
  }
});
