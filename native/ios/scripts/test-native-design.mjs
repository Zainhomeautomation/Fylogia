import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve("native/ios");
const modules = resolve(root, ".build/golden-source/node_modules");
const evidence =
  process.env.FYLOGIA_DESIGN_EVIDENCE ||
  "/Volumes/Developments/Xcode/TestResults/Fylogia-Native-Design-20261107";
mkdirSync(evidence, { recursive: true });

const { webkit } = await import(resolve(modules, "playwright/index.mjs"));
const browser = await webkit.launch();
const page = await browser.newPage({
  viewport: { width: 393, height: 852 },
  deviceScaleFactor: 2,
});
await page.addInitScript(
  readFileSync(resolve(root, "web/parity-fixture.js"), "utf8"),
);
await page.route("**/*nasa-spinoff-2025.jpg*", (route) => route.abort());

try {
  await page.goto(process.env.FYLOGIA_TEST_URL || "http://127.0.0.1:4174");
  await page.locator(".native-story-list .story-open").first().waitFor();
  const skip = page.getByRole("button", { name: "Skip tips", exact: true });
  if (await skip.isVisible()) await skip.click();

  const portrait = page.locator(".native-story-list");
  const firstStory = portrait.locator("[data-story-id]").first();
  const heading = firstStory.locator("h2");
  const headingSize = await heading.evaluate((node) =>
    parseFloat(getComputedStyle(node).fontSize),
  );
  assert.ok(headingSize >= 23, `Portrait headline size was ${headingSize}px`);
  const fallback = firstStory.locator(".type-art");
  await fallback.waitFor();
  assert.equal(
    await fallback
      .locator("svg")
      .evaluate((node) => getComputedStyle(node).display),
    "none",
  );
  const palette = await portrait.evaluate((node) => {
    const style = getComputedStyle(node);
    return {
      paper: style.getPropertyValue("--paper").trim(),
      ink: style.getPropertyValue("--ink").trim(),
      muted: style.getPropertyValue("--muted").trim(),
      line: style.getPropertyValue("--line").trim(),
      green: style.getPropertyValue("--green").trim(),
    };
  });
  assert.deepEqual(palette, {
    paper: "#f7f2e3",
    ink: "#20251f",
    muted: "#59645b",
    line: "#d8d1bd",
    green: "#496b59",
  });
  await page.screenshot({
    path: resolve(evidence, "iphone-portrait-feed.png"),
    fullPage: true,
  });
  console.log(
    "PASS portrait feed hierarchy, publisher fallback and premium palette",
    {
      headingSize,
      palette,
    },
  );

  const imagePage = await browser.newPage({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 2,
  });
  await imagePage.addInitScript(
    readFileSync(resolve(root, "web/parity-fixture.js"), "utf8"),
  );
  await imagePage.goto(process.env.FYLOGIA_TEST_URL || "http://127.0.0.1:4174");
  const imageSkip = imagePage.getByRole("button", {
    name: "Skip tips",
    exact: true,
  });
  if (await imageSkip.isVisible()) await imageSkip.click();
  const leadImage = imagePage
    .locator(".native-story-list .story-open img")
    .first();
  await leadImage.waitFor();
  await imagePage.waitForFunction(
    () =>
      document.querySelector(".native-story-list .story-open img")
        ?.naturalWidth > 0,
  );
  const portraitImageHeight = await leadImage.evaluate(
    (node) => node.getBoundingClientRect().height,
  );
  assert.ok(portraitImageHeight >= 170);
  await imagePage.screenshot({
    path: resolve(evidence, "iphone-portrait-imagery.png"),
    fullPage: true,
  });
  await imagePage.setViewportSize({ width: 844, height: 390 });
  await imagePage.locator(".native-horizontal-feed").waitFor();
  const wideImage = imagePage
    .locator(".native-horizontal-feed .story-open img")
    .first();
  await imagePage.waitForFunction(
    () =>
      document.querySelector(".native-horizontal-feed .story-open img")
        ?.naturalWidth > 0,
  );
  const wideImageHeight = await wideImage.evaluate(
    (node) => node.getBoundingClientRect().height,
  );
  assert.ok(wideImageHeight >= 88);
  await imagePage.screenshot({
    path: resolve(evidence, "iphone-landscape-imagery.png"),
    fullPage: true,
  });
  console.log("PASS loaded article imagery in portrait and short landscape", {
    portraitImageHeight,
    wideImageHeight,
  });
  await imagePage.close();

  await page.setViewportSize({ width: 844, height: 390 });
  const wide = page.locator(".native-horizontal-feed");
  await wide.waitFor();
  const spread = wide.locator(".native-scroll-spread").first();
  assert.equal(await spread.locator("[data-story-id]").count(), 2);
  assert.equal(
    await wide
      .locator(".native-spread-strip")
      .evaluate((node) => getComputedStyle(node).scrollSnapType),
    "x mandatory",
  );
  const wideMetrics = await spread.evaluate((node) => {
    const card = node.querySelector("[data-story-id]");
    const title = card.querySelector("h2");
    const imageOrFallback = card.querySelector(
      ".story-open img, .story-open .type-art",
    );
    return {
      spreadWidth: node.clientWidth,
      cardCount: node.querySelectorAll("[data-story-id]").length,
      titleSize: parseFloat(getComputedStyle(title).fontSize),
      artHeight: imageOrFallback?.getBoundingClientRect().height || 0,
      clippedTitle:
        title.scrollWidth > title.clientWidth + 1 ||
        title.scrollHeight > title.clientHeight + 1,
      titleVisible: (() => {
        const titleRect = title.getBoundingClientRect();
        const sheetRect = card.getBoundingClientRect();
        return (
          titleRect.top >= sheetRect.top && titleRect.bottom <= sheetRect.bottom
        );
      })(),
    };
  });
  assert.ok(
    wideMetrics.titleSize >= 19,
    "Wide headline hierarchy was not applied",
  );
  assert.ok(
    wideMetrics.artHeight >= 72,
    "Short-landscape artwork/fallback is too short",
  );
  assert.equal(wideMetrics.clippedTitle, false);
  assert.equal(
    wideMetrics.titleVisible,
    true,
    `Short-landscape headline is clipped from the initial card viewport: ${JSON.stringify(wideMetrics)}`,
  );
  await page.screenshot({
    path: resolve(evidence, "wide-two-story-spread.png"),
    fullPage: true,
  });
  console.log(
    "PASS wide two-story horizontal spread and un-clipped headline",
    wideMetrics,
  );

  await page.setViewportSize({ width: 1180, height: 820 });
  const tabletSpread = page
    .locator(".native-horizontal-feed .native-scroll-spread")
    .first();
  await tabletSpread.waitFor();
  const tabletImageHeight = await tabletSpread
    .locator(".story-open img, .story-open .type-art")
    .first()
    .evaluate((node) => node.getBoundingClientRect().height);
  assert.ok(
    tabletImageHeight >= 220,
    `Tall wide imagery was only ${tabletImageHeight}px`,
  );
  await page.screenshot({
    path: resolve(evidence, "ipad-wide-spread.png"),
    fullPage: true,
  });
  console.log("PASS tall wide imagery remains prominent", {
    tabletImageHeight,
  });

  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Settings", exact: true })
    .first()
    .click();
  const settings = page.locator(".settings");
  await settings.waitFor();
  const settingMetrics = await settings.evaluate((node) => {
    const section = node.querySelector("section");
    const heading = node.querySelector("h2");
    const choice = node.querySelector(".segmented button");
    const style = getComputedStyle(section);
    const button = choice?.getBoundingClientRect();
    return {
      maxWidth: getComputedStyle(node).maxWidth,
      sectionPadding: style.paddingBlock,
      sectionMargin: style.marginBottom,
      headingSize: parseFloat(getComputedStyle(heading).fontSize),
      choiceHeight: button?.height || 0,
    };
  });
  assert.equal(settingMetrics.maxWidth, "820px");
  assert.ok(settingMetrics.headingSize <= 25.1);
  assert.ok(
    settingMetrics.choiceHeight >= 44,
    "Settings action fell below the 44 px target floor",
  );
  await page.screenshot({
    path: resolve(evidence, "wide-settings.png"),
    fullPage: true,
  });
  console.log(
    "PASS compact Settings layout and accessible action sizing",
    settingMetrics,
  );
} finally {
  await browser.close();
}
