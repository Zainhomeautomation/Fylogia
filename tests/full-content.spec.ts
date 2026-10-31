import { test, expect } from "@playwright/test";
test("licensed feed articles, read-here filter, immersive pagination and preview original link", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const edition = await (await page.request.get("data/edition.json")).json();
  const mit = edition.articles.find(
    (a: any) => a.sourceId === "mit-ai" && a.full,
  );
  const ha = edition.articles.find(
    (a: any) => a.sourceId === "homeassistant" && a.full,
  );
  const preview = edition.articles.find(
    (a: any) => a.sourceId === "bbc-science" && !a.full,
  );
  expect(mit).toBeTruthy();
  expect(ha).toBeTruthy();
  await page.goto("./");
  await expect(page).toHaveTitle(/Fylogia/);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Create My Fylogia" }).click();
  const menu = page.getByRole("button", {
    name: "Open navigation",
    exact: true,
  });
  await expect(page.locator(".mobile-header")).toBeAttached();
  if (await menu.isVisible()) await menu.click();
  await page
    .getByRole("navigation", { name: "Main navigation", exact: true })
    .getByRole("button", { name: "Explore", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Refresh edition", exact: true }),
  ).toBeEnabled({ timeout: 30000 });
  await page
    .getByRole("button", { name: "Full articles only", exact: true })
    .click();
  await expect(page.locator(".story").first()).toBeVisible();
  await expect(page.locator(".story .content-label.preview")).toHaveCount(0);
  await page
    .getByRole("textbox", { name: "Search stories", exact: true })
    .fill(mit.title);
  await page.locator(".story-open").filter({ hasText: mit.title }).click();
  await expect(page.locator(".article-body")).toContainText(mit.author);
  await expect(page.locator(".article-body")).toContainText(
    "Reprinted with permission of",
  );
  const before = await page.locator(".article-body").innerText();
  await page.getByRole("button", { name: "Enter immersive reading" }).click();
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(page.locator(".turn-leaf")).toHaveCount(0);
  expect(await page.locator(".article-body").innerText()).toBe(before);
  await page.setViewportSize({ width: 820, height: 1100 });
  await expect(page.locator(".reader-content")).toHaveCSS("column-count", "2");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".reader-content")).toHaveCSS("column-count", "1");
  await page.getByRole("button", { name: "Back to previous section" }).click();
  await expect(
    page.getByRole("button", { name: "Full articles only", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Full articles only", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Search stories", exact: true })
    .fill(preview.title);
  await page.locator(".story-open").filter({ hasText: preview.title }).click();
  if (preview.image) {
    // Exercise image-failure recovery independently of service-worker/CDN caches.
    await page.locator(".reader-content > figure img").dispatchEvent("error");
    await expect(page.locator(".reader-content > figure")).not.toBeVisible();
  }
  await expect(page.locator(".preview-note a")).toHaveAttribute(
    "href",
    preview.url,
  );
  await expect(page.locator(".preview-note")).toContainText(
    "Continue reading at the original publisher",
  );
  if (process.env.FYLOGIA_SCREENSHOTS)
    await page.screenshot({
      path: `${process.env.FYLOGIA_SCREENSHOTS}/full-content-preview-${info.project.name}.png`,
    });
  expect(errors).toEqual([]);
});
