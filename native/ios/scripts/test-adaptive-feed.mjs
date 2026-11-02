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
  const target = cards.nth(4);
  const id = await target.getAttribute("data-story-id");
  await target.evaluate((e) =>
    e.scrollIntoView({ block: "start", behavior: "instant" }),
  );
  await page.waitForTimeout(300);
  await page.setViewportSize({ width: 1210, height: 782 });
  await page.locator('.news-feed-surface[data-paper-spread="2"]').waitFor();
  await page.waitForTimeout(350);
  const visible = page.locator(
    ".news-feed-surface > .feed-spread [data-story-id]",
  );
  if (
    !(
      await visible.evaluateAll((es) => es.map((e) => e.dataset.storyId))
    ).includes(id)
  )
    throw Error("Rotation lost story anchor");
  await page.setViewportSize({ width: 834, height: 1158 });
  await page.getByRole("region", { name: "Scrolling news feed" }).waitFor();
  await page.waitForTimeout(350);
  const rect = await page.locator(`[data-story-id="${id}"]`).boundingBox();
  if (rect.y < -5 || rect.y > 150)
    throw Error("Portrait anchor not restored " + rect.y);
  for (const [width, height] of [
    [393, 759],
    [440, 900],
    [720, 900],
    [834, 1158],
    [1210, 782],
    [844, 390],
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
    if (clipped) throw Error("Clipped headline at " + width + "x" + height);
  }
  if (
    prefs !==
    (await page.evaluate(() => localStorage.getItem("folio.v1.preferences")))
  )
    throw Error("Preferences changed");
  console.log(
    "PASS adaptive portrait/landscape, anchor round trip, six viewports, complete headlines and unchanged preferences",
  );
} finally {
  await browser.close();
}
