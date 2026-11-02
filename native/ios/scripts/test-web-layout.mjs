import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const ios = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const modules =
  process.env.FYLOGIA_NODE_MODULES ||
  resolve(ios, ".build/golden-source/node_modules");
const { webkit } = await import(resolve(modules, "playwright/index.mjs"));
import { readFileSync } from "node:fs";
const b = await webkit.launch();
const results = [];
for (const [width, height, scale, expected] of [
  [393, 759, 1, 0],
  [440, 900, 1, 0],
  [720, 900, 1, 0],
  [834, 1158, 1, 0],
  [1210, 782, 1, 2],
  [834, 1158, 1.6, 0],
]) {
  const p = await b.newPage({ viewport: { width, height } });
  await p.addInitScript(
    readFileSync(resolve(ios, "web/parity-fixture.js"), "utf8"),
  );
  await p.goto(process.env.FYLOGIA_TEST_URL || "http://127.0.0.1:4174");
  await p.locator(".news-feed-surface, .native-story-list").waitFor();
  await p.evaluate((s) => {
    document.documentElement.dataset.nativeTextScale = s;
    dispatchEvent(new Event("resize"));
  }, String(scale));
  await p.waitForTimeout(250);
  const result = await p
    .locator(".news-feed-surface, .native-story-list")
    .evaluate((e) => ({
      spread: +(e.dataset.paperSpread || 0),
      width: e.clientWidth,
      headlines: [
        ...e.querySelectorAll(
          ":scope > .feed-spread h2, :scope > .feed-sheet h2",
        ),
      ].map((h) => ({
        width: h.clientWidth,
        scrollWidth: h.scrollWidth,
        height: h.clientHeight,
        scrollHeight: h.scrollHeight,
      })),
    }));
  if (
    result.spread !== expected ||
    result.headlines.some(
      (h) => h.scrollWidth > h.width + 1 || h.scrollHeight > h.height + 1,
    )
  )
    throw Error(JSON.stringify({ width, scale, result }));
  const book = await p
    .locator(".news-feed-surface, .native-story-list")
    .boundingBox();
  if (book.y > 140) throw Error("Magazine is pushed below stacked controls");
  await p
    .getByRole("button", { name: "Edition controls", exact: true })
    .click();
  for (const label of ["Sort stories", "Search stories"]) {
    if (!(await p.getByLabel(label, { exact: true }).last().isVisible()))
      throw Error("Control missing: " + label);
  }
  await p.getByRole("button", { name: "Resume reading", exact: true }).click();
  await p.getByRole("button", { name: "Open navigation", exact: true }).click();
  if (
    !(await p
      .getByRole("button", { name: "Settings", exact: true })
      .first()
      .isVisible())
  )
    throw Error("Sidebar unavailable");
  await p
    .getByRole("button", { name: "Close navigation", exact: true })
    .click();
  results.push({
    viewportWidth: width,
    viewportHeight: height,
    scale,
    bookTop: book.y,
    readingAreaFraction: book.height / (height - book.y),
    ...result,
  });
  await p.close();
}
await b.close();
console.log(JSON.stringify(results));
