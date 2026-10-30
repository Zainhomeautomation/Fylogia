import { expect } from "@playwright/test";
import { defaults } from "../src/catalog";
import { test, mockEdition, restoreEdition } from "./edition-fixture";
test("real worker sees fixture updates, offline cached responses, and restored publisher news on every engine", async ({
  page,
  context,
}) => {
  test.skip(
    Boolean(process.env.FYLOGIA_TEST_URL) ||
      process.env.FYLOGIA_PAGES_RUNTIME === "0",
    "Verifies only the loopback test harness; production has no fixture endpoint",
  );
  const edition = await (await page.request.get("data/edition.json")).json();
  const articles = edition.articles
    .filter((a: any) => a.full && a.sourceId === "nasa")
    .slice(0, 2);
  expect(articles.length).toBe(2);
  await mockEdition(page, { ...edition, articles: [articles[0]] });
  await page.addInitScript(
    (p) =>
      localStorage.getItem("folio.v1.preferences") ||
      localStorage.setItem("folio.v1.preferences", JSON.stringify(p)),
    { ...defaults, complete: true, interests: ["Space"], sourceIds: ["nasa"] },
  );
  await page.goto("./");
  await expect(page.locator(".story h2")).toHaveText([articles[0].title]);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await mockEdition(page, { ...edition, articles: [articles[1]] });
  await page
    .getByRole("button", { name: "Refresh edition", exact: true })
    .click();
  await expect(page.locator(".story h2")).toHaveText([articles[1].title]);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator(".story h2")).toHaveText([articles[1].title]);
  // Change the fixture below the worker before reconnecting, just as a real
  // publisher edition can change while the browser is offline. APIRequestContext
  // is independent of browser offline emulation. Reconnection itself must refresh.
  await restoreEdition(page);
  await context.setOffline(false);
  await expect.poll(() => page.locator(".story").count()).toBeGreaterThan(1);
});
