import assert from "node:assert/strict";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";

const root = resolve("native/ios");
const { webkit } = await import(
  resolve(root, ".build/golden-source/node_modules/playwright/index.mjs")
);
const browser = await webkit.launch();
const page = await browser.newPage({ viewport: { width: 393, height: 759 } });
await page.addInitScript(readFileSync(resolve(root, "web/parity-fixture.js"), "utf8"));
const hitTarget = async (locator, name) => {
  const bounds = await locator.boundingBox();
  assert.ok(bounds, `${name} must be visible`);
  assert.ok(bounds.width >= 44, `${name} width ${bounds.width} is below 44 px`);
  assert.ok(bounds.height >= 44, `${name} height ${bounds.height} is below 44 px`);
};
try {
  await page.goto(process.env.FYLOGIA_TEST_URL || "http://127.0.0.1:4174");
  await hitTarget(page.getByRole("button", { name: "Open navigation" }), "Open navigation");
  const card = page.locator(".native-story-list > .feed-sheet").first();
  await card.waitFor();

  const title = "A new perspective on our changing world";
  const art = card.locator(".story-open img");
  assert.match(await art.getAttribute("alt"), new RegExp(`^Story image accompanying: ${title}$`));
  await hitTarget(card.getByRole("button", { name: new RegExp(`^Save ${title}`) }), "Feed bookmark");
  await hitTarget(
    card.getByRole("button", { name: new RegExp(`^Download offline ${title}`) }),
    "Feed offline download",
  );

  await page.getByRole("button", { name: new RegExp(title) }).first().click();
  await hitTarget(page.getByRole("button", { name: "Save article" }), "Article bookmark");
  await hitTarget(
    page.getByRole("button", { name: "Download current article" }),
    "Article offline download",
  );
  await hitTarget(
    page.locator(".reader-download-strip > .text-button"),
    "Reader download action",
  );

  console.log("PASS native accessibility artwork description and feed/article hit targets");
} finally {
  await browser.close();
}
