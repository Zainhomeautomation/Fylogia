import { resolve } from "node:path";
import { readFileSync } from "node:fs";
const root = resolve("native/ios"),
  modules = resolve(root, ".build/golden-source/node_modules");
const { webkit } = await import(resolve(modules, "playwright/index.mjs"));
const browser = await webkit.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 834, height: 1158 },
  });
  await page.addInitScript(
    readFileSync(resolve(root, "web/parity-fixture.js"), "utf8"),
  );
  await page.goto(process.env.FYLOGIA_TEST_URL || "http://127.0.0.1:4174");
  await page.getByRole("region", { name: "Scrolling news feed" }).waitFor();
  const prefs = await page.evaluate(() =>
    localStorage.getItem("folio.v1.preferences"),
  );
  const cards = page.locator(".native-story-list > [data-story-id]");
  if ((await cards.count()) !== 8)
    throw Error("Portrait must show all stories");
  await page.mouse.move(420, 420);
  await page.mouse.wheel(0, 1100);
  await page.waitForTimeout(300);
  const id = await page
    .locator(".native-story-list")
    .getAttribute("data-native-anchor");
  if (!id || id === (await cards.nth(0).getAttribute("data-story-id")))
    throw Error(
      `A real scroll gesture did not record the reading anchor: ${id}; scrollY=${await page.evaluate(() => window.scrollY)}`,
    );
  console.log(
    "Portrait anchor before resize",
    id,
    "scrollY",
    await page.evaluate(() => window.scrollY),
  );
  await page.setViewportSize({ width: 1210, height: 782 });
  await page.locator('.news-feed-surface[data-paper-spread="2"]').waitFor();
  await page.waitForTimeout(350);
  const visible = page.locator(
    ".news-feed-surface > .feed-spread [data-story-id]",
  );
  const restoredIds = await visible.evaluateAll((es) =>
    es.map((e) => e.dataset.storyId),
  );
  console.log(
    "Wide anchor after resize",
    await page.locator(".news-feed-surface").getAttribute("data-native-anchor"),
  );
  if (!restoredIds.includes(id))
    throw Error(
      `Rotation lost story anchor ${id}; visible=${restoredIds.join(",")}; viewport=${await page.evaluate(() => `${innerWidth}x${innerHeight}`)}`,
    );
  await page.setViewportSize({ width: 834, height: 1158 });
  await page.getByRole("region", { name: "Scrolling news feed" }).waitFor();
  await page.waitForTimeout(350);
  const rect = await page.locator(`[data-story-id="${id}"]`).boundingBox();
  if (rect.y < -5 || rect.y > 150)
    throw Error("Portrait anchor not restored " + rect.y);
  for (const [name, width, height] of [
    ["standard phone portrait", 393, 759],
    ["large phone portrait", 440, 900],
    ["tablet portrait", 834, 1158],
    ["compact wide", 720, 900],
    ["wide landscape", 1210, 782],
    ["short landscape", 844, 390],
    ["Duo external portrait viewport", 390, 844],
    ["Duo external landscape viewport", 844, 390],
    ["Duo internal portrait viewport", 840, 900],
    ["Duo internal landscape viewport", 1180, 820],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(350);
    const wide = width >= 680 && width >= height * 0.9;
    if (wide)
      await page.locator('.news-feed-surface[data-paper-spread="2"]').waitFor();
    else
      await page.getByRole("region", { name: "Scrolling news feed" }).waitFor();
    const clipped = await page
      .locator(
        wide ? ".news-feed-surface > .feed-spread h2" : ".native-story-list h2",
      )
      .evaluateAll((es) =>
        es.some(
          (e) =>
            e.scrollWidth > e.clientWidth + 1 ||
            e.scrollHeight > e.clientHeight + 1,
        ),
      );
    if (clipped)
      throw Error(
        "Clipped headline at " + name + " (" + width + "x" + height + ")",
      );
    console.log(
      "PASS",
      name,
      `${width}x${height}`,
      wide ? "facing pages" : "vertical feed",
    );
  }
  if (
    prefs !==
    (await page.evaluate(() => localStorage.getItem("folio.v1.preferences")))
  )
    throw Error("Preferences changed");
  console.log(
    "PASS adaptive portrait/landscape, anchor round trip, ten viewports, complete headlines and unchanged preferences",
  );
} finally {
  await browser.close();
}
