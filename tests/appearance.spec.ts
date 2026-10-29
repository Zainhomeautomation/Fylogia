import { test, expect, type Page } from "@playwright/test";
async function settings(page: Page) {
  const menu = page.getByRole("button", {
    name: "Open navigation",
    exact: true,
  });
  if (await menu.isVisible()) await menu.click();
  await page
    .getByRole("navigation", { name: "Main navigation", exact: true })
    .getByRole("button", { name: "Settings", exact: true })
    .click();
}
test("four themes, navy default, system changes and legacy green preference", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("./");
  await expect(page).toHaveTitle(/Fylogia/);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Create My Fylogia" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "navy");
  await expect(page.locator("html")).toHaveCSS(
    "background-color",
    "rgb(10, 16, 24)",
  );
  await settings(page);
  await expect(page.locator(".appearance-options button")).toHaveCount(4);
  for (const [label, value, color] of [
    ["Editorial Green", "dark", "rgb(18, 26, 23)"],
    ["Light", "light", "rgb(248, 246, 239)"],
    ["Midnight Navy", "navy", "rgb(10, 16, 24)"],
  ]) {
    await page.getByRole("button", { name: label, exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", value);
    await expect(page.locator("html")).toHaveCSS("background-color", color);
    if (process.env.FYLOGIA_SCREENSHOTS)
      await page.screenshot({
        path: `${process.env.FYLOGIA_SCREENSHOTS}/appearance-${value}-${info.project.name}.png`,
      });
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", value);
  }
  await page.getByRole("button", { name: "System", exact: true }).click();
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "navy");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  // The persisted pre-upgrade value remains valid and is still green.
  await page
    .getByRole("button", { name: "Editorial Green", exact: true })
    .click();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("folio.v1.preferences")!).theme,
    ),
  ).toBe("dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(errors).toEqual([]);
});
