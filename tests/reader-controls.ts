import { expect, type Page } from "@playwright/test";
export async function readerOption(page: Page, name: string) {
  const control = page.getByRole("button", { name, exact: true });
  if (!(await control.isVisible()))
    await page
      .getByRole("button", { name: "Reading options", exact: true })
      .click();
  await expect(control).toBeVisible();
  return control;
}
