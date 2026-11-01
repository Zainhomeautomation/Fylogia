import { test, mockEdition } from "./edition-fixture";
import { expect, type Page } from "@playwright/test";
import { defaults } from "../src/catalog";
test.use({ hasTouch: true, storageState: { cookies: [], origins: [] } });
const surface = (p: Page) => p.locator(".news-book > .news-feed-surface");
const active = (p: Page) => surface(p).locator(":scope > .feed-spread");
async function seed(page: Page) {
  const edition = await (await page.request.get("data/edition.json")).json();
  await mockEdition(page, {
    ...edition,
    articles: Array.from({ length: 45 }, (_, i) => ({
      id: `ux-${i}`,
      title: `Magazine story ${i + 1}: perspectives on our world`,
      sourceId: "nasa",
      source: "NASA",
      url: `https://example.test/ux/${i}`,
      categories: ["Technology"],
      region: "Worldwide",
      published: new Date(Date.now() - i * 60000).toISOString(),
      excerpt: "A publisher preview with context for the next story.",
      content: "<p>Reader interaction fixture, not real published content.</p>",
      full: false,
    })),
  });
  await page.addInitScript(
    (prefs) =>
      localStorage.setItem("folio.v1.preferences", JSON.stringify(prefs)),
    {
      ...defaults,
      complete: true,
      interests: ["Technology"],
      sourceIds: ["nasa"],
    },
  );
  await page.goto("./");
  await expect(surface(page)).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await surface(page).scrollIntoViewIfNeeded();
}
async function settled(page: Page) {
  await expect(surface(page)).not.toHaveAttribute("data-page-turn", /.+/);
}

test("visible next control supports a partial mouse drag and cancellation without opening a story", async ({
  page,
}) => {
  await seed(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const next = surface(page).locator(".feed-edge-next");
  const b = (await next.boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x - 80, b.y + b.height / 2 + 10, { steps: 8 });
  await expect(surface(page).locator(".paper-fold")).toBeVisible();
  await expect(surface(page).locator(".paper-fold .feed-preload")).toHaveCount(
    0,
  );
  await page.mouse.move(b.x + b.width / 2 - 3, b.y + b.height / 2, {
    steps: 5,
  });
  await page.mouse.up();
  await settled(page);
  await expect(active(page).locator("h2").first()).toContainText(
    "Magazine story 1:",
  );
  await expect(page.locator(".reader")).toHaveCount(0);
});

test("unfolded viewport uses two readable pages, portrait uses one, and the anchor survives rotation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Next stories", exact: true }).click();
  for (const [width, height, count] of [
    [884, 708, 2],
    [884, 832, 2],
    [720, 720, 2],
    [832, 884, 2],
    [834, 1194, 1],
    [1194, 834, 2],
    [390, 844, 1],
    [1440, 1000, 2],
  ]) {
    await page.setViewportSize({ width, height });
    await expect(surface(page)).toHaveAttribute(
      "data-paper-spread",
      String(count),
    );
    await expect(active(page).locator('[data-story-id="ux-1"]')).toHaveCount(1);
    const sizes = await active(page)
      .locator(".feed-sheet")
      .evaluateAll((nodes) =>
        nodes.map((n) => ({
          width: n.getBoundingClientRect().width,
          height: n.getBoundingClientRect().height,
        })),
      );
    if (count === 2) {
      expect(sizes[0].width).toBeGreaterThanOrEqual(330);
      expect(sizes[0]).toEqual(sizes[1]);
    }
  }
});

test("one primary control pair has unobstructed 44 pixel touch targets", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page);
  await expect(page.locator(".feed-pagination button")).toHaveCount(0);
  for (const brand of await page.locator(".brand-home:visible").all())
    await expect(brand).toHaveText("Fylogia");
  for (const name of ["Next stories", "Previous stories"]) {
    const button = page.getByRole("button", { name, exact: true });
    await expect(button).toHaveCount(1);
    const b = (await button.boundingBox())!;
    expect(b.width).toBeGreaterThanOrEqual(44);
    expect(b.height).toBeGreaterThanOrEqual(44);
  }
  const overlap = await surface(page).evaluate((node) => {
    const edge = node.querySelector(".feed-edge-next")!.getBoundingClientRect();
    return [...node.querySelectorAll(":scope > .feed-spread h2")].some((h) => {
      const r = h.getBoundingClientRect();
      return (
        edge.left < r.right &&
        edge.right > r.left &&
        edge.top < r.bottom &&
        edge.bottom > r.top
      );
    });
  });
  expect(overlap).toBe(false);
});

test("twenty consecutive spreads and their reverse stay ordered, bounded and return to the same article", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 1194, height: 834 });
  await seed(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  for (const forward of [true, false])
    for (let n = 1; n <= 20; n++) {
      const expected = forward ? n * 2 : (20 - n) * 2;
      await page
        .getByRole("button", {
          name: forward ? "Next stories" : "Previous stories",
          exact: true,
        })
        .click();
      await settled(page);
      await expect(
        active(page).locator("[data-story-id]").first(),
      ).toHaveAttribute("data-story-id", `ux-${expected}`);
      expect(await surface(page).locator(".story").count()).toBeLessThanOrEqual(
        6,
      );
      await expect(
        surface(page).locator(".paper-fold,.curl-underlay"),
      ).toHaveCount(0);
    }
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (let n = 0; n < 22; n++)
    await page
      .getByRole("button", { name: "Next stories", exact: true })
      .click();
  await expect(active(page).locator("[data-story-id]")).toHaveCount(1);
  await expect(active(page).locator("[data-story-id]")).toHaveAttribute(
    "data-story-id",
    "ux-44",
  );
  await expect(active(page).locator(".feed-end")).toContainText("caught up");
  await expect(page.locator(".feed-pagination")).toHaveText("Story 45 of 45");
  await expect(
    page.getByRole("button", { name: "Next stories", exact: true }),
  ).toBeDisabled();
  await active(page).locator(".story-open").click();
  await expect(page.locator(".reader")).toBeVisible();
  await page
    .getByRole("button", { name: "Back to previous section", exact: true })
    .click();
  await expect(active(page).locator("[data-story-id]")).toHaveAttribute(
    "data-story-id",
    "ux-44",
  );
});

test("trackpad momentum turns just one spread while vertical scrolling and pinch remain native", async ({
  page,
}) => {
  await seed(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const ids = () =>
    active(page)
      .locator("[data-story-id]")
      .evaluateAll((nodes) =>
        nodes.map((n) => n.getAttribute("data-story-id")),
      );
  const before = await ids();
  const send = async (dx: number, dy: number, ctrlKey = false) =>
    surface(page).evaluate(
      (node, { dx, dy, ctrlKey }) => {
        const e = new WheelEvent("wheel", {
          deltaX: dx,
          deltaY: dy,
          ctrlKey,
          bubbles: true,
          cancelable: true,
        });
        node.dispatchEvent(e);
        return e.defaultPrevented;
      },
      { dx, dy, ctrlKey },
    );
  expect(await send(0, 140)).toBe(false);
  expect(await send(120, 0, true)).toBe(false);
  expect(await ids()).toEqual(before);
  for (const dx of [25, 40, 60, 70, 35, 20])
    expect(await send(dx, 0)).toBe(true);
  const after = await ids();
  expect(after).not.toEqual(before);
  expect(after[0]).toBe(`ux-${before.length}`);
  await page.waitForTimeout(220); // Trackpad contact must finish before reversing.
  for (const dx of [-30, -45, -60, -20]) await send(dx, 0);
  expect(await ids()).toEqual(before);
});

test("finger dragging the visible edge curls, cancels and commits only once despite a compatibility click", async ({
  page,
}) => {
  await seed(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const before = await active(page)
    .locator("[data-story-id]")
    .first()
    .getAttribute("data-story-id");
  for (const cancel of [true, false]) {
    const poses = await surface(page).evaluate(async (surface, cancel) => {
      const target = surface.querySelector(".feed-edge-next")!;
      const r = target.getBoundingClientRect();
      const x = r.x + r.width / 2,
        y = r.y + r.height / 2;
      const width =
        surface.clientWidth /
        (surface.getAttribute("data-paper-spread") === "2" ? 2 : 1);
      const point = (dx: number) => ({
        identifier: 51,
        target,
        clientX: x + dx,
        clientY: y,
        pageX: x + dx,
        pageY: y,
        screenX: x + dx,
        screenY: y,
      });
      const fire = (type: string, dx: number) => {
        const e = new Event(type, { bubbles: true, cancelable: true });
        Object.assign(e, {
          touches:
            type === "touchend" || type === "touchcancel" ? [] : [point(dx)],
          changedTouches: [point(dx)],
        });
        target.dispatchEvent(e);
      };
      fire("touchstart", 0);
      const poses = [];
      for (let i = 1; i <= 8; i++) {
        fire("touchmove", (-width * 0.5 * i) / 8);
        await new Promise<void>((r) => requestAnimationFrame(() => r()));
        const leaf = surface.querySelector<HTMLElement>(".paper-fold");
        if (leaf) poses.push(leaf.dataset.distance);
      }
      fire(cancel ? "touchcancel" : "touchend", -width * 0.5);
      (target as HTMLButtonElement).click(); // WebKit's compatibility click must not add a turn.
      return poses;
    }, cancel);
    expect(new Set(poses).size).toBeGreaterThan(2);
    await settled(page);
    if (cancel)
      await expect(
        active(page).locator("[data-story-id]").first(),
      ).toHaveAttribute("data-story-id", before!);
    else {
      const spread = Number(
        await surface(page).getAttribute("data-paper-spread"),
      );
      await expect(
        active(page).locator("[data-story-id]").first(),
      ).toHaveAttribute("data-story-id", `ux-${spread}`);
    }
    await expect(page.locator(".reader")).toHaveCount(0);
  }
});
