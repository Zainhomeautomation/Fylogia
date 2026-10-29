import { test, expect } from "@playwright/test";

test("editorial cover, readable preview, immersive controls and advanced settings", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const edition = await (await page.request.get("data/edition.json")).json();
  const preview = edition.articles.find(
    (a: any) => !a.full && a.sourceId === "bbc-science",
  );
  expect(preview).toBeTruthy();
  await page.route("**/data/edition.json*", (r) =>
    r.fulfill({
      json: {
        ...edition,
        articles: [preview, { ...preview, id: preview.id + "#second" }],
      },
    }),
  );
  await page.goto("./");
  await expect(page).toHaveTitle(/Fylogia/);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Create My Fylogia" }).click();
  await expect(page.locator(".daily-edition")).toContainText(
    "A little time. A wider world.",
  );
  await expect(page.locator(".content-label").first()).toHaveText(
    "Publisher preview",
  );
  if (process.env.FYLOGIA_SCREENSHOTS)
    await page.screenshot({
      path: `${process.env.FYLOGIA_SCREENSHOTS}/editorial-${testInfo.project.name}.png`,
      fullPage: false,
    });
  const initialSize = page.viewportSize()!;
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".story:not(.lead) h2").first()).toHaveCSS(
    "grid-column-start",
    "2",
  );
  await page.setViewportSize(initialSize);
  await page.locator(".story-open").first().click();
  await page.setViewportSize({ width: 1100, height: 1000 });
  await expect(page.locator(".reader-content")).toHaveCSS("column-count", "1");
  await expect(page.locator(".preview-note")).toContainText(
    "Publisher preview",
  );
  const before = await page.locator(".reader-viewport").boundingBox();
  await page.getByRole("button", { name: "Enter immersive reading" }).click();
  await expect(page.locator(".reader-download-strip")).not.toBeVisible();
  await expect
    .poll(
      async () =>
        (await page.locator(".reader-viewport").boundingBox())!.height,
    )
    .toBeGreaterThan(before!.height);
  await page.getByRole("button", { name: "Exit immersive reading" }).click();
  await page.getByRole("button", { name: "Back to previous section" }).click();
  if (
    await page
      .getByRole("button", { name: "Open navigation", exact: true })
      .isVisible()
  )
    await page
      .getByRole("button", { name: "Open navigation", exact: true })
      .click();
  await page
    .getByRole("navigation", { name: "Main navigation", exact: true })
    .getByRole("button", { name: "Settings", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Export library", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Backup password", { exact: true }),
  ).not.toBeVisible();
  await page.getByText("Advanced settings", { exact: true }).click();
  await expect(
    page.getByLabel("Backup password", { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
