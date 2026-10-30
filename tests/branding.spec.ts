import { test, expect } from "@playwright/test";
import { defaults } from "../src/catalog";
test("official logo, light variant, favicons, maskable safe area and offline branding", async ({
  page,
  context,
}) => {
  await page.goto("./");
  await expect(
    page.locator(".onboard-brand .brand-mark img:visible"),
  ).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator(".onboard-brand .brand-mark img:visible")
        .evaluate(
          (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
        ),
    )
    .toBeTruthy();
  await page.addInitScript(
    (p) => {
      if (!sessionStorage.getItem("brand-test-initialized")) {
        localStorage.setItem("folio.v1.preferences", JSON.stringify(p));
        sessionStorage.setItem("brand-test-initialized", "1");
      }
    },
    { ...defaults, complete: true, sourceIds: ["nasa"] },
  );
  await page.reload();
  const before = await page.evaluate(() =>
    localStorage.getItem("folio.v1.preferences"),
  );
  const visibleLogo = page.locator(".brand-name .brand-mark img:visible");
  await expect(visibleLogo).toHaveCount(1);
  await expect
    .poll(() =>
      visibleLogo.evaluate(
        (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
      ),
    )
    .toBeTruthy();
  for (const [rel, href] of [
    ["icon", "favicon.svg"],
    ["icon", "favicon.ico"],
    ["apple-touch-icon", "apple-touch-icon.png"],
  ]) {
    const link = page.locator(`link[rel="${rel}"][href$="${href}"]`);
    await expect(link).toHaveCount(1);
    const response = await page.request.get((await link.getAttribute("href"))!);
    expect(response.ok()).toBeTruthy();
  }
  const manifest = await (
    await page.request.get("manifest.webmanifest")
  ).json();
  for (const icon of manifest.icons)
    expect((await page.request.get(icon.src)).ok()).toBeTruthy();
  const outside = await page.evaluate(async () => {
    const img = new Image();
    img.src = new URL("icons/maskable-512.png", document.baseURI).href;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, 512, 512).data;
    let outside = 0;
    for (let y = 0; y < 512; y++)
      for (let x = 0; x < 512; x++) {
        const p = (y * 512 + x) * 4;
        if (
          Math.hypot(x - 255.5, y - 255.5) > 204.8 &&
          (data[p] !== 10 || data[p + 1] !== 16 || data[p + 2] !== 24)
        )
          outside++;
      }
    return outside;
  });
  expect(outside).toBe(0);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // A navigation after activation reliably acquires control in WebKit too.
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();
  await expect(visibleLogo).toHaveCount(1);
  await expect
    .poll(() =>
      visibleLogo.evaluate(
        (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
      ),
    )
    .toBeTruthy();
  expect(
    await page.evaluate(() => localStorage.getItem("folio.v1.preferences")),
  ).toBe(before);
  if (
    await page
      .getByRole("button", { name: "Open navigation", exact: true })
      .isVisible()
  )
    await page
      .getByRole("button", { name: "Open navigation", exact: true })
      .click();
  await page
    .getByRole("navigation", { name: "Main navigation", exact: true })
    .getByRole("button", { name: "Saved Articles", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Keep something worth returning to.",
      exact: true,
    }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator(".empty .brand-mark img:visible")
        .evaluate(
          (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
        ),
    )
    .toBeTruthy();
});
