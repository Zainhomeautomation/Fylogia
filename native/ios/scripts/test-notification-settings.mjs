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
  await page.goto(process.env.FYLOGIA_TEST_URL || "http://127.0.0.1:4176");
  await page.locator(".native-story-list .story-open").first().waitFor();
  await page.waitForFunction(() => {
    const stories = JSON.parse(
      localStorage.getItem("fylogia.native.dailyHeadlines") || "[]",
    );
    return stories.length > 0;
  });
  const skip = page.getByRole("button", { name: "Skip tips", exact: true });
  if (await skip.isVisible()) await skip.click();
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Settings", exact: true })
    .first()
    .click();

  const enabled = page.getByRole("checkbox", {
    name: "Optional daily summary",
    exact: true,
  });
  await enabled.waitFor();
  assert.equal(
    await enabled.isChecked(),
    false,
    "Daily summary is disabled by default",
  );
  await enabled.check();
  await page.waitForFunction(() =>
    window.__nativeMessages.some(
      (message) =>
        message.action === "notificationPreferences" && message.enabled,
    ),
  );
  const briefing = await page.evaluate(() =>
    window.__nativeMessages.findLast(
      (message) =>
        message.action === "notificationPreferences" && message.enabled,
    ),
  );
  assert.ok(
    briefing.headlines.length > 0,
    "Briefing contains recent story titles",
  );
  const categories = page.locator(
    ".native-notifications fieldset input[type=checkbox]",
  );
  await categories.nth(2).check();
  await page.waitForFunction(() =>
    window.__nativeMessages.some(
      (message) =>
        message.action === "notificationPreferences" &&
        message.topics.includes("Science"),
    ),
  );
  assert.equal(
    await page.evaluate(() =>
      localStorage.getItem("fylogia.native.dailyBriefing"),
    ),
    "true",
  );
  console.log(
    "PASS daily summary defaults off and selected topics reach the native bridge",
  );
} finally {
  await browser.close();
}
