import { test, mockEdition } from "./edition-fixture";
import { expect, type Page } from "@playwright/test";
import { defaults } from "../src/catalog";
async function fixture(
  page: Page,
  reading: "pages" | "scroll" = "pages",
  images = false,
) {
  const data = await (await page.request.get("data/edition.json")).json();
  const full = data.articles
    .filter(
      (a: any) =>
        a.full &&
        a.sourceId === "nasa" &&
        a.content.length > 4000 &&
        (!images || Boolean(a.image)),
    )
    .sort((a: any, b: any) => b.content.length - a.content.length)
    .slice(0, 2)
    .map((a: any) => ({
      ...a,
      image: images ? a.image : undefined,
      offlineImagesAllowed: false,
    }));
  expect(full.length).toBe(2);
  const preview = data.articles.find(
    (a: any) => !a.full && a.sourceId === "bbc-world",
  );
  expect(preview).toBeTruthy();
  const articles = [...full, { ...preview, image: undefined }];
  await mockEdition(page, { ...data, articles });
  await page.addInitScript(
    (p) =>
      localStorage.getItem("folio.v1.preferences") ||
      localStorage.setItem("folio.v1.preferences", JSON.stringify(p)),
    {
      ...defaults,
      reading,
      complete: true,
      interests: ["Space", "World News"],
      sourceIds: ["nasa", "bbc-world"],
    },
  );
  await page.goto("./");
  await expect(
    page.getByRole("button", { name: "Open Today's Fylogia" }),
  ).toBeEnabled();
  return articles;
}
async function open(page: Page) {
  await page.getByRole("button", { name: "Open Today's Fylogia" }).click();
  await expect(
    page.getByRole("heading", { name: "Today's Fylogia", exact: true }),
  ).toBeVisible();
}
test("daily cover, contents and continuous stories reuse pagination and preserve separate progress and bookmarks", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await fixture(page);
  await open(page);
  const titles = await page
    .locator(".daily-contents-story strong")
    .allTextContents();
  expect(titles.length).toBe(3);
  await page.getByRole("button", { name: "Start reading" }).click();
  await expect(page.locator(".daily-story-navigation")).toContainText(
    "Story 1 of 3",
  );
  const first = page.getByRole("dialog", { name: titles[0], exact: true });
  await expect(first).toBeVisible();
  await first
    .getByRole("button", { name: "Save article", exact: true })
    .click();
  let turns = 0;
  while (
    await first
      .getByRole("button", { name: "Next page", exact: true })
      .isEnabled()
  ) {
    const status = first.locator(".reader-footer [role=status]");
    const before = await status.textContent();
    await first.getByRole("button", { name: "Next page", exact: true }).click();
    await expect(status).not.toHaveText(before!);
    await expect(first.locator(".paper-fold,.curl-underlay")).toHaveCount(0);
    expect(++turns).toBeLessThan(35);
  }
  const stored = await page.evaluate(
    () => JSON.parse(localStorage.getItem("folio.v1.dailyEditions")!)[0],
  );
  await expect(
    page
      .locator(".daily-story-navigation")
      .getByRole("button", { name: "Next story", exact: true }),
  ).toBeVisible();
  await page
    .locator(".daily-story-navigation")
    .getByRole("button", { name: "Next story", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: titles[1], exact: true }),
  ).toBeVisible();
  await expect(page.locator('.reader-footer [role="status"]')).toContainText(
    /(?:Page|Spread) 1 of/,
  );
  await expect
    .poll(() =>
      page.evaluate(
        (id) => JSON.parse(localStorage.getItem("folio.v1.progress")!)[id],
        stored.stories[0].id,
      ),
    )
    .toBe(1);
  const newProgress = await page.evaluate(
    (id) => JSON.parse(localStorage.getItem("folio.v1.progress")!)[id] || 0,
    stored.stories[1].id,
  );
  expect(newProgress).toBe(0);
  await page
    .getByRole("button", { name: "Back to previous section", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "In this edition", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".daily-magazine")).toHaveCount(0);
  await page.reload();
  await open(page);
  expect(
    await page.locator(".daily-contents-story strong").allTextContents(),
  ).toEqual(titles);
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("folio.v1.saved")!),
  );
  expect(saved.some((a: any) => a.id === stored.stories[0].id)).toBe(true);
  await page.getByRole("button", { name: "Start reading" }).click();
  await expect(page.locator(".daily-story-navigation")).toBeVisible();
  await page
    .getByRole("button", { name: "Home — For You", exact: true })
    .click();
  await expect(page.locator(".daily-magazine")).toHaveCount(0);
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe(
    "hidden",
  );
  await page.setViewportSize({ width: 390, height: 600 });
  await page.evaluate(() => window.scrollTo(0, 200));
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
test("downloaded daily edition reopens offline, turns pages and retains contents across viewport changes", async ({
  page,
  context,
}) => {
  await fixture(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await page.getByRole("button", { name: /Download Daily Edition/ }).click();
  await expect(page.locator(".download-notice")).toContainText(
    "3 articles downloaded.",
  );
  await context.setOffline(true);
  await page.reload();
  await open(page);
  await expect(page.locator(".daily-magazine")).toContainText(
    "Offline · 3 of 3 stories available",
  );
  await page.getByRole("button", { name: "Start reading" }).click();
  await expect(
    page.getByRole("button", { name: "Next page", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.setViewportSize({ width: 1000, height: 900 });
  await expect(page.locator(".daily-story-navigation")).toContainText(
    "Story 1 of 3",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Contents", exact: true }).click();
  await expect(page.locator(".daily-contents-story")).toHaveCount(3);
  await context.setOffline(false);
  await page.reload();
  await open(page);
  await expect(page.locator(".daily-contents-story")).toHaveCount(3);
});
test("preview stories have an honest single-page presentation and edition metadata excludes publisher bodies", async ({
  page,
}) => {
  const articles = await fixture(page);
  await open(page);
  const preview = articles.find((a: any) => !a.full);
  await page.evaluate(() => document.fonts.ready);
  await page.locator(".daily-magazine-body").evaluate((e) => {
    e.scrollTop = e.scrollHeight;
    // Capture after the browser scrolls its click target, before React opens it.
    e.addEventListener(
      "click",
      () => {
        e.dataset.testPreviousScroll = String(e.scrollTop);
      },
      { once: true, capture: true },
    );
  });
  await page
    .locator(".daily-contents-story")
    .filter({ hasText: preview.title })
    .click();
  const tocScroll = Number(
    await page
      .locator(".daily-magazine-body")
      .getAttribute("data-test-previous-scroll"),
  );
  await expect(page.locator(".preview-reader")).toBeVisible();
  expect(
    await page.evaluate(
      (id) =>
        JSON.parse(localStorage.getItem("folio.v1.history")!).some(
          (a: any) => a.id === id,
        ),
      preview.id,
    ),
  ).toBe(true);
  await expect(
    page.getByRole("link", { name: "Continue Reading", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".page-turn-controls")).toHaveCount(0);
  await page.getByRole("button", { name: "Contents", exact: true }).click();
  await expect
    .poll(() =>
      page.locator(".daily-magazine-body").evaluate((e) => e.scrollTop),
    )
    .toBe(tocScroll);
  await expect(
    page.locator(".daily-contents-story").filter({ hasText: preview.title }),
  ).toBeFocused();
  const before = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("folio.v1.dailyEditions")!),
  );
  expect(
    before[0].stories.every(
      (s: any) => !("content" in s) && !("image" in s) && !("excerpt" in s),
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Open Today's Fylogia" }),
  ).toBeVisible();
});

test("pre-magazine library backups restore without cloning identity or removing offline downloads", async ({
  page,
}) => {
  await fixture(page);
  await page
    .locator(".story")
    .first()
    .getByRole("button", { name: /^Save / })
    .click();
  await page.getByRole("button", { name: /Download Daily Edition/ }).click();
  await expect(page.locator(".download-notice")).toContainText(
    "3 articles downloaded.",
  );
  const before = await page.evaluate(() => ({
    profile: JSON.parse(localStorage.getItem("folio.v1.profile")!),
    backup: {
      version: 1,
      ...Object.fromEntries(
        ["preferences", "saved", "history", "progress", "custom"].map((k) => [
          k,
          JSON.parse(localStorage.getItem("folio.v1." + k)!),
        ]),
      ),
    },
  }));
  if (await page.getByRole("button", { name: "Open navigation" }).isVisible())
    await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("navigation", { name: "Main navigation", exact: true })
    .getByRole("button", { name: "Settings", exact: true })
    .click();
  await page.locator("input[type=file]").setInputFiles({
    name: "legacy-library.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(before.backup)),
  });
  await expect(page.locator(".notice[role=status]")).toContainText(
    "Library imported successfully.",
  );
  const after = await page.evaluate(() => ({
    profile: JSON.parse(localStorage.getItem("folio.v1.profile")!),
    saved: JSON.parse(localStorage.getItem("folio.v1.saved")!),
    daily: JSON.parse(localStorage.getItem("folio.v1.dailyEditions")!),
  }));
  expect(after.profile).toEqual(before.profile);
  expect(after.saved).toEqual(before.backup.saved);
  expect(after.daily).toEqual([]);
  if (await page.getByRole("button", { name: "Open navigation" }).isVisible())
    await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("navigation", { name: "Main navigation", exact: true })
    .getByRole("button", { name: "For You", exact: true })
    .click();
  await open(page);
  await expect(page.locator(".daily-contents-story")).toHaveCount(3);
  await expect(page.locator(".daily-contents-story").first()).toContainText(
    "Downloaded",
  );
});

test("advancing a scrolling story flushes pending saves and resumes the next unread story", async ({
  page,
}) => {
  await fixture(page, "scroll");
  await open(page);
  await page.getByRole("button", { name: "Start reading" }).click();
  const metadata = await page.evaluate(
    () => JSON.parse(localStorage.getItem("folio.v1.dailyEditions")!)[0],
  );
  // Font loading can legitimately reflow the text and change a ratio while
  // preserving its text anchor. Compare keyboard behavior after layout settles.
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
  await page.locator(".reader-viewport").evaluate((e) => {
    e.scrollTop = (e.scrollHeight - e.clientHeight) / 2;
    e.dispatchEvent(new Event("scroll"));
  });
  await expect
    .poll(() =>
      page.evaluate(
        (id) => JSON.parse(localStorage.getItem("folio.v1.progress")!)[id] || 0,
        metadata.stories[0].id,
      ),
    )
    .toBeGreaterThan(0.2);
  const beforeArrow = await page.evaluate(
    (id) => JSON.parse(localStorage.getItem("folio.v1.progress")!)[id],
    metadata.stories[0].id,
  );
  await page.keyboard.press("ArrowRight");
  expect(
    await page.evaluate(
      (id) => JSON.parse(localStorage.getItem("folio.v1.progress")!)[id],
      metadata.stories[0].id,
    ),
  ).toBe(beforeArrow);
  await page.locator(".reader-viewport").evaluate((e) => {
    e.scrollTop = (e.scrollHeight - e.clientHeight) * 0.6;
    e.dispatchEvent(new Event("scroll"));
  });
  await page
    .locator(".daily-story-navigation")
    .getByRole("button", { name: "Next story", exact: true })
    .click();
  await expect(page.locator(".daily-story-navigation")).toContainText(
    "Story 2 of 3",
  );
  await expect
    .poll(() =>
      page.evaluate(
        (id) => JSON.parse(localStorage.getItem("folio.v1.progress")!)[id],
        metadata.stories[0].id,
      ),
    )
    .toBe(1);
  await expect(page.locator(".reader-footer")).toContainText("Scroll reading");
  await page.getByRole("button", { name: "Contents", exact: true }).click();
  await page.getByRole("button", { name: "Start reading" }).click();
  await expect(page.locator(".daily-story-navigation")).toContainText(
    "Story 2 of 3",
  );
  expect(
    await page.evaluate(
      (id) => JSON.parse(localStorage.getItem("folio.v1.progress")!)[id],
      metadata.stories[0].id,
    ),
  ).toBe(1);
});

test("online editions retain publisher images after text-only downloads and offline uses the stored fallback", async ({
  page,
  context,
}) => {
  const articles = await fixture(page, "pages", true);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await page.getByRole("button", { name: /Download Daily Edition/ }).click();
  await expect(page.locator(".download-notice")).toContainText(
    "3 articles downloaded.",
  );
  const metadata = await page.evaluate(
    () => JSON.parse(localStorage.getItem("folio.v1.dailyEditions")!)[0],
  );
  const cover = articles.find((a: any) => a.id === metadata.stories[0].id);
  expect(cover.image).toBeTruthy();
  await open(page);
  await expect(page.locator(".daily-cover > img")).toHaveAttribute(
    "src",
    cover.image,
  );
  await expect(page.locator(".daily-cover > img")).toHaveCSS(
    "object-fit",
    "contain",
  );
  await page.getByRole("button", { name: "Start reading" }).click();
  await expect(page.locator(".reader-content > figure > img")).toHaveAttribute(
    "src",
    cover.image,
  );
  await page
    .getByRole("button", { name: "Home — For You", exact: true })
    .click();
  await context.setOffline(true);
  await page.reload();
  await open(page);
  await expect(page.locator(".daily-cover > img")).toHaveCount(0);
  await page.getByRole("button", { name: "Start reading" }).click();
  await expect(page.locator(".article-body")).toBeVisible();
  await expect(page.locator(".reader-content > figure > img")).toHaveCount(0);
});
