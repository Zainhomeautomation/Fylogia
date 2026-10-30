import { test, mockEdition, restoreEdition } from "./edition-fixture";
import { expect, type Page } from "@playwright/test";
import type { Edition } from "../src/catalog";
async function nav(page: Page, label: string) {
  // IndexedDB restoration may finish after the document load event.
  await expect(page.locator(".mobile-header")).toBeAttached();
  if (await page.getByRole("button", { name: "Open navigation" }).isVisible())
    await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("navigation", { name: "Main navigation", exact: true })
    .getByRole("button", { name: label, exact: true })
    .click();
}
async function onboard(page: Page) {
  await page.goto("./");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Create My Fylogia" }).click();
  await expect(page.locator(".story").first()).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
}
async function fixture(page: Page, images = false) {
  const edition: Edition = await (
    await page.request.get("data/edition.json")
  ).json();
  const articles = edition.articles
    .filter((a) => a.full && a.offlineImagesAllowed && a.image)
    .sort((a, b) => b.content.length - a.content.length)
    .slice(0, 6)
    .map((a) => ({ ...a, offlineImagesAllowed: images }));
  expect(articles.length).toBeGreaterThan(1);
  const state = { edition: { ...edition, articles }, original: edition };
  await mockEdition(page, state.edition);
  return state;
}
async function downloadFirst(page: Page) {
  await page
    .locator(".story")
    .first()
    .getByRole("button", { name: /^Download offline / })
    .click();
  await expect(page.locator(".download-notice")).toContainText(
    "1 article downloaded.",
    { timeout: 60000 },
  );
}

test("downloaded article and permitted opaque image survive offline relaunch, page turns, folding, bookmark and progress", async ({
  page,
  context,
}) => {
  test.setTimeout(120000);
  const state = await fixture(page, true);
  const article = state.edition.articles[0];
  state.edition.articles = [article];
  await mockEdition(page, state.edition);
  // Use the real publisher's photo, with CORS deliberately absent to exercise
  // Cache Storage's opaque-image path rather than inventing production imagery.
  const image = await page.request.get(article.image!);
  expect(image.ok()).toBeTruthy();
  const bytes = await image.body();
  await page.route(article.image!, (route) =>
    route.fulfill({
      body: bytes,
      contentType: image.headers()["content-type"] || "image/jpeg",
    }),
  );
  await onboard(page);
  await downloadFirst(page);
  await nav(page, "Offline Library");
  await expect(page.locator(".offline-row")).toHaveCount(1);
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const cache = await caches.open("fyllora-offline-images-v1");
        return (await cache.keys()).length;
      }),
    )
    .toBeGreaterThan(0);
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Offline Library", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".edition-bar")).toContainText("Offline");
  await nav(page, "Offline Library");
  await page
    .getByRole("button", { name: `Open downloaded ${article.title}` })
    .click();
  await expect(page.locator(".reader-content h1")).toHaveText(article.title);
  await expect
    .poll(
      () =>
        page
          .locator(".reader-content figure img")
          .first()
          .evaluate(
            (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
          ),
      { timeout: 15000 },
    )
    .toBeTruthy();
  if (process.env.FYLOGIA_SCREENSHOTS)
    await page.screenshot({
      animations: "disabled",
      scale: "css",
      path:
        process.env.FYLOGIA_SCREENSHOTS +
        "/" +
        test.info().project.name +
        "-offline-article.png",
    });
  await page.getByRole("button", { name: "Save article", exact: true }).click();
  await page
    .getByRole("button", { name: "Drag or tap to turn forward", exact: true })
    .click();
  await expect(page.locator(".reader-footer")).toContainText(
    /(?:Page|Spread) 2 of/,
  );
  const position = await page
    .locator(".reader-footer [role=status]")
    .innerText();
  await page.getByRole("button", { name: "Back to previous section" }).click();
  await page.reload();
  await nav(page, "Offline Library");
  await expect(page.locator(".offline-row")).toContainText("Bookmarked");
  await page
    .getByRole("button", { name: `Open downloaded ${article.title}` })
    .click();
  await expect(page.locator(".reader-footer [role=status]")).toHaveText(
    position,
  );
  await page.setViewportSize({ width: 360, height: 740 });
  await expect(page.locator(".reader-content")).toHaveCSS("column-count", "1");
  await page.setViewportSize({ width: 1200, height: 900 });
  await expect(page.locator(".reader-content")).toHaveCSS("column-count", "2");
  if (process.env.FYLOGIA_SCREENSHOTS)
    await page.screenshot({
      animations: "disabled",
      scale: "css",
      path:
        process.env.FYLOGIA_SCREENSHOTS +
        "/" +
        test.info().project.name +
        "-offline-reading.png",
    });
  await page.getByRole("button", { name: "Back to previous section" }).click();
  await page.evaluate(() => caches.delete("fyllora-offline-images-v1"));
  await page.reload();
  await nav(page, "Offline Library");
  await expect(page.locator(".offline-row")).toContainText(
    "some images missing",
  );
  await restoreEdition(page);
  const onlineEdition = page.waitForResponse(
    (response) =>
      response.request().method() === "GET" &&
      (response.url().includes("/data/edition.json") ||
        response.url().includes("/data/source-files/")) &&
      response.ok(),
  );
  await context.setOffline(false);
  const response = await onlineEdition;
  expect((await response.json()).articles.length).toBeGreaterThan(1);
  await nav(page, "For You");
  await expect(page.locator(".edition-bar")).not.toContainText("Offline");
  const another = state.original.articles.find(
    (a) => a.full && a.id !== article.id,
  )!;
  await page
    .getByRole("textbox", { name: "Search stories", exact: true })
    .fill(another.title);
  await expect(
    page.getByRole("heading", { name: another.title, exact: true }),
  ).toBeVisible();
});

test("multi-select and daily edition download, deletion preserves bookmarks and frees referenced images", async ({
  page,
}) => {
  const state = await fixture(page);
  await onboard(page);
  await page
    .getByRole("button", { name: "Select stories", exact: true })
    .click();
  await page.locator(".story-select input").nth(0).check();
  await page.locator(".story-select input").nth(1).check();
  await page.getByRole("button", { name: "Download selected (2)" }).click();
  await expect(page.locator(".download-notice")).toContainText(
    "2 articles downloaded.",
  );
  await page.getByRole("button", { name: /Download Daily Edition/ }).click();
  await expect(page.locator(".download-notice")).toContainText(
    `${state.edition.articles.length} articles downloaded.`,
  );
  await nav(page, "Offline Library");
  await expect(page.locator(".offline-row")).toHaveCount(
    state.edition.articles.length,
  );
  const article = state.edition.articles[0];
  await page
    .getByRole("button", { name: `Open downloaded ${article.title}` })
    .click();
  await page.getByRole("button", { name: "Save article", exact: true }).click();
  await page.getByRole("button", { name: "Back to previous section" }).click();
  await page
    .getByRole("button", { name: `Delete download ${article.title}` })
    .click();
  await expect(page.locator(".offline-row")).toHaveCount(
    state.edition.articles.length - 1,
  );
  await nav(page, "Saved Articles");
  await expect(
    page.getByRole("heading", { name: article.title, exact: true }),
  ).toBeVisible();
});

test("unverified publisher images are excluded and low storage fails safely", async ({
  page,
  context,
}) => {
  await fixture(page);
  await onboard(page);
  await downloadFirst(page);
  const downloadedTitle = await page.locator(".story h2").first().innerText();
  await nav(page, "Offline Library");
  await expect(page.locator(".offline-row")).toContainText(
    "other images excluded",
  );
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const cache = await caches.open("fyllora-offline-images-v1");
        return (await cache.keys()).length;
      }),
    )
    .toBe(0);
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value: any, ...args: any[]) {
      if (value?.article)
        throw new DOMException("Simulated browser quota", "QuotaExceededError");
      return original.call(this, value, ...(args as [IDBValidKey]));
    };
  });
  await nav(page, "For You");
  await page
    .locator(".story")
    .nth(1)
    .getByRole("button", { name: /^Download offline / })
    .click();
  await expect(page.locator(".download-notice")).toContainText(
    "Storage is full",
  );
  await context.setOffline(true);
  await page.reload();
  await nav(page, "Offline Library");
  await expect(page.locator(".offline-row")).toHaveCount(1);
  await page
    .getByRole("button", {
      name: `Open downloaded ${downloadedTitle}`,
    })
    .click();
  await expect(page.locator(".article-body")).not.toBeEmpty();
});

test("browser eviction is detected without deleting bookmarks", async ({
  page,
}) => {
  await fixture(page);
  await onboard(page);
  await downloadFirst(page);
  const savedTitle = await page.locator(".story h2").first().innerText();
  await page
    .locator(".story")
    .first()
    .getByRole("button", { name: /^Save / })
    .click();
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase("fyllora-offline");
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
  );
  await page.reload();
  await expect(page.locator(".download-notice")).toContainText(
    "browser removed some downloads",
  );
  await nav(page, "Offline Library");
  await expect(page.locator(".offline-row")).toHaveCount(0);
  await nav(page, "Saved Articles");
  await expect(
    page.getByRole("heading", {
      name: savedTitle,
      exact: true,
    }),
  ).toBeVisible();
});

test("download failures remain visible inside article and Daily Magazine readers without blocking page turns", async ({
  page,
}) => {
  const state = await fixture(page);
  await onboard(page);
  // A refreshed edition may rank a short story first; this case needs pages.
  await page
    .getByRole("textbox", { name: "Search stories", exact: true })
    .fill(state.edition.articles[0].title);
  await expect(page.locator(".story-open")).toHaveCount(1);
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value: any, ...args: any[]) {
      if (value?.article)
        throw new DOMException("Simulated browser quota", "QuotaExceededError");
      return original.call(this, value, ...(args as [IDBValidKey]));
    };
  });
  await page.locator(".story-open").first().click();
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  const pageHeight = await page
    .locator(".reader-viewport")
    .evaluate((e) => e.clientHeight);
  await page
    .getByRole("button", { name: "Download current article", exact: true })
    .click();
  await expect(page.locator(".reader-download-notice")).toContainText(
    "Storage is full",
  );
  await expect
    .poll(() =>
      page.locator(".reader-viewport").evaluate((e) => e.clientHeight),
    )
    .toBe(pageHeight);
  await expect(
    page.getByRole("button", { name: "Previous page", exact: true }),
  ).toBeEnabled();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
  // A visible error banner legitimately changes pagination while retaining the
  // text anchor. Turn one page back from that measured position.
  const footer = page.locator('.reader-footer [role="status"]');
  const before = Number(
    (await footer.innerText()).match(/(?:Page|Spread) (\d+) of/)![1],
  );
  await page
    .getByRole("button", { name: "Previous page", exact: true })
    .click();
  await expect(footer).toContainText(
    new RegExp(`(?:Page|Spread) ${before - 1} of`),
  );
  await page
    .getByRole("button", { name: "Back to previous section", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Open Today's Fylogia", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Download edition", exact: true })
    .click();
  await expect(
    page.locator(".daily-magazine-body").getByRole("status"),
  ).toContainText("Storage is full");
  await page
    .getByRole("button", { name: "Start reading", exact: true })
    .click();
  await expect(page.locator(".reader-download-notice")).toContainText(
    "Storage is full",
  );
});
