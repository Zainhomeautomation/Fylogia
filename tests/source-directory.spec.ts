import { test, mockEdition } from "./edition-fixture";
import { expect, type Page } from "@playwright/test";
async function nav(page: Page) {
  // Reload restores IndexedDB before rendering the responsive navigation.
  await expect(page.locator(".mobile-header")).toBeAttached();
  if (await page.getByRole("button", { name: "Open navigation" }).isVisible())
    await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("navigation", { name: "Main navigation", exact: true })
    .getByRole("button", { name: "My Sources", exact: true })
    .click();
}
test("expanded source directory searches, filters and preserves follows on mobile and desktop", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Create My Fylogia" }).click();
  await expect(page.locator(".story").first()).toBeVisible();
  await nav(page);
  await expect(page.locator(".source-row")).toHaveCount(30);
  await page.getByRole("button", { name: "Show 30 more" }).click();
  await expect(page.locator(".source-row")).toHaveCount(60);
  await page
    .getByRole("textbox", { name: "Search sources" })
    .fill("Raspberry Pi");
  const row = page.locator(".source-row");
  await expect(row).toHaveCount(1);
  await expect(row).toContainText("Raspberry Pi News");
  await row.getByRole("button", { name: "Follow", exact: true }).click();
  await expect(
    row.getByRole("button", { name: "Following", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await nav(page);
  await page
    .getByRole("textbox", { name: "Search sources" })
    .fill("Raspberry Pi");
  await expect(
    row.getByRole("button", { name: "Following", exact: true }),
  ).toBeVisible();
  await row.getByRole("button", { name: "Following", exact: true }).click();
  await expect(
    row.getByRole("button", { name: "Follow", exact: true }),
  ).toBeVisible();
  await page.getByRole("textbox", { name: "Search sources" }).fill("");
  await page
    .getByLabel("Source content", { exact: true })
    .selectOption("Full text capable");
  await expect(row).toHaveCount(9);
  await expect(row.filter({ hasText: "Open Source Initiative" })).toContainText(
    "Full text where authorized",
  );
  await expect(row.filter({ hasText: "EFF" })).toContainText(
    "Full text where authorized",
  );
  await page
    .getByLabel("Source content", { exact: true })
    .selectOption("All content");
  await page
    .getByLabel("Source region", { exact: true })
    .selectOption("Middle East");
  await expect(row.first()).toBeVisible();
  for (const text of await row.allTextContents())
    expect(text).toContain("Middle East");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page
    .getByLabel("Source region", { exact: true })
    .selectOption("All regions");
  await page
    .locator(".source-directory-tools")
    .getByRole("button", { name: "Recommended", exact: true })
    .click();
  await expect(row.first()).toContainText("Recommended for your interests");
  expect(await row.count()).toBeLessThanOrEqual(20);
});

test("merged stories remain visible to readers following the alternate feed", async ({
  page,
}) => {
  const edition = await (await page.request.get("data/edition.json")).json();
  const original = edition.articles.find((a: any) => a.full);
  const article = {
    ...original,
    title: "Source provenance regression fixture",
    sourceId: "nasa",
    region: "United States",
    categories: ["World News", "Technology"],
    feedContexts: [
      { sourceId: "nasa", region: "United States", categories: ["World News"] },
      {
        sourceId: "nasa-science",
        region: "Worldwide",
        categories: ["Technology"],
      },
    ],
    alsoIn: ["nasa-science"],
    duplicateCount: 2,
  };
  await mockEdition(page, { ...edition, articles: [article] });
  await page.addInitScript(() =>
    localStorage.setItem(
      "folio.v1.preferences",
      JSON.stringify({
        complete: true,
        interests: ["Space"],
        topics: [],
        region: "Europe",
        sourceIds: ["nasa-science"],
        customSources: [],
        theme: "navy",
        reading: "pages",
        fontSize: 19,
        converter: false,
      }),
    ),
  );
  await page.goto("./");
  await expect(page.locator(".story")).toHaveCount(1);
  await expect(page.locator(".story")).toContainText(article.title);
  await expect(page.locator(".story")).toContainText("2 feed entries combined");
  await page.locator(".story-open").click();
  await expect(page.getByRole("dialog")).toBeVisible();
});
