import { test, expect } from "@playwright/test";
import { defaults } from "../src/catalog";

const tagline = "Your World, One Page at a Time.";
test("homepage brand tagline stays secondary, responsive and exclusive to For You", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(
    (prefs) => {
      if (!localStorage.getItem("folio.v1.preferences"))
        localStorage.setItem("folio.v1.preferences", JSON.stringify(prefs));
    },
    { ...defaults, complete: true, sourceIds: ["nasa"] },
  );
  for (const theme of ["navy", "dark", "light"]) {
    await page.goto("./");
    await page.evaluate((theme) => {
      const prefs = JSON.parse(localStorage.getItem("folio.v1.preferences")!);
      localStorage.setItem(
        "folio.v1.preferences",
        JSON.stringify({ ...prefs, theme }),
      );
    }, theme);
    await page.reload();
    await expect(page).toHaveTitle(`Fylogia — ${tagline}`);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await page.evaluate(() => document.fonts.ready);
    for (const [width, height] of [
      [360, 780],
      [390, 844],
      [844, 740],
      [768, 1024],
      [1024, 1366],
      [1440, 1000],
    ]) {
      await page.setViewportSize({ width, height });
      const visible = page.locator(".brand-tagline:visible");
      await expect(visible).toHaveCount(1);
      await expect(visible).toHaveText(tagline);
      const box = await visible.boundingBox();
      const logo = await visible
        .locator("..")
        .locator(".wordmark")
        .boundingBox();
      expect(box!.y).toBeGreaterThanOrEqual(logo!.y + logo!.height);
      expect(box!.y - logo!.y - logo!.height).toBeLessThanOrEqual(8);
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      expect(
        await visible.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
      ).toBeTruthy();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy();
      await expect(page.locator("vite-error-overlay")).toHaveCount(0);
      if (width < 760) {
        expect(
          (await page.locator(".mobile-header").boundingBox())!.height,
        ).toBeLessThanOrEqual(78);
      }
      if (
        process.env.FYLOGIA_SCREENSHOTS &&
        ((theme === "navy" && width === 360) ||
          (theme === "light" && width === 1440))
      )
        await page.screenshot({
          path: `${process.env.FYLOGIA_SCREENSHOTS}/tagline-${info.project.name}-${theme}.png`,
        });
    }
  }
  const preferences = await page.evaluate(() =>
    localStorage.getItem("folio.v1.preferences"),
  );
  await page
    .getByRole("navigation", { name: "Main navigation", exact: true })
    .getByRole("button", { name: "Explore", exact: true })
    .click();
  await expect(page.locator(".brand-tagline")).toHaveCount(0);
  await page
    .getByRole("navigation", { name: "Main navigation", exact: true })
    .getByRole("button", { name: "For You", exact: true })
    .click();
  await expect(page.locator(".brand-tagline:visible")).toHaveText(tagline);
  expect(
    await page.evaluate(() => localStorage.getItem("folio.v1.preferences")),
  ).toBe(preferences);
  expect(errors).toEqual([]);
});
