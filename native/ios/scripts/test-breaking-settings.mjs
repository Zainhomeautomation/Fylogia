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
  await page.addInitScript(() => {
    window.__nativeMessages = [];
    Object.defineProperty(window, "webkit", {
      configurable: true,
      value: {
        messageHandlers: {
          fylogia: {
            postMessage: (message) => window.__nativeMessages.push(message),
          },
        },
      },
    });
  });
  await page.addInitScript(
    readFileSync(resolve(root, "web/parity-fixture.js"), "utf8"),
  );
  await page.goto(process.env.FYLOGIA_TEST_URL || "http://127.0.0.1:4174");
  await page.locator(".native-story-list .story-open").first().waitFor();
  const skip = page.getByRole("button", { name: "Skip tips", exact: true });
  if (await skip.isVisible()) await skip.click();
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Settings", exact: true })
    .first()
    .click();
  const panel = page.locator(".native-breaking");
  await panel.waitFor();
  const optIn = panel.locator("input[type=checkbox]").first();
  assert.equal(await optIn.isChecked(), false, "Breaking alerts default off");
  const topics = panel.locator("fieldset input[type=checkbox]");
  await topics.nth(2).check();
  await optIn.check();
  await page.waitForFunction(() =>
    window.__nativeMessages.some(
      (item) => item.action === "breakingPreferences" && item.optedIn === true,
    ),
  );
  const prefs = await page.evaluate(() =>
    window.__nativeMessages.findLast(
      (item) => item.action === "breakingPreferences",
    ),
  );
  assert.deepEqual(prefs.topics, ["Science"]);
  assert.equal(
    await page.evaluate(() =>
      localStorage.getItem("fylogia.native.breakingOptIn"),
    ),
    "true",
  );
  assert.deepEqual(
    JSON.parse(
      await page.evaluate(() =>
        localStorage.getItem("fylogia.native.breakingTopics"),
      ),
    ),
    ["Science"],
  );
  console.log(
    "PASS breaking alerts default off; explicit opt-in and selected topics reach the native bridge",
  );
} finally {
  await browser.close();
}
