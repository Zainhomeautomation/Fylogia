import { test, expect, type Page } from "@playwright/test";
const proxy =
  !process.env.FYLOGIA_TEST_URL && process.env.FYLOGIA_PAGES_RUNTIME !== "0";
export async function mockEdition(page: Page, edition: unknown) {
  if (proxy) {
    const result = await page.request.post("__test/edition", { data: edition });
    expect(result.ok(), "loopback worker-level edition fixture installed").toBe(
      true,
    );
  } else {
    await page
      .context()
      .route("**/data/edition.json*", (route) =>
        route.fulfill({ json: edition }),
      );
  }
}
export async function restoreEdition(page: Page) {
  if (proxy) {
    const result = await page.request.delete("__test/edition", {
      headers: { "Content-Type": "application/json" },
    });
    expect(result.ok()).toBe(true);
  } else await page.context().unroute("**/data/edition.json*");
}

if (proxy)
  test.afterEach(async ({ page }) => {
    await restoreEdition(page);
  });
