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
  let id = await page
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
  await page.locator(".native-horizontal-feed .native-spread-strip").waitFor();
  await page.waitForTimeout(350);
  const strip = page.locator(".native-spread-strip");
  const activeSpreadIndex = await strip.evaluate((e) =>
    Math.round(e.scrollLeft / e.clientWidth),
  );
  const visible = strip.locator(".native-scroll-spread").nth(activeSpreadIndex);
  const restoredIds = await visible
    .locator("[data-story-id]")
    .evaluateAll((es) => es.map((e) => e.dataset.storyId));
  console.log(
    "Wide anchor after resize",
    await strip.getAttribute("data-native-anchor"),
  );
  if (!restoredIds.includes(id))
    throw Error(
      `Rotation lost story anchor ${id}; visible=${restoredIds.join(",")}; viewport=${await page.evaluate(() => `${innerWidth}x${innerHeight}`)}`,
    );
  if ((await visible.locator("[data-story-id]").count()) !== 2)
    throw Error(
      "Wide landscape must retain two facing stories per horizontal spread",
    );
  const previousButton = page.getByRole("button", { name: "Previous spread" });
  const nextButton = page.getByRole("button", { name: "Next spread" });
  const controls = page.getByRole("navigation", { name: "Spread navigation" });
  await controls.waitFor();
  const controlSizes = await Promise.all(
    [previousButton, nextButton].map((button) =>
      button.evaluate((e) => {
        const rect = e.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      }),
    ),
  );
  if (controlSizes.some(({ width, height }) => width < 44 || height < 44))
    throw Error(`Spread controls are below the 44 px target: ${JSON.stringify(controlSizes)}`);
  const firstStory = await strip.locator("[data-story-id]").first().getAttribute("data-story-id");
  await strip.evaluate((e) => {
    e.scrollTo({ left: 0, behavior: "instant" });
    e.dispatchEvent(new Event("scroll", { bubbles: true }));
  });
  await page.waitForFunction(() =>
    document.querySelector('[aria-label="Previous spread"]')?.disabled,
  );
  if (await nextButton.isDisabled()) throw Error("Next spread is unexpectedly disabled at the first spread");
  const firstLabel = await page.locator(".native-spread-controls .feed-pagination").textContent();
  await nextButton.click();
  await page.waitForFunction((old) => {
    const label = document.querySelector(".native-spread-controls .feed-pagination")?.textContent;
    const strip = document.querySelector(".native-spread-strip");
    return label !== old && Boolean(strip && strip.scrollLeft > 0);
  }, firstLabel);
  await page.waitForFunction(() =>
    document.querySelector('[aria-label="Previous spread"]')?.disabled === false,
  );
  if (await previousButton.isDisabled()) throw Error("Previous spread stayed disabled after advancing");
  await previousButton.click();
  await page.waitForFunction((old) =>
    document.querySelector(".native-spread-controls .feed-pagination")?.textContent === old,
  firstLabel);
  await page.waitForFunction(() =>
    document.querySelector('[aria-label="Previous spread"]')?.disabled,
  );
  if ((await strip.getAttribute("data-native-anchor")) !== firstStory)
    throw Error("Previous/next controls did not restore the first spread's reading anchor");
  await strip.evaluate((e) => {
    e.scrollTo({ left: e.scrollWidth, behavior: "instant" });
    e.dispatchEvent(new Event("scroll", { bubbles: true }));
  });
  await page.waitForFunction(() =>
    document.querySelector('[aria-label="Next spread"]')?.disabled,
  );
  if (await previousButton.isDisabled()) throw Error("Previous spread is disabled at the final spread");
  await strip.evaluate((e) => {
    e.scrollTo({ left: 0, behavior: "instant" });
    e.dispatchEvent(new Event("scroll", { bubbles: true }));
  });
  await page.waitForFunction(() =>
    document.querySelector('[aria-label="Previous spread"]')?.disabled,
  );
  console.log("PASS accessible spread controls: 44 px targets, disabled boundary, forward/back navigation and anchor restoration");
  const priorLabel = await page
    .locator(".native-horizontal-feed .feed-pagination")
    .textContent();
  const priorLeft = await strip.evaluate((e) => e.scrollLeft);
  await strip.evaluate((e) =>
    e.scrollTo({ left: e.scrollLeft + e.clientWidth, behavior: "instant" }),
  );
  await page.waitForFunction(
    (old) =>
      document.querySelector(".native-horizontal-feed .feed-pagination")
        ?.textContent !== old,
    priorLabel,
  );
  if ((await strip.evaluate((e) => e.scrollLeft)) <= priorLeft)
    throw Error("Horizontal scrolling did not reveal the next facing spread");
  id = await strip.getAttribute("data-native-anchor");
  if (!id)
    throw Error("Horizontal spread navigation did not preserve a story anchor");
  if (
    await page
      .locator(".news-feed-surface, .nativeGoldenCurl, .paper-fold.turn-leaf")
      .count()
  )
    throw Error("Landscape scroll mode must not mount a curl surface");
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
      await page
        .locator(".native-horizontal-feed .native-scroll-spread")
        .first()
        .waitFor();
    else
      await page.getByRole("region", { name: "Scrolling news feed" }).waitFor();
    const clipped = await page
      .locator(
        wide
          ? ".native-horizontal-feed .feed-sheet h2"
          : ".native-story-list h2",
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
      wide ? "two facing stories with horizontal scrolling" : "vertical feed",
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
