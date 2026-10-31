import { test, expect } from "@playwright/test";
import { defaults } from "../src/catalog";
import { magazineFixture } from "./pdf-fixture";
test("installed-shell update is explicit, hidden in a reader and preserves the private library", async ({
  page,
}) => {
  await page.addInitScript(
    (p) => localStorage.setItem("folio.v1.preferences", JSON.stringify(p)),
    { ...defaults, complete: true, theme: "dark", topics: ["iPhone"] },
  );
  await page.goto("./magazines");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBeTruthy();
  // Reload once under the installed shell so this is an update, not installation.
  await page.reload();
  await page.locator("input[type=file]").setInputFiles({
    name: "Update preservation.pdf",
    mimeType: "application/pdf",
    buffer: magazineFixture(8),
  });
  await page
    .getByRole("button", { name: "Open Update preservation", exact: true })
    .click();
  await expect(
    page.locator(".pdf-page canvas[aria-busy=false]").first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Next magazine page", exact: true })
    .click();
  await expect(page.locator(".paper-fold")).toHaveCount(0);
  const position = await page
    .locator(".reader-footer [role=status]")
    .innerText();
  await page.evaluate(() =>
    navigator.serviceWorker.dispatchEvent(new Event("controllerchange")),
  );
  await expect(
    page.getByRole("complementary", { name: "Application update" }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("complementary", { name: "Application update" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Update Fylogia", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Open Update preservation", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("folio.v1.preferences")!).theme,
    ),
  ).toBe("dark");
  await page
    .getByRole("button", { name: "Open Update preservation", exact: true })
    .click();
  await expect(page.locator(".reader-footer [role=status]")).toHaveText(
    position,
  );
});
