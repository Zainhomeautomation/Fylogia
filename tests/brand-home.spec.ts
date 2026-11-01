import { test, expect, type Page } from "@playwright/test";
import { defaults } from "../src/catalog";
import { magazineFixture } from "./pdf-fixture";
const label = "Fylogia — Go to homepage";
async function nav(page: Page, section: string) {
  const menu = page.getByRole("button", {
    name: "Open navigation",
    exact: true,
  });
  if (await menu.isVisible()) await menu.click();
  await page
    .getByRole("navigation", { name: "Main navigation", exact: true })
    .getByRole("button", { name: section, exact: true })
    .click();
}
async function sidebarBrand(page: Page) {
  const menu = page.getByRole("button", {
    name: "Open navigation",
    exact: true,
  });
  if (await menu.isVisible()) await menu.click();
  return page
    .locator(".sidebar")
    .getByRole("button", { name: label, exact: true });
}
async function snapshot(page: Page) {
  return page.evaluate(() =>
    Object.fromEntries(
      ["preferences", "saved", "progress", "magazineReading"].map((k) => [
        k,
        localStorage.getItem("folio.v1." + k),
      ]),
    ),
  );
}
test.beforeEach(async ({ page }) => {
  const e = await (await page.request.get("data/edition.json")).json();
  const article = e.articles.find((a: any) => a.full && a.sourceId === "nasa");
  expect(article).toBeTruthy();
  await page.addInitScript(
    ({ prefs, article }) => {
      if (!localStorage.getItem("folio.v1.preferences"))
        for (const [key, value] of Object.entries({
          preferences: prefs,
          saved: [article],
          progress: { [article.id]: 0.25 },
          magazineReading: { "nasa-spinoff-2025": { page: 3, bookmark: 3 } },
        }))
          localStorage.setItem("folio.v1." + key, JSON.stringify(value));
    },
    {
      prefs: {
        ...defaults,
        complete: true,
        interests: ["Space", "World News"],
        sourceIds: ["nasa", "bbc-world"],
      },
      article,
    },
  );
  await page.goto("./");
});
test("one logo/name target returns from every sidebar section without reload or library changes", async ({
  page,
}) => {
  let documents = 0;
  page.on("request", (r) => {
    if (r.isNavigationRequest() && r.resourceType() === "document") documents++;
  });
  const before = await snapshot(page);
  for (const section of [
    "Settings",
    "Categories",
    "Local News",
    "Regional News",
    "World News",
    "Latest News",
    "Explore",
    "My Sources",
    "Saved Articles",
    "Offline Library",
    "Magazines",
    "History",
  ]) {
    await nav(page, section);
    const brand = await sidebarBrand(page);
    await expect(brand).toHaveAttribute("title", label);
    const bounds = await brand.boundingBox();
    expect(bounds!.height).toBeGreaterThanOrEqual(44);
    // Both the actual icon and the wordmark belong to that same native control.
    await brand
      .locator(
        section === "Categories" ? ".brand-mark img:visible" : ".wordmark",
      )
      .click();
    await expect(
      page.getByRole("heading", { name: "Your daily perspective." }),
    ).toBeVisible();
    await expect(page.locator(".sidebar")).not.toHaveClass(/open/);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    expect(await snapshot(page)).toEqual(before);
  }
  expect(documents).toBe(0);
});
test("keyboard activation, homepage top and mobile-header logo use the same Home action", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1180, height: 600 });
  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight),
  );
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(0);
  const brand = await sidebarBrand(page);
  await brand.focus();
  await page.keyboard.press("Enter");
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await nav(page, "Settings");
  const again = await sidebarBrand(page);
  await again.focus();
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("heading", { name: "Your daily perspective." }),
  ).toBeVisible();
  for (const width of [320, 390, 760, 820, 1194, 1440]) {
    await page.setViewportSize({ width, height: 850 });
    await nav(page, "Categories");
    const target =
      width <= 760
        ? page
            .locator(".mobile-header")
            .getByRole("button", { name: label, exact: true })
        : await sidebarBrand(page);
    const b = await target.boundingBox();
    expect(b!.x).toBeGreaterThanOrEqual(0);
    expect(b!.x + b!.width).toBeLessThanOrEqual(width + 1);
    await target.click();
    await expect(
      page.getByRole("heading", { name: "Your daily perspective." }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width + 1);
  }
});
test("article, Daily Magazine and PDF brand controls close readers and preserve bookmarks/progress", async ({
  page,
}) => {
  const before = await snapshot(page);
  await nav(page, "Saved Articles");
  await page.locator(".story-open").first().click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: label, exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your daily perspective." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Open Today's Fylogia", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: label, exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your daily perspective." }),
  ).toBeVisible();
  await nav(page, "Magazines");
  await page.locator("input[type=file]").setInputFiles({
    name: "Home navigation.pdf",
    mimeType: "application/pdf",
    buffer: magazineFixture(),
  });
  await page.getByRole("button", { name: /Home navigation/ }).click();
  await expect(
    page.locator(".pdf-page canvas[aria-busy=false]").first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Bookmark page", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: label, exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your daily perspective." }),
  ).toBeVisible();
  const after = await snapshot(page);
  expect(after.preferences).toBe(before.preferences);
  expect(after.saved).toBe(before.saved);
  expect(after.magazineReading).toBe(before.magazineReading);
  expect(
    Object.values(JSON.parse(after.progress!)).every((p) => Number(p) > 0),
  ).toBe(true);
});
