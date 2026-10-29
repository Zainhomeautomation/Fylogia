import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

async function nav(page: Page, name: string) {
  // IndexedDB restoration may finish after the document load event.
  await expect(page.locator(".mobile-header")).toBeAttached();
  if (await page.getByRole("button", { name: "Open navigation" }).isVisible())
    await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("navigation", { name: "Main navigation", exact: true })
    .getByRole("button", { name, exact: true })
    .click();
}
async function fixture(page: Page) {
  const edition = await (await page.request.get("data/edition.json")).json();
  const article = edition.articles
    .filter((a: any) => a.full)
    .sort((a: any, b: any) => b.content.length - a.content.length)[0];
  await page.route("**/data/edition.json*", (route) =>
    route.fulfill({
      json: {
        ...edition,
        articles: [
          { ...article, image: undefined, offlineImagesAllowed: false },
        ],
      },
    }),
  );
  return article;
}
async function onboard(page: Page) {
  await page.goto("./");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Create My Fylogia" }).click();
  await expect(page.locator(".story").first()).toBeVisible();
}
async function saved(page: Page) {
  await nav(page, "Settings");
  await expect(page.getByTestId("local-save-state")).toHaveText(
    "Saved on this device",
  );
}
async function values(page: Page) {
  return page.evaluate(() =>
    Object.fromEntries(
      ["preferences", "saved", "history", "progress", "custom", "profile"].map(
        (key) => [key, JSON.parse(localStorage.getItem("folio.v1." + key)!)],
      ),
    ),
  );
}
async function bookmark(page: Page) {
  await page
    .locator(".story")
    .first()
    .getByRole("button", { name: /^Save / })
    .click();
}
test("anonymous profile and entire library recover offline from IndexedDB after primary storage loss", async ({
  page,
  context,
}) => {
  const article = await fixture(page);
  await onboard(page);
  await bookmark(page);
  await page.locator(".story-open").first().click();
  await expect(page.getByRole("button", { name: "Next page" })).toBeEnabled();
  await page.getByRole("button", { name: "Next page" }).click();
  // A late publisher image load must not restore the previous page before close.
  await page.locator(".reader-content").dispatchEvent("load");
  await page.getByRole("button", { name: "Close reader" }).click();
  await nav(page, "My Sources");
  await page
    .locator(".source-row")
    .filter({ hasText: "BBC · World" })
    .getByRole("button", { name: /^Follow/ })
    .click();
  await saved(page);
  await page
    .getByLabel("Regional news", { exact: true })
    .selectOption("Europe");
  await expect(page.getByTestId("local-save-state")).toHaveText(
    "Saved on this device",
  );
  const before = await values(page);
  expect(before.profile.id).toMatch(/^[a-f0-9-]{36}$/);
  expect(before.progress[article.id]).toBeGreaterThan(0);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await page.evaluate(() => {
    for (const key of Object.keys(localStorage))
      if (key.startsWith("folio.v1.") || key.startsWith("folio.local."))
        localStorage.removeItem(key);
  });
  await context.setOffline(true);
  await page.reload();
  await saved(page);
  await expect(
    page.getByText("Your library was recovered from its local IndexedDB copy."),
  ).toBeVisible();
  expect(await values(page)).toEqual(before);
  await nav(page, "Saved Articles");
  await expect(
    page.getByRole("heading", { name: article.title, exact: true }),
  ).toBeVisible();
  await page.locator(".story-open").first().click();
  await expect(
    page.getByRole("button", { name: "Previous page" }),
  ).toBeEnabled();
  await context.setOffline(false);
});

test("IndexedDB preserves the library when localStorage writes are blocked", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith("folio."))
        throw new DOMException("Full", "QuotaExceededError");
      return original.call(this, key, value);
    };
  });
  const article = await fixture(page);
  await onboard(page);
  await bookmark(page);
  await saved(page);
  await page.reload();
  await saved(page);
  await nav(page, "Saved Articles");
  await expect(
    page.getByRole("heading", { name: article.title, exact: true }),
  ).toBeVisible();
});

test("complete storage failure is visible and current in-memory library can still be exported", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const open = IDBFactory.prototype.open;
    IDBFactory.prototype.open = function (name, version) {
      if (name === "folio-personal-library")
        throw new DOMException("Blocked", "SecurityError");
      return version ? open.call(this, name, version) : open.call(this, name);
    };
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith("folio."))
        throw new DOMException("Blocked", "SecurityError");
      return set.call(this, key, value);
    };
  });
  const article = await fixture(page);
  await onboard(page);
  await bookmark(page);
  await nav(page, "Settings");
  await expect(page.getByTestId("local-save-state")).toHaveText(
    "Changes are only in this tab",
  );
  await expect(
    page.getByText(/Changes could not be saved on this device/),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export library", exact: true })
    .click();
  const path = await (await download).path();
  expect(JSON.parse(await readFile(path!, "utf8")).saved[0].id).toBe(
    article.id,
  );
});

test("encrypted backup restores on another device without cloning identity; wrong password and tampering change nothing", async ({
  page,
  browser,
}) => {
  const article = await fixture(page);
  await onboard(page);
  await bookmark(page);
  await page
    .locator(".story")
    .first()
    .getByRole("button", { name: /^Download / })
    .click();
  await expect(page.locator(".download-notice")).toContainText(
    "1 article downloaded.",
  );
  await saved(page);
  const original = await values(page);
  if (process.env.FYLOGIA_SCREENSHOTS) {
    await page
      .getByRole("heading", { name: "Your anonymous profile", exact: true })
      .scrollIntoViewIfNeeded();
    await page.screenshot({
      path:
        process.env.FYLOGIA_SCREENSHOTS +
        "/" +
        test.info().project.name +
        "-local-profile.png",
    });
  }
  const password = "A private recovery phrase 2026!";
  await page.getByLabel("Backup password", { exact: true }).fill(password);
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export encrypted backup", exact: true })
    .click();
  const download = await pending;
  const encrypted = await readFile((await download.path())!, "utf8");
  expect(encrypted).not.toContain(article.title);
  expect(encrypted).not.toContain(password);
  expect(encrypted).not.toContain(original.profile.id);
  expect(download.suggestedFilename()).toBe("fylogia-library.encrypted.json");
  await expect(page.getByLabel("Backup password", { exact: true })).toHaveValue(
    "",
  );
  const device = await browser.newContext({
    baseURL: new URL("./", page.url()).href,
  });
  try {
    const other = await device.newPage();
    await fixture(other);
    await onboard(other);
    await saved(other);
    const before = await values(other);
    expect(before.profile.id).not.toBe(original.profile.id);
    async function restore(text: string) {
      await other.locator("input[type=file]").setInputFiles({
        name: "private.encrypted.json",
        mimeType: "application/json",
        buffer: Buffer.from(text),
      });
    }
    await other
      .getByLabel("Backup password", { exact: true })
      .fill("incorrect password");
    await restore(encrypted);
    await expect(other.getByRole("status")).toContainText(
      "Could not unlock this backup",
    );
    expect(await values(other)).toEqual(before);
    const changed = JSON.parse(encrypted);
    changed.ciphertext =
      (changed.ciphertext[0] === "A" ? "B" : "A") + changed.ciphertext.slice(1);
    await other.getByLabel("Backup password", { exact: true }).fill(password);
    await restore(JSON.stringify(changed));
    await expect(other.getByRole("status")).toContainText(
      "Could not unlock this backup",
    );
    expect(await values(other)).toEqual(before);
    await restore(encrypted);
    await expect(other.getByRole("status")).toContainText(
      "Library imported successfully.",
    );
    const restored = await values(other);
    expect(restored.profile.id).toBe(before.profile.id);
    for (const key of ["preferences", "saved", "history", "progress", "custom"])
      expect(restored[key]).toEqual(original[key]);
    await nav(other, "Offline Library");
    await expect(other.locator(".offline-row")).toHaveCount(0);
    await nav(other, "Saved Articles");
    await expect(
      other.getByRole("heading", { name: article.title, exact: true }),
    ).toBeVisible();
  } finally {
    await device.close();
  }
});

test("invalid backup sections and a failed restore transaction cannot partially replace the library", async ({
  page,
}) => {
  await fixture(page);
  await onboard(page);
  await bookmark(page);
  await saved(page);
  const before = await values(page);
  const backup = {
    version: 1,
    ...before,
    preferences: { ...before.preferences, interests: ["Cooking"] },
    progress: { bad: 2 },
  };
  await page.locator("input[type=file]").setInputFiles({
    name: "broken.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(page.getByRole("status")).toContainText("No changes were made.");
  expect(await values(page)).toEqual(before);
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put;
    let writes = 0;
    IDBObjectStore.prototype.put = function (value, key) {
      if (
        this.transaction.db.name === "folio-personal-library" &&
        ++writes === 2
      )
        throw new DOMException("Storage full", "QuotaExceededError");
      return key === undefined
        ? put.call(this, value)
        : put.call(this, value, key);
    };
  });
  backup.progress = {} as any;
  await page.locator("input[type=file]").setInputFiles({
    name: "valid.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(page.getByRole("status")).toContainText(
    "Restore requires writable IndexedDB",
  );
  expect(await values(page)).toEqual(before);
  await page.reload();
  await saved(page);
  expect(await values(page)).toEqual(before);
});
