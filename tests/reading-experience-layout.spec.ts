import { test, mockEdition } from "./edition-fixture";
import { expect, type Page } from "@playwright/test";
import { defaults } from "../src/catalog";

test.use({ storageState: { cookies: [], origins: [] } });

async function seed(page: Page, count = 16) {
  const edition = await (await page.request.get("data/edition.json")).json();
  await mockEdition(page, {
    ...edition,
    articles: Array.from({ length: count }, (_, index) => ({
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

test("rotation retains a story beyond the first scrolling batch and more stories remain available", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1194, height: 834 });
  await seed(page, 100);
  const surface = page.locator(".news-book > .news-feed-surface");
  const status = page.locator(".feed-pagination");
  for (let turn = 1; turn <= 38; turn++) {
    await page
      .getByRole("button", { name: "Next stories", exact: true })
      .click();
    await expect(status).toContainText(`Story ${turn * 2 + 1}–`);
  }
  await page.setViewportSize({ width: 834, height: 1194 });
  await expect(surface).toHaveClass(/scrolling-feed/);
  const active = surface.locator('[data-story-id="layout-76"]');
  await expect(active).toBeInViewport();
  await page.getByRole("button", { name: /Show more stories/ }).click();
  await expect(
    surface.locator(".news-feed-list > [data-story-id]"),
  ).toHaveCount(100);
});

test("opening a lower visible story keeps its selected position through history updates and reader rotation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 834, height: 1194 });
  await seed(page);
  const target = page.locator('.news-feed-list [data-story-id="layout-2"]');
  await target.evaluate((node) => {
    window.scrollBy({
      top: node.getBoundingClientRect().top - 300,
      behavior: "instant",
    });
  });
  await page.waitForTimeout(80);
  await target.locator(".story-open").click({ position: { x: 30, y: 30 } });
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.setViewportSize({ width: 1194, height: 834 });
  await page
    .getByRole("button", { name: "Back to previous section", exact: true })
    .click();
  const surface = page.locator(".news-book > .news-feed-surface");
  await expect(
    surface.locator(':scope > .feed-spread [data-story-id="layout-2"]'),
  ).toBeInViewport();
});

test("scrolling keeps card geometry stable and the bottom navigation leaves final story controls accessible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page);
  await page.evaluate(() => document.fonts.ready);
  const cards = page.locator(".news-feed-list .story");
  const heights = await cards.evaluateAll((nodes) =>
    nodes.map((node) => node.getBoundingClientRect().height),
  );
  await cards.nth(5).scrollIntoViewIfNeeded();
  await page.waitForTimeout(80);
  const after = await cards.evaluateAll((nodes) =>
    nodes.map((node) => node.getBoundingClientRect().height),
  );
  after.forEach((height, index) =>
    expect(Math.abs(height - heights[index])).toBeLessThan(1),
  );
  await cards.last().scrollIntoViewIfNeeded();
  await page.evaluate(() =>
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "instant",
    }),
  );
  const navigation = await page.locator(".bottom-nav").boundingBox();
  await expect
    .poll(
      async () =>
        (await cards.last().locator(".story-meta").boundingBox())!.y +
        (await cards.last().locator(".story-meta").boundingBox())!.height,
    )
    .toBeLessThanOrEqual(navigation!.y);
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
