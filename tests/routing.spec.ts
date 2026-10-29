import { test, expect } from "@playwright/test";

test("root metadata and section URLs survive reload, back and offline navigation", async ({
  page,
  context,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Create My Fylogia" }).click();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://fylogia.com/",
  );
  const manifest = await (
    await page.request.get("manifest.webmanifest")
  ).json();
  expect(manifest.start_url).toBe(new URL("./", page.url()).pathname);
  expect(manifest.scope).toBe(manifest.start_url);
  const settings = new URL("settings", page.url()).href;
  const saved = new URL("saved", page.url()).href;
  await page.goto(settings);
  await expect(
    page.getByRole("heading", { name: "Settings", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Settings", exact: true }),
  ).toBeVisible();
  await page.goto(saved);
  await expect(
    page.getByRole("heading", { name: "Saved Articles", exact: true }),
  ).toBeVisible();
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "Settings", exact: true }),
  ).toBeVisible();
  await context.setOffline(true);
  await page.goto(new URL("offline", settings).href);
  await expect(
    page.getByRole("heading", { name: "Offline Library", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Offline Library", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".edition-bar")).toContainText("Offline");
  await context.setOffline(false);
});
