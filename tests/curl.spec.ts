import { test, expect } from "@playwright/test";
test("curl drag cancellation, tutorial persistence and offline turns", async ({
  page,
  context,
}, info) => {
  const edition = await (await page.request.get("data/edition.json")).json();
  const article = edition.articles
    .filter((a: any) => a.full)
    .sort((a: any, b: any) => b.content.length - a.content.length)[0];
  await page.route("**/data/edition.json*", (r) =>
    r.fulfill({ json: { ...edition, articles: [article] } }),
  );
  await page.goto("./");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Create My Fylogia" }).click();
  await page.locator(".story-open").first().click();
  await expect(page.getByLabel("Page turning guide")).toBeVisible();
  const status = page.locator(".reader-footer [role=status]");
  const before = await status.innerText();
  async function drag(fraction: number, cancel = false) {
    const corner = page.getByRole("button", {
      name: "Drag or tap to turn forward",
    });
    const b = (await corner.boundingBox())!;
    const surface = page.locator(".reader-viewport");
    const w =
      (await surface.boundingBox())!.width /
      Number(await surface.getAttribute("data-spread"));
    const x = b.x + b.width / 2,
      y = b.y + b.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x - w * fraction, y - 30, { steps: 8 });
    if (cancel) await corner.dispatchEvent("pointercancel", { pointerId: 1 });
    else {
      await expect(page.locator(".curl-strip")).toHaveCount(12);
      const transforms = await page
        .locator(".curl-strip")
        .evaluateAll((nodes) =>
          nodes.map((n) => (n as HTMLElement).style.transform),
        );
      expect(new Set(transforms).size).toBe(12);
      if (process.env.FYLOGIA_SCREENSHOTS)
        await page.screenshot({
          path: `${process.env.FYLOGIA_SCREENSHOTS}/curl-${info.project.name}.png`,
        });
    }
    await page.mouse.up();
    await expect(page.locator(".turn-leaf")).toHaveCount(0);
  }
  await drag(0.15);
  await expect(status).toHaveText(before);
  await drag(0.55, true);
  await expect(status).toHaveText(before);
  await drag(0.55);
  await expect(status).not.toHaveText(before);
  await expect(page.getByLabel("Page turning guide")).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      localStorage.getItem("fylogia.page-turn-tutorial.v1"),
    ),
  ).toBe("done");
  await page.setViewportSize({ width: 820, height: 1100 });
  await expect(page.locator(".reader-content")).toHaveCSS("column-count", "2");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".reader-content")).toHaveCSS("column-count", "1");
  await page
    .getByRole("button", { name: "Drag or tap to turn forward" })
    .click();
  await expect(page.locator(".turn-leaf")).toHaveCount(0);
  await context.setOffline(true);
  const offline = await status.innerText();
  await page
    .getByRole("button", { name: "Drag or tap to turn backward" })
    .click();
  await expect(status).not.toHaveText(offline);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page
    .getByRole("button", { name: "Drag or tap to turn forward" })
    .click();
  await expect(page.locator(".turn-leaf")).toHaveCount(0);
  await page.getByRole("button", { name: "Back to previous section" }).click();
  await page.locator(".story-open").first().click();
  await expect(page.getByLabel("Page turning guide")).toHaveCount(0);
  await context.setOffline(false);
  await page.reload();
  await page.locator(".story-open").first().click();
  await expect(page.getByLabel("Page turning guide")).toHaveCount(0);
});

test("single-page publisher preview has no misleading curl hint", async ({
  page,
}) => {
  const edition = await (await page.request.get("data/edition.json")).json();
  const article = edition.articles
    .filter((a: any) => !a.full && a.sourceId === "bbc-science")
    .sort((a: any, b: any) => a.content.length - b.content.length)[0];
  await page.setViewportSize({ width: 1100, height: 1400 });
  await page.route("**/data/edition.json*", (r) =>
    r.fulfill({ json: { ...edition, articles: [article] } }),
  );
  await page.goto("./");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Create My Fylogia" }).click();
  await page.locator(".story-open").first().click();
  await expect(page.locator(".reader-footer")).toContainText("Page 1 of 1");
  await expect(page.locator(".page-turn-controls")).toHaveCount(0);
});
