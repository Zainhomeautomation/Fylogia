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

  await page.setViewportSize({ width: 1210, height: 782 });
  await page.locator('.news-feed-surface[data-paper-spread="2"]').waitFor();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("button", { name: "Settings", exact: true })
    .first()
    .click();
  const scrolling = page.getByRole("checkbox", {
    name: "Prefer vertical scrolling in wide layouts",
  });
  await scrolling.waitFor();
  await scrolling.check();
  if (
    (await page.evaluate(() =>
      localStorage.getItem("fylogia.native.readingMode"),
    )) !== "scroll"
  )
    throw Error("Scrolling preference was not saved");

  await page.goto(process.env.FYLOGIA_TEST_URL || "http://127.0.0.1:4174");
  await page.getByRole("region", { name: /Scrolling news feed/ }).waitFor();
  await page.locator(".news-feed-surface[data-paper-spread='2']").waitFor({
    state: "detached",
  });
  await page.locator(".native-story-list .story-open").first().click();
  await page.locator('.reader-viewport.scrolling[data-spread="1"]').waitFor();
  const content = page.locator(".reader-content");
  if (
    (await content.evaluate(
      (element) => getComputedStyle(element).columnCount,
    )) !== "1"
  )
    throw Error(
      "Wide article must remain a single vertical column when scrolling is selected",
    );
  await page.setViewportSize({ width: 834, height: 1158 });
  await page.locator(".reader-viewport.scrolling").waitFor();
  await page.setViewportSize({ width: 1210, height: 782 });
  await page.locator(".reader-viewport.scrolling").waitFor();
  await page.goto(process.env.FYLOGIA_TEST_URL || "http://127.0.0.1:4174");
  await page.getByRole("region", { name: /Scrolling news feed/ }).waitFor();
  await page.setViewportSize({ width: 1210, height: 782 });
  await page.locator(".native-story-list").waitFor();
  if (
    (await page.evaluate(() =>
      localStorage.getItem("fylogia.native.readingMode"),
    )) !== "scroll"
  )
    throw Error("Reading preference did not survive app restart");
  console.log(
    "PASS default landscape curling, Settings scrolling override, feed/article consistency, rotation and persisted preference",
  );
} finally {
  await browser.close();
}
