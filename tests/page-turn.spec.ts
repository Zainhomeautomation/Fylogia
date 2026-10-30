import { mockEdition } from "./edition-fixture";
import { test, expect } from "@playwright/test";

test("paper turns, facing pages, intact text and reduced motion", async ({
  page,
}, testInfo) => {
  const edition = await (await page.request.get("data/edition.json")).json();
  const article = edition.articles
    .filter((a: any) => a.full)
    .sort((a: any, b: any) => b.content.length - a.content.length)[0];
  // Isolate text reflow from asynchronous publisher image sizing. Cached image
  // rendering is covered separately by the offline suite.
  article.image = undefined;
  article.content = article.content.replace(/<img[^>]*>/gi, "");
  await mockEdition(page, { ...edition, articles: [article] });
  await page.goto("./");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Create My Fylogia" }).click();
  await page.locator(".story-open").first().click();
  const body = page.locator(".reader-content .article-body").first();
  const text = await body.innerText();
  // Observe the transient surface in-page: a long licensed release article can
  // finish its animation before the test process gets its next browser reply.
  await page.evaluate(() => {
    (window as any).__paperWasHidden = false;
    const observer = new MutationObserver((records) => {
      for (const record of records)
        for (const node of record.addedNodes) {
          if (
            node instanceof HTMLElement &&
            node.classList.contains("turn-leaf")
          ) {
            (window as any).__paperWasHidden =
              node.getAttribute("aria-hidden") === "true" && node.inert;
            observer.disconnect();
          }
        }
    });
    observer.observe(document.querySelector(".reader-viewport")!, {
      childList: true,
    });
  });
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => (window as any).__paperWasHidden))
    .toBe(true);
  await expect(page.locator(".turn-leaf")).toHaveCount(0);
  const readingAnchor = await body.evaluateHandle((element) => {
    const bounds = element.closest(".reader-viewport")!.getBoundingClientRect();
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.textContent?.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      if (
        ![...range.getClientRects()].some(
          (r) => r.left >= bounds.left - 1 && r.left < bounds.right,
        )
      )
        continue;
      for (let i = 0; i < node.textContent.length; i++) {
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        const r = range.getBoundingClientRect();
        if (
          r.width &&
          r.left >= bounds.left - 1 &&
          r.left < bounds.right &&
          r.top >= bounds.top - 1
        )
          return range;
      }
    }
    throw new Error("No visible text anchor");
  });
  const anchorIsVisible = () =>
    readingAnchor.evaluate((range) => {
      const bounds = document
        .querySelector(".reader-viewport")!
        .getBoundingClientRect();
      const r = range.getBoundingClientRect();
      return (
        r.left >= bounds.left - 1 &&
        r.right <= bounds.right + 1 &&
        r.top >= bounds.top - 1 &&
        r.bottom <= bounds.bottom + 1
      );
    });
  await page.setViewportSize({ width: 820, height: 1100 });
  await expect(page.locator(".reader-content")).toHaveCSS("column-count", "2");
  expect(await body.innerText()).toBe(text);
  await expect.poll(anchorIsVisible).toBe(true);
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
  await expect.poll(anchorIsVisible).toBe(true);
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
  for (let turn = 0; turn < 2; turn++) {
    const before = await page
      .locator(".reader-footer [role=status]")
      .innerText();
    await page.keyboard.press("ArrowRight");
    await expect(page.locator(".reader-footer [role=status]")).not.toHaveText(
      before,
    );
  }
});
