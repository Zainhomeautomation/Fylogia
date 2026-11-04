import assert from "node:assert/strict";
import { resolve } from "node:path";
import { readFileSync, mkdirSync } from "node:fs";

const root = resolve("native/ios");
const { webkit } = await import(
  resolve(root, ".build/golden-source/node_modules/playwright/index.mjs")
);
const browser = await webkit.launch();
const fixture = readFileSync(
  resolve(root, "web/parity-fixture.js"),
  "utf8",
).replaceAll('"nasa"', '"bbc-world"');
const url = process.env.FYLOGIA_TEST_URL || "http://127.0.0.1:4176";
const evidence =
  process.env.FYLOGIA_REVIEW_DIR || resolve(root, ".build/launch-review");
mkdirSync(evidence, { recursive: true });
try {
  // Fresh library: no setup gate, headlines remain visible behind optional tips.
  const context = await browser.newContext({
    viewport: { width: 393, height: 759 },
  });
  await context.addInitScript(
    fixture +
      `
    if (!sessionStorage.getItem("native-launched"))
      localStorage.removeItem("folio.v1.preferences");
  `,
  );
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  const requests = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto(url);
  assert.match(await page.title(), /Fylogia/);
  await page.locator(".native-story-list .story-open").first().waitFor();
  assert.equal(
    await page.locator(".native-story-list > .feed-sheet").count(),
    8,
  );
  assert.equal(await page.locator(".onboarding").count(), 0);
  await page
    .getByRole("complementary", { name: "Reading tips", exact: true })
    .waitFor();
  const preferences = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("folio.v1.preferences")),
  );
  assert.equal(preferences.complete, true);
  assert.ok(preferences.sourceIds.includes("bbc-world"));
  await page.screenshot({ path: resolve(evidence, "first-reading-phone.png") });
  for (const title of [
    "Keep a good story",
    "Read your way",
    "Choose your sources",
  ]) {
    await page.getByRole("button", { name: "Next tip", exact: true }).click();
    await page.getByRole("heading", { name: title, exact: true }).waitFor();
  }
  await page
    .getByRole("button", { name: "Start reading", exact: true })
    .click();
  assert.equal(await page.locator(".native-reading-tips").count(), 0);
  await page
    .locator(".native-story-list > .feed-sheet")
    .first()
    .getByRole("button", { name: /^Save / })
    .click();
  await page
    .locator(".native-story-list > .feed-sheet")
    .first()
    .getByRole("button", { name: /^Unsave / })
    .waitFor();
  await page.evaluate(() => {
    sessionStorage.setItem("native-launched", "true");
  });
  await page.reload();
  await page.locator(".native-story-list").waitFor();
  assert.equal(await page.locator(".native-reading-tips").count(), 0);
  await page
    .locator(".native-story-list > .feed-sheet")
    .first()
    .getByRole("button", { name: /^Unsave / })
    .waitFor();
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Settings", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Reading tips", exact: true }).click();
  await page
    .getByRole("heading", { name: "Make yourself comfortable", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Skip tips", exact: true }).click();
  assert.equal(await page.locator(".native-reading-tips").count(), 0);
  assert.ok(
    !requests.some((request) => /\/api\/sync\//.test(request)),
    "No web-account pairing on native startup",
  );
  assert.deepEqual(errors, []);
  await context.close();

  // An existing library, including its theme, sources, saved stories and reading
  // position, must survive launch unchanged, and must not see unsolicited tips.
  const existing = await browser.newContext({
    viewport: { width: 1210, height: 782 },
  });
  await existing.addInitScript(
    fixture +
      `
    const prefs = JSON.parse(localStorage.getItem("folio.v1.preferences"));
    prefs.theme = "light";
    prefs.fontSize = 22;
    localStorage.setItem("folio.v1.preferences", JSON.stringify(prefs));
    localStorage.setItem("folio.v1.progress", JSON.stringify({"native-parity-0": 0.42}));
  `,
  );
  const oldPage = await existing.newPage();
  await oldPage.goto(url);
  await oldPage.locator(".news-feed-surface").waitFor();
  assert.equal(await oldPage.locator(".native-reading-tips").count(), 0);
  const retained = await oldPage.evaluate(() => ({
    preferences: JSON.parse(localStorage.getItem("folio.v1.preferences")),
    progress: JSON.parse(localStorage.getItem("folio.v1.progress")),
  }));
  assert.equal(retained.preferences.theme, "light");
  assert.equal(retained.preferences.fontSize, 22);
  assert.deepEqual(retained.preferences.sourceIds, ["bbc-world"]);
  assert.equal(retained.progress["native-parity-0"], 0.42);
  await oldPage.screenshot({
    path: resolve(evidence, "existing-reading-wide.png"),
  });
  await existing.close();

  const partial = await browser.newContext({
    viewport: { width: 393, height: 759 },
  });
  await partial.addInitScript(
    fixture +
      `
    const prefs = JSON.parse(localStorage.getItem("folio.v1.preferences"));
    prefs.complete = false;
    prefs.theme = "light";
    prefs.fontSize = 24;
    localStorage.setItem("folio.v1.preferences", JSON.stringify(prefs));
  `,
  );
  const partialPage = await partial.newPage();
  await partialPage.goto(url);
  await partialPage.locator(".native-story-list").waitFor();
  const resumed = await partialPage.evaluate(() =>
    JSON.parse(localStorage.getItem("folio.v1.preferences")),
  );
  assert.equal(resumed.complete, true);
  assert.equal(resumed.theme, "light");
  assert.equal(resumed.fontSize, 24);
  assert.deepEqual(resumed.sourceIds, ["bbc-world"]);
  await partialPage
    .getByRole("button", { name: "Skip tips", exact: true })
    .click();
  assert.equal(await partialPage.locator(".native-reading-tips").count(), 0);
  await partial.close();
  console.log(
    "PASS fresh general-news launch, four optional tips, saved story/restart, Settings replay/skip, existing and incomplete preferences/progress, no web pairing, no JS errors",
  );
} finally {
  await browser.close();
}
