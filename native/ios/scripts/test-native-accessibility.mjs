import assert from "node:assert/strict";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";

const root = resolve("native/ios");
const { webkit } = await import(
  resolve(root, ".build/golden-source/node_modules/playwright/index.mjs")
);
const browser = await webkit.launch();
const page = await browser.newPage({ viewport: { width: 393, height: 759 } });
await page.addInitScript(
  readFileSync(resolve(root, "web/parity-fixture.js"), "utf8"),
);
const hitTarget = async (locator, name) => {
  const bounds = await locator.boundingBox();
  assert.ok(bounds, `${name} must be visible`);
  assert.ok(bounds.width >= 44, `${name} width ${bounds.width} is below 44 px`);
  assert.ok(
    bounds.height >= 44,
    `${name} height ${bounds.height} is below 44 px`,
  );
};
try {
  await page.goto(process.env.FYLOGIA_TEST_URL || "http://127.0.0.1:4174");
  await hitTarget(
    page.getByRole("button", { name: "Open navigation" }),
    "Open navigation",
  );
  const card = page.locator(".native-story-list > .feed-sheet").first();
  await card.waitFor();

  const title = "A new perspective on our changing world";
  const art = card.locator(".story-open img");
  assert.match(
    await art.getAttribute("alt"),
    new RegExp(`^Story image accompanying: ${title}$`),
  );
  await hitTarget(
    card.getByRole("button", { name: new RegExp(`^Save ${title}`) }),
    "Feed bookmark",
  );
  await hitTarget(
    card.getByRole("button", {
      name: new RegExp(`^Download offline ${title}`),
    }),
    "Feed offline download",
  );

  await page
    .getByRole("button", { name: new RegExp(title) })
    .first()
    .click();
  await hitTarget(
    page.getByRole("button", { name: "Save article" }),
    "Article bookmark",
  );
  await hitTarget(
    page.getByRole("button", { name: "Download current article" }),
    "Article offline download",
  );
  await hitTarget(
    page.locator(".reader-download-strip > .text-button"),
    "Reader download action",
  );

  const settingsPage = await browser.newPage({
    viewport: { width: 393, height: 852 },
  });
  await settingsPage.addInitScript(
    readFileSync(resolve(root, "web/parity-fixture.js"), "utf8"),
  );
  await settingsPage.goto(
    process.env.FYLOGIA_TEST_URL || "http://127.0.0.1:4174",
  );
  await settingsPage.getByRole("button", { name: "Open navigation" }).click();
  await settingsPage
    .getByRole("button", { name: "Settings", exact: true })
    .first()
    .click();

  const paperRow = settingsPage
    .locator(".native-options label")
    .filter({ hasText: "Warm cream paper" });
  const paperSwitch = paperRow.locator('input[type="checkbox"]');
  const assertPaperTarget = async (layout) => {
    const controlBounds = await paperSwitch.boundingBox();
    const rowBounds = await paperRow.boundingBox();
    const mark = await paperRow
      .locator(".native-checkbox-indicator")
      .boundingBox();
    assert.ok(controlBounds, `${layout} appearance control must be exposed`);
    assert.ok(
      controlBounds.width >= 44,
      `${layout} switch width ${controlBounds.width} is below 44 px`,
    );
    assert.ok(
      controlBounds.height >= 44,
      `${layout} switch height ${controlBounds.height} is below 44 px`,
    );
    assert.ok(
      rowBounds && rowBounds.height >= 44,
      `${layout} Settings row must retain a 44 px hit area`,
    );
    assert.deepEqual(
      mark && { width: mark.width, height: mark.height },
      { width: 18, height: 18 },
      `${layout} visible checkbox mark must remain compact`,
    );
  };

  await paperSwitch.waitFor();
  const initiallyChecked = await paperSwitch.isChecked();
  await assertPaperTarget("Compact");
  await paperSwitch.setChecked(!initiallyChecked);
  assert.equal(await paperSwitch.isChecked(), !initiallyChecked);
  await paperSwitch.setChecked(initiallyChecked);

  await settingsPage.setViewportSize({ width: 1180, height: 820 });
  await assertPaperTarget("Wide");
  await paperSwitch.setChecked(!initiallyChecked);
  assert.equal(await paperSwitch.isChecked(), !initiallyChecked);
  await paperSwitch.setChecked(initiallyChecked);
  await settingsPage.close();

  console.log(
    "PASS native accessibility artwork description, feed/article hit targets, and 44 px Settings switch target in compact and wide layouts",
  );
} finally {
  await browser.close();
}
