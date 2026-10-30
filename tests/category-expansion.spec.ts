import { test, expect, type Page } from "@playwright/test";
async function nav(page: Page, name: string) {
  const menu = page.getByRole("button", {
    name: "Open navigation",
    exact: true,
  });
  if (await menu.isVisible()) await menu.click();
  await page
    .getByRole("navigation", { name: "Main navigation", exact: true })
    .getByRole("button", { name, exact: true })
    .click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
}
async function start(page: Page) {
  await page.goto("./");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Create My Fylogia" }).click();
}
test("fashion categories search, follow and navigate to real publisher stories without changing selected sources", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await start(page);
  const before = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("folio.v1.preferences")!),
  );
  await nav(page, "Categories");
  await page.getByLabel("Find a category", { exact: true }).fill("fashion");
  await expect(page.locator(".category-tile")).toHaveCount(2);
  await page
    .getByLabel("Find a category", { exact: true })
    .fill("MEN'S FASHION");
  await expect(page.locator(".category-tile")).toHaveCount(2);
  await page.getByLabel("Find a category", { exact: true }).fill("fashion");
  const men = page.locator(".category-tile").filter({
    has: page.getByRole("heading", { name: "Men’s Fashion", exact: true }),
  });
  await men
    .getByRole("button", { name: "Follow interest", exact: true })
    .click();
  await expect(
    men.getByRole("button", { name: "Unfollow interest", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Categories", exact: true }),
  ).toBeVisible();
  const after = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("folio.v1.preferences")!),
  );
  expect(after.interests).toContain("Men’s Fashion");
  expect(after.sourceIds).toEqual(before.sourceIds);
  expect(after.theme).toBe(before.theme);
  await page
    .locator(".category-grid button")
    .filter({
      has: page.getByRole("heading", { name: "Women’s Fashion", exact: true }),
    })
    .click();
  await expect(
    page.getByRole("button", { name: "Women’s Fashion", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".story-open").first()).toBeVisible();
  await page.locator(".story-open").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("button", { name: "Back to previous section", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Women’s Fashion", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(errors).toEqual([]);
});
test("category-linked magazine directory distinguishes real issues from fashion previews", async ({
  page,
}) => {
  await start(page);
  await nav(page, "Categories");
  await page
    .locator(".category-tile")
    .filter({
      has: page.getByRole("heading", { name: "Men’s Fashion", exact: true }),
    })
    .getByRole("button", { name: "Magazines & publications", exact: true })
    .click();
  await expect(
    page.getByLabel("Magazine category", { exact: true }),
  ).toHaveValue("Men’s Fashion");
  await expect(page.locator(".magazine-grid .magazine")).toHaveCount(0);
  const gq = page.locator('[data-publication-id="gq"]');
  await expect(gq).toContainText("Publisher previews");
  await expect(
    gq.getByRole("link", { name: "Official publication" }),
  ).toHaveAttribute("href", "https://www.gq.com");
  await gq.getByRole("button", { name: "Browse articles" }).click();
  await expect(
    page.getByPlaceholder("Search stories, sources, ideas…"),
  ).toHaveValue("GQ");
  await expect(page.locator(".story-open").first()).toBeVisible();
  await nav(page, "Magazines");
  await page
    .getByLabel("Find a publication", { exact: true })
    .fill("HackSpace");
  await expect(page.locator('[data-magazine-id="hackspace-75"]')).toContainText(
    "February 2024 · Issue 75",
  );
  await expect
    .poll(() =>
      page
        .locator('[data-magazine-id="hackspace-75"] img')
        .evaluate((image: HTMLImageElement) => image.naturalWidth),
    )
    .toBeGreaterThan(0);
  await expect(page.locator('[data-magazine-id="hackspace-75"]')).toContainText(
    "CC BY-NC-SA 3.0",
  );
});
test("new categories and publication filters remain usable across folded and unfolded widths", async ({
  page,
}, info) => {
  await start(page);
  await nav(page, "Categories");
  for (const width of [390, 820, 1194, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(
      page.getByLabel("Find a category", { exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
  await page.getByLabel("Find a category", { exact: true }).fill("gardening");
  await expect(page.locator(".category-tile")).toHaveCount(1);
  await expect(page.locator(".category-tile")).toContainText("Home & Garden");
  if (process.env.FYLOGIA_SCREENSHOTS)
    await page.screenshot({
      path: `${process.env.FYLOGIA_SCREENSHOTS}/categories-${info.project.name}.png`,
      fullPage: false,
    });
});
