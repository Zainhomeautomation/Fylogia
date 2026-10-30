import { test, expect } from "@playwright/test";
import { defaults } from "../src/catalog";

test("queued article turns stay within the first and last text pages", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 650 });
  const edition = await (await page.request.get("data/edition.json")).json();
  const article = edition.articles
    .filter((a: any) => a.full && a.content.length >= 2000)
    .sort((a: any, b: any) => a.content.length - b.content.length)[0];
  expect(article).toBeTruthy();
  await page.addInitScript(
    ({ article, prefs }) => {
      localStorage.setItem("folio.v1.preferences", JSON.stringify(prefs));
      localStorage.setItem("folio.v1.saved", JSON.stringify([article]));
    },
    { article, prefs: { ...defaults, complete: true, fontSize: 24 } },
  );
  await page.goto("./saved");
  await page.locator(".story-open").click();
  await page.evaluate(() => document.fonts.ready);
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
