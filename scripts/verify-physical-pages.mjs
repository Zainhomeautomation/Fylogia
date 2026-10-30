// Optional real-publication smoke test; never touches a user's browser library.
import { chromium, webkit, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { defaults } from "../src/catalog.ts";
const arg = (key, fallback) =>
  process.argv.find((a) => a.startsWith(key + "="))?.slice(key.length + 1) ||
  fallback;
const base = arg("--url", "https://fylogia.com/");
const output = resolve(arg("--out", "/tmp/fylogia-physical-pages"));
const commit = arg("--commit", "");
await mkdir(output, { recursive: true });
const results = [];
for (const [name, type, viewport] of [
  ["desktop-chromium", chromium, { width: 1180, height: 900 }],
  ["unfolded-webkit", webkit, { width: 844, height: 740 }],
  ["phone-webkit", webkit, { width: 390, height: 844 }],
]) {
  const browser = await type.launch(),
    context = await browser.newContext({ viewport, hasTouch: true });
  try {
    const page = await context.newPage();
    const info = await (
      await page.request.get(new URL("build-info.json", base).href)
    ).json();
    if (commit) expect(info.commit).toBe(commit);
    await page.addInitScript(
      (p) => localStorage.setItem("folio.v1.preferences", JSON.stringify(p)),
      { ...defaults, complete: true },
    );
    await page.goto(new URL("magazines", base).href);
    await page
      .getByRole("button", { name: "Open NASA Spinoff 2025", exact: true })
      .click();
    const surface = page.locator(".pdf-spread"),
      native = page.locator(".pdf-spread > .pdf-pages canvas");
    await expect(
      page.locator(".pdf-spread > .pdf-pages canvas[aria-busy=false]"),
    ).toHaveCount(1, { timeout: 120000 });
    const facing = viewport.width >= 680;
    await expect(surface).toHaveAttribute(
      "data-paper-spread",
      facing ? "2" : "1",
    );
    await expect(surface).toHaveAttribute("data-spread", "1");
    const b = await native.boundingBox(),
      s = await surface.boundingBox();
    const width = facing ? b.width / 2 : b.width;
    const x = b.x + b.width - 10,
      y = b.y + b.height - 30;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x - width * 0.9, y - 30, { steps: 14 });
    await expect(page.locator(".paper-fold")).toHaveAttribute(
      "data-direction",
      "forward",
    );
    if (facing) {
      await expect(
        page.locator(".paper-fold [data-face=back] img"),
      ).toHaveCount(7, { timeout: 45000 });
      expect(
        Number(await page.locator(".paper-fold").getAttribute("data-hinge")),
      ).toBeCloseTo(b.x - s.x + width, 0);
    }
    await page.screenshot({
      path: resolve(output, name + "-held-curl.png"),
      scale: "css",
    });
    await page.mouse.up();
    await expect(page.locator(".reader-footer")).toContainText("Page 2 of 56", {
      timeout: 45000,
    });
    await expect(page.locator(".paper-fold,.curl-underlay")).toHaveCount(0, {
      timeout: 10000,
    });
    const step = async (key) => {
      await page.keyboard.press(key);
      await expect(page.locator(".paper-fold,.curl-underlay")).toHaveCount(0, {
        timeout: 45000,
      });
    };
    await step("ArrowLeft");
    await expect(page.locator(".reader-footer")).toContainText("Page 1 of 56");
    await page
      .getByRole("button", { name: "Next magazine page", exact: true })
      .click();
    await expect(page.locator(".reader-footer")).toContainText("Page 2 of 56");
    await expect(page.locator(".paper-fold")).toHaveCount(0);
    await page
      .getByRole("button", { name: "Bookmark page", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Back to previous section" })
      .click();
    await page
      .getByRole("button", { name: "Open NASA Spinoff 2025", exact: true })
      .click();
    await expect(page.locator(".reader-footer")).toContainText("Page 2 of 56");
    results.push({
      name,
      viewport,
      commit: info.commit,
      status: "PASS",
      physicalDevice: false,
      nativePdfPages: 56,
      paperSpread: facing ? 2 : 1,
      checks: [
        "actual NASA PDF",
        "held deforming sheet",
        "fixed spine and reverse face on wide layout",
        "forward/backward order",
        "single-tap corner control",
        "bookmark and progress retained",
      ],
    });
    console.log(name, "PASS");
  } finally {
    await context.close();
    await browser.close();
  }
}
await writeFile(
  resolve(output, "verification.json"),
  JSON.stringify(results, null, 2),
);
