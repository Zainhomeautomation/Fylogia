import { resolve } from "node:path";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
const root = resolve("native/ios"),
  modules = resolve(root, ".build/golden-source/node_modules");
const { webkit } = await import(resolve(modules, "playwright/index.mjs"));
const { magazineFixture } = await import(
  resolve(root, ".build/golden-source/tests/pdf-fixture.ts")
);
const browser = await webkit.launch();
const results = [];
try {
  const context = await browser.newContext({
    viewport: { width: 834, height: 1158 },
  });
  await context.addInitScript(
    readFileSync(resolve(root, "web/parity-fixture.js"), "utf8"),
  );
  await context.addInitScript(() =>
    localStorage.setItem("fylogia.news.view", "list"),
  );
  const p = await context.newPage(),
    errors = [];
  p.on("pageerror", (e) => errors.push(String(e)));
  await p.goto(process.env.FYLOGIA_TEST_URL || "http://127.0.0.1:4176");
  const prefs = await p.evaluate(() =>
    localStorage.getItem("folio.v1.preferences"),
  );
  const screenshots = resolve(root, ".build/consistent-review");
  mkdirSync(screenshots, { recursive: true });
  await p.locator(".native-story-list .story-open").first().waitFor();
  await p.screenshot({ path: resolve(screenshots, "portrait-feed.png") });
  for (let i = 0; i < 3; i++) {
    await p.locator(".native-story-list .story-open").first().click();
    await p.locator('.reader-viewport.scrolling[data-spread="1"]').waitFor();
    const body = p.locator(".reader-content");
    const text = await body.textContent();
    if ((await body.evaluate((e) => getComputedStyle(e).columnCount)) !== "1")
      throw Error("Portrait columns");
    const target = p
      .locator(".reader-content p")
      .filter({ hasText: /^Section 8\./ })
      .first();
    await target.evaluate((e) =>
      e.scrollIntoView({ block: "start", behavior: "instant" }),
    );
    await p.waitForTimeout(400);
    if (i === 0)
      await p.screenshot({
        path: resolve(screenshots, "portrait-article.png"),
      });
    await p.setViewportSize({ width: 1210, height: 782 });
    await p.locator('.reader-viewport.paginated[data-spread="2"]').waitFor();
    await p.waitForTimeout(400);
    if ((await body.textContent()) !== text)
      throw Error("Article content changed on rotation");
    if (i === 0)
      await p.screenshot({
        path: resolve(screenshots, "landscape-article.png"),
      });
    await p.setViewportSize({ width: 834, height: 1158 });
    await p.locator(".reader-viewport.scrolling").waitFor();
    await p.waitForTimeout(400);
    const visible = await target.evaluate((e) => {
      const r = e.getBoundingClientRect(),
        v = e.closest(".reader-viewport").getBoundingClientRect();
      return r.bottom > v.top && r.top < v.bottom;
    });
    if (!visible) throw Error("Reading text location lost");
    await p
      .getByRole("button", { name: "Back to previous section", exact: true })
      .click();
  }
  const card = p.locator(".native-story-list > [data-story-id]").first();
  await card.getByRole("button", { name: /^Save / }).click();
  await card.getByRole("button", { name: /^Download offline / }).click();
  await card.getByRole("button", { name: /^Downloaded / }).waitFor();
  await p.getByRole("button", { name: "Open navigation", exact: true }).click();
  await p
    .getByRole("button", { name: "Saved Articles", exact: true })
    .first()
    .click();
  await context.setOffline(true);
  await p.locator(".story-open").first().click();
  await p.locator(".reader-viewport.scrolling").waitFor();
  if (
    !(await p.locator(".reader-content").textContent()).includes("Section 8.")
  )
    throw Error("Saved offline content missing");
  await p.evaluate(
    () => (document.documentElement.dataset.nativeTextScale = "1.6"),
  );
  await p.waitForTimeout(300);
  if (
    (await p
      .locator(".reader-content")
      .evaluate((e) => parseFloat(getComputedStyle(e).fontSize))) < 30
  )
    throw Error("Dynamic Type not applied");
  await p.evaluate(
    () => (document.documentElement.dataset.nativeTextScale = "1"),
  );
  await context.setOffline(false);
  await p.getByRole("button", { name: "Home — For You", exact: true }).click();
  await p.setViewportSize({ width: 1210, height: 782 });
  await p.waitForTimeout(350);
  await p.screenshot({ path: resolve(screenshots, "landscape-feed.png") });
  await p.setViewportSize({ width: 834, height: 1158 });
  await p.waitForTimeout(350);
  await p.getByRole("button", { name: "Open navigation", exact: true }).click();
  await p
    .getByRole("button", { name: "Magazines", exact: true })
    .first()
    .click();
  await p.locator("input[type=file]").setInputFiles({
    name: "Native continuous fixture.pdf",
    mimeType: "application/pdf",
    buffer: magazineFixture(20),
  });
  await p.getByRole("button", { name: /Native continuous fixture/ }).click();
  await p
    .locator(".native-pdf-stream canvas[aria-busy=false]")
    .first()
    .waitFor();
  if ((await p.locator("[data-native-pdf-page]").count()) !== 20)
    throw Error("Missing PDF pages");
  if ((await p.locator(".native-pdf-stream canvas").count()) > 6)
    throw Error("Offscreen PDF canvases not bounded");
  await p
    .locator('[data-native-pdf-page="4"]')
    .evaluate((e) => e.scrollIntoView({ block: "start" }));
  await p.waitForTimeout(500);
  await p.setViewportSize({ width: 1210, height: 782 });
  await p
    .locator('.pdf-spread:not(.native-pdf-flow)[data-spread="2"]')
    .waitFor();
  await p.waitForTimeout(400);
  if (!(await p.locator('canvas[aria-label="Magazine page 4"]').count()))
    throw Error("PDF page lost on rotation");
  await p.setViewportSize({ width: 834, height: 1158 });
  await p.locator(".native-pdf-stream").waitFor();
  await p.waitForTimeout(400);
  await context.setOffline(true);
  await p
    .locator('[data-native-pdf-page="5"]')
    .evaluate((e) => e.scrollIntoView({ block: "start" }));
  await p
    .locator('canvas[aria-label="Magazine page 5"][aria-busy=false]')
    .waitFor();
  await context.setOffline(false);
  if (
    prefs !==
    (await p.evaluate(() => localStorage.getItem("folio.v1.preferences")))
  )
    throw Error("Preferences overwritten");
  if (
    (await p.evaluate(() => localStorage.getItem("fylogia.news.view"))) !==
    "list"
  )
    throw Error("Stored website presentation preference changed");
  if (errors.length) throw Error(errors.join("\n"));
  // A malformed local publication must leave navigation usable.
  await p
    .getByRole("button", { name: "Back to previous section", exact: true })
    .click();
  await p
    .locator("input[type=file]")
    .setInputFiles({
      name: "Malformed native fixture.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.7 invalid fixture"),
    });
  await p.getByRole("button", { name: /Malformed native fixture/ }).click();
  await p
    .getByRole("alert")
    .filter({ hasText: /could not be loaded/ })
    .waitFor();
  await p
    .getByRole("button", { name: "Back to previous section", exact: true })
    .click();
  results.push(
    "PASS article scrolling/facing pages, unchanged text, repeated open/back, approximate progress, PDF continuous/lazy/offline pages and rotation",
  );
  writeFileSync(resolve(screenshots, "results.json"), JSON.stringify(results));
  console.log(results.join("\n"));
} finally {
  await browser.close();
}
