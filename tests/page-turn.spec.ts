import { test, expect } from "@playwright/test";

test("paper turns, facing pages, intact text and reduced motion", async ({
  page,
}, testInfo) => {
  const edition = await (await page.request.get("data/edition.json")).json();
  const article = edition.articles
    .filter((a: any) => a.full)
    .sort((a: any, b: any) => b.content.length - a.content.length)[0];
  await page.route("**/data/edition.json*", (route) =>
    route.fulfill({ json: { ...edition, articles: [article] } }),
  );
  await page.goto("./");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Create My Fylogia" }).click();
  await page.locator(".story-open").first().click();
  const body = page.locator(".reader-content .article-body").first();
  const text = await body.innerText();
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(page.locator(".turn-leaf")).toHaveAttribute(
    "aria-hidden",
    "true",
  );
  await expect(page.locator(".turn-leaf")).toHaveCount(0);
  await page.setViewportSize({ width: 820, height: 1100 });
  await expect(page.locator(".reader-content")).toHaveCSS("column-count", "2");
  expect(await body.innerText()).toBe(text);
  const clipped = await body.evaluate((element) => {
    const bounds = element.closest(".reader-viewport")!.getBoundingClientRect();
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const failures: string[] = [];
    while (walker.nextNode()) {
      if (!walker.currentNode.textContent?.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(walker.currentNode);
      if (
        [...range.getClientRects()].some(
          (rect) =>
            rect.height &&
            (rect.top < bounds.top - 2 || rect.bottom > bounds.bottom + 2),
        )
      )
        failures.push(walker.currentNode.textContent.slice(0, 40));
    }
    return failures;
  });
  expect(clipped).toEqual([]);
  if (process.env.FYLOGIA_SCREENSHOTS)
    await page.screenshot({
      path: `${process.env.FYLOGIA_SCREENSHOTS}/premium-unfolded-${testInfo.project.name}.png`,
    });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".reader-content")).toHaveCSS("column-count", "1");
  expect(await body.innerText()).toBe(text);
  if (process.env.FYLOGIA_SCREENSHOTS)
    await page.screenshot({
      path: `${process.env.FYLOGIA_SCREENSHOTS}/premium-folded-${testInfo.project.name}.png`,
    });
  const beforeSwipe = await page
    .locator(".reader-footer [role=status]")
    .innerText();
  await page.locator(".reader-viewport").dispatchEvent("touchstart", {
    touches: [{ identifier: 1, clientX: 320, clientY: 400 }],
  });
  await page.locator(".reader-viewport").dispatchEvent("touchend", {
    changedTouches: [{ identifier: 1, clientX: 80, clientY: 405 }],
  });
  await expect(page.locator(".reader-footer [role=status]")).not.toHaveText(
    beforeSwipe,
  );
  await expect(page.locator(".turn-leaf")).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(page.locator(".turn-leaf")).toHaveCount(0);
  await expect(page.locator(".reader-footer")).toContainText(/Page \d+ of/);
});
