import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve("native/ios");
const { webkit } = await import(
  resolve(root, ".build/golden-source/node_modules/playwright/index.mjs")
);
const browser = await webkit.launch();
try {
  const page = await browser.newPage({ viewport: { width: 393, height: 759 } });
  await page.addInitScript(
    readFileSync(resolve(root, "web/parity-fixture.js"), "utf8"),
  );
  await page.goto(process.env.FYLOGIA_TEST_URL || "http://127.0.0.1:4176");
  await page.locator(".native-story-list .story-open").first().waitFor();
  const skip = page.getByRole("button", { name: "Skip tips", exact: true });
  if (await skip.isVisible()) await skip.click();

  await page.evaluate(() =>
    window.__fylogiaDeliverNativeShortcut(
      "categories?fylogiaTopic=World%20News",
    ),
  );
  const worldFilter = page
    .locator('.filter-tabs button[aria-pressed="true"]')
    .filter({ hasText: "World News" });
  await worldFilter.waitFor({ state: "attached" });
  assert.equal(await worldFilter.getAttribute("aria-pressed"), "true");

  await page.evaluate(() => window.__fylogiaDeliverNativeShortcut("saved"));
  await page
    .getByText("Keep something worth returning to.")
    .waitFor({ state: "attached" });
  await page.evaluate(() => window.__fylogiaDeliverNativeShortcut("history"));
  await page
    .getByText("Your reading journey begins here.")
    .waitFor({ state: "attached" });
  console.log(
    "PASS App Intents bridge routes to World News, Saved, and History",
  );
} finally {
  await browser.close();
}
