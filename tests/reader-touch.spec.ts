import { test, expect, type Page } from "@playwright/test";
async function open(page: Page) {
  const edition = await (await page.request.get("data/edition.json")).json();
  const article = edition.articles
    .filter((a: any) => a.full && a.sourceId === "mit-ai")
    .sort((a: any, b: any) => b.content.length - a.content.length)[0];
  article.image = undefined;
  await page.route("**/data/edition.json*", (r) =>
    r.fulfill({ json: { ...edition, articles: [article] } }),
  );
  await page.addInitScript(
    (id) =>
      localStorage.setItem(
        "folio.v1.preferences",
        JSON.stringify({
          complete: true,
          interests: ["Technology"],
          topics: [],
          region: "Worldwide",
          sourceIds: [id],
          customSources: [],
          theme: "navy",
          reading: "pages",
          fontSize: 19,
          converter: false,
        }),
      ),
    article.sourceId,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  await page.locator(".story-open").click();
  await expect(page.locator(".reader-footer")).toContainText("Page 1 of");
  return article;
}
test("one tap, touch jitter and rapid consecutive turns are never swallowed or doubled", async ({
  page,
  context,
  browserName,
}) => {
  const article = await open(page);
  const corner = page.getByRole("button", {
    name: "Drag or tap to turn forward",
  });
  const box = (await corner.boundingBox())!;
  if (browserName === "chromium") {
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setTouchEmulationEnabled", {
      enabled: true,
      maxTouchPoints: 1,
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: box.x + 24, y: box.y + 22, id: 1 }],
    });
    await expect(page.locator(".turn-leaf")).toHaveCount(0);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: box.x + 16, y: box.y + 22, id: 1 }],
    });
    await expect(page.locator(".turn-leaf")).toHaveCount(0);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  } else await corner.tap();
  const status = page.locator(".reader-footer [role=status]");
  await expect(status).toContainText("Page 2 of");
  await expect(page.locator(".turn-leaf")).toHaveCount(0);
  await expect(status).toContainText("Page 2 of");
  for (let i = 0; i < 2; i++)
    await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(status).toContainText("Page 4 of");
  await page.keyboard.press("ArrowLeft");
  await expect(status).toContainText("Page 3 of");
  expect(
    await page.evaluate(
      (id) => JSON.parse(localStorage.getItem("folio.v1.progress") || "{}")[id],
      article.id,
    ),
  ).toBeGreaterThan(0);
});
test("compact toolbar, reserved navigation rail and single-tap immersive controls preserve readable space", async ({
  page,
}) => {
  await open(page);
  expect(
    await page.locator(".sidebar").evaluate((el) => (el as HTMLElement).inert),
  ).toBeTruthy();
  for (const dimensions of [
    { width: 390, height: 844 },
    { width: 820, height: 1100 },
    { width: 1200, height: 900 },
  ]) {
    await page.setViewportSize(dimensions);
    await expect
      .poll(() =>
        page
          .locator(".reader-toolbar")
          .evaluate((el) => el.getBoundingClientRect().height),
      )
      .toBeLessThanOrEqual(56);
    const positions = await page.evaluate(() => {
      const v = document
        .querySelector(".reader-viewport")!
        .getBoundingClientRect();
      return [
        ...document.querySelectorAll(
          ".page-corner,.turn-tutorial,.reader-footer button",
        ),
      ].map((n) => ({ top: n.getBoundingClientRect().top, bottom: v.bottom }));
    });
    for (const p of positions)
      expect(p.top).toBeGreaterThanOrEqual(p.bottom - 1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
  await page.getByRole("button", { name: "Enter immersive reading" }).click();
  await expect(page.locator(".reader-download-strip")).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save article", exact: true }),
  ).not.toBeVisible();
  await page.locator(".reader-viewport").click({ position: { x: 5, y: 5 } });
  await expect(
    page.getByRole("button", { name: "Save article", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Reading options", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Increase text size" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Reading options", exact: true }),
  ).toHaveAttribute("aria-expanded", "false");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await page.locator(".sidebar").evaluate((el) => (el as HTMLElement).inert),
  ).toBeFalsy();
});
test("summary stays above page corners and returns keyboard focus to visible reading options", async ({
  page,
}) => {
  await open(page);
  await page.setViewportSize({ width: 390, height: 500 });
  const options = page.getByRole("button", {
    name: "Reading options",
    exact: true,
  });
  await options.click();
  await page.getByRole("button", { name: "Summarize", exact: true }).click();
  const summary = page.getByRole("alertdialog");
  await expect(summary).toBeVisible();
  expect(
    await page.evaluate(() => {
      const overlay = document.querySelector(".summary-backdrop")!;
      const rail = document.querySelector(".page-turn-controls")!;
      const r = rail.getBoundingClientRect();
      return (
        Number(getComputedStyle(overlay).zIndex) >
          Number(getComputedStyle(rail).zIndex) &&
        overlay.contains(
          document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2),
        )
      );
    }),
  ).toBeTruthy();
  await page
    .getByRole("button", { name: "Back to reading", exact: true })
    .click();
  await expect(options).toBeFocused();
  await expect(page.locator(".sidebar")).toHaveAttribute("inert", "");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await page.locator(".sidebar").evaluate((el) => (el as HTMLElement).inert),
  ).toBeFalsy();
});
