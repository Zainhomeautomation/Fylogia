import { test, expect } from "@playwright/test";
import { defaults } from "../src/catalog";

test("queued article turns stay within the first and last text pages", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 650 });
  const edition = await (await page.request.get("data/edition.json")).json();
  const article = edition.articles
    .filter(
      (a: any) =>
        a.full &&
        a.content.length >= 2000 &&
        !/<(?:img|figure)\b/i.test(a.content),
    )
    .sort((a: any, b: any) => a.content.length - b.content.length)[0];
  expect(article).toBeTruthy();
  // Boundary behavior is independent of remote image loading and reflow.
  article.image = undefined;
  await page.addInitScript(
    ({ article, prefs }) => {
      localStorage.setItem("folio.v1.preferences", JSON.stringify(prefs));
      localStorage.setItem("folio.v1.saved", JSON.stringify([article]));
    },
    { article, prefs: { ...defaults, complete: true, fontSize: 24 } },
  );
  await page.goto("./saved");
  await page.locator(".story-open").click();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
  const status = page.locator(".reader-footer [role=status]");
  const number = async () =>
    Number((await status.innerText()).match(/Page (\d+)/)?.[1]);
  const total = Number((await status.innerText()).match(/of (\d+)/)?.[1]);
  expect(total).toBeGreaterThan(1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  while ((await number()) < total - 1) {
    const before = await status.textContent();
    await page.getByRole("button", { name: "Next page", exact: true }).click();
    await expect(status).not.toHaveText(before!);
  }
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const next = page.getByRole("button", { name: "Next page", exact: true });
  await next.click();
  await next.click();
  await expect(page.locator(".reader-viewport[data-page-turn]")).toHaveCount(0);
  await expect(status).toContainText(`Page ${total} of ${total}`);
  await expect(next).toBeDisabled();
  await page.emulateMedia({ reducedMotion: "reduce" });
  while ((await number()) > 2) {
    const before = await status.textContent();
    await page
      .getByRole("button", { name: "Previous page", exact: true })
      .click();
    await expect(status).not.toHaveText(before!);
  }
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const previous = page.getByRole("button", {
    name: "Previous page",
    exact: true,
  });
  await previous.click();
  await previous.click();
  await expect(page.locator(".reader-viewport[data-page-turn]")).toHaveCount(0);
  await expect(status).toContainText(`Page 1 of ${total}`);
  await expect(previous).toBeDisabled();
  expect(
    await page.evaluate(
      (id) => JSON.parse(localStorage.getItem("folio.v1.progress") || "{}")[id],
      article.id,
    ),
  ).toBe(0);
});

test("long-article turns and responsive pagination recover when animation callbacks stop", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1180, height: 900 });
  const edition = await (await page.request.get("data/edition.json")).json();
  const article = edition.articles
    .filter((a: any) => a.full)
    .sort((a: any, b: any) => b.content.length - a.content.length)[0];
  article.image = undefined;
  article.content = article.content.replace(/<img[^>]*>/gi, "");
  await page.addInitScript(
    ({ article, prefs }) => {
      localStorage.setItem("folio.v1.preferences", JSON.stringify(prefs));
      localStorage.setItem("folio.v1.saved", JSON.stringify([article]));
      const request = window.requestAnimationFrame.bind(window);
      (window as any).pauseReaderFrames = false;
      window.requestAnimationFrame = (callback) =>
        request((time) => {
          if (!(window as any).pauseReaderFrames) callback(time);
        });
    },
    { article, prefs: { ...defaults, complete: true } },
  );
  await page.goto("./saved");
  await page.locator(".story-open").click();
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(".reader-content")).toHaveCSS("column-count", "2");
  const text = await page.locator(".article-body").innerText();
  // Hold the sheet so slow CI assertions cannot race a 620 ms auto turn.
  const corner = (await page
    .getByRole("button", { name: "Drag or tap to turn forward", exact: true })
    .boundingBox())!;
  const width =
    (await page.locator(".reader-viewport").boundingBox())!.width / 2;
  await page.mouse.move(corner.x + 24, corner.y + 24);
  await page.mouse.down();
  await page.mouse.move(corner.x + 24 - width * 0.7, corner.y, { steps: 8 });
  await expect(page.locator(".paper-fold")).toHaveCount(1);
  await expect(
    page.locator(".paper-flat[data-face=front] .turn-content"),
  ).toHaveCSS("will-change", "auto");
  const projected = page.locator(".paper-flat[data-face=front] .turn-content");
  expect(await projected.locator("*").count()).toBeLessThan(250);
  const source = await page.locator(".reader-content").textContent();
  const lines = await projected.locator("span").allTextContents();
  expect(lines.length).toBeGreaterThan(5);
  for (const line of lines)
    expect(source!.replace(/\s+/g, " ")).toContain(line.replace(/\s+/g, " "));
  await page.evaluate(() => {
    (window as any).pauseReaderFrames = true;
  });
  await page.mouse.up();
  await expect(page.locator(".paper-fold,.curl-underlay")).toHaveCount(0);
  await expect(page.locator(".reader-footer")).toContainText("Spread 2 of");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".reader-content")).toHaveCSS("column-count", "1");
  await expect(page.locator(".reader-footer")).toContainText(/Page \d+ of/);
  expect(await page.locator(".article-body").innerText()).toBe(text);
  await page.evaluate(() => {
    (window as any).pauseReaderFrames = false;
  });
});
