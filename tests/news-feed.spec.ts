import { test, mockEdition } from "./edition-fixture";
import { expect, type Page } from "@playwright/test";
import { defaults } from "../src/catalog";
// Exercise the actual default, independently of the retained list regressions.
test.use({ storageState: { cookies: [], origins: [] } });
async function seed(page: Page) {
  const edition = await (await page.request.get("data/edition.json")).json();
  await mockEdition(page, {
    ...edition,
    articles: Array.from({ length: 12 }, (_, i) => ({
      id: `feed-fixture-${i}`,
      image: i === 0 ? "/__missing-feed-photo.png" : undefined,
      title: `News page ${i + 1}: a different perspective`,
      sourceId: "nasa",
      source: "NASA",
      url: `https://example.test/feed/${i}`,
      categories: [i < 8 ? "Technology" : "Science"],
      region: "Worldwide",
      published: new Date(Date.now() - i * 60000).toISOString(),
      excerpt:
        "A short publisher preview with enough context to choose your next story.",
      content: "<p>Test publisher content for the feed navigation fixture.</p>",
      full: false,
    })),
  });
  await page.addInitScript(
    (prefs) => {
      if (!localStorage.getItem("folio.v1.preferences"))
        localStorage.setItem("folio.v1.preferences", JSON.stringify(prefs));
    },
    {
      ...defaults,
      complete: true,
      interests: ["Technology", "Science"],
      sourceIds: ["nasa"],
    },
  );
  await page.goto("./");
  await expect(page.locator(".news-book")).toBeVisible();
  await expect(
    page
      .locator(".news-book > .news-feed-surface > .feed-spread .story h2")
      .first(),
  ).toContainText("News page 1:");
  await page.locator(".news-book").scrollIntoViewIfNeeded();
}
const active = (page: Page) =>
  page.locator(".news-book > .news-feed-surface > .feed-spread");
async function settled(page: Page) {
  await expect(
    page.locator(".news-book > .news-feed-surface"),
  ).not.toHaveAttribute("data-page-turn", /.+/);
}
async function gesture(page: Page, dx: number, dy = 0, cancel = false) {
  await page.evaluate(
    async ({ dx, dy, cancel }) => {
      const surface = document.querySelector(
        ".news-book > .news-feed-surface",
      )!;
      const box = surface.getBoundingClientRect();
      const x = box.left + box.width * 0.6,
        y = box.top + Math.min(box.height * 0.4, innerHeight - box.top - 80);
      const target = document.elementFromPoint(x, y)!;
      const touch = (x: number, y: number) => ({
        identifier: 8,
        target,
        clientX: x,
        clientY: y,
        pageX: x,
        pageY: y,
        screenX: x,
        screenY: y,
      });
      const fire = (type: string, points: unknown[], changed: unknown[]) => {
        const event = new Event(type, { bubbles: true, cancelable: true });
        Object.assign(event, {
          touches: points,
          targetTouches: points,
          changedTouches: changed,
        });
        target.dispatchEvent(event);
      };
      fire("touchstart", [touch(x, y)], [touch(x, y)]);
      for (let i = 1; i <= 6; i++) {
        const p = touch(x + (dx * i) / 6, y + (dy * i) / 6);
        fire("touchmove", [p], [p]);
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve()),
        );
      }
      fire(cancel ? "touchcancel" : "touchend", [], [touch(x + dx, y + dy)]);
    },
    { dx, dy, cancel },
  );
}
async function nav(page: Page, name: string) {
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
    .getByRole("button", { name, exact: true })
    .click();
}
test("default feed turns printed pages forward and backward, with bounded neighboring stories", async ({
  page,
}) => {
  await seed(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const before = (await active(page).textContent())!;
  // Collect actual intermediate printed-paper poses, not just page numbers.
  await page.evaluate(() => {
    (window as any).__feedPoses = [];
    let left = 120;
    function sample() {
      const leaf = document.querySelector<HTMLElement>(
        ".news-book > .news-feed-surface .paper-fold",
      );
      if (leaf)
        (window as any).__feedPoses.push({
          distance: leaf.dataset.distance,
          bands: leaf.querySelectorAll(".paper-band").length,
          text: leaf.textContent,
        });
      if (--left) requestAnimationFrame(sample);
    }
    sample();
  });
  await page.getByRole("button", { name: "Next stories", exact: true }).click();
  await expect(active(page)).not.toHaveText(before);
  await settled(page);
  const poses = await page.evaluate(() => (window as any).__feedPoses);
  expect(poses.length).toBeGreaterThan(2);
  expect(new Set(poses.map((p: any) => p.distance)).size).toBeGreaterThan(2);
  expect(poses.some((p: any) => p.text.includes("News page 1:"))).toBeTruthy();
  expect(await page.locator(".news-book .story").count()).toBeLessThanOrEqual(
    6,
  );
  await page
    .getByRole("button", { name: "Previous stories", exact: true })
    .click();
  await expect(active(page)).toHaveText(before);
});
test("native touch swipes, cancellation and vertical scrolling do not open a story or double turn", async ({
  page,
}) => {
  await seed(page);
  const before = (await active(page).textContent())!;
  await gesture(page, -140);
  await expect(active(page)).not.toHaveText(before);
  await settled(page);
  await expect(page.locator(".reader")).toHaveCount(0);
  const after = (await active(page).textContent())!;
  await gesture(page, -35, 0, true);
  await settled(page);
  await expect(active(page)).toHaveText(after);
  await gesture(page, 0, -140);
  await settled(page);
  await expect(active(page)).toHaveText(after);
  await gesture(page, 140);
  await settled(page);
  await expect(active(page)).toHaveText(before);
});
test("tap to read and Back restore the exact feed page, bookmarks and scroll", async ({
  page,
}) => {
  await seed(page);
  await page.getByRole("button", { name: "Next stories", exact: true }).click();
  await settled(page);
  const before = (await active(page).textContent())!;
  await active(page)
    .getByRole("button", { name: /^Save / })
    .first()
    .click();
  const saved = await page.evaluate(() =>
    localStorage.getItem("folio.v1.saved"),
  );
  await active(page).locator(".story-open").first().scrollIntoViewIfNeeded();
  const y = await page.evaluate(() => scrollY);
  await active(page).locator(".story-open").first().click();
  await expect(page.locator(".reader")).toBeVisible();
  await page
    .getByRole("button", { name: "Back to previous section", exact: true })
    .click();
  await expect(active(page)).toHaveText(before);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeCloseTo(y, 0);
  expect(
    await page.evaluate(() => localStorage.getItem("folio.v1.saved")),
  ).toBe(saved);
});
test("resizing keeps the story while using readable facing pages; filters start a fresh book", async ({
  page,
}) => {
  await seed(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".news-book > .news-feed-surface")).toHaveAttribute(
    "data-paper-spread",
    "1",
  );
  await page.getByRole("button", { name: "Next stories", exact: true }).click();
  await settled(page);
  const id = await active(page)
    .locator(".feed-sheet")
    .first()
    .getAttribute("data-story-id");
  await page.setViewportSize({ width: 1194, height: 834 });
  await expect(page.locator(".news-book > .news-feed-surface")).toHaveAttribute(
    "data-paper-spread",
    "2",
  );
  await expect(active(page).locator(`[data-story-id="${id}"]`)).toHaveCount(1);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(active(page).locator(".feed-sheet").first()).toHaveAttribute(
    "data-story-id",
    id!,
  );
  await nav(page, "Explore");
  await page.getByRole("button", { name: "Science", exact: true }).click();
  await expect(active(page).locator("h2").first()).toContainText(
    "News page 1:",
  );
});
test("missing photographs, reduced motion, keyboard and list option remain accessible", async ({
  page,
}) => {
  await seed(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(active(page).locator(".type-art").first()).toBeVisible();
  const before = (await active(page).textContent())!;
  await page.locator(".news-book > .news-feed-surface").focus();
  await page.keyboard.press("ArrowRight");
  await expect(active(page)).not.toHaveText(before);
  await expect(page.locator(".paper-fold")).toHaveCount(0);
  await page.getByRole("button", { name: "Story list", exact: true }).click();
  await expect(page.locator(".news-book")).toHaveCount(0);
  await expect(page.locator(".story")).toHaveCount(12);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Story list", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});
test("offline cached news pages turn without requests and retain a downloaded story", async ({
  page,
  context,
}) => {
  await seed(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await active(page)
    .getByRole("button", { name: /^Download offline / })
    .first()
    .click();
  await expect(
    active(page).getByText("Downloaded", { exact: true }).first(),
  ).toBeVisible({ timeout: 15000 });
  await page.reload();
  await expect(page.locator(".news-book")).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator(".news-book")).toBeVisible();
  await page.locator(".news-book").scrollIntoViewIfNeeded();
  const before = (await active(page).textContent())!;
  await page.getByRole("button", { name: "Next stories", exact: true }).click();
  await expect(active(page)).not.toHaveText(before);
  await settled(page);
  await page
    .getByRole("button", { name: "Previous stories", exact: true })
    .click();
  await settled(page);
  await active(page).locator(".story-open").first().click();
  await expect(page.locator(".reader")).toBeVisible();
  await expect(page.locator(".reader")).toContainText("Test publisher content");
  await context.setOffline(false);
});

test("rapid turns remain ordered and an abandoned mouse edge drag returns naturally", async ({
  page,
}) => {
  await seed(page);
  const surface = page.locator(".news-book > .news-feed-surface");
  const spread = Number(await surface.getAttribute("data-paper-spread"));
  const next = page.getByRole("button", { name: "Next stories", exact: true });
  await next.click();
  await next.click();
  await expect(active(page).locator("h2").first()).toContainText(
    `News page ${spread * 2 + 1}:`,
  );
  await settled(page);
  const before = (await active(page).textContent())!;
  await surface.scrollIntoViewIfNeeded();
  const box = (await surface.boundingBox())!;
  const x = box.x + box.width - 12,
    y = box.y + 22;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 65, y + 8, { steps: 6 });
  await expect(surface.locator(".paper-fold")).toBeVisible();
  await page.mouse.move(x - 8, y + 2, { steps: 5 });
  await page.mouse.up();
  await settled(page);
  await expect(active(page)).toHaveText(before);
  await expect(page.locator(".reader")).toHaveCount(0);
});
