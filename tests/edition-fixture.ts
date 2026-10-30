import { test as base, expect, type Page } from "@playwright/test";
const proxy =
  !process.env.FYLOGIA_TEST_URL && process.env.FYLOGIA_PAGES_RUNTIME !== "0";
export async function mockEdition(page: Page, edition: unknown) {
  if (proxy) {
    const result = await page.request.post("__test/edition", { data: edition });
    expect(
      result.status(),
      "loopback worker-level edition fixture installed",
    ).toBe(200);
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

// An automatic per-test fixture survives worker/module reuse across spec files.
// A hook registered as an import side effect only belongs to the first file.
export const test = base.extend<{ editionCleanup: void }>({
  editionCleanup: [
    async ({ page }, use) => {
      await use();
      if (proxy) await restoreEdition(page);
    },
    { auto: true },
  ],
});
