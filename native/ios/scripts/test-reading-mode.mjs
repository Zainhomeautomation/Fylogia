import { resolve } from "node:path";
import { readFileSync } from "node:fs";
const root = resolve("native/ios"),
  modules = resolve(root, ".build/golden-source/node_modules");
const { webkit } = await import(resolve(modules, "playwright/index.mjs"));
const browser = await webkit.launch();
try {
  const context = await browser.newContext({
    viewport: { width: 834, height: 1158 },
  });
  await context.addInitScript(
    readFileSync(resolve(root, "web/parity-fixture.js"), "utf8"),
  );
  const page = await context.newPage();
  await page.goto(process.env.FYLOGIA_TEST_URL || "http://127.0.0.1:4174");
  await page.getByRole("region", { name: "Scrolling news feed" }).waitFor();
  const preserved = await page.evaluate(() => ({
    preferences: localStorage.getItem("folio.v1.preferences"),
    nativeMode: localStorage.getItem("fylogia.native.readingMode"),
  }));
  await page.setViewportSize({ width: 1210, height: 782 });
  await page
    .locator(".native-horizontal-feed .native-scroll-spread")
    .first()
    .waitFor();
  if (
    (await page
      .locator(".native-horizontal-feed .native-scroll-spread")
      .first()
      .locator("[data-story-id]")
      .count()) !== 2
  )
    throw Error("Landscape must retain two facing stories");
  if (
    (await page.evaluate(
      () => document.documentElement.dataset.nativeReadingMode,
    )) !== "scroll"
  )
    throw Error("Native reading mode must disable page curls");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("button", { name: "Settings", exact: true })
    .first()
    .click();
  await page
    .getByText(
      "In wide layouts, browse two facing stories with horizontal scrolling.",
    )
    .waitFor();
  await page
    .getByRole("button", { name: /For You/ })
    .first()
    .click();
  await page
    .locator(".native-horizontal-feed .native-scroll-spread")
    .first()
    .waitFor();
  await page.locator(".native-horizontal-feed .story-open").first().click();
  await page.locator('.reader-viewport.scrolling[data-spread="1"]').waitFor();
  await page.setViewportSize({ width: 834, height: 1158 });
  await page.locator(".reader-viewport.scrolling").waitFor();
  await page.setViewportSize({ width: 1210, height: 782 });
  await page.locator(".reader-viewport.scrolling").waitFor();
  const after = await page.evaluate(() => ({
    preferences: localStorage.getItem("folio.v1.preferences"),
    nativeMode: localStorage.getItem("fylogia.native.readingMode"),
  }));
  if (JSON.stringify(after) !== JSON.stringify(preserved))
    throw Error(
      "Switching to stable scrolling changed stored reader preferences",
    );
  console.log(
    "PASS portrait vertical feed, landscape two-story horizontal scrolling, scroll-only article rotation and unchanged stored preferences",
  );
} finally {
  await browser.close();
}
